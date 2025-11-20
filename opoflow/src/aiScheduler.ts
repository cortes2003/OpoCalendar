import type { Task } from './types';

// Funciones auxiliares para manejar horas
const timeToMin = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minToTime = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const optimizeSchedule = (tasks: Task[], startDay: string, endDay: string): Task[] => {
  // 1. Separamos lo fijo (médico/clases) de lo flexible (estudio)
  const fixedTasks = tasks.filter(t => t.isFixed).sort((a, b) => timeToMin(a.startTime!) - timeToMin(b.startTime!));
  const flexibleTasks = tasks.filter(t => !t.isFixed);

  let newSchedule = [...fixedTasks];
  let currentTime = timeToMin(startDay);
  const dayEndTime = timeToMin(endDay);

  // 2. Rellenamos huecos
  for (let i = 0; i <= fixedTasks.length; i++) {
    const nextFixedStart = i < fixedTasks.length ? timeToMin(fixedTasks[i].startTime!) : dayEndTime;
    let gapDuration = nextFixedStart - currentTime;

    while (gapDuration > 0 && flexibleTasks.length > 0) {
      // Buscamos una tarea que quepa en el hueco
      const taskIndex = flexibleTasks.findIndex(t => t.duration <= gapDuration);

      if (taskIndex !== -1) {
        const taskToSchedule = flexibleTasks[taskIndex];
        taskToSchedule.startTime = minToTime(currentTime); // Le asignamos la hora
        
        newSchedule.push(taskToSchedule);
        
        currentTime += taskToSchedule.duration;
        gapDuration -= taskToSchedule.duration;
        flexibleTasks.splice(taskIndex, 1); // La quitamos de pendientes
      } else {
        break; // No cabe nada más aquí
      }
    }

    if (i < fixedTasks.length) {
      currentTime = timeToMin(fixedTasks[i].startTime!) + fixedTasks[i].duration;
    }
  }

  return newSchedule.sort((a, b) => timeToMin(a.startTime!) - timeToMin(b.startTime!));
};