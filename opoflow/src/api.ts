import type { Task } from './types';

const API_URL = 'http://localhost:8000';

const formatTimeForInput = (timeStr: string) => timeStr.slice(0, 5);
const formatTimeForDb = (timeStr: string) => timeStr.length === 5 ? `${timeStr}:00` : timeStr;

export const api = {
  // 1. OBTENER TODAS
  getTasks: async (): Promise<Task[]> => {
    try {
        const res = await fetch(`${API_URL}/tasks`);
        if (!res.ok) throw new Error('Error de red');
        const data = await res.json();
        return data.map((t: any) => ({
            ...t,
            start_time: formatTimeForInput(t.start_time),
            end_time: formatTimeForInput(t.end_time)
        }));
    } catch (error) {
        console.error("No se pudo conectar con el backend:", error);
        return [];
    }
  },

  // 2. CREAR TAREA
  createTask: async (task: any): Promise<Task> => {
    const payload = {
        ...task,
        start_time: formatTimeForDb(task.start_time),
        end_time: formatTimeForDb(task.end_time)
    };
    const res = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error al crear');
    return await res.json();
  },

  // 3. ACTUALIZAR TAREA
  updateTask: async (id: number, task: any): Promise<Task> => {
    const payload = { ...task };
    if (payload.start_time) payload.start_time = formatTimeForDb(payload.start_time);
    if (payload.end_time) payload.end_time = formatTimeForDb(payload.end_time);

    const res = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error al actualizar');
    return await res.json();
  },

  // 4. BORRAR TAREA
  deleteTask: async (id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al borrar');
  },

  // --- IA NUEVA ---
  
  // 5. CALCULAR OPTIMIZACIÓN (Simulación)
  calculateOptimization: async (date: string, dayStart: string, dayEnd: string, breaks: {start: string, end: string}[]) => {
    const payload = {
        day_start: dayStart,
        day_end: dayEnd,
        breaks: breaks.map(b => ({ start_time: b.start, end_time: b.end }))
    };
    
    const res = await fetch(`${API_URL}/optimize/calculate/${date}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Error IA');
    return await res.json();
  },

  // 6. APLICAR OPTIMIZACIÓN (Guardar cambios)
  applyOptimization: async (proposals: any[]) => {
    const res = await fetch(`${API_URL}/optimize/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposals)
    });
    if (!res.ok) throw new Error('Error al aplicar');
  }
};