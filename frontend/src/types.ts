export type TaskType = 'study' | 'class' | 'personal' | 'break';
export type Priority = 'high' | 'medium' | 'low';

// Esta interfaz coincide EXACTAMENTE con tu base de datos MySQL
export interface Task {
  id: number;          // ID numérico (antes era string)
  title: string;
  description?: string;
  type: TaskType;
  priority: Priority;
  date: string;        // "YYYY-MM-DD"
  start_time: string;  // Python usa guiones bajos (snake_case)
  end_time: string;    
  duration: number;
  is_fixed: boolean;   
  email_reminder: boolean;
  repeat_weekly: boolean;
  completed: boolean;
}