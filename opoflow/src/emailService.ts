export const MockEmailService = {
  sendReminder: (taskTitle: string, time: string) => {
    console.log(`[SERVIDOR CORREO] 📧 Enviando email simulado...`);
    // Usamos un alert para que veas que funciona
    alert(`📧 Recordatorio: "${taskTitle}" empieza a las ${time} (en 30 min).`);
    return Promise.resolve(true);
  }
};

export const startEmailWorker = (tasks: any[]) => {
  // Chequea cada minuto (60000 ms)
  const intervalId = setInterval(() => {
    const now = new Date();
    tasks.forEach(task => {
        if (!task.startTime) return;
        const [hours, minutes] = task.startTime.split(':').map(Number);
        const taskTime = new Date();
        taskTime.setHours(hours, minutes, 0);

        // Calculamos la diferencia en minutos
        const diff = (taskTime.getTime() - now.getTime()) / 1000 / 60;
        
        // Si faltan entre 29 y 30 minutos, enviamos aviso
        if (diff >= 29 && diff <= 30) {
            MockEmailService.sendReminder(task.title, task.startTime);
        }
    });
  }, 60000);
  
  return intervalId;
};