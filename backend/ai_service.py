from datetime import datetime, timedelta, time, date
from sqlalchemy.orm import Session
import models

# --- HELPERS ---
def time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute

def minutes_to_time(m: int) -> time:
    hours = m // 60
    minutes = m % 60
    return time(hour=hours, minute=minutes)

def parse_time_str(t_str: str) -> int:
    try:
        parts = t_str.split(":")
        t = time(hour=int(parts[0]), minute=int(parts[1]))
        return time_to_minutes(t)
    except:
        print(f"❌ Error parseando hora: {t_str}")
        return 0

# --- LÓGICA PRINCIPAL ---
def optimize_day(db: Session, target_date: date, day_start_str: str, day_end_str: str):
    print(f"\n--- 🤖 INICIANDO IA para el día {target_date} ---")
    print(f"📥 Configuración recibida: Inicio={day_start_str}, Fin={day_end_str}")

    # 1. Obtener tareas
    tasks = db.query(models.Task).filter(
        models.Task.date == target_date,
        models.Task.completed == False
    ).all()

    if not tasks:
        print("⚠️ No hay tareas para organizar.")
        return {"message": "No hay tareas"}

    # 2. Parsear límites
    day_start = parse_time_str(day_start_str)
    day_end = parse_time_str(day_end_str)
    
    if day_end <= day_start:
        print("⚠️ Horas inválidas, usando defaults (08:00 - 22:00)")
        day_start = 480 # 08:00
        day_end = 1320  # 22:00

    print(f"⏱️  Ventana de trabajo (minutos): {day_start} a {day_end}")

    # 3. Clasificar
    fixed_tasks = sorted([t for t in tasks if t.is_fixed], key=lambda x: x.start_time)
    flexible_tasks = [t for t in tasks if not t.is_fixed]
    
    # Mapa de prioridades para ordenación
    prio_val = {"high": 3, "medium": 2, "low": 1} 
    # Ordenamos flexibles: Primero más prioridad, luego más largas
    flexible_tasks.sort(key=lambda x: (prio_val.get(x.priority.value, 1), x.duration), reverse=True)

    print(f"📌 Tareas Fijas: {len(fixed_tasks)}")
    print(f"🔄 Tareas Flexibles a colocar: {len(flexible_tasks)}")

    current_time = day_start
    updated_count = 0

    # Marcadores de bloqueo (añadimos el fin del día como cierre)
    fixed_markers = fixed_tasks + [None]

    for marker in fixed_markers:
        # Límite del hueco actual: o empieza la siguiente tarea fija, o acaba el día
        if marker:
            marker_start = time_to_minutes(marker.start_time)
            marker_end = time_to_minutes(marker.end_time)
            print(f"   ⛔ Bloqueo fijo detectado a las {marker.start_time}")
        else:
            marker_start = day_end
            marker_end = day_end
            print("   🏁 Fin del día")

        # Definimos dónde acaba el hueco útil (no podemos pasarnos del día ni chocarnos con la fija)
        gap_end = min(marker_start, day_end)
        
        # ¿Hay espacio desde donde estamos (current_time) hasta el bloqueo?
        if gap_end > current_time:
            gap_duration = gap_end - current_time
            print(f"   🟢 Hueco libre de {gap_duration} min (desde {minutes_to_time(current_time)} hasta {minutes_to_time(gap_end)})")

            # Intentamos meter flexibles
            i = 0
            while i < len(flexible_tasks):
                task = flexible_tasks[i]
                if task.duration <= gap_duration:
                    # ¡Cabe!
                    new_start = minutes_to_time(current_time)
                    new_end = minutes_to_time(current_time + task.duration)
                    
                    print(f"      ✅ Colocando '{task.title}' ({task.duration}min) a las {new_start}")
                    
                    # Actualizar DB
                    task.start_time = new_start
                    task.end_time = new_end
                    updated_count += 1
                    
                    current_time += task.duration
                    gap_duration -= task.duration
                    flexible_tasks.pop(i) # Sacar de la lista
                else:
                    print(f"      ❌ '{task.title}' ({task.duration}min) no cabe aquí.")
                    i += 1
        else:
            print(f"   ⚠️ Sin hueco útil aquí (Hora actual: {minutes_to_time(current_time)})")

        # Avanzamos el reloj saltando la tarea fija (si la hay)
        if marker:
            # Nos aseguramos de no retroceder si la tarea fija fue muy temprano
            current_time = max(current_time, marker_end)
            # Pero si la tarea fija terminó ANTES de mi hora de inicio (ej: 08:30 y yo empiezo 09:00),
            # debo respetar mi hora de inicio.
            current_time = max(current_time, day_start)

    db.commit()
    print(f"--- ✅ FIN: {updated_count} tareas actualizadas ---\n")
    return {"message": "Optimizado", "updated": updated_count}