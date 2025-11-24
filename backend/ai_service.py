from datetime import datetime, timedelta, time, date
from sqlalchemy.orm import Session
import models, crud

def time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute

def minutes_to_time(m: int) -> time:
    hours = m // 60
    minutes = m % 60
    return time(hour=hours, minute=minutes)

def parse_time_str(t_str: str) -> int:
    """Convierte 'HH:MM' string a minutos enteros del día"""
    try:
        parts = t_str.split(":")
        t = time(hour=int(parts[0]), minute=int(parts[1]))
        return time_to_minutes(t)
    except:
        return 0

def optimize_day(db: Session, target_date: date, day_start_str: str, day_end_str: str):
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

    # Ordenar flexibles por prioridad
    priority_map = {"high": 1, "medium": 2, "low": 3}
    flexible_tasks.sort(key=lambda x: (priority_map[x.priority.value], -x.duration))

    # 3. Límites del día (CORRECCIÓN CRÍTICA)
    day_start = parse_time_str(day_start_str)
    day_end = parse_time_str(day_end_str)
    
    # Si el usuario pone mal las horas (fin antes que inicio), usamos defaults
    if day_end <= day_start:
        day_start = time_to_minutes(time(8, 0))
        day_end = time_to_minutes(time(22, 0))

    current_time = day_start
    schedule_updates = []

    # Añadimos un cierre ficticio al final del horario permitido
    # Esto asegura que NUNCA nos pasemos de day_end
    fixed_markers = fixed_tasks + [None] 

    for marker in fixed_markers:
        # Si ya hemos superado el fin del día, paramos inmediatamente
        if current_time >= day_end:
            break

        if marker:
            marker_start = time_to_minutes(marker.start_time)
            marker_end = time_to_minutes(marker.end_time)
        else:
            # Si es el marcador final, el límite es el fin del día del usuario
            marker_start = day_end
            marker_end = day_end

        # CORRECCIÓN: El hueco efectivo acaba en el marcador O en el fin del día, lo que ocurra antes
        effective_gap_end = min(marker_start, day_end)
        
        # Solo calculamos hueco si el marcador empieza DESPUÉS de ahora
        if effective_gap_end > current_time:
            gap_duration = effective_gap_end - current_time

            # Intentamos meter tareas flexibles
            i = 0
            while i < len(flexible_tasks):
                task = flexible_tasks[i]
                if task.duration <= gap_duration:
                    # Programar tarea
                    new_start = minutes_to_time(current_time)
                    new_end = minutes_to_time(current_time + task.duration)
                    
                    task.start_time = new_start
                    task.end_time = new_end
                    schedule_updates.append(task)
                    
                    current_time += task.duration
                    gap_duration -= task.duration
                    flexible_tasks.pop(i)
                else:
                    i += 1
        
        # Avanzar el reloj
        if marker:
            # Saltamos al final de la tarea fija, PERO si la tarea fija termina 
            # antes de mi hora de inicio (ej: una tarea a las 06:00 AM), 
            # el current_time debe seguir siendo mi hora de inicio (ej: 09:00 AM).
            current_time = max(current_time, marker_end)

    # 4. Guardar cambios
    db.commit()
    
    return {"message": "Horario optimizado", "updated_count": len(schedule_updates)}