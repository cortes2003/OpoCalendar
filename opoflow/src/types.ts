export type TaskType = 'study' | 'class' | 'personal' | 'break';
export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;      
  priority: Priority;
  date: string;        // Formato "YYYY-MM-DD"
  startTime: string;   // Formato "HH:mm"
  endTime: string;     // Formato "HH:mm"
  duration: number;    // Minutos (Sagrado para la IA)
  isFixed: boolean;    
  emailReminder: boolean;
  repeatWeekly: boolean;
  completed: boolean;  // Nuevo campo para el check
}