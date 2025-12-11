import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, Trash2, X, Calendar as CalendarIcon, Clock, Save, ChevronLeft, ChevronRight, ArrowLeft, Edit2, CheckCircle, Circle, AlertTriangle, BarChart3, Layout, Settings, Bell, User, Play, ArrowRight, BookOpen, GraduationCap, Coffee, Utensils, Loader2, Undo2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
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

const OpoCalendarApp = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User Settings
  const [userSettings, setUserSettings] = useStickyState({
    name: 'Opositor',
    email: '',
    notificationsEnabled: false,
    dayStart: '08:00',
    dayEnd: '22:00',
    lunchStart: '14:00',
    lunchEnd: '15:00',
    dinnerStart: '21:00',
    dinnerEnd: '22:00'
  }, 'opocalendar-settings');

  // Navigation
  const [view, setView] = useState<'calendar' | 'day' | 'settings'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info'; }>({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // IA States
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiStep, setAiStep] = useState<'questions' | 'proposal'>('questions');
  const [aiBreaks, setAiBreaks] = useState<{start: string, end: string}[]>([]);
  const [aiProposals, setAiProposals] = useState<any[]>([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // Loading & UX States
  const [isSaving, setIsSaving] = useState(false);
  const [undoTask, setUndoTask] = useState<{task: Task, timeoutId: NodeJS.Timeout} | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '', description: '', type: 'study' as TaskType, priority: 'medium' as Priority,
    date: new Date().toISOString().split('T')[0], 
    start_time: '09:00', end_time: '10:00', 
    is_fixed: false, email_reminder: true, repeat_weekly: false
  });

  // Init
  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    const data = await api.getTasks();
    setTasks(data);
    setIsLoading(false);
  };

  // Validación de horarios bloqueados
  const validateBlockedHours = () => {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const dayStartMin = toMinutes(userSettings.dayStart);
    const dayEndMin = toMinutes(userSettings.dayEnd);
    const lunchStartMin = toMinutes(userSettings.lunchStart);
    const lunchEndMin = toMinutes(userSettings.lunchEnd);
    const dinnerStartMin = toMinutes(userSettings.dinnerStart);
    const dinnerEndMin = toMinutes(userSettings.dinnerEnd);

    if (dayStartMin >= dayEndMin) {
      showAlert("Horario inválido", "El fin del día debe ser posterior al inicio", "error");
      return false;
    }
    if (lunchStartMin >= lunchEndMin) {
      showAlert("Comida inválida", "El fin de la comida debe ser posterior al inicio", "error");
      return false;
    }
    if (dinnerStartMin >= dinnerEndMin) {
      showAlert("Cena inválida", "El fin de la cena debe ser posterior al inicio", "error");
      return false;
    }
    if (lunchStartMin < dayStartMin || lunchEndMin > dayEndMin) {
      showAlert("Comida fuera de horario", "La comida debe estar dentro del horario disponible", "error");
      return false;
    }
    if (dinnerStartMin < dayStartMin || dinnerEndMin > dayEndMin) {
      showAlert("Cena fuera de horario", "La cena debe estar dentro del horario disponible", "error");
      return false;
    }
    if (dinnerStartMin < lunchEndMin) {
      showAlert("Horarios solapados", "La cena no puede comenzar antes de que termine la comida", "error");
      return false;
    }
    return true;
  };

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // No activar si hay un modal abierto con inputs
      if (showForm || showAIModal) {
        if (e.key === 'Escape') {
          closeModals();
          setShowForm(false);
          setShowAIModal(false);
        }
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openCreateForm();
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleOpenAI();
      } else if (e.key === 'Escape') {
        closeModals();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, showAIModal, selectedDate]);

  // Notificaciones
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach(task => {
        if (!task.start_time || task.completed) return;
        const [hours, minutes] = task.start_time.split(':').map(Number);
        const taskDate = new Date(task.date);
        taskDate.setHours(hours, minutes, 0);
        if (taskDate.getDate() !== now.getDate()) return;

        const diff = (taskDate.getTime() - now.getTime()) / 1000 / 60;
        if (diff >= 29 && diff <= 30 && userSettings.notificationsEnabled && Notification.permission === "granted") {
             new Notification(`⏳ Prepárate: ${task.title}`, { body: `Empieza a las ${task.start_time}` });
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [tasks, userSettings]);

  // Handlers
  const handleOpenAI = () => { setAiStep('questions'); setAiBreaks([]); setAiProposals([]); setShowAIModal(true); };
  const addBreak = () => setAiBreaks([...aiBreaks, { start: '14:00', end: '15:00' }]);
  const removeBreak = (index: number) => { const n = [...aiBreaks]; n.splice(index, 1); setAiBreaks(n); };
  const updateBreak = (index: number, f: 'start'|'end', v: string) => { const n = [...aiBreaks]; n[index][f] = v; setAiBreaks(n); };

  const handleGenerateProposal = async () => {
    setIsProcessingAI(true);
    try {
        // Combinar descansos del usuario con comidas y cenas configuradas
        const mealBreaks = [
            { start: userSettings.lunchStart, end: userSettings.lunchEnd },
            { start: userSettings.dinnerStart, end: userSettings.dinnerEnd }
        ];
        const allBreaks = [...aiBreaks, ...mealBreaks];
        
        const proposals = await api.calculateOptimization(selectedDate, userSettings.dayStart, userSettings.dayEnd, allBreaks);
        if (proposals.length === 0) { showAlert("Sin cambios", "Tu horario ya está optimizado.", "info"); setShowAIModal(false); }
        else { setAiProposals(proposals); setAiStep('proposal'); }
    } catch (e) { showAlert("Error", "No se pudo conectar con la IA.", "error"); }
    setIsProcessingAI(false);
  };

  const handleApplyProposal = async () => {
    setIsProcessingAI(true);
    try { await api.applyOptimization(aiProposals); await loadTasks(); setShowAIModal(false); showAlert("¡Éxito!", "Día reorganizado.", "success"); }
    catch (e: any) { showAlert("Error", e.message || "Fallo al guardar.", "error"); }
    setIsProcessingAI(false);
  };

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => setAlertConfig({ isOpen: true, title, message, type });
  const showConfirm = (title: string, message: string, onConfirm: () => void) => setConfirmConfig({ isOpen: true, title, message, onConfirm });
  const closeModals = () => { setAlertConfig(p => ({ ...p, isOpen: false })); setConfirmConfig(p => ({ ...p, isOpen: false })); };

  const generateCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', type: 'study', priority: 'medium', date: selectedDate, start_time: '09:00', end_time: '10:00', is_fixed: false, email_reminder: true, repeat_weekly: false });
    setShowForm(true);
  };

  const openEditForm = (task: Task) => {
    setEditingId(task.id);
    setFormData({ title: task.title, description: task.description || '', type: task.type, priority: task.priority, date: task.date, start_time: task.start_time, end_time: task.end_time, is_fixed: task.is_fixed, email_reminder: task.email_reminder, repeat_weekly: task.repeat_weekly });
    setShowForm(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones mejoradas
    if (!formData.title.trim()) {
      showAlert("Campo requerido", "El título es obligatorio", "error");
      return;
    }

    const start = new Date(`1970-01-01T${formData.start_time}:00`);
    const end = new Date(`1970-01-01T${formData.end_time}:00`);
    const durationMin = (end.getTime() - start.getTime()) / 60000;
    
    if (durationMin <= 0) { 
      showAlert("Error horario", "La hora de fin debe ser posterior a la de inicio. Revisa los horarios e inténtalo de nuevo.", "error"); 
      return; 
    }
    
    // Validación Fecha Pasada
    const now = new Date();
    const taskDateTime = new Date(`${formData.date}T${formData.start_time}:00`);
    if (taskDateTime < now) { 
      showAlert("Fecha no válida", "No puedes programar actividades en el pasado. Selecciona una fecha futura.", "error"); 
      return; 
    }

    const taskPayload: any = { ...formData, duration: durationMin, completed: false };
    
    setIsSaving(true);
    try { 
      if (editingId) await api.updateTask(editingId, taskPayload); 
      else await api.createTask(taskPayload); 
      await loadTasks(); 
      setShowForm(false); 
      showAlert("¡Guardado!", editingId ? "Tarea actualizada correctamente" : "Nueva tarea creada", "success");
    } catch (error: any) { 
      showAlert("Error al guardar", error.message || "No se pudo conectar con el servidor. Verifica tu conexión.", "error"); 
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRequest = (id: number) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    // Implementar undo
    const newTasks = tasks.filter(t => t.id !== id);
    setTasks(newTasks);
    
    const timeoutId = setTimeout(async () => {
      await api.deleteTask(id);
      setUndoTask(null);
    }, 5000);

    setUndoTask({ task: taskToDelete, timeoutId });
    showAlert("Tarea eliminada", "Tienes 5 segundos para deshacer", "info");
  };

  const handleUndo = () => {
    if (undoTask) {
      clearTimeout(undoTask.timeoutId);
      setTasks(prev => [...prev, undoTask.task].sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setUndoTask(null);
      showAlert("Deshecho", "Tarea restaurada", "success");
    }
  };
  const toggleComplete = async (task: Task) => { setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t)); await api.updateTask(task.id, { completed: !task.completed }); };
  const requestNotificationPermission = () => { Notification.requestPermission().then((p) => { if (p === "granted") { setUserSettings(prev => ({ ...prev, notificationsEnabled: true })); showAlert("¡Activado!", "Avisos activados.", "success"); }}); };

  // Helper: Obtener icono por tipo de tarea
  const getTaskIcon = (type: TaskType) => {
    const icons = {
      study: BookOpen,
      class: GraduationCap,
      personal: User,
      break: Coffee
    };
    return icons[type] || BookOpen;
  };

  // Helper: Validar horarios al cambiar
  const handleSettingsChange = (field: string, value: string) => {
    const newSettings = { ...userSettings, [field]: value };
    setUserSettings(newSettings);
    
    // Validar después de un pequeño delay para evitar alertas mientras escribe
    setTimeout(() => validateBlockedHours(), 500);
  };

  const ToggleSwitch = ({ label, subLabel, checked, onChange, name }: any) => (
    <div className="flex items-center justify-between py-3">
      <div><span className="block text-sm font-medium text-gray-900">{label}</span>{subLabel && <p className="text-xs text-gray-500 mt-0.5">{subLabel}</p>}</div>
      <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div></label>
    </div>
  );

  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4"><div className={`p-3 rounded-xl ${color} text-white`}><Icon size={20} /></div><div><p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p><p className="text-2xl font-bold text-gray-900">{value}</p></div></div>
  );

  const dayTasks = tasks.filter(t => t.date === selectedDate).sort((a,b) => a.start_time.localeCompare(b.start_time));
  const completedCount = dayTasks.filter(t => t.completed).length;

  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      
      <aside className={`md:w-[400px] bg-white border-r border-gray-200 flex flex-col z-20 flex-shrink-0 transition-all duration-300 ${view === 'calendar' ? 'flex' : 'hidden md:flex'} h-full`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="bg-blue-600 p-2 rounded-lg"><Layout className="text-white" size={24} /></div><span className="text-xl font-bold tracking-tight text-gray-900">OpoCalendar</span></div>
            <button onClick={() => setView('settings')} className="hidden md:flex p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" aria-label="Abrir configuración"><Settings size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="flex justify-between items-center mb-6"><button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Mes anterior"><ChevronLeft size={20}/></button><h2 className="text-lg font-bold capitalize text-gray-800">{format(currentMonth, 'MMMM yyyy', { locale: es })}</h2><button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Mes siguiente"><ChevronRight size={20}/></button></div>
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <span key={d} className="text-xs font-bold text-gray-400">{d}</span>)}</div>
            <div className="grid grid-cols-7 gap-2">
                {generateCalendarDays().map((day) => {
                    const dayString = format(day, 'yyyy-MM-dd');
                    const isSelected = dayString === selectedDate;
                    const isMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());
                    const hasTasks = tasks.filter(t => t.date === dayString);
                    return (
                        <button key={day.toString()} onClick={() => { setSelectedDate(dayString); if (window.innerWidth < 768) setView('day'); }} className={`aspect-square rounded-xl flex flex-col items-center justify-center relative ${isMonth ? 'text-gray-700' : 'text-gray-300'} ${isSelected ? 'bg-blue-600 text-white shadow-lg' : ''} ${!isSelected && isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}`}>
                            <span className="text-sm font-bold z-10">{format(day, 'd')}</span>
                            <div className="flex gap-0.5 mt-1 h-1">{hasTasks.slice(0,3).map(t => <div key={t.id} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/70' : 'bg-blue-500'}`}/>)}</div>
                        </button>
                    );
                })}
            </div>
            <div className="mt-8 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2" title="La IA respetará estos horarios al reorganizar tareas"><Clock size={14}/> Horarios Bloqueados</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1.5" title="Tu horario activo del día">⏰ Disponibilidad Diaria</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="block text-[9px] text-gray-400 mb-1">Inicio</label><input type="time" value={userSettings.dayStart} onChange={e => handleSettingsChange('dayStart', e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none" title="Hora en que te levantas" /></div>
                            <div><label className="block text-[9px] text-gray-400 mb-1">Fin</label><input type="time" value={userSettings.dayEnd} onChange={e => handleSettingsChange('dayEnd', e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none" title="Hora en que te acuestas" /></div>
                        </div>
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                        <label className="block text-[10px] font-bold text-gray-500 mb-1.5" title="No se programarán tareas durante la comida">🍽️ Hora de Comida</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="block text-[9px] text-gray-400 mb-1">Inicio</label><input type="time" value={userSettings.lunchStart} onChange={e => handleSettingsChange('lunchStart', e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none" /></div>
                            <div><label className="block text-[9px] text-gray-400 mb-1">Fin</label><input type="time" value={userSettings.lunchEnd} onChange={e => handleSettingsChange('lunchEnd', e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none" /></div>
                        </div>
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                        <label className="block text-[10px] font-bold text-gray-500 mb-1.5" title="No se programarán tareas durante la cena">🌙 Hora de Cena</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="block text-[9px] text-gray-400 mb-1">Inicio</label><input type="time" value={userSettings.dinnerStart} onChange={e => handleSettingsChange('dinnerStart', e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none" /></div>
                            <div><label className="block text-[9px] text-gray-400 mb-1">Fin</label><input type="time" value={userSettings.dinnerEnd} onChange={e => handleSettingsChange('dinnerEnd', e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none" /></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </aside>

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
                        <section className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Play size={20}/> Atajos de Teclado</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                                    <span className="text-sm text-gray-700">Nueva tarea</span>
                                    <kbd className="px-3 py-1 bg-gray-900 text-white rounded text-xs font-mono">N</kbd>
                                </div>
                                <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                                    <span className="text-sm text-gray-700">Organizar con IA</span>
                                    <kbd className="px-3 py-1 bg-gray-900 text-white rounded text-xs font-mono">I</kbd>
                                </div>
                                <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                                    <span className="text-sm text-gray-700">Cerrar modal</span>
                                    <kbd className="px-3 py-1 bg-gray-900 text-white rounded text-xs font-mono">ESC</kbd>
                                </div>
                            </div>
                        </section>
                    </div>
                 </div>
             </div>
        ) : (
            <>
                <div className="md:hidden p-4 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-2"><button onClick={() => setView('calendar')} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Volver al calendario"><ArrowLeft size={20}/></button><span className="font-bold">{format(parseISO(selectedDate), "d 'de' MMMM", { locale: es })}</span></div>
                    <button onClick={() => setView('settings')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500" aria-label="Abrir configuración"><Settings size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-12">
                    <div className="max-w-5xl mx-auto w-full space-y-8">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div><div className="mb-6"><h1 className="text-3xl font-bold text-gray-900">Hola, {userSettings.name}</h1><p className="text-gray-500">Tus objetivos de hoy.</p></div><h2 className="text-xl text-gray-600 flex items-center gap-2"><CalendarIcon size={20} /><span className="capitalize">{format(parseISO(selectedDate), "EEEE, d 'de' MMMM", { locale: es })}</span></h2></div>
                            <div className="flex gap-3">
                                <button onClick={handleOpenAI} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg flex items-center gap-2 font-semibold" title="Reorganiza automáticamente tus tareas flexibles (Atajo: I)" aria-label="Organizar tareas con IA"><Sparkles size={18} /><span className="hidden sm:inline">Organizar con IA</span></button>
                                <button onClick={openCreateForm} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 shadow-lg flex items-center gap-2 font-semibold" title="Crear nueva tarea (Atajo: N)" aria-label="Crear nueva tarea"><Plus size={18} /><span>Nueva</span></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4"><StatCard label="Actividades" value={dayTasks.length} icon={BarChart3} color="bg-blue-500" /><StatCard label="Completadas" value={completedCount} icon={CheckCircle} color="bg-green-500" /><StatCard label="Pendientes" value={dayTasks.length - completedCount} icon={Clock} color="bg-orange-500" /></div>
                        
                        {/* Botón Undo */}
                        {undoTask && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertTriangle size={20} className="text-yellow-600"/>
                              <span className="text-sm font-medium">Tarea eliminada: <strong>{undoTask.task.title}</strong></span>
                            </div>
                            <button onClick={handleUndo} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold flex items-center gap-2">
                              <Undo2 size={16}/> Deshacer
                            </button>
                          </div>
                        )}

                        <div className="space-y-4">{isLoading ? <p className="text-center text-gray-400 py-10">Cargando...</p> : dayTasks.length === 0 ? (<div className="bg-white/50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center cursor-pointer" onClick={openCreateForm}><div className="bg-gray-100 p-4 rounded-full mb-4 inline-block"><Plus size={32} /></div><h3 className="text-lg font-bold text-gray-900">Día despejado</h3><p className="text-gray-500">Añade una actividad.</p></div>) : (<div className="grid grid-cols-1 gap-4">{dayTasks.map(task => {
                          const TaskIcon = getTaskIcon(task.type);
                          return (<div key={task.id} className={`group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex gap-4 items-center ${task.completed ? 'opacity-60 bg-gray-50' : ''}`}><div className="flex flex-col items-center min-w-[4rem]"><span className="text-sm font-bold text-gray-900">{task.start_time}</span><span className="text-xs text-gray-400">{task.end_time}</span><div className={`h-8 w-0.5 mt-2 rounded-full ${task.type === 'study' ? 'bg-blue-200' : task.type === 'class' ? 'bg-red-200' : 'bg-green-200'}`}></div></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><TaskIcon size={16} className={`${task.type === 'study' ? 'text-blue-600' : task.type === 'class' ? 'text-red-600' : 'text-green-600'}`}/><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${task.type === 'study' ? 'bg-blue-50 text-blue-600' : task.type === 'class' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{task.type}</span>{task.priority === 'high' && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-orange-50 text-orange-600 flex items-center gap-1"><AlertTriangle size={10}/> Prioridad</span>}</div><h3 className={`text-lg font-bold text-gray-900 truncate ${task.completed ? 'line-through text-gray-400' : ''}`}>{task.title}</h3><p className="text-gray-500 text-sm line-clamp-1">{task.description}</p></div><div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><button onClick={() => toggleComplete(task)} className={`p-2 rounded-xl ${task.completed ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-400'}`} title="Marcar completada">{task.completed ? <CheckCircle size={20}/> : <Circle size={20} />}</button><button onClick={() => openEditForm(task)} className="p-2 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-gray-400" title="Editar tarea"><Edit2 size={20}/></button><button onClick={() => handleDeleteRequest(task.id)} className="p-2 rounded-xl hover:bg-red-50 hover:text-red-600 text-gray-400" title="Eliminar tarea"><Trash2 size={20}/></button></div></div>);
                        })}</div>)}</div>
                    </div>
                </div>
            </>
        )}
      </main>

      {showAIModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-start">
                    <div><h2 className="text-2xl font-bold flex items-center gap-2"><Sparkles size={24}/> Asistente IA</h2><p className="text-indigo-100 text-sm mt-1">{aiStep === 'questions' ? 'Configuración de la sesión' : 'Propuesta de cambios'}</p></div>
                    <button onClick={() => setShowAIModal(false)} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10"><X size={24}/></button>
                </div>
                {aiStep === 'questions' && (
                    <div className="p-6 space-y-6">
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
                            <Coffee size={20} className="text-indigo-600 mt-0.5"/>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-1">Descansos Puntuales</h3>
                                <p className="text-sm text-gray-600">Añade pausas específicas para HOY (ej: cita médica, recados). Las comidas y cena ya están configuradas en tu horario.</p>
                            </div>
                        </div>
                        <div>
                            {aiBreaks.map((brk, idx) => (
                                <div key={idx} className="flex gap-2 items-end mb-2">
                                    <div className="flex-1"><label className="text-xs font-bold text-gray-500">Inicio</label><input type="time" value={brk.start} onChange={e => updateBreak(idx, 'start', e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" aria-label={`Hora de inicio del descanso ${idx + 1}`}/></div>
                                    <div className="flex-1"><label className="text-xs font-bold text-gray-500">Fin</label><input type="time" value={brk.end} onChange={e => updateBreak(idx, 'end', e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" aria-label={`Hora de fin del descanso ${idx + 1}`}/></div>
                                    <button onClick={() => removeBreak(idx)} className="p-2.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100" title="Eliminar descanso" aria-label={`Eliminar descanso ${idx + 1}`}><Trash2 size={18}/></button>
                                </div>
                            ))}
                            <button onClick={addBreak} className="text-sm text-indigo-600 font-bold hover:underline flex items-center gap-1 mt-2"><Plus size={16}/> Añadir descanso</button>
                        </div>
                        <button onClick={handleGenerateProposal} disabled={isProcessingAI} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Generar propuesta de reorganización">
                          {isProcessingAI ? <><Loader2 size={18} className="animate-spin"/> Calculando...</> : <><Play size={18} fill="currentColor"/> Generar Propuesta</>}
                        </button>
                    </div>
                )}
                {aiStep === 'proposal' && (
                    <div className="p-0 flex flex-col h-[500px]">
                        <div className="p-4 bg-gray-50 border-b border-gray-100"><p className="text-sm text-gray-600">La IA propone mover <strong>{aiProposals.length} actividades</strong>.</p></div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {aiProposals.map((prop: any) => (
                                <div key={prop.task_id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                                    <div><h4 className="font-bold text-gray-800">{prop.title}</h4><div className="flex items-center gap-2 text-sm mt-1"><span className="text-red-400 line-through">{prop.old_start.slice(0,5)}</span><ArrowRight size={14} className="text-gray-400"/><span className="text-green-600 font-bold bg-green-50 px-1.5 rounded">{prop.new_start.slice(0,5)} - {prop.new_end.slice(0,5)}</span></div></div>
                                    <div className="bg-indigo-50 p-2 rounded-full text-indigo-600"><Sparkles size={18}/></div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-gray-100 flex gap-3"><button onClick={() => setAiStep('questions')} className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50">Volver</button><button onClick={handleApplyProposal} disabled={isProcessingAI} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg">{isProcessingAI ? 'Aplicando...' : 'Confirmar'}</button></div>
                    </div>
                )}
            </div>
        </div>
      )}

      {confirmConfig.isOpen && <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm"><Trash2 size={32} className="mx-auto mb-4 text-red-500"/><h3 className="text-xl font-bold mb-2">{confirmConfig.title}</h3><p className="mb-8 text-gray-500">{confirmConfig.message}</p><div className="flex gap-3"><button onClick={closeModals} className="flex-1 py-3 font-semibold hover:bg-gray-50 rounded-xl">Cancelar</button><button onClick={confirmConfig.onConfirm} className="flex-1 py-3 font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl">Eliminar</button></div></div></div>}
      {alertConfig.isOpen && <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm"><Sparkles size={32} className="mx-auto mb-4 text-blue-500"/><h3 className="text-xl font-bold mb-2">{alertConfig.title}</h3><p className="mb-8 text-gray-500">{alertConfig.message}</p><button onClick={closeModals} className="w-full py-3 font-bold text-white bg-gray-900 hover:bg-black rounded-xl">Entendido</button></div></div>}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100"><h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Editar' : 'Nueva'}</h2><button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Cerrar formulario"><X size={24}/></button></div>
            <form onSubmit={handleSaveTask} className="p-8 space-y-6" aria-label="Formulario de tarea">
                <div className="space-y-2"><label className="block text-sm font-bold text-gray-700" htmlFor="task-title">Título</label><input id="task-title" type="text" name="title" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.title} onChange={handleInputChange} placeholder="Ej: Estudiar Constitución" aria-required="true"/></div>
                <div className="space-y-2"><label className="block text-sm font-bold text-gray-700" htmlFor="task-description">Descripción</label><textarea id="task-description" name="description" rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.description} onChange={handleInputChange} placeholder="Detalles opcionales..." /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="block text-sm font-bold text-gray-700" htmlFor="task-type">Categoría</label><select id="task-type" name="type" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.type} onChange={handleInputChange as any} aria-label="Categoría de la tarea"><option value="study">Estudio</option><option value="class">Clase</option><option value="personal">Personal</option><option value="break">Descanso</option></select></div>
                    <div className="space-y-2"><label className="block text-sm font-bold text-gray-700" htmlFor="task-priority">Prioridad</label><select id="task-priority" name="priority" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.priority} onChange={handleInputChange as any} aria-label="Prioridad de la tarea"><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2"><label className="block text-sm font-bold text-gray-700" htmlFor="task-date">Fecha</label><input id="task-date" type="date" name="date" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.date} onChange={handleInputChange} aria-label="Fecha de la tarea" /></div>
                     <div className="space-y-2"><label className="block text-sm font-bold text-gray-700" htmlFor="task-start">Inicio</label><input id="task-start" type="time" name="start_time" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.start_time} onChange={handleInputChange} aria-label="Hora de inicio" /></div>
                     <div className="space-y-2"><label className="block text-sm font-bold text-gray-700" htmlFor="task-end">Fin</label><input id="task-end" type="time" name="end_time" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl" value={formData.end_time} onChange={handleInputChange} aria-label="Hora de fin" /></div>
                </div>
                <div className="bg-blue-50 rounded-2xl p-5 space-y-4 border border-blue-100">
                    <ToggleSwitch name="is_fixed" label="Fijo (No mover)" checked={formData.is_fixed} onChange={handleInputChange} />
                    <div className="h-px bg-blue-200/50"></div>
                    <ToggleSwitch name="email_reminder" label="Notificar email" checked={formData.email_reminder} onChange={handleInputChange} />
                    <div className="h-px bg-blue-200/50"></div>
                    <ToggleSwitch name="repeat_weekly" label="Repetir semanal" checked={formData.repeat_weekly} onChange={handleInputChange} />
                </div>
                <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isSaving ? <><Loader2 size={20} className="animate-spin"/> Guardando...</> : <><Save size={20}/> Guardar</>}
                </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpoCalendarApp;