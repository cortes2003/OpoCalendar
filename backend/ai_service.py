from datetime import datetime, timedelta, time, date
from sqlalchemy.orm import Session
import models, schemas

# --- HELPERS ---
def time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute

def minutes_to_time(m: int) -> time:
    hours = m // 60
    minutes = m % 60
    return time(hour=hours, minute=minutes)

def parse_time_str(t_str: str) -> int:
    try:
        if len(t_str) == 5: t_str += ":00" # Asegurar formato HH:MM:SS
        parts = t_str.split(":")
        t = time(hour=int(parts[0]), minute=int(parts[1]))
        return time_to_minutes(t)
    except:
        return 0

# --- LÓGICA PRINCIPAL ---
def calculate_schedule(db: Session, target_date: date, request: schemas.OptimizationRequest):
    # 1. Obtener tareas del día
    tasks = db.query(models.Task).filter(
        models.Task.date == target_date,
        models.Task.completed == False
    ).all()

    if not tasks:
        return []

    # 2. Configurar Límites
    day_start = parse_time_str(request.day_start)
    day_end = parse_time_str(request.day_end)
    if day_end <= day_start:
        day_start, day_end = 480, 1320 # 08:00 - 22:00 default

    # 3. Separar Fijas y Flexibles
    # A las tareas fijas, les SUMAMOS los descansos del usuario como si fueran tareas fijas
    fixed_blocks = []
    
    # Añadir tareas fijas reales
    for t in tasks:
        if t.is_fixed:
            fixed_blocks.append({
                "start": time_to_minutes(t.start_time),
                "end": time_to_minutes(t.end_time),
                "type": "fixed_task"
            })

    # Añadir descansos del usuario
    for b in request.breaks:
        fixed_blocks.append({
            "start": parse_time_str(b.start_time),
            "end": parse_time_str(b.end_time),
            "type": "user_break"
        })

    # Ordenar todos los bloqueos por hora de inicio
    fixed_blocks.sort(key=lambda x: x["start"])

    # Flexibles a organizar
    flexible_tasks = [t for t in tasks if not t.is_fixed]
    prio_val = {"high": 3, "medium": 2, "low": 1}
    flexible_tasks.sort(key=lambda x: (prio_val.get(x.priority.value, 1), x.duration), reverse=True)

    current_time = day_start
    proposals = []

    # Añadir cierre ficticio
    fixed_blocks.append({"start": day_end, "end": day_end, "type": "end_of_day"})

    for block in fixed_blocks:
        if current_time >= day_end: break

        block_start = block["start"]
        block_end = block["end"]

        # Calcular hueco libre antes del bloqueo
        effective_gap_end = min(block_start, day_end)
        
        if effective_gap_end > current_time:
            gap_duration = effective_gap_end - current_time
            
            # Rellenar hueco con flexibles
            i = 0
            while i < len(flexible_tasks):
                task = flexible_tasks[i]
                if task.duration <= gap_duration:
                    # Encontrado sitio!
                    new_start_min = current_time
                    new_end_min = current_time + task.duration
                    
                    # Guardamos la propuesta (NO guardamos en DB aún)
                    proposals.append({
                        "task_id": task.id,
                        "title": task.title,
                        "old_start": task.start_time,
                        "new_start": minutes_to_time(new_start_min),
                        "new_end": minutes_to_time(new_end_min)
                    })
                    
                    current_time += task.duration
                    gap_duration -= task.duration
                    flexible_tasks.pop(i)
                else:
                    i += 1
        
        # Saltar bloqueo
        current_time = max(current_time, block_end)
        # Respetar hora inicio día
        current_time = max(current_time, day_start)

    return proposals