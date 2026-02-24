import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import { 
  Calendar, 
  Plus, 
  MapPin, 
  Users, 
  Sparkles, 
  ChevronRight, 
  Clock, 
  Tag, 
  TrendingUp,
  Ticket,
  Target, 
  DollarSign, 
  Search, 
  Filter, 
  X, 
  Save, 
  ArrowLeft, 
  CalendarDays, 
  Loader2, 
  Trash2, 
  Edit, 
  Receipt, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  PlusCircle, 
  Settings2, 
  Check
} from 'lucide-react';
import { analyzePageData } from '../lib/gemini';
import { formatCurrency, DEPARTMENTS } from '../constants';
import { cn, generateId } from '../utils';

interface Expense {
  id: string;
  label: string;
  amount: number;
  date: string;
}

interface Event {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  category: string;
  status: string;
  registered: number;
  target: number;
  budget: number;
  expenses: number;
  expenseList?: Expense[];
  image: string;
  description?: string;
}

interface Goal {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface TeamAssignment {
  id: string;
  dept: string;
  eventId: string;
  eventName: string;
  status: 'Confirmé' | 'En attente' | 'Prêt';
}

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>(() => {
    const saved = localStorage.getItem('vinea_events');
    return saved ? JSON.parse(saved) : [];
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('vinea_event_goals');
    return saved ? JSON.parse(saved) : [];
  });

  const [assignments, setAssignments] = useState<TeamAssignment[]>(() => {
    const saved = localStorage.getItem('vinea_event_assignments');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'upcoming' | 'archives'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // UI States
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [isAssignmentsModalOpen, setIsAssignmentsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Form States
  const [newExpense, setNewExpense] = useState({ label: '', amount: '' });
  const [newAssignment, setNewAssignment] = useState({ dept: DEPARTMENTS[0] as any, eventId: '', status: 'En attente' as const });
  const [newGoalData, setNewGoalData] = useState({ label: '', value: 0, color: 'bg-indigo-600' });

  // Persistence
  useEffect(() => {
    localStorage.setItem('vinea_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('vinea_event_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('vinea_event_assignments', JSON.stringify(assignments));
  }, [assignments]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const eventEndDate = new Date(event.endDate);
      eventEndDate.setHours(23, 59, 59, 999);
      const isUpcoming = eventEndDate >= today;
      const matchesTab = activeTab === 'upcoming' ? isUpcoming : !isUpcoming;
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          event.location.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [events, activeTab, searchTerm, today]);

  const initialFormState: Omit<Event, 'id'> = {
    title: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    location: '',
    category: 'Général',
    status: 'Programmé',
    registered: 0,
    target: 100,
    budget: 0,
    expenses: 0,
    expenseList: [],
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800',
    description: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const dataForAI = { 
      events: events,
      stats: { 
        totalTarget: events.reduce((sum, e) => sum + e.target, 0), 
        currentRegistered: events.reduce((sum, e) => sum + e.registered, 0),
        goals: goals
      }
    };
    const result = await analyzePageData("Planification des Événements", dataForAI);
    setAnalysis(result || null);
    setIsAnalyzing(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      if (editingEventId) {
        setEvents(prev => prev.map(ev => ev.id === editingEventId ? { ...ev, ...formData } : ev));
        if (selectedEvent?.id === editingEventId) {
          setSelectedEvent({ ...selectedEvent, ...formData });
        }
      } else {
        const newEvent: Event = { ...formData, id: generateId(), expenseList: [] };
        setEvents([newEvent, ...events]);
      }
      setIsFormOpen(false);
      setIsSubmitting(false);
      setEditingEventId(null);
      setFormData(initialFormState);
    }, 800);
  };

  const handleEditEvent = (event: Event) => {
    setFormData({
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      category: event.category,
      status: event.status,
      registered: event.registered,
      target: event.target,
      budget: event.budget,
      expenses: event.expenses,
      expenseList: event.expenseList || [],
      image: event.image,
      description: event.description || ''
    });
    setEditingEventId(event.id);
    setSelectedEvent(null);
    setIsFormOpen(true);
  };

  const handleOpenBudget = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setIsBudgetModalOpen(true);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !newExpense.label || !newExpense.amount) return;

    const amount = parseInt(newExpense.amount);
    const expense: Expense = {
      id: generateId(),
      label: newExpense.label,
      amount,
      date: new Date().toISOString().split('T')[0]
    };

    const updatedEvents = events.map(ev => {
      if (ev.id === selectedEvent.id) {
        const newList = [...(ev.expenseList || []), expense];
        const newTotalExpenses = newList.reduce((sum, ex) => sum + ex.amount, 0);
        const updated = { ...ev, expenseList: newList, expenses: newTotalExpenses };
        setSelectedEvent(updated);
        return updated;
      }
      return ev;
    });

    setEvents(updatedEvents);
    setNewExpense({ label: '', amount: '' });
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (!selectedEvent) return;
    const updatedEvents = events.map(ev => {
      if (ev.id === selectedEvent.id) {
        const newList = (ev.expenseList || []).filter(ex => ex.id !== expenseId);
        const newTotalExpenses = newList.reduce((sum, ex) => sum + ex.amount, 0);
        const updated = { ...ev, expenseList: newList, expenses: newTotalExpenses };
        setSelectedEvent(updated);
        return updated;
      }
      return ev;
    });
    setEvents(updatedEvents);
  };

  const handleUpdateGoalValue = (id: string, value: number) => {
    setGoals(goals.map(g => g.id === id ? { ...g, value } : g));
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalData.label.trim()) return;
    const newGoal: Goal = {
      id: generateId(),
      label: newGoalData.label.trim(),
      value: newGoalData.value,
      color: newGoalData.color
    };
    setGoals([...goals, newGoal]);
    setNewGoalData({ label: '', value: 0, color: 'bg-indigo-600' });
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const event = events.find(ev => ev.id === newAssignment.eventId);
    if (!event) return;

    const assignment: TeamAssignment = {
      id: generateId(),
      dept: newAssignment.dept,
      eventId: newAssignment.eventId,
      eventName: event.title.substring(0, 15) + (event.title.length > 15 ? '...' : ''),
      status: newAssignment.status
    };

    setAssignments([assignment, ...assignments]);
    setNewAssignment({ dept: DEPARTMENTS[0], eventId: '', status: 'En attente' });
  };

