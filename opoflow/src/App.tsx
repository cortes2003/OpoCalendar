import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, Trash2, X, Calendar as CalendarIcon, Clock, Save, ChevronLeft, ChevronRight, ArrowLeft, Edit2, CheckCircle, Circle, AlertTriangle, BarChart3, Layout, Settings, Bell, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { optimizeSchedule } from './aiScheduler';
import { api } from './api';
import type { Task, TaskType, Priority } from './types';

function useStickyState<T>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

const OpoFlowApp = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [userSettings, setUserSettings] = useStickyState({
    name: 'Opositor',
    email: '',
    notificationsEnabled: false
  }, 'opoflow-settings');

  const [view, setView] = useState<'calendar' | 'day' | 'settings'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info'; }>({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [formData, setFormData] = useState({
    title: '', description: '', category: 'study' as TaskType, priority: 'medium' as Priority,
    date: new Date().toISOString().split('T')[0], 
    start_time: '09:00', end_time: '10:00', 
    is_fixed: false, email_reminder: true, repeat_weekly: false
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    const data = await api.getTasks();
    setTasks(data);
    setIsLoading(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach(task => {
        if (!task.start_time || task.completed) return;
        const [hours, minutes] = task.start_time.split(':').map(Number);
        const taskDate = new Date(task.date);
        taskDate.setHours(hours, minutes, 0);

        const isSameDate = taskDate.getDate() === now.getDate() && taskDate.getMonth() === now.getMonth();
        if (!isSameDate) return;

        const diff = (taskDate.getTime() - now.getTime()) / 1000 / 60;
        if (diff >= 29 && diff <= 30 && userSettings.notificationsEnabled && Notification.permission === "granted") {
             new Notification(`⏳ Prepárate: ${task.title}`, { body: `Empieza a las ${task.start_time}` });
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [tasks, userSettings]);

  const showAlert = (title: string, message: string, type: 'success' | 'error' = 'success') => setAlertConfig({ isOpen: true, title, message, type });
  const showConfirm = (title: string, message: string, onConfirm: () => void) => setConfirmConfig({ isOpen: true, title, message, onConfirm });
  const closeModals = () => { setAlertConfig(p => ({ ...p, isOpen: false })); setConfirmConfig(p => ({ ...p, isOpen: false })); };

  const generateCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const handleOptimize = async () => {
    const dayTasks = tasks.filter(t => t.date === selectedDate);
    if (dayTasks.length === 0) { showAlert("Sin tareas", "No hay actividades hoy.", "error"); return; }
    
    const optimizedDayTasks = optimizeSchedule(dayTasks, '08:00', '22:00');
    
    for (const task of optimizedDayTasks) {
        await api.updateTask(task.id, { start_time: task.start_time, end_time: task.end_time });
    }
    
    await loadTasks();
    showAlert("¡Día Optimizado!", "Horario reorganizado.", "success");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({ 
        title: '', description: '', category: 'study', priority: 'medium', 
        date: selectedDate, start_time: '09:00', end_time: '10:00', 
        is_fixed: false, email_reminder: true, repeat_weekly: false 
    });
    setShowForm(true);
  };

  const openEditForm = (task: Task) => {
    setEditingId(task.id);
    setFormData({ 
        title: task.title, description: task.description || '', category: task.type, priority: task.priority, 
        date: task.date, start_time: task.start_time, end_time: task.end_time, 
        is_fixed: task.is_fixed, email_reminder: task.email_reminder, repeat_weekly: task.repeat_weekly 
    });
    setShowForm(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(`1970-01-01T${formData.start_time}:00`);
    const end = new Date(`1970-01-01T${formData.end_time}:00`);
    const durationMin = (end.getTime() - start.getTime()) / 60000;

    if (durationMin <= 0) { showAlert("Error horario", "Hora fin debe ser posterior.", "error"); return; }

    const taskPayload: any = {
      title: formData.title, description: formData.description, type: formData.category, priority: formData.priority,
      date: formData.date, start_time: formData.start_time, end_time: formData.end_time, duration: durationMin,
      is_fixed: formData.is_fixed, email_reminder: formData.email_reminder, repeat_weekly: formData.repeat_weekly, completed: false
    };

    try {
        if (editingId) {
            await api.updateTask(editingId, taskPayload);
        } else {
            await api.createTask(taskPayload);
        }
        await loadTasks();
        setShowForm(false);
    } catch (error) {
        showAlert("Error", "No se pudo guardar en el servidor.", "error");
    }
  };

  const handleDeleteRequest = (id: number) => showConfirm("¿Eliminar?", "Irreversible.", async () => { 
      await api.deleteTask(id);
      await loadTasks();
      closeModals(); 
  });

  const toggleComplete = async (task: Task) => {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
      await api.updateTask(task.id, { completed: !task.completed });
  };

  const requestNotificationPermission = () => {
    Notification.requestPermission().then((p) => {
      if (p === "granted") {
        setUserSettings(prev => ({ ...prev, notificationsEnabled: true }));
        showAlert("¡Activado!", "Avisos activados.", "success");
      }
    });
  };

  const ToggleSwitch = ({ label, subLabel, checked, onChange, name }: any) => (
    <div className="flex items-center justify-between py-3">
      <div><span className="block text-sm font-medium text-gray-900">{label}</span>{subLabel && <p className="text-xs text-gray-500 mt-0.5">{subLabel}</p>}</div>
      <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div></label>
    </div>
  );

  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color} text-white`}><Icon size={20} /></div>
        <div><p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p><p className="text-2xl font-bold text-gray-900">{value}</p></div>
    </div>
  );

  const dayTasks = tasks.filter(t => t.date === selectedDate).sort((a,b) => a.start_time.localeCompare(b.start_time));
  const completedCount = dayTasks.filter(t => t.completed).length;

  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* SIDEBAR */}
      <aside className={`md:w-[400px] bg-white border-r border-gray-200 flex flex-col z-20 flex-shrink-0 transition-all duration-300 ${view === 'calendar' ? 'flex' : 'hidden md:flex'} h-full`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="bg-blue-600 p-2 rounded-lg"><Layout className="text-white" size={24} /></div><span className="text-xl font-bold tracking-tight text-gray-900">OpoFlow</span></div>
            <button onClick={() => setView('settings')} className="hidden md:flex p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Settings size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={20}/></button>
                <h2 className="text-lg font-bold capitalize text-gray-800">{format(currentMonth, 'MMMM yyyy', { locale: es })}</h2>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={20}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <span key={d} className="text-xs font-bold text-gray-400">{d}</span>)}</div>
            <div className="grid grid-cols-7 gap-2">
                {generateCalendarDays().map((day) => {
                    const dayString = format(day, 'yyyy-MM-dd');
                    const isSelected = dayString === selectedDate;
                    const isMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());
                    const hasTasks = tasks.filter(t => t.date === dayString);
                    return (
                        <button key={day.toString()} onClick={() => { setSelectedDate(dayString); if (window.innerWidth < 768) setView('day'); }} 
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center relative ${isMonth ? 'text-gray-700' : 'text-gray-300'} ${isSelected ? 'bg-blue-600 text-white shadow-lg' : ''} ${!isSelected && isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}`}>
                            <span className="text-sm font-bold z-10">{format(day, 'd')}</span>
                            <div className="flex gap-0.5 mt-1 h-1">{hasTasks.slice(0,3).map(t => <div key={t.id} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/70' : 'bg-blue-500'}`}/>)}</div>
                        </button>
                    );
                })}
            </div>
        </div>
      </aside>

      {/* MAIN PANEL */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300 bg-white/50 md:bg-transparent ${view === 'calendar' ? 'hidden md:flex' : 'flex'}`}>
        {view === 'settings' ? (
             <div className="flex-1 p-4 md:p-12 overflow-y-auto custom-scrollbar">
                 <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6"><button onClick={() => setView('day')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24}/></button><h2 className="text-3xl font-bold text-gray-900">Configuración</h2></div>
                    <div className="space-y-8">
                        <section>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><User size={20}/> Tu Perfil</h3>
                            <div className="grid gap-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-2">Nombre</label><input type="text" value={userSettings.name} onChange={e => setUserSettings({...userSettings, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-2">Email</label><input type="email" value={userSettings.email} onChange={e => setUserSettings({...userSettings, email: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" /></div>
                            </div>
                        </section>
                        <section className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                            <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2"><Bell size={20}/> Notificaciones</h3>
                            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-blue-100">
                                <div><span className="block font-bold text-gray-900">Avisos</span><span className="text-xs text-gray-500">{userSettings.notificationsEnabled ? 'Activado' : 'Desactivado'}</span></div>
                                <button onClick={requestNotificationPermission} className={`px-4 py-2 rounded-lg font-bold text-sm ${userSettings.notificationsEnabled ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white'}`}>{userSettings.notificationsEnabled ? 'Activado' : 'Activar'}</button>
                            </div>
                        </section>
                    </div>
                 </div>
             </div>
        ) : (
            <>
                <div className="md:hidden p-4 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-2"><button onClick={() => setView('calendar')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={20}/></button><span className="font-bold">{format(parseISO(selectedDate), "d 'de' MMMM", { locale: es })}</span></div>
                    <button onClick={() => setView('settings')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><Settings size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-12">
                    <div className="max-w-5xl mx-auto w-full space-y-8">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div><div className="mb-6"><h1 className="text-3xl font-bold text-gray-900">Hola, {userSettings.name}</h1><p className="text-gray-500">Tus objetivos de hoy.</p></div><h2 className="text-xl text-gray-600 flex items-center gap-2"><CalendarIcon size={20} /><span className="capitalize">{format(parseISO(selectedDate), "EEEE, d 'de' MMMM", { locale: es })}</span></h2></div>
                            <div className="flex gap-3"><button onClick={handleOptimize} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg flex items-center gap-2 font-semibold"><Sparkles size={18} /><span className="hidden sm:inline">IA Organize</span></button><button onClick={openCreateForm} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 shadow-lg flex items-center gap-2 font-semibold"><Plus size={18} /><span>Nueva</span></button></div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <StatCard label="Actividades" value={dayTasks.length} icon={BarChart3} color="bg-blue-500" />
                            <StatCard label="Completadas" value={completedCount} icon={CheckCircle} color="bg-green-500" />
                            <StatCard label="Pendientes" value={dayTasks.length - completedCount} icon={Clock} color="bg-orange-500" />
                        </div>

                        <div className="space-y-4">
                            {isLoading ? <p className="text-center text-gray-400 py-10">Cargando agenda...</p> : dayTasks.length === 0 ? (
                                <div className="bg-white/50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center cursor-pointer" onClick={openCreateForm}><div className="bg-gray-100 p-4 rounded-full mb-4 inline-block"><Plus size={32} /></div><h3 className="text-lg font-bold text-gray-900">Día despejado</h3><p className="text-gray-500">Añade una actividad.</p></div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">{dayTasks.map(task => (
                                    <div key={task.id} className={`group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex gap-4 items-center ${task.completed ? 'opacity-60 bg-gray-50' : ''}`}>
                                        <div className="flex flex-col items-center min-w-[4rem]"><span className="text-sm font-bold text-gray-900">{task.start_time}</span><span className="text-xs text-gray-400">{task.end_time}</span><div className={`h-8 w-0.5 mt-2 rounded-full ${task.type === 'study' ? 'bg-blue-200' : task.type === 'class' ? 'bg-red-200' : 'bg-green-200'}`}></div></div>
                                        <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${task.type === 'study' ? 'bg-blue-50 text-blue-600' : task.type === 'class' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{task.type}</span>{task.priority === 'high' && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-orange-50 text-orange-600 flex items-center gap-1"><AlertTriangle size={10}/> Prioridad</span>}</div><h3 className={`text-lg font-bold text-gray-900 truncate ${task.completed ? 'line-through text-gray-400' : ''}`}>{task.title}</h3><p className="text-gray-500 text-sm line-clamp-1">{task.description}</p></div>
                                        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => toggleComplete(task)} className={`p-2 rounded-xl ${task.completed ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-400'}`}>{task.completed ? <CheckCircle size={20}/> : <Circle size={20} />}</button>
                                            <button onClick={() => openEditForm(task)} className="p-2 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-gray-400"><Edit2 size={20}/></button>
                                            <button onClick={() => handleDeleteRequest(task.id)} className="p-2 rounded-xl hover:bg-red-50 hover:text-red-600 text-gray-400"><Trash2 size={20}/></button>
                                        </div>
                                    </div>
                                ))}</div>
                            )}
                        </div>
                    </div>
                </div>
            </>
        )}
      </main>

      {/* MODALES (Correctamente situados fuera de main, pero dentro del div root) */}
      {confirmConfig.isOpen && <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm"><Trash2 size={32} className="mx-auto mb-4 text-red-500"/><h3 className="text-xl font-bold mb-2">{confirmConfig.title}</h3><p className="mb-8 text-gray-500">{confirmConfig.message}</p><div className="flex gap-3"><button onClick={closeModals} className="flex-1 py-3 font-semibold hover:bg-gray-50 rounded-xl">Cancelar</button><button onClick={confirmConfig.onConfirm} className="flex-1 py-3 font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl">Eliminar</button></div></div></div>}
      {alertConfig.isOpen && <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm"><Sparkles size={32} className="mx-auto mb-4 text-blue-500"/><h3 className="text-xl font-bold mb-2">{alertConfig.title}</h3><p className="mb-8 text-gray-500">{alertConfig.message}</p><button onClick={closeModals} className="w-full py-3 font-bold text-white bg-gray-900 hover:bg-black rounded-xl">Entendido</button></div></div>}
      
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100"><h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Editar' : 'Nueva'}</h2><button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button></div>
            <form onSubmit={handleSaveTask} className="p-8 space-y-6">
                <div className="space-y-2"><label className="block text-sm font-bold text-gray-700">Título</label><input type="text" name="title" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.title} onChange={handleInputChange} /></div>
                <div className="space-y-2"><label className="block text-sm font-bold text-gray-700">Descripción</label><textarea name="description" rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.description} onChange={handleInputChange} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="block text-sm font-bold text-gray-700">Categoría</label><select name="category" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.category} onChange={handleInputChange as any}><option value="study">Estudio</option><option value="class">Clase</option><option value="personal">Personal</option><option value="break">Descanso</option></select></div>
                    <div className="space-y-2"><label className="block text-sm font-bold text-gray-700">Prioridad</label><select name="priority" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.priority} onChange={handleInputChange as any}><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2"><label className="block text-sm font-bold text-gray-700">Fecha</label><input type="date" name="date" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.date} onChange={handleInputChange} /></div>
                     <div className="space-y-2"><label className="block text-sm font-bold text-gray-700">Inicio</label><input type="time" name="start_time" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.start_time} onChange={handleInputChange} /></div>
                     <div className="space-y-2"><label className="block text-sm font-bold text-gray-700">Fin</label><input type="time" name="end_time" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.end_time} onChange={handleInputChange} /></div>
                </div>
                <div className="bg-blue-50 rounded-2xl p-5 space-y-4 border border-blue-100">
                    <ToggleSwitch name="is_fixed" label="Fijo (No mover)" checked={formData.is_fixed} onChange={handleInputChange} />
                    <div className="h-px bg-blue-200/50"></div>
                    <ToggleSwitch name="email_reminder" label="Notificar email" checked={formData.email_reminder} onChange={handleInputChange} />
                    <div className="h-px bg-blue-200/50"></div>
                    <ToggleSwitch name="repeat_weekly" label="Repetir semanal" checked={formData.repeat_weekly} onChange={handleInputChange} />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg"><Save size={20} className="inline mr-2"/> Guardar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpoFlowApp;