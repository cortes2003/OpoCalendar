import type { Task } from './types';
import { getAccessToken, setAccessToken, setRefreshToken, getRefreshToken, clearTokens } from './secureStorage';
import { sanitizeAttribute, validateInput } from './security';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const formatTimeForInput = (timeStr: string) => timeStr.slice(0, 5);
const formatTimeForDb = (timeStr: string) => timeStr.length === 5 ? `${timeStr}:00` : timeStr;

/**
 * Obtener headers con token de autenticación
 */
const getAuthHeaders = (): HeadersInit => {
    const token = getAccessToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
};

/**
 * Manejar respuesta de la API con renovación de token si es necesario
 */
const handleResponse = async (res: Response) => {
    // Si token expirado, intentar refrescar
    if (res.status === 401) {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
            try {
                const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${refreshToken}`
                    }
                });
                
                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    setAccessToken(data.access_token);
                    // Reintentar solicitud original
                    return null; // Señalar que se necesita reintentar
                } else {
                    // Refresh también falló, logout
                    clearTokens();
                    window.location.href = '/login';
                }
            } catch (e) {
                clearTokens();
                window.location.href = '/login';
            }
        }
        clearTokens();
        window.location.href = '/login';
    }
    
    if (!res.ok) {
        let errorMessage = `Error ${res.status}`;
        try {
            const errorData = await res.json();
            if (errorData.detail) {
                errorMessage = typeof errorData.detail === 'string' 
                    ? errorData.detail 
                    : JSON.stringify(errorData.detail);
            }
        } catch (e) { }
        throw new Error(errorMessage);
    }
    
    return res.json();
};

/**
 * Realizar solicitud con manejo de autenticación
 */
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const headers = getAuthHeaders();
    
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers }
        });
        
        const data = await handleResponse(res);
        
        // Si retorna null, reintentar (token fue refrescado)
        if (data === null) {
            const headers2 = getAuthHeaders();
            const res2 = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers: { ...headers2, ...options.headers }
            });
            return handleResponse(res2);
        }
        
        return data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const api = {
    // ============ AUTENTICACIÓN ============
    register: async (username: string, email: string, password: string) => {
        const validation = validateInput(username, 'Usuario', 50);
        if (!validation.valid) throw new Error(validation.error);
        
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await handleResponse(res);
        setAccessToken(data.access_token, 30);
        setRefreshToken(data.refresh_token);
        return data;
    },

    login: async (username: string, password: string) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await handleResponse(res);
        setAccessToken(data.access_token, 30);
        setRefreshToken(data.refresh_token);
        return data;
    },

    logout: async () => {
        try {
            await fetchWithAuth('/auth/logout', { method: 'POST' });
        } finally {
            clearTokens();
        }
    },

    refreshToken: async () => {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            clearTokens();
            throw new Error('No refresh token available');
        }
        
        const res = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshToken}`
            }
        });
        
        const data = await handleResponse(res);
        setAccessToken(data.access_token, 30);
        return data;
    },

    // ============ TAREAS ============
    getTasks: async (): Promise<Task[]> => {
        try {
            const data = await fetchWithAuth('/tasks');
            return data.map((t: any) => ({
                ...t,
                start_time: formatTimeForInput(t.start_time),
                end_time: formatTimeForInput(t.end_time)
            }));
        } catch (error) {
            console.error("Error fetching tasks:", error);
            return [];
        }
    },

    createTask: async (task: any): Promise<Task> => {
        // Sanitizar entrada
        const title = sanitizeAttribute(task.title);
        const description = sanitizeAttribute(task.description || '');
        
        const payload = {
            ...task,
            title,
            description,
            start_time: formatTimeForDb(task.start_time),
            end_time: formatTimeForDb(task.end_time)
        };
        
        return fetchWithAuth('/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },

    updateTask: async (id: number, task: any): Promise<Task> => {
        // Sanitizar entrada
        if (task.title) task.title = sanitizeAttribute(task.title);
        if (task.description) task.description = sanitizeAttribute(task.description);
        
        const payload = { ...task };
        if (payload.start_time) payload.start_time = formatTimeForDb(payload.start_time);
        if (payload.end_time) payload.end_time = formatTimeForDb(payload.end_time);

        return fetchWithAuth(`/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },

    deleteTask: async (id: number): Promise<void> => {
        return fetchWithAuth(`/tasks/${id}`, { method: 'DELETE' });
    },

    // ============ OPTIMIZACIÓN IA ============
    calculateOptimization: async (date: string, dayStart: string, dayEnd: string, breaks: {start: string, end: string}[]) => {
        const payload = {
            day_start: dayStart,
            day_end: dayEnd,
            breaks: breaks.map(b => ({ start_time: b.start, end_time: b.end }))
        };
        
        return fetchWithAuth(`/optimize/calculate/${date}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },

    applyOptimization: async (proposals: any[]) => {
        return fetchWithAuth('/optimize/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proposals)
        });
    },

    // ============ HEALTH CHECK ============
    healthCheck: async () => {
        try {
            const res = await fetch(`${API_URL}/health`);
            return await handleResponse(res);
        } catch (error) {
            console.error("Health check failed:", error);
            return null;
        }
    }
};