  const handleDeleteAssignment = (id: string) => {
    setAssignments(assignments.filter(a => a.id !== id));
  };

  const handleDeleteRequest = (id: string) => {
    setEventToDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (eventToDeleteId) {
      setEvents(events.filter(e => e.id !== eventToDeleteId));
      setAssignments(assignments.filter(a => a.eventId !== eventToDeleteId));
      setIsDeleteConfirmOpen(false);
      setSelectedEvent(null);
      setEventToDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Planification des Événements</h2>
          <p className="text-sm text-slate-500 font-medium italic">Vinea : Gérez vos grands rassemblements, conventions et retraites spirituelles.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || events.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-sm font-black hover:bg-indigo-100 transition-all uppercase tracking-widest disabled:opacity-50"
          >
            <Sparkles size={16} /> {isAnalyzing ? 'Analyse...' : 'Analyser l\'impact'}
          </button>
          <button 
            onClick={() => { setEditingEventId(null); setFormData(initialFormState); setIsFormOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 uppercase tracking-widest"
          >
            <Plus size={18} /> Nouvel Événement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Événements" subtitle="Année en cours" icon={<Calendar size={20} className="text-indigo-600" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black">{events.length}</span>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-widest">
              {events.filter(e => new Date(e.endDate) >= today).length} à venir
            </span>
          </div>
        </Card>
        <Card title="Inscriptions" subtitle="Remplissage global" icon={<Users size={20} className="text-indigo-600" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black">{events.reduce((sum, e) => sum + e.registered, 0)}</span>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase tracking-widest">Cumul</span>
          </div>
        </Card>
        <Card title="Engagement Budget" subtitle="Total alloué" icon={<DollarSign size={20} className="text-emerald-600" />}>
          <div className="flex items-end justify-between">
            <span className="text-xl font-black truncate">{formatCurrency(events.reduce((sum, e) => sum + e.budget, 0))}</span>
          </div>
        </Card>
        <Card title="Impact" subtitle="Objectifs annuels" icon={<Target size={20} className="text-amber-500" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black">{goals.length > 0 ? `${Math.round(goals.reduce((a, b) => a + b.value, 0) / goals.length)}%` : '--%'}</span>
            <TrendingUp size={20} className="text-amber-500 mb-1" />
          </div>
        </Card>
      </div>

      <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setActiveTab('upcoming')}
                className={cn(
                  "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'upcoming' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:text-slate-600"
                )}
              >
                À venir
              </button>
              <button 
                onClick={() => setActiveTab('archives')}
                className={cn(
                  "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'archives' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Archives
              </button>
            </div>
            <div className="flex gap-2">
               <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
                <input 
                  type="text" 
                  placeholder="Chercher..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 text-[10px] font-black uppercase tracking-widest border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 bg-white shadow-sm w-40 md:w-60" 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {filteredEvents.length > 0 ? filteredEvents.map((event) => (
              <div 
                key={event.id} 
                onClick={() => setSelectedEvent(event)}
                className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row hover:border-indigo-300 transition-all group shadow-sm cursor-pointer"
              >
                <div className="md:w-64 h-48 md:h-auto overflow-hidden relative bg-slate-100">
                  {event.image ? (
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Calendar size={48} />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black text-indigo-600 shadow-sm uppercase tracking-widest border border-white/50">
                      {event.category}
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-8 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h4 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-tight truncate">{event.title}</h4>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-1 font-bold uppercase tracking-widest">
                        <MapPin size={12} className="text-rose-500" /> {event.location}
                      </p>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap border shadow-sm",
                      event.status === 'Terminé' ? "bg-slate-50 text-slate-400 border-slate-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                    )}>
                      {event.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Période</p>
                      <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <Clock size={12} className="text-indigo-400" /> {new Date(event.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inscrits</p>
                      <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <Users size={12} className="text-indigo-400" /> {event.registered} / {event.target}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Budget</p>
                      <p className="text-xs font-black text-emerald-600">{formatCurrency(event.budget).split(' ')[0]} F</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Remplissage</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (event.registered/(event.target || 1))*100)}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black text-slate-500">{Math.round((event.registered/(event.target || 1))*100)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                      {(assignments.filter(a => a.eventId === event.id).length)} équipes affectées
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => handleOpenBudget(e, event)}
                        className="px-5 py-2 text-[10px] font-black text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-50 transition-all uppercase tracking-widest"
                      >
                        Gérer Budget
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                        className="flex items-center gap-1.5 px-5 py-2 text-[10px] font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest"
                      >
                        Voir Détails <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-24 text-center bg-white border border-dashed border-slate-200 rounded-[3rem]">
                <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-sm font-bold text-slate-400 italic">Aucun événement trouvé.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-80 space-y-6">
          <Card title="Objectifs stratégiques" icon={<Target size={18} />}>
            <div className="space-y-6">
              {goals.length > 0 ? goals.map((obj) => (
                <div key={obj.id} className="space-y-2">
                  <div className="flex justify-between items-end text-[10px] uppercase tracking-widest font-black">
                    <span className="text-slate-500 truncate max-w-[120px]">{obj.label}</span>
                    <span className="text-indigo-600">{obj.value}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-1000", obj.color)} style={{ width: `${obj.value}%` }}></div>
                  </div>
                </div>
              )) : (
                <p className="text-[10px] text-slate-300 italic text-center py-4">Aucun objectif défini</p>
              )}
            </div>
            <button 
              onClick={() => setIsGoalsModalOpen(true)}
              className="w-full mt-8 py-3 text-[10px] font-black text-indigo-600 bg-indigo-50/50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Settings2 size={14} /> Gérer les Objectifs
            </button>
          </Card>

          <Card title="Départements Mobiles" icon={<Tag size={18} />}>
            <div className="space-y-4">
              {assignments.map((item) => (
                <div key={item.id} className="flex items-start gap-4 p-3 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-100 transition-all group">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:scale-125 transition-transform"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 uppercase leading-tight tracking-tight truncate">{item.dept}</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-tighter truncate">
                      {item.eventName} • <span className="text-indigo-600">{item.status}</span>
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDeleteAssignment(item.id)}
                    className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {assignments.length === 0 && (
                <div className="py-8 text-center text-slate-300 italic text-[10px] uppercase tracking-widest">
                  Aucune équipe affectée
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsAssignmentsModalOpen(true)}
              disabled={events.length === 0}
              className="w-full mt-6 flex items-center justify-center gap-2 py-4 text-[10px] font-black text-indigo-600 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-all uppercase tracking-widest border border-indigo-100 shadow-sm disabled:opacity-50"
            >
              <Ticket size={16} /> Affecter une équipe
            </button>
          </Card>
        </div>
      </div>

      {/* Modal: Gestion des Objectifs */}
      {isGoalsModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsGoalsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-8 text-white relative shrink-0">
               <button onClick={() => setIsGoalsModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
               <h3 className="text-xl font-black uppercase tracking-tight">Objectifs Stratégiques</h3>
               <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] mt-1">Planification annuelle</p>
            </div>
            <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
               <form onSubmit={handleAddGoal} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajouter un nouvel objectif</p>
                  <input 
                    type="text" required
                    placeholder="Libellé (ex: Impact social)"
                    value={newGoalData.label}
                    onChange={(e) => setNewGoalData({...newGoalData, label: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold"
                  />
                  <div className="flex gap-2">
                    <input 
                      type="number" min="0" max="100"
                      placeholder="Valeur %"
                      value={newGoalData.value || ''}
                      onChange={(e) => setNewGoalData({...newGoalData, value: parseInt(e.target.value) || 0})}
                      className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold"
                    />
                    <select 
                      value={newGoalData.color}
                      onChange={(e) => setNewGoalData({...newGoalData, color: e.target.value})}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase"
                    >
                      <option value="bg-indigo-600">Indigo</option>
                      <option value="bg-emerald-500">Vert</option>
                      <option value="bg-amber-500">Ambre</option>
                      <option value="bg-rose-500">Rose</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                    Ajouter à la liste
                  </button>
               </form>

               <div className="space-y-4 pt-4">
                 {goals.map(goal => (
                   <div key={goal.id} className="space-y-3 p-4 border border-slate-100 rounded-2xl relative group">
                      <button 
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="flex justify-between items-center px-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{goal.label}</label>
                         <span className="text-xs font-black text-indigo-600">{goal.value}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={goal.value}
                        onChange={(e) => handleUpdateGoalValue(goal.id, parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                   </div>
                 ))}
               </div>
            </div>
            <div className="p-8 border-t border-slate-50 bg-slate-50 shrink-0">
               <button 
                onClick={() => setIsGoalsModalOpen(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl"
               >
                 Terminer la gestion
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Affectation d'équipe */}
      {isAssignmentsModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsAssignmentsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col">
            <div className="bg-indigo-600 p-8 text-white relative">
               <button onClick={() => setIsAssignmentsModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
               <h3 className="text-xl font-black uppercase tracking-tight">Affectation d'Équipes</h3>
               <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em] mt-1">Coordination logistique</p>
            </div>
            
            <form onSubmit={handleAddAssignment} className="p-8 space-y-6">
               <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Département</label>
                    <select 
                      value={newAssignment.dept}
                      onChange={(e) => setNewAssignment({...newAssignment, dept: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    >
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Événement cible</label>
                    <select 
                      required
                      value={newAssignment.eventId}
                      onChange={(e) => setNewAssignment({...newAssignment, eventId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    >
                      <option value="">Sélectionner un événement</option>
                      {events.filter(e => new Date(e.endDate) >= today).map(e => (
                        <option key={e.id} value={e.id}>{e.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut de préparation</label>
                    <select 
                      value={newAssignment.status}
                      onChange={(e) => setNewAssignment({...newAssignment, status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    >
                      <option value="En attente">En attente</option>
                      <option value="Confirmé">Confirmé</option>
                      <option value="Prêt">Prêt</option>
                    </select>
                  </div>
               </div>
               <button 
                  type="submit"
                  disabled={!newAssignment.eventId}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
               >
                 <CheckCircle2 size={16} /> Confirmer l'affectation
               </button>
            </form>

            <div className="px-8 pb-8 flex flex-col gap-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Affectations récentes</h4>
              <div className="max-h-[150px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                 {assignments.map(a => (
                   <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[9px] font-black text-slate-700 uppercase truncate max-w-[150px]">{a.dept}</span>
                      <div className="flex items-center gap-2">
                         <span className="text-[9px] font-bold text-indigo-600 uppercase">{a.status}</span>
                         <button onClick={() => handleDeleteAssignment(a.id)} className="text-slate-300 hover:text-rose-500"><X size={12} /></button>
                      </div>
                   </div>
                 ))}
                 {assignments.length === 0 && <p className="text-[9px] text-slate-300 italic text-center py-2">Aucune équipe affectée</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gestion du Budget */}
      {isBudgetModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsBudgetModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="bg-emerald-600 p-8 text-white relative shrink-0">
               <button onClick={() => setIsBudgetModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
               <h3 className="text-xl font-black uppercase tracking-tight">Gestion Budgétaire</h3>
               <p className="text-[10px] font-bold text-white/80 uppercase tracking-[0.2em] mt-1">{selectedEvent.title}</p>
            </div>
            
            <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-3 gap-4">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Budget Alloué</p>
                    <p className="text-sm font-black text-slate-900">{formatCurrency(selectedEvent.budget)}</p>
                 </div>
                 <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-center text-rose-600">
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Total Dépensé</p>
                    <p className="text-sm font-black">{formatCurrency(selectedEvent.expenses)}</p>
                 </div>
                 <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center text-emerald-600">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Solde Disponible</p>
                    <p className="text-sm font-black">{formatCurrency(selectedEvent.budget - selectedEvent.expenses)}</p>
                 </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Receipt size={14} /> Liste des dépenses
                  </h4>
                  <span className="text-[10px] font-black text-indigo-600">{selectedEvent.expenseList?.length || 0} transaction(s)</span>
                </div>
                
                <div className="space-y-2">
                  {selectedEvent.expenseList?.map(expense => (
                    <div key={expense.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-rose-100 hover:bg-rose-50/20 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                            <ArrowUpRight size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase">{expense.label}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(expense.date).toLocaleDateString('fr-FR')}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-rose-600">-{formatCurrency(expense.amount)}</span>
                          <button 
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                       </div>
                    </div>
                  ))}
                  {!selectedEvent.expenseList?.length && (
                    <div className="py-12 text-center text-slate-300 italic text-xs uppercase tracking-widest">
                       Aucune dépense enregistrée
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleAddExpense} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-4">
                 <h5 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Ajouter une dépense</h5>
                 <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="text" 
                      required
                      placeholder="Libellé (ex: Sono)"
                      value={newExpense.label}
                      onChange={(e) => setNewExpense({...newExpense, label: e.target.value})}
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold"
                    />
                    <div className="relative">
                      <input 
                        type="number" 
                        required
                        placeholder="Montant"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold pr-12"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300">FCFA</span>
                    </div>
                 </div>
                 <button 
                  type="submit"
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
                 >
                   <PlusCircle size={16} /> Enregistrer la sortie de fonds
                 </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détails Événement - Centré */}
      {selectedEvent && !isBudgetModalOpen && (
        <div className="fixed inset-0 z-[150] overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedEvent(null)} />
          <div className="relative w-full max-w-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[3rem] overflow-hidden max-h-[90vh]">
            <div className="relative h-64 shrink-0 bg-slate-200">
              {selectedEvent.image ? (
                <img src={selectedEvent.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <CalendarDays size={64} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
              <button onClick={() => setSelectedEvent(null)} className="absolute top-6 left-6 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-md">
                <ArrowLeft size={24} />
              </button>
              <div className="absolute bottom-8 left-10 right-10">
                 <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-3 inline-block">
                  {selectedEvent.category}
                 </span>
                 <h3 className="text-3xl font-black text-white uppercase leading-tight tracking-tighter">
                  {selectedEvent.title}
                 </h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <CalendarDays size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dates</p>
                      <p className="text-sm font-black text-slate-800 uppercase leading-none">
                       Du {new Date(selectedEvent.startDate).getDate()} au {new Date(selectedEvent.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                   </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                      <MapPin size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lieu</p>
                      <p className="text-sm font-black text-slate-800 uppercase leading-none">{selectedEvent.location}</p>
                   </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <AlertCircle size={14} className="text-indigo-500" /> À propos de l'événement
                </h4>
                <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                  {selectedEvent.description || "Aucune description détaillée fournie."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  onClick={() => setIsBudgetModalOpen(true)}
                  className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 cursor-pointer group hover:scale-[1.02] transition-transform"
                >
                   <div className="flex justify-between items-center mb-6">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Budget engagé</h4>
                     <DollarSign size={20} className="text-indigo-200 group-hover:rotate-12 transition-transform" />
                   </div>
                   <p className="text-3xl font-black">{formatCurrency(selectedEvent.budget)}</p>
                   <div className="mt-6 space-y-2">
                      <div className="flex justify-between text-[9px] font-black uppercase">
                        <span>Utilisé</span>
                        <span>{formatCurrency(selectedEvent.expenses)} ({Math.round((selectedEvent.expenses/(selectedEvent.budget || 1))*100 || 0)}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                         <div className="h-full bg-white transition-all duration-1000" style={{ width: `${(selectedEvent.expenses/(selectedEvent.budget || 1))*100 || 0}%` }}></div>
                      </div>
                   </div>
                </div>
                
                <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100">
                   <div className="flex justify-between items-center mb-6">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">Remplissage</h4>
                     <Users size={20} className="text-emerald-200" />
                   </div>
                   <p className="text-3xl font-black">{selectedEvent.registered} / {selectedEvent.target}</p>
                   <div className="mt-6 space-y-2">
                      <div className="flex justify-between text-[9px] font-black uppercase">
                        <span>Taux d'inscription</span>
                        <span>{Math.round((selectedEvent.registered/(selectedEvent.target || 1))*100 || 0)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                         <div className="h-full bg-white transition-all duration-1000" style={{ width: `${(selectedEvent.registered/(selectedEvent.target || 1))*100 || 0}%` }}></div>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="p-10 border-t border-slate-100 bg-white flex gap-4 shrink-0">
              <button 
                onClick={() => handleEditEvent(selectedEvent)}
                className="flex-1 py-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
              >
                <Edit size={16} /> Modifier
              </button>
              <button 
                onClick={() => handleDeleteRequest(selectedEvent.id)}
                className="px-6 py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nouvel Événement / Modification */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[170] overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !isSubmitting && setIsFormOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-8 text-white shrink-0">
              <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xl font-black uppercase tracking-tight">
                  {editingEventId ? 'Modifier l\'Événement' : 'Nouvel Événement'}
                 </h3>
                 <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={24} /></button>
              </div>
              <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Planification Vinea</p>
            </div>
            
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar bg-slate-50/30">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titre de l'événement</label>
                  <input 
                    type="text" required autoFocus
                    placeholder="Ex: Convention Impact 2024"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-300 outline-none text-sm font-black shadow-sm transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date début</label>
                    <input 
                      type="date" required
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date fin</label>
                    <input 
                      type="date" required
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Localisation</label>
                  <input 
                    type="text" required
                    placeholder="Ex: Salle Vinea"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-300 outline-none text-sm font-black shadow-sm transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catégorie</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-[10px] font-black uppercase tracking-widest"
                    >
                      <option value="Général">Général</option>
                      <option value="Jeunesse">Jeunesse</option>
                      <option value="Famille">Famille</option>
                      <option value="Musique">Musique</option>
                      <option value="Femmes">Femmes</option>
                      <option value="Évangélisation">Évangélisation</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cible inscrits</label>
                    <input 
                      type="number" required
                      value={formData.target}
                      onChange={(e) => setFormData({...formData, target: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Budget prévisionnel (FCFA)</label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={formData.budget || ''}
                    onChange={(e) => setFormData({...formData, budget: parseInt(e.target.value) || 0})}
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-300 outline-none text-sm font-black shadow-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Notes</label>
                  <textarea 
                    rows={4}
                    placeholder="Détails de l'événement..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-3xl focus:ring-4 outline-none text-sm font-medium resize-none shadow-sm transition-all"
                  />
                </div>
              </div>

              <div className="pt-8 flex gap-4 pb-4">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingEventId ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight uppercase">Supprimer ?</h3>
            <p className="text-slate-500 mt-3 text-sm font-medium leading-relaxed">Cette opération est irréversible.</p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-200">Confirmer suppression</button>
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;