import type { Task } from './types'; // <--- Añadido "type" aquí

const API_URL = 'http://localhost:8000';

// Helpers para formatear horas
const formatTimeForInput = (timeStr: string) => timeStr.slice(0, 5);
const formatTimeForDb = (timeStr: string) => timeStr.length === 5 ? `${timeStr}:00` : timeStr;

export const api = {
  // LEER
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

  // CREAR
  createTask: async (task: Omit<Task, 'id'>): Promise<Task> => {
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
    return await res.json();
  },

  // ACTUALIZAR
  updateTask: async (id: number, task: Partial<Task>): Promise<Task> => {
    const payload = { ...task };
    if (payload.start_time) payload.start_time = formatTimeForDb(payload.start_time);
    if (payload.end_time) payload.end_time = formatTimeForDb(payload.end_time);

    const res = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  // BORRAR
  deleteTask: async (id: number): Promise<void> => {
    await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
  }
};