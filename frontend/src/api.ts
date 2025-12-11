import type { Task } from './types';

const API_URL = 'http://localhost:8000';

const formatTimeForInput = (timeStr: string) => timeStr.slice(0, 5);
const formatTimeForDb = (timeStr: string) => timeStr.length === 5 ? `${timeStr}:00` : timeStr;

// Helper para limpiar errores
const handleResponse = async (res: Response) => {
    if (!res.ok) {
        let errorMessage = `Error ${res.status}`;
        try {
            const errorData = await res.json();
            if (errorData.detail) {
                errorMessage = typeof errorData.detail === 'string' 
                    ? errorData.detail 
                    : JSON.stringify(errorData.detail);
            }
        } catch (e) { /* Si no es JSON, usamos el genérico */ }
        throw new Error(errorMessage);
    }
    return res.json();
};

export const api = {
  // LEER
  getTasks: async (): Promise<Task[]> => {
    try {
        const res = await fetch(`${API_URL}/tasks`);
        return await handleResponse(res).then(data => data.map((t: any) => ({
            ...t,
            start_time: formatTimeForInput(t.start_time),
            end_time: formatTimeForInput(t.end_time)
        })));
    } catch (error) {
        console.error("API Error:", error);
        return [];
    }
  },

  // CREAR
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
    return handleResponse(res);
  },

  // ACTUALIZAR
  updateTask: async (id: number, task: any): Promise<Task> => {
    const payload = { ...task };
    if (payload.start_time) payload.start_time = formatTimeForDb(payload.start_time);
    if (payload.end_time) payload.end_time = formatTimeForDb(payload.end_time);

    const res = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // BORRAR
  deleteTask: async (id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  // IA: CALCULAR
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
    return handleResponse(res);
  },

  // IA: APLICAR
  applyOptimization: async (proposals: any[]) => {
    const res = await fetch(`${API_URL}/optimize/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposals)
    });
    return handleResponse(res);
  }
};