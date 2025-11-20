import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, Trash2, X, Calendar as CalendarIcon, Clock, Save, ChevronLeft, ChevronRight, ArrowLeft, Edit2, CheckCircle, Circle, AlertTriangle, BarChart3, Layout, Settings, Bell, User, Mail } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { optimizeSchedule } from './aiScheduler';
// import { startEmailWorker } from './emailService'; // Lo integramos dentro del componente para acceder al estado
import type { Task, TaskType, Priority } from './types';

// --- HOOK PERSONALIZADO PARA PERSISTENCIA (LocalStorage) ---
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
  // --- ESTADO CON PERSISTENCIA ---
  const [tasks, setTasks] = useStickyState<Task[]>([
    { 
      id: '1', title: 'Bienvenido a OpoFlow', type: 'study', priority: 'high', 
      date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '10:00', duration: 60, 
      isFixed: true, emailReminder: true, repeatWeekly: false, completed: false 
    }
  ], 'opoflow-tasks');

  const [userSettings, setUserSettings] = useStickyState({
    name: 'Opositor',
    email: '',
    notificationsEnabled: false
  }, 'opoflow-settings');

  // --- ESTADO DE NAVEGACIÓN ---
  const [view, setView] = useState<'calendar' | 'day' | 'settings'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); 
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info'; }>({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [formData, setFormData] = useState({
    title: '', description: '', category: 'study' as TaskType, priority: 'medium' as Priority,
    date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '10:00',
    isFlexible: false, emailReminder: true, repeatWeekly: false
  });

  // --- WORKER DE NOTIFICACIONES REALES ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach(task => {
        if (!task.startTime || task.completed) return;
        
        const [hours, minutes] = task.startTime.split(':').map(Number);
        const taskDate = new Date(task.date);
        taskDate.setHours(hours, minutes, 0);

        // Comparar si es hoy y faltan 30 min
        const isSameDate = taskDate.getDate() === now.getDate() && taskDate.getMonth() === now.getMonth();
        if (!isSameDate) return;

        const diff = (taskDate.getTime() - now.getTime()) / 1000 / 60;

        // Rango de aviso (entre 29 y 30 min) para no spamear
        if (diff >= 29 && diff <= 30) {
            // 1. Notificación Navegador (PC/Móvil)
            if (userSettings.notificationsEnabled && Notification.permission === "granted") {
                new Notification(`⏳ Prepárate: ${task.title}`, {
                    body: `Tu actividad comienza en 30 minutos (${task.startTime}). ¡Ánimo!`,
                    icon: '/vite.svg'
                });
            }
            // 2. Simulación Email (Solo log)
            if (task.emailReminder && userSettings.email) {
                console.log(`📧 Enviando correo a ${userSettings.email}: Recordatorio de ${task.title}`);
            }
        }
      });
    }, 60000); // Chequear cada minuto

    return () => clearInterval(interval);
  }, [tasks, userSettings]);

  // --- HELPERS ---
  const showAlert = (title: string, message: string, type: 'success' | 'error' = 'success') => setAlertConfig({ isOpen: true, title, message, type });
  const showConfirm = (title: string, message: string, onConfirm: () => void) => setConfirmConfig({ isOpen: true, title, message, onConfirm });
  const closeModals = () => { setAlertConfig(p => ({ ...p, isOpen: false })); setConfirmConfig(p => ({ ...p, isOpen: false })); };

  const generateCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const handleOptimize = () => {
    const dayTasks = tasks.filter(t => t.date === selectedDate);
    const otherTasks = tasks.filter(t => t.date !== selectedDate);
    if (dayTasks.length === 0) { showAlert("Sin tareas", "No hay actividades hoy para organizar.", "error"); return; }
    const optimizedDayTasks = optimizeSchedule(dayTasks, '08:00', '22:00');
    setTasks([...otherTasks, ...optimizedDayTasks]);
    showAlert("¡Día Optimizado!", "Tu horario ha sido reorganizado para máxima eficiencia.", "success");
  };

  const requestNotificationPermission = () => {
    if (!("Notification" in window)) {
      showAlert("No soportado", "Tu navegador no soporta notificaciones de escritorio.", "error");
      return;
    }
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        setUserSettings(prev => ({ ...prev, notificationsEnabled: true }));
        showAlert("¡Activado!", "Te avisaremos 30 minutos antes de cada tarea.", "success");
        new Notification("OpoFlow Activado", { body: "Así se verán tus recordatorios." });
      } else {
        setUserSettings(prev => ({ ...prev, notificationsEnabled: false }));
        showAlert("Permiso denegado", "No podremos enviarte avisos si bloqueas las notificaciones.", "error");
      }
    });
  };

  // --- FORM HANDLERS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', category: 'study', priority: 'medium', date: selectedDate, startTime: '09:00', endTime: '10:00', isFlexible: false, emailReminder: true, repeatWeekly: false });
    setShowForm(true);
  };

  const openEditForm = (task: Task) => {
    setEditingId(task.id);
    setFormData({ title: task.title, description: task.description || '', category: task.type, priority: task.priority, date: task.date, startTime: task.startTime, endTime: task.endTime, isFlexible: !task.isFixed, emailReminder: task.emailReminder, repeatWeekly: task.repeatWeekly });
    setShowForm(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(`1970-01-01T${formData.startTime}:00`);
    const end = new Date(`1970-01-01T${formData.endTime}:00`);
    const durationMin = (end.getTime() - start.getTime()) / 60000;

    if (durationMin <= 0) { showAlert("Error horario", "La hora fin debe ser posterior al inicio.", "error"); return; }

    const taskPayload: Task = {
      id: editingId || Date.now().toString(),
      title: formData.title, description: formData.description, type: formData.category, priority: formData.priority,
      date: formData.date, startTime: formData.startTime, endTime: formData.endTime, duration: durationMin,
      isFixed: !formData.isFlexible, emailReminder: formData.emailReminder, repeatWeekly: formData.repeatWeekly, completed: false
    };

    setTasks(prev => editingId ? prev.map(t => t.id === editingId ? { ...taskPayload, completed: t.completed } : t) : [...prev, taskPayload]);
    setShowForm(false);
  };

  const handleDeleteRequest = (id: string) => showConfirm("¿Eliminar actividad?", "Esta acción es irreversible.", () => { setTasks(p => p.filter(t => t.id !== id)); closeModals(); });
  const toggleComplete = (id: string) => setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));

  const ToggleSwitch = ({ label, subLabel, checked, onChange, name }: any) => (
    <div className="flex items-center justify-between py-3">
      <div><span className="block text-sm font-medium text-gray-900">{label}</span>{subLabel && <p className="text-xs text-gray-500 mt-0.5">{subLabel}</p>}</div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );

  // --- COMPONENTES VISUALES ---
  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color} text-white`}><Icon size={20} /></div>
        <div><p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p><p className="text-2xl font-bold text-gray-900">{value}</p></div>
    </div>
  );

  const dayTasks = tasks.filter(t => t.date === selectedDate).sort((a,b) => a.startTime.localeCompare(b.startTime));
  const completedCount = dayTasks.filter(t => t.completed).length;

  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* SIDEBAR */}
      <aside className={`md:w-[400px] bg-white border-r border-gray-200 flex flex-col z-20 flex-shrink-0 transition-all duration-300 ${view === 'calendar' ? 'flex' : 'hidden md:flex'} h-full`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg"><Layout className="text-white" size={24} /></div>
                <span className="text-xl font-bold tracking-tight text-gray-900">OpoFlow</span>
            </div>
            {/* Botón de Ajustes (visible solo en desktop aquí, en móvil estará abajo) */}
            <button onClick={() => setView('settings')} className="hidden md:flex p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                <Settings size={20} />
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {/* CALENDARIO COMPONENTE */}
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={20}/></button>
                <h2 className="text-lg font-bold capitalize text-gray-800">{format(currentMonth, 'MMMM yyyy', { locale: es })}</h2>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={20}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <span key={d} className="text-xs font-bold text-gray-400">{d}</span>)}</div>
            <div className="grid grid-cols-7 gap-2">
                {generateCalendarDays().map((day) => {
                    const dayString = format(day, 'yyyy-MM-dd');
                    const isSelectedMonth = isSameMonth(day, currentMonth);
                    const isSelectedDay = dayString === selectedDate;
                    const tasksForDay = tasks.filter(t => t.date === dayString);
                    const isToday = isSameDay(day, new Date());
                    return (
                        <button 
                            key={day.toString()}
                            onClick={() => { setSelectedDate(dayString); if (window.innerWidth < 768) setView('day'); }}
                            className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-200 ${isSelectedMonth ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-300'} ${isSelectedDay ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700' : ''} ${!isSelectedDay && isToday ? 'ring-2 ring-blue-600 ring-inset' : ''}`}
                        >
                            <span className="text-sm font-bold z-10">{format(day, 'd')}</span>
                            <div className="flex gap-0.5 mt-1 h-1">{tasksForDay.slice(0, 3).map(t => <div key={t.id} className={`w-1 h-1 rounded-full ${isSelectedDay ? 'bg-white/70' : (t.type === 'study' ? 'bg-blue-500' : t.type === 'class' ? 'bg-red-500' : 'bg-green-500')}`} />)}</div>
                        </button>
                    );
                })}
            </div>
            <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Categorías</h3>
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Estudio</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div>Clase / Examen</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div>Personal</div>
                </div>
            </div>
        </div>
      </aside>

      {/* MAIN PANEL (Contenido Dinámico) */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300 bg-white/50 md:bg-transparent ${view === 'calendar' ? 'hidden md:flex' : 'flex'}`}>
        
        {/* VISTA DE AJUSTES (NUEVO) */}
        {view === 'settings' && (
             <div className="flex-1 p-4 md:p-12 overflow-y-auto custom-scrollbar">
                 <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
                        <button onClick={() => setView('day')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft size={24}/></button>
                        <h2 className="text-3xl font-bold text-gray-900">Configuración</h2>
                    </div>

                    <div className="space-y-8">
                        {/* Perfil */}
                        <section>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><User size={20} className="text-blue-500"/> Tu Perfil</h3>
                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Tu Nombre</label>
                                    <input 
                                        type="text" 
                                        value={userSettings.name} 
                                        onChange={e => setUserSettings({...userSettings, name: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Cómo quieres que te llamemos"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Correo Electrónico</label>
                                    <input 
                                        type="email" 
                                        value={userSettings.email} 
                                        onChange={e => setUserSettings({...userSettings, email: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="tu@email.com (Para futuras notificaciones)"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Notificaciones */}
                        <section className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                            <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2"><Bell size={20}/> Notificaciones</h3>
                            <p className="text-blue-700 mb-4 text-sm">Recibe avisos en tu móvil u ordenador 30 minutos antes de cada tarea importante.</p>
                            
                            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-blue-100">
                                <div>
                                    <span className="block font-bold text-gray-900">Avisos de escritorio/móvil</span>
                                    <span className="text-xs text-gray-500">{userSettings.notificationsEnabled ? 'Activado' : 'Desactivado'}</span>
                                </div>
                                <button 
                                    onClick={requestNotificationPermission}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${userSettings.notificationsEnabled ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                >
                                    {userSettings.notificationsEnabled ? 'Permiso Concedido' : 'Activar Avisos'}
                                </button>
                            </div>
                        </section>
                    </div>
                 </div>
             </div>
        )}

        {/* VISTA DE TAREAS (TERMINAL DIARIA) */}
        {view !== 'settings' && (
            <>
                {/* Topbar Móvil */}
                <div className="md:hidden p-4 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setView('calendar')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={20}/></button>
                        <span className="font-bold">{format(parseISO(selectedDate), "d 'de' MMMM", { locale: es })}</span>
                    </div>
                    <button onClick={() => setView('settings')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><Settings size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-12">
                    <div className="max-w-5xl mx-auto w-full space-y-8">
                        
                        {/* Header del Día */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <div className="mb-6">
                                    <h1 className="text-3xl font-bold text-gray-900">Hola, {userSettings.name || 'Opositor'}</h1>
                                    <p className="text-gray-500">Vamos a por los objetivos de hoy.</p>
                                </div>
                                <h2 className="text-xl text-gray-600 flex items-center gap-2"><CalendarIcon size={20} /><span className="capitalize">{format(parseISO(selectedDate), "EEEE, d 'de' MMMM", { locale: es })}</span></h2>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleOptimize} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 font-semibold"><Sparkles size={18} /><span className="hidden sm:inline">IA Organize</span></button>
                                <button onClick={openCreateForm} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg flex items-center gap-2 font-semibold"><Plus size={18} /><span>Nueva</span></button>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <StatCard label="Actividades" value={dayTasks.length} icon={BarChart3} color="bg-blue-500" />
                            <StatCard label="Completadas" value={completedCount} icon={CheckCircle} color="bg-green-500" />
                            <StatCard label="Pendientes" value={dayTasks.length - completedCount} icon={Clock} color="bg-orange-500" />
                        </div>

                        {/* Lista de Tareas */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Línea de tiempo</h3>
                            {dayTasks.length === 0 ? (
                                <div className="bg-white/50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center group hover:border-blue-300 transition-colors cursor-pointer" onClick={openCreateForm}>
                                    <div className="bg-gray-100 p-4 rounded-full mb-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"><Plus size={32} /></div>
                                    <h3 className="text-lg font-bold text-gray-900">Día despejado</h3><p className="text-gray-500 max-w-xs">No tienes nada programado. Haz clic para añadir tu primera actividad.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {dayTasks.map(task => (
                                        <div key={task.id} className={`group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex gap-4 items-center ${task.completed ? 'opacity-60 bg-gray-50' : ''}`}>
                                            <div className="flex flex-col items-center min-w-[4rem]"><span className="text-sm font-bold text-gray-900">{task.startTime}</span><span className="text-xs text-gray-400">{task.endTime}</span><div className={`h-8 w-0.5 mt-2 rounded-full ${task.type === 'study' ? 'bg-blue-200' : task.type === 'class' ? 'bg-red-200' : 'bg-green-200'}`}></div></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${task.type === 'study' ? 'bg-blue-50 text-blue-600' : task.type === 'class' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{task.type}</span>
                                                    {task.priority === 'high' && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-orange-50 text-orange-600 flex items-center gap-1"><AlertTriangle size={10}/> Prioridad</span>}
                                                </div>
                                                <h3 className={`text-lg font-bold text-gray-900 truncate ${task.completed ? 'line-through text-gray-400' : ''}`}>{task.title}</h3>
                                                {task.description && <p className="text-gray-500 text-sm line-clamp-1">{task.description}</p>}
                                            </div>
                                            <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => toggleComplete(task.id)} className={`p-2 rounded-xl transition-colors ${task.completed ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-400'}`}>{task.completed ? <CheckCircle size={20} fill="currentColor" className="text-green-500" /> : <Circle size={20} />}</button>
                                                <button onClick={() => openEditForm(task)} className="p-2 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-gray-400 transition-colors"><Edit2 size={20} /></button>
                                                <button onClick={() => handleDeleteRequest(task.id)} className="p-2 rounded-xl hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors"><Trash2 size={20} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </>
        )}
      </main>

      {/* MODALES DE ALERTA, CONFIRMACIÓN Y FORMULARIO (Idénticos, solo asegurando render) */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><Trash2 size={32}/></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmConfig.title}</h3>
                <p className="text-gray-500 mb-8">{confirmConfig.message}</p>
                <div className="flex gap-3"><button onClick={closeModals} className="flex-1 py-3 font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">Cancelar</button><button onClick={confirmConfig.onConfirm} className="flex-1 py-3 font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-200 transition-transform hover:scale-[1.02]">Eliminar</button></div>
            </div>
        </div>
      )}
      {alertConfig.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-2 ${alertConfig.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${alertConfig.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{alertConfig.type === 'error' ? <AlertTriangle size={32}/> : <Sparkles size={32}/>}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{alertConfig.title}</h3>
                <p className="text-gray-500 mb-8">{alertConfig.message}</p>
                <button onClick={closeModals} className="w-full py-3 font-bold text-white bg-gray-900 hover:bg-black rounded-xl shadow-lg transition-transform hover:scale-[1.02]">Entendido</button>
            </div>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100"><h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Editar Actividad' : 'Nueva Actividad'}</h2><button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24} /></button></div>
            <form onSubmit={handleSaveTask} className="p-8 space-y-6">
                <div className="space-y-2"><label className="block text-sm font-bold text-gray-700">Título</label><input type="text" name="title" required placeholder="Ej: Repaso..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" value={formData.title} onChange={handleInputChange} /></div>
                <div className="space-y-2"><label className="block text-sm font-bold text-gray-700">Descripción</label><textarea name="description" rows={3} placeholder="Notas..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none transition-all" value={formData.description} onChange={handleInputChange} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="block text-sm font-bold text-gray-700">Categoría</label><div className="relative"><select name="category" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500 outline-none" value={formData.category} onChange={handleInputChange as any}><option value="study">Estudio</option><option value="class">Clase</option><option value="personal">Personal</option><option value="break">Descanso</option></select></div></div>
                    <div className="space-y-2"><label className="block text-sm font-bold text-gray-700">Prioridad</label><div className="relative"><select name="priority" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500 outline-none" value={formData.priority} onChange={handleInputChange as any}><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select></div></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2"><label className="block text-sm font-bold text-gray-700">Fecha</label><input type="date" name="date" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.date} onChange={handleInputChange} /></div>
                     <div className="space-y-2"><label className="block text-sm font-bold text-gray-700">Inicio</label><input type="time" name="startTime" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.startTime} onChange={handleInputChange} /></div>
                     <div className="space-y-2"><label className="block text-sm font-bold text-gray-700">Fin</label><input type="time" name="endTime" className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.endTime} onChange={handleInputChange} /></div>
                </div>
                <div className="bg-blue-50 rounded-2xl p-5 space-y-4 border border-blue-100">
                    <ToggleSwitch name="isFlexible" label="Horario flexible" subLabel="Permitir que la IA mueva esta tarea" checked={formData.isFlexible} onChange={handleInputChange} />
                    <div className="h-px bg-blue-200/50"></div>
                    <ToggleSwitch name="emailReminder" label="Notificar por email" checked={formData.emailReminder} onChange={handleInputChange} />
                    <div className="h-px bg-blue-200/50"></div>
                    <ToggleSwitch name="repeatWeekly" label="Repetir cada semana" checked={formData.repeatWeekly} onChange={handleInputChange} />
                </div>
                <div className="flex gap-4 pt-2">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 transform hover:scale-[1.02]"><Save size={20} /> {editingId ? 'Guardar Cambios' : 'Crear Actividad'}</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpoFlowApp;