from datetime import datetime, timedelta, time, date
from sqlalchemy.orm import Session
import models, crud

def time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute

def minutes_to_time(m: int) -> time:
    hours = m // 60
    minutes = m % 60
    return time(hour=hours, minute=minutes)

def optimize_day(db: Session, target_date: date):
    # 1. Obtener tareas del día
    tasks = db.query(models.Task).filter(
        models.Task.date == target_date,
        models.Task.completed == False
    ).all()

    if not tasks:
        return {"message": "No hay tareas pendientes para organizar"}

    # 2. Separar Fijas y Flexibles
    fixed_tasks = sorted([t for t in tasks if t.is_fixed], key=lambda x: x.start_time)
    flexible_tasks = [t for t in tasks if not t.is_fixed]

    # Ordenar flexibles por prioridad (Alta > Media > Baja) y duración
    priority_map = {"high": 1, "medium": 2, "low": 3}
    flexible_tasks.sort(key=lambda x: (priority_map[x.priority.value], -x.duration))

    # 3. Algoritmo de Relleno de Huecos (Gap Filling)
    day_start = time_to_minutes(time(8, 0))  # Empieza a las 08:00
    day_end = time_to_minutes(time(22, 0))   # Acaba a las 22:00
    
    current_time = day_start
    schedule_updates = []

    # Iteramos sobre los huecos que dejan las tareas fijas
    # Añadimos un "cierre" ficticio al final del día para procesar el último hueco
    fixed_markers = fixed_tasks + [None] 

    for marker in fixed_markers:
        if marker:
            marker_start = time_to_minutes(marker.start_time)
            marker_end = time_to_minutes(marker.end_time)
        else:
            marker_start = day_end
            marker_end = day_end

        # Calculamos el hueco disponible antes de este marcador fijo
        gap_duration = marker_start - current_time

        # Intentamos meter tareas flexibles en este hueco
        i = 0
        while i < len(flexible_tasks):
            task = flexible_tasks[i]
            if task.duration <= gap_duration:
                # ¡Cabe! La programamos
                new_start = minutes_to_time(current_time)
                new_end = minutes_to_time(current_time + task.duration)
                
                # Actualizamos en BD
                task.start_time = new_start
                task.end_time = new_end
                schedule_updates.append(task)
                
                # Ajustamos tiempos del hueco
                current_time += task.duration
                gap_duration -= task.duration
                
                # Quitamos de la lista de pendientes
                flexible_tasks.pop(i)
            else:
                i += 1
        
        # Saltamos al final de la tarea fija actual para el siguiente ciclo
        if marker:
            current_time = max(current_time, marker_end)

    # 4. Guardar cambios en la BD
    db.commit()
    
    return {"message": "Horario optimizado con éxito", "updated_count": len(schedule_updates)}