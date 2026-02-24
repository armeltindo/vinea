import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import { 
  Briefcase, 
  Plus, 
  Users, 
  Target, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Edit, 
  Trash2, 
  Search, 
  X, 
  Save, 
  Download, 
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Activity,
  Loader2,
  ListChecks,
  Info,
  UserPlus,
  ChevronLeft,
  Calendar,
  Timer,
  AlertCircle,
  AlertTriangle,
  UserCheck,
  Settings2,
  User,
  Baby,
  Palette,
  Flame,
  Heart,
  Coins,
  GraduationCap,
  Zap,
  Shield,
  HandHeart,
  Music,
  Mic2,
  Languages,
  Home,
  Monitor,
  Rocket,
  ArrowLeft,
  Receipt,
  UserRound,
  StickyNote,
  Filter,
  CircleDashed,
  RefreshCw,
  Repeat
} from 'lucide-react';
import { analyzePageData } from '../lib/gemini';
import { formatCurrency, DEPARTMENTS as CONST_DEPARTMENTS } from '../constants';
import { DepartmentInfo, DepartmentActivity, ActivityStatus, Member, Department, ActivityRecurrence } from '../types';
import { cn, generateId, formatFirstName, getInitials } from '../utils';
import { getDepartmentsInfo, upsertDepartmentInfo, deleteDepartmentInfo, getDepartmentActivities, createDepartmentActivity, updateDepartmentActivity, deleteDepartmentActivity, getMembers, getChurchSettings } from '../lib/db';

const formatToUIDate = (isoDate: string | undefined) => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
};

/**
 * Ajoute une période à une date ISO pour calculer la prochaine occurrence
 */
const calculateNextDeadline = (currentDate: string, recurrence: ActivityRecurrence): string => {
  const date = new Date(currentDate);
  if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0];

  switch (recurrence) {
    case 'Quotidienne':
      date.setDate(date.getDate() + 1);
      break;
    case 'Hebdomadaire':
      date.setDate(date.getDate() + 7);
      break;
    case 'Mensuelle':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'Trimestrielle':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'Semestrielle':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'Annuelle':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return currentDate;
  }
  return date.toISOString().split('T')[0];
};

/**
 * Calcule la différence de jours entre aujourd'hui et une date cible
 */
const getRelativeDays = (dateStr: string) => {
  if (!dateStr) return null;
  
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  targetDate.setHours(0, 0, 0, 0);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

const getDepartmentIcon = (name: string, size = 20) => {
  const n = name.toLowerCase();
  if (n.includes('accueil')) return <Users size={size} />;
  if (n.includes('enfants')) return <Baby size={size} />;
  if (n.includes('entretien')) return <Palette size={size} />;
  if (n.includes('évangélisation')) return <Flame size={size} />;
  if (n.includes('femmes')) return <Heart size={size} />;
  if (n.includes('finance')) return <Coins size={size} />;
  if (n.includes('théologique')) return <GraduationCap size={size} />;
  if (n.includes('orientations')) return <Zap size={size} />;
  if (n.includes('hommes')) return <Shield size={size} />;
  if (n.includes('intercession')) return <HandHeart size={size} />;
  if (n.includes('jeunes')) return <Rocket size={size} />;
  if (n.includes('louange')) return <Music size={size} />;
  if (n.includes('modération')) return <Mic2 size={size} />;
  if (n.includes('interprétation')) return <Languages size={size} />;
  if (n.includes('sociales')) return <Home size={size} />;
  if (n.includes('secrétariat') || n.includes('communication') || n.includes('médias')) return <Monitor size={size} />;
  return <Briefcase size={size} />;
};

const RECURRENCE_OPTIONS: ActivityRecurrence[] = [
  'Ponctuelle', 'Quotidienne', 'Hebdomadaire', 'Mensuelle', 'Trimestrielle', 'Semestrielle', 'Annuelle'
];

const Planning: React.FC = () => {
  const [churchName, setChurchName] = useState('Vinea');
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [activities, setActivities] = useState<DepartmentActivity[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'Tous'>('Tous');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'deadline' | 'cost' | 'title', direction: 'asc' | 'desc' }>({ key: 'deadline', direction: 'asc' });
  const [activeView, setActiveView] = useState<'depts' | 'planning'>('planning');
  
  const currentYearStr = new Date().getFullYear().toString();

  const [isDeptFormOpen, setIsDeptFormOpen] = useState(false);
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [isDeleteDeptConfirmOpen, setIsDeleteDeptConfirmOpen] = useState(false);
  const [isDeleteActivityConfirmOpen, setIsDeleteActivityConfirmOpen] = useState(false);
  const [deptToDeleteId, setDeptToDeleteId] = useState<string | null>(null);
  const [activityToDeleteId, setActivityToDeleteId] = useState<string | null>(null);
  
  const [selectedDeptForDetails, setSelectedDeptForDetails] = useState<DepartmentInfo | null>(null);
  const [isDeptDetailsOpen, setIsDeptDetailsOpen] = useState(false);
  const [isDeptDescExpanded, setIsDeptDescExpanded] = useState(false);

  const [selectedActivityForDetails, setSelectedActivityForDetails] = useState<DepartmentActivity | null>(null);
  const [isActivityDetailsOpen, setIsActivityDetailsOpen] = useState(false);
  
  const [editingDept, setEditingDept] = useState<DepartmentInfo | null>(null);
  const [editingActivity, setEditingActivity] = useState<DepartmentActivity | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const [presidentSearch, setPresidentSearch] = useState('');
  const [responsibleSearch, setResponsibleSearch] = useState('');

  const [deptFormData, setDeptFormData] = useState<Partial<DepartmentInfo>>({
    name: '', description: '', presidentId: '', memberIds: [], status: 'Actif', color: '#4f46e5'
  });
  const [activityFormData, setActivityFormData] = useState<Partial<DepartmentActivity>>({
    title: '', deptId: '', responsibleId: '', associateName: '', cost: 0, deadline: '', status: ActivityStatus.PLANIFIEE, observations: '', recurrence: 'Ponctuelle'
  });

  useEffect(() => {
    const load = async () => {
      const [depts, acts, mems, settings] = await Promise.all([
        getDepartmentsInfo(),
        getDepartmentActivities(),
        getMembers(),
        getChurchSettings(),
      ]);

      // Si aucun département en DB, initialiser depuis les constantes
      if (depts.length === 0) {
        const defaultDepts: DepartmentInfo[] = CONST_DEPARTMENTS.map(name => ({
          id: generateId(),
          name,
          description: 'Département à configurer.',
          presidentId: '',
          memberIds: [],
          status: 'Actif',
          color: '#4f46e5'
        }));
        setDepartments(defaultDepts);
      } else {
        setDepartments(depts);
      }

      setActivities(acts);
      setMembers(mems);
      if (settings?.name) setChurchName(settings.name);
    };
    load();
  }, []);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    activities.forEach(a => {
      const dateStr = a.deadline || a.createdAt;
      if (dateStr) {
        const year = new Date(dateStr).getFullYear().toString();
        yearsSet.add(year);
      }
    });
    if (yearsSet.size === 0) yearsSet.add(currentYearStr);
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [activities, currentYearStr]);

  const [selectedYear, setSelectedYear] = useState<string>(availableYears[0] || currentYearStr);

  const filteredByYearActivities = useMemo(() => {
    return activities.filter(a => {
      const activityYear = new Date(a.deadline || a.createdAt).getFullYear();
      const selectedYearNum = parseInt(selectedYear);

      if (a.recurrence && a.recurrence !== 'Ponctuelle') {
        return selectedYearNum >= activityYear;
      }
      
      return activityYear === selectedYearNum;
    });
  }, [activities, selectedYear]);

  const stats = useMemo(() => ({
    totalDepts: departments.length,
    totalActivities: filteredByYearActivities.length,
    realizedCount: filteredByYearActivities.filter(a => a.status === ActivityStatus.REALISEE).length,
    totalCost: filteredByYearActivities.reduce((sum, a) => sum + (a.cost || 0), 0),
    realizationRate: filteredByYearActivities.length > 0 ? Math.round((filteredByYearActivities.filter(a => a.status === ActivityStatus.REALISEE).length / filteredByYearActivities.length) * 100) : 0
  }), [filteredByYearActivities, departments]);

  const getMemberNameFormatted = (id: string) => {
    if (!id) return 'Non assigné';
    const member = members.find(m => m.id === id);
    if (!member) return 'Inconnu'; 
    return `${formatFirstName(member.firstName)} ${member.lastName.toUpperCase()}`;
  };

  const filteredActivities = useMemo(() => {
    let result = filteredByYearActivities.filter(a => {
      const dept = departments.find(d => d.id === a.deptId);
      const search = searchTerm.toLowerCase();
      const responsibleName = getMemberNameFormatted(a.responsibleId).toLowerCase();
      const matchesSearch = a.title.toLowerCase().includes(search) || responsibleName.includes(search) || (dept?.name || '').toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'Tous' || a.status === statusFilter;
      const matchesDept = !selectedDeptId || a.deptId === selectedDeptId;
      return matchesSearch && matchesStatus && matchesDept;
    });
    return result.sort((a, b) => {
      let aVal: any = a[sortConfig.key] || '';
      let bVal: any = b[sortConfig.key] || '';
      if (sortConfig.key === 'deadline') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredByYearActivities, searchTerm, statusFilter, selectedDeptId, sortConfig, departments, members]);

  const handleSort = (key: 'deadline' | 'cost' | 'title') => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzePageData("Planning Stratégique", { selectedYear, departments, activities: filteredByYearActivities, stats });
    setAnalysis(result || null);
    setIsAnalyzing(false);
  };

  const handleRealizeOccurrence = (activity: DepartmentActivity) => {
    setIsSubmitting(true);
    setTimeout(() => {
      const todayIso = new Date().toISOString().split('T')[0];
      let updatedActivities: DepartmentActivity[];

      if (activity.recurrence === 'Ponctuelle') {
        updatedActivities = activities.map(a => 
          a.id === activity.id ? { ...a, status: ActivityStatus.REALISEE, lastRealizedAt: todayIso } : a
        );
      } else {
        // Logique récurrente : on calcule la prochaine date et on remet en "Planifiée"
        const nextDate = calculateNextDeadline(activity.deadline || todayIso, activity.recurrence!);
        updatedActivities = activities.map(a => 
          a.id === activity.id ? { ...a, deadline: nextDate, status: ActivityStatus.PLANIFIEE, lastRealizedAt: todayIso } : a
        );
      }

      setActivities(updatedActivities);
      const updatedActivity = updatedActivities.find(a => a.id === activity.id);
      if (updatedActivity) {
        setSelectedActivityForDetails(updatedActivity);
        updateDepartmentActivity(activity.id, { status: updatedActivity.status, deadline: updatedActivity.deadline, lastRealizedAt: updatedActivity.lastRealizedAt } as any);
      }
      setIsSubmitting(false);
    }, 600);
  };

  const saveDept = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const deptData = { ...deptFormData as DepartmentInfo };
    if (!editingDept) {
      deptData.id = generateId();
    }
    setTimeout(() => {
      if (editingDept) {
        setDepartments(prev => prev.map(d => d.id === editingDept.id ? deptData : d));
      } else {
        setDepartments(prev => [deptData, ...prev]);
      }
      upsertDepartmentInfo(deptData);
      setIsDeptFormOpen(false);
      setEditingDept(null);
      setIsSubmitting(false);
    }, 800);
  };

  const confirmDeleteDept = () => {
    if (deptToDeleteId) {
      setDepartments(prev => prev.filter(d => d.id !== deptToDeleteId));
      setActivities(prev => prev.filter(a => a.deptId !== deptToDeleteId));
      deleteDepartmentInfo(deptToDeleteId);
      setIsDeleteDeptConfirmOpen(false);
      setDeptToDeleteId(null);
    }
  };

  const confirmDeleteActivity = () => {
    if (activityToDeleteId) {
      setActivities(prev => prev.filter(a => a.id !== activityToDeleteId));
      deleteDepartmentActivity(activityToDeleteId);
      setIsDeleteActivityConfirmOpen(false);
      setActivityToDeleteId(null);
      if (selectedActivityForDetails?.id === activityToDeleteId) {
        setIsActivityDetailsOpen(false);
        setSelectedActivityForDetails(null);
      }
    }
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      if (editingActivity) {
        const updated = { ...editingActivity, ...activityFormData } as DepartmentActivity;
        setActivities(prev => prev.map(a => a.id === editingActivity.id ? updated : a));
        updateDepartmentActivity(editingActivity.id, activityFormData as Partial<DepartmentActivity>);
      } else {
        const newActivity: DepartmentActivity = { ...activityFormData as DepartmentActivity, id: generateId(), createdAt: new Date().toISOString() };
        setActivities(prev => [newActivity, ...prev]);
        createDepartmentActivity(newActivity);
      }
      setIsActivityFormOpen(false);
      setEditingActivity(null);
      setIsSubmitting(false);
    }, 800);
  };

  const handleEditDept = (dept: DepartmentInfo) => {
    setEditingDept(dept);
    setDeptFormData({ ...dept });
    const president = members.find(m => m.id === dept.presidentId);
    setPresidentSearch(president ? `${formatFirstName(president.firstName)} ${president.lastName.toUpperCase()}` : '');
    setIsDeptDetailsOpen(false);
    setIsDeptFormOpen(true);
  };

  const handleEditActivity = (activity: DepartmentActivity) => {
    setEditingActivity(activity);
    setActivityFormData({ ...activity });
    const resp = members.find(m => m.id === activity.responsibleId);
    setResponsibleSearch(resp ? `${formatFirstName(resp.firstName)} ${resp.lastName.toUpperCase()}` : activity.responsibleId);
    setIsActivityDetailsOpen(false);
    setIsActivityFormOpen(true);
  };

  const handleOpenActivityDetails = (activity: DepartmentActivity) => {
    setSelectedActivityForDetails(activity);
    setIsActivityDetailsOpen(true);
  };

  const filteredDepts = useMemo(() => {
    return departments.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || getMemberNameFormatted(d.presidentId).toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  }, [departments, searchTerm, members]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Planning Stratégique</h2>
          <p className="text-sm text-slate-500 font-medium italic">{churchName} : Coordonnez vos actions et suivez vos objectifs ministériels.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAnalyze} disabled={isAnalyzing} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-sm font-black hover:bg-indigo-100 transition-all hover:bg-indigo-100 uppercase tracking-widest disabled:opacity-50">
            <Sparkles size={16} /> {isAnalyzing ? '...' : 'Analyse IA'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit overflow-x-auto max-w-full no-scrollbar">
          {availableYears.map(year => (
            <button 
              key={year} 
              onClick={() => setSelectedYear(year)} 
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0", 
                selectedYear === year ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Départements" icon={<Briefcase size={20} className="text-indigo-600" />} className="cursor-pointer active:scale-95" onClick={() => setActiveView('depts')}>
          <div className="flex items-end justify-between"><span className="text-3xl font-black text-slate-900">{stats.totalDepts}</span></div>
        </Card>
        <Card title="Planification" icon={<Target size={20} className="text-amber-500" />} className="cursor-pointer active:scale-95" onClick={() => setActiveView('planning')}>
          <div className="flex items-end justify-between"><span className="text-3xl font-black text-slate-900">{stats.totalActivities}</span></div>
        </Card>
        <Card title="Réalisation" icon={<CheckCircle2 size={20} className="text-emerald-500" />}>
          <div className="flex items-end justify-between"><span className="text-3xl font-black text-emerald-600">{stats.realizationRate}%</span><TrendingUp size={20} className="text-emerald-500 mb-1" /></div>
        </Card>
        <Card title="Coût Global" icon={<DollarSign size={20} className="text-slate-600" />}>
          <div className="flex items-end justify-between"><span className="text-xl font-black">{formatCurrency(stats.totalCost).replace(' F CFA', '')}</span></div>
        </Card>
      </div>

      <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button onClick={() => setActiveView('planning')} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeView === 'planning' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>
            Calendrier Activités
          </button>
          <button onClick={() => setActiveView('depts')} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeView === 'depts' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>
            Structure Départements
          </button>
        </div>
      </div>

      {activeView === 'depts' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDepts.map(dept => {
            const president = members.find(m => m.id === dept.presidentId);
            return (
              <Card key={dept.id} onClick={() => { setSelectedDeptForDetails(dept); setIsDeptDetailsOpen(true); setIsDeptDescExpanded(false); }} className="group hover:border-indigo-400 border-2 transition-all p-0 overflow-hidden cursor-pointer rounded-[2.5rem]">
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                      {getDepartmentIcon(dept.name, 24)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors truncate">{dept.name}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Département {churchName}</p>
                    </div>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleEditDept(dept)} className="p-2 text-slate-400 hover:text-indigo-600 transition-all rounded-xl hover:bg-indigo-50"><Edit size={16} /></button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed italic">{dept.description}</p>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable</span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 text-[8px] font-black text-indigo-600 uppercase">
                          {president?.photoUrl ? (
                            <img src={president.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            getInitials(president?.firstName, president?.lastName)
                          )}
                        </div>
                        <p className="text-xs font-black text-slate-800 truncate uppercase">{getMemberNameFormatted(dept.presidentId)}</p>
                      </div>
                    </div>
                    <div className="space-y-1"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Effectif</span><div className="flex items-center gap-2"><Users size={14} className="text-slate-400" /><span className="text-xs font-black text-slate-800">{dept.memberIds.length} fidèles</span></div></div>
                  </div>
                  
                  <div className="pt-4" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => {
                        setActivityFormData({ status: ActivityStatus.PLANIFIEE, deptId: dept.id, recurrence: 'Ponctuelle' });
                        setEditingActivity(null);
                        setResponsibleSearch('');
                        setIsActivityFormOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                    >
                      <Plus size={14} /> Ajouter Activité
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
          <div className="p-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center opacity-40">
             <Settings2 size={32} className="text-slate-300 mb-2" />
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Géré via les paramètres</p>
          </div>
        </div>
      ) : (
        <Card className="p-0 overflow-hidden border-slate-200 shadow-xl rounded-[2.5rem] animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 bg-white border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="relative flex-1 max-w-lg w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="RECHERCHER UNE ACTIVITÉ OU UN PORTEUR..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-xs font-black uppercase tracking-widest outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                />
             </div>
             <div className="flex flex-wrap gap-3 shrink-0">
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <Briefcase size={14} />
                  </div>
                  <select 
                    value={selectedDeptId || ''} 
                    onChange={(e) => setSelectedDeptId(e.target.value || null)}
                    className="pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-300 shadow-sm cursor-pointer hover:bg-slate-50 transition-all appearance-none"
                  >
                    <option value="">Tous les départements</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={14} />
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <Filter size={14} />
                  </div>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-300 shadow-sm cursor-pointer hover:bg-slate-50 transition-all appearance-none"
                  >
                    <option value="Tous">Tous les statuts</option>
                    {Object.values(ActivityStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={14} />
                  </div>
                </div>
                
                <button 
                  onClick={() => { setActivityFormData({ status: ActivityStatus.PLANIFIEE, recurrence: 'Ponctuelle' }); setEditingActivity(null); setResponsibleSearch(''); setIsActivityFormOpen(true); }} 
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Plus size={16} /> Planifier
                </button>
             </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('title')}>
                    <div className="flex items-center gap-2">Activité {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</div>
                  </th>
                  <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Porteur de Projet</th>
                  <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] cursor-pointer hover:text-indigo-600 transition-colors text-right" onClick={() => handleSort('cost')}>
                    <div className="flex items-center justify-end gap-2">Coût {sortConfig.key === 'cost' && (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</div>
                  </th>
                  <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('deadline')}>
                    <div className="flex items-center gap-2">Échéance {sortConfig.key === 'deadline' && (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</div>
                  </th>
                  <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Statut</th>
                  <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActivities.length > 0 ? filteredActivities.map(activity => {
                  const dept = departments.find(d => d.id === activity.deptId);
                  const respMember = members.find(m => m.id === activity.responsibleId);
                  const daysRemaining = activity.deadline ? getRelativeDays(activity.deadline) : null;
                  const isRecurring = activity.recurrence && activity.recurrence !== 'Ponctuelle';

                  return (
                    <tr 
                      key={activity.id} 
                      onClick={() => handleOpenActivityDetails(activity)}
                      className="hover:bg-indigo-50/30 transition-all group cursor-pointer active:scale-[0.998]"
                    >
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
                              {getDepartmentIcon(dept?.name || '', 18)}
                           </div>
                           <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors truncate max-w-[200px]">{activity.title}</p>
                                {isRecurring && (
                                  /* Fix: Wrapped Repeat icon in a span to provide a tooltip since Lucide icons do not support the title prop directly */
                                  <span title={`Fréquence : ${activity.recurrence}`}>
                                    <Repeat size={12} className="text-indigo-500 animate-pulse" />
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{dept?.name || 'Général'}</span>
                              </div>
                           </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                           <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                              {respMember?.photoUrl ? (
                                <img src={respMember.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                respMember ? getInitials(respMember.firstName, respMember.lastName) : '??'
                              )}
                           </div>
                           <div className="min-w-0">
                              <p className="text-xs font-black text-slate-800 uppercase tracking-tighter truncate max-w-[150px]">
                                {respMember ? `${respMember.firstName} ${respMember.lastName}` : activity.responsibleId}
                              </p>
                           </div>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right font-black text-slate-900">{(activity.cost || 0).toLocaleString('fr-FR')}</td>
                      <td className="px-10 py-6">
                        <div className="space-y-1.5">
                           {activity.deadline ? (
                             <>
                               <div className="flex items-center gap-2">
                                  <Calendar size={14} className="text-indigo-400" />
                                  <span className="text-xs font-black text-slate-700">{new Date(activity.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                               </div>
                               {activity.status !== ActivityStatus.REALISEE && (
                                 <div className={cn(
                                   "text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest w-fit",
                                   daysRemaining !== null && daysRemaining < 0 ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                   daysRemaining !== null && daysRemaining === 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                   daysRemaining !== null && daysRemaining <= 7 ? "bg-amber-50 text-amber-600 border-amber-100 animate-pulse" :
                                   "bg-slate-50 text-slate-400"
                                 )}>
                                   {daysRemaining !== null && daysRemaining < 0 ? `Retard ${Math.abs(daysRemaining)}j` : 
                                    daysRemaining !== null && daysRemaining === 0 ? "Aujourd'hui" :
                                    daysRemaining !== null ? `Dans ${daysRemaining}j` : ''}
                                 </div>
                               )}
                             </>
                           ) : (
                             <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                               <RefreshCw size={10}/> {isRecurring ? activity.recurrence : '---'}
                             </span>
                           )}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border",
                          activity.status === ActivityStatus.REALISEE ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          activity.status === ActivityStatus.EN_COURS ? "bg-blue-50 text-blue-600 border-blue-100" :
                          activity.status === ActivityStatus.PLANIFIEE ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-rose-50 text-rose-600 border-rose-100"
                        )}>
                          {activity.status === ActivityStatus.REALISEE ? <CheckCircle2 size={12}/> : activity.status === ActivityStatus.EN_COURS ? <Timer size={12} className="animate-spin" /> : <Clock size={12}/>}
                          {activity.status}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleEditActivity(activity)} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm"><Edit size={16} /></button>
                          <button onClick={() => { setActivityToDeleteId(activity.id); setIsDeleteActivityConfirmOpen(true); }} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 rounded-xl shadow-sm"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="px-10 py-32 text-center opacity-30">
                       <ListChecks size={64} strokeWidth={1} className="mx-auto mb-4" />
                       <p className="text-sm font-black uppercase tracking-widest">Aucune activité enregistrée</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modale Détails Activité */}
      {isActivityDetailsOpen && selectedActivityForDetails && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsActivityDetailsOpen(false)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[3rem] overflow-hidden max-h-[90vh]">
            <div className="px-10 py-8 text-white shrink-0 relative overflow-hidden bg-amber-500">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Target size={180} />
              </div>
              <button onClick={() => setIsActivityDetailsOpen(false)} className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"><ChevronLeft size={24} /></button>
              <div className="relative z-10 space-y-2 mt-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Détail Activité</span>
                <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight">{selectedActivityForDetails.title}</h3>
                <div className="flex items-center gap-2">
                   <Briefcase size={12} />
                   <span className="text-[10px] font-black uppercase tracking-widest">{departments.find(d => d.id === selectedActivityForDetails.deptId)?.name || 'Général'}</span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2">
                   <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <UserRound size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable</p>
                      <p className="text-xs font-black text-slate-800 uppercase leading-none mt-1">{getMemberNameFormatted(selectedActivityForDetails.responsibleId)}</p>
                   </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2">
                   <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <DollarSign size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget estimé</p>
                      <p className="text-xs font-black text-slate-800 uppercase leading-none mt-1">{formatCurrency(selectedActivityForDetails.cost || 0)}</p>
                   </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2">
                   <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <Calendar size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Échéance</p>
                      <p className="text-xs font-black text-slate-800 uppercase leading-none mt-1">
                        {selectedActivityForDetails.deadline ? new Date(selectedActivityForDetails.deadline).toLocaleDateString('fr-FR') : 'Non définie'}
                      </p>
                   </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2">
                   <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Repeat size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Récurrence</p>
                      <p className="text-xs font-black text-slate-800 uppercase leading-none mt-1">{selectedActivityForDetails.recurrence || 'Ponctuelle'}</p>
                   </div>
                </div>
              </div>

              {selectedActivityForDetails.observations && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <StickyNote size={14} className="text-indigo-500" /> Observations
                   </h4>
                   <p className="text-xs text-slate-600 font-medium italic">"{selectedActivityForDetails.observations}"</p>
                </div>
              )}

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">État de l'activité</h4>
                 <div className={cn(
                   "p-4 rounded-2xl flex items-center justify-between border",
                   selectedActivityForDetails.status === ActivityStatus.REALISEE ? "bg-emerald-50 border-emerald-100" : "bg-white border-slate-100"
                 )}>
                    <div className="flex items-center gap-3">
                       <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", selectedActivityForDetails.status === ActivityStatus.REALISEE ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>
                          {selectedActivityForDetails.status === ActivityStatus.REALISEE ? <CheckCircle2 size={20} /> : <CircleDashed size={20} />}
                       </div>
                       <span className="text-sm font-black uppercase text-slate-700">{selectedActivityForDetails.status}</span>
                    </div>
                    {selectedActivityForDetails.lastRealizedAt && (
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Dernière fois : {new Date(selectedActivityForDetails.lastRealizedAt).toLocaleDateString()}</span>
                    )}
                 </div>
              </div>
            </div>
            <div className="p-10 border-t border-slate-100 bg-white flex flex-col gap-3 shrink-0">
              {selectedActivityForDetails.status !== ActivityStatus.REALISEE && (
                <button 
                  onClick={() => handleRealizeOccurrence(selectedActivityForDetails)}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  {selectedActivityForDetails.recurrence === 'Ponctuelle' ? "Marquer comme réalisée" : "Valider l'occurrence"}
                </button>
              )}
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEditActivity(selectedActivityForDetails)}
                  className="flex-1 py-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  <Edit size={16} /> Modifier
                </button>
                <button 
                  onClick={() => { setActivityToDeleteId(selectedActivityForDetails.id); setIsDeleteActivityConfirmOpen(true); }}
                  className="px-6 py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modales Formulaires et Confirmations */}
      {isDeptFormOpen && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => !isSubmitting && setIsDeptFormOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-8 text-white shrink-0">
               <h3 className="text-xl font-black uppercase tracking-tight">{editingDept ? 'Modifier Département' : 'Configuration Département'}</h3>
               <button onClick={() => setIsDeptFormOpen(false)} disabled={isSubmitting} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors text-white disabled:opacity-50"><X size={20} /></button>
            </div>
            <form onSubmit={saveDept} className="p-8 space-y-6 bg-slate-50/30 overflow-y-auto custom-scrollbar">
               <div className="space-y-4">
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission / Vision</label><textarea rows={3} value={deptFormData.description} onChange={e => setDeptFormData({...deptFormData, description: e.target.value})} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-medium resize-none shadow-sm" placeholder="Objectifs du département..." /></div>
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><UserCheck size={12} className="text-indigo-600" /> Responsable Principal</label>
                    <div className="relative group">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input 
                          type="text" 
                          placeholder="RECHERCHER UN MEMBRE..." 
                          value={presidentSearch} 
                          onChange={e => { 
                            setPresidentSearch(e.target.value); 
                            if (deptFormData.presidentId) setDeptFormData({...deptFormData, presidentId: ''}); 
                          }} 
                          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-black uppercase" 
                        />
                    </div>
                    {presidentSearch && !deptFormData.presidentId && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl custom-scrollbar">
                        {members.filter(m => `${formatFirstName(m.firstName)} ${m.lastName}`.toLowerCase().includes(presidentSearch.toLowerCase())).map(m => (
                          <button key={m.id} type="button" onClick={() => { setDeptFormData({...deptFormData, presidentId: m.id}); setPresidentSearch(`${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`); }} className="w-full text-left px-5 py-4 text-[10px] font-black uppercase hover:bg-indigo-50 flex items-center gap-4 transition-colors border-b border-slate-50 last:border-0 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 text-[8px] font-black text-slate-400 uppercase">
                               {m.photoUrl ? (
                                 <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                               ) : (
                                 getInitials(m.firstName, m.lastName)
                               )}
                            </div>
                            <span className="text-slate-700">{formatFirstName(m.firstName)} {m.lastName.toUpperCase()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
               </div>
               <div className="flex gap-3 pt-8 pb-4">
                  <button type="button" onClick={() => setIsDeptFormOpen(false)} disabled={isSubmitting} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[11px] font-black uppercase">Annuler</button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Enregistrer
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {isActivityFormOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsActivityFormOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="bg-amber-500 p-8 text-white shrink-0">
               <h3 className="text-xl font-black uppercase tracking-tight">{editingActivity ? 'Modifier' : 'Planifier'}</h3>
               <button onClick={() => setIsActivityFormOpen(false)} disabled={isSubmitting} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors text-white disabled:opacity-50"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveActivity} className="p-8 space-y-8 bg-slate-50/30 overflow-y-auto custom-scrollbar">
               <div className="space-y-6">
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Activité *</label><input type="text" required value={activityFormData.title} onChange={e => setActivityFormData({...activityFormData, title: e.target.value})} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-black shadow-sm" placeholder="Intitulé de l'action..." /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Département *</label><select required value={activityFormData.deptId} onChange={e => setActivityFormData({...activityFormData, deptId: e.target.value})} className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-[10px] font-black uppercase shadow-sm">{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut</label><select required value={activityFormData.status} onChange={e => setActivityFormData({...activityFormData, status: e.target.value as ActivityStatus})} className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-[10px] font-black uppercase shadow-sm">{Object.values(ActivityStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  </div>
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Activity size={12} className="text-amber-600" /> Responsable *</label>
                    <div className="relative group">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input type="text" required placeholder="RECHERCHER LE RESPONSABLE..." value={responsibleSearch} onChange={e => { setResponsibleSearch(e.target.value); if (!e.target.value) setActivityFormData({...activityFormData, responsibleId: ''}); }} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-black uppercase tracking-widest shadow-sm focus:border-amber-400 transition-all" />
                    </div>
                    {responsibleSearch && !activityFormData.responsibleId && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl">
                        {members.filter(m => `${formatFirstName(m.firstName)} ${m.lastName}`.toLowerCase().includes(responsibleSearch.toLowerCase())).map(m => (
                          <button key={m.id} type="button" onClick={() => { setActivityFormData({...activityFormData, responsibleId: m.id}); setResponsibleSearch(`${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`); }} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase hover:bg-amber-50 flex items-center gap-4 transition-colors border-b border-slate-50 last:border-0 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 text-[8px] font-black text-slate-400 uppercase">
                               {m.photoUrl ? (
                                 <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                               ) : (
                                 getInitials(m.firstName, m.lastName)
                               )}
                            </div>
                            <span className="text-slate-700">{formatFirstName(m.firstName)} {m.lastName.toUpperCase()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{activityFormData.recurrence !== 'Ponctuelle' ? 'Date de mise en vigueur' : 'Échéance'}</label><input type="date" value={activityFormData.deadline} onChange={(e) => setActivityFormData({...activityFormData, deadline: e.target.value})} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-[11px] font-bold shadow-sm" /></div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Récurrence</label>
                      <select 
                        value={activityFormData.recurrence || 'Ponctuelle'} 
                        onChange={e => setActivityFormData({...activityFormData, recurrence: e.target.value as any})} 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-[10px] font-black uppercase shadow-sm"
                      >
                        {RECURRENCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Coût par cycle (FCFA)</label>
                    <input 
                      type="number" 
                      value={activityFormData.cost} 
                      onChange={(e) => setActivityFormData({...activityFormData, cost: parseInt(e.target.value) || 0})} 
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-black text-indigo-600 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observations / Commentaires</label>
                    <textarea rows={3} value={activityFormData.observations} onChange={(e) => setActivityFormData({...activityFormData, observations: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-medium resize-none" placeholder="Précisez les détails..." />
                  </div>
               </div>
               <div className="flex gap-3 pt-6 pb-2">
                <button type="button" onClick={() => setIsActivityFormOpen(false)} disabled={isSubmitting} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[11px] font-black uppercase">Annuler</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-amber-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-amber-600 transition-all disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Enregistrer l'activité
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Détails Département */}
      {isDeptDetailsOpen && selectedDeptForDetails && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsDeptDetailsOpen(false)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[3rem] overflow-hidden max-h-[90vh]">
            <div className="px-10 py-8 text-white shrink-0 relative overflow-hidden bg-indigo-600">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 {getDepartmentIcon(selectedDeptForDetails.name, 180)}
              </div>
              <button onClick={() => setIsDeptDetailsOpen(false)} className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"><ChevronLeft size={24} /></button>
              <div className="relative z-10 space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{selectedDeptForDetails.name}</h3>
                <div className="text-sm font-bold text-white/90 uppercase tracking-widest leading-relaxed">
                  {selectedDeptForDetails.description.length > 80 ? (
                    <>
                      <span 
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setIsDeptDescExpanded(!isDeptDescExpanded)}
                      >
                        {isDeptDescExpanded ? selectedDeptForDetails.description : selectedDeptForDetails.description.substring(0, 80)}
                      </span>
                      {!isDeptDescExpanded && (
                        <button 
                          onClick={() => setIsDeptDescExpanded(true)}
                          className="text-indigo-200 hover:text-white ml-1 transition-colors"
                        >
                          ...
                        </button>
                      )}
                      {isDeptDescExpanded && (
                        <button 
                          onClick={() => setIsDeptDescExpanded(false)}
                          className="text-indigo-200 hover:text-white ml-2 text-[10px] font-black uppercase tracking-widest align-middle"
                        >
                          [Réduire]
                        </button>
                      )}
                    </>
                  ) : (
                    selectedDeptForDetails.description
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/30">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-3">
                 <div className="w-20 h-20 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-2xl uppercase overflow-hidden shadow-inner">
                  {members.find(m => m.id === selectedDeptForDetails.presidentId)?.photoUrl ? (
                    <img src={members.find(m => m.id === selectedDeptForDetails.presidentId)?.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(members.find(m => m.id === selectedDeptForDetails.presidentId)?.firstName, members.find(m => m.id === selectedDeptForDetails.presidentId)?.lastName)
                  )}
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable Principal</p>
                    <p className="text-lg font-black text-slate-900 uppercase">{getMemberNameFormatted(selectedDeptForDetails.presidentId)}</p>
                 </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-900 uppercase flex items-center gap-2"><Users size={18} className="text-indigo-500" /> Équipe ({selectedDeptForDetails.memberIds.length})</h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedDeptForDetails.memberIds.map(mId => {
                    const m = members.find(mem => mem.id === mId);
                    return (
                      <div key={mId} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black uppercase text-slate-400 overflow-hidden shrink-0 text-[8px]">
                             {m?.photoUrl ? (
                               <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                             ) : (
                               getInitials(m?.firstName, m?.lastName)
                             )}
                          </div>
                          <span className="text-xs font-black text-slate-800 uppercase">{m ? `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}` : '??'}</span>
                        </div>
                        {m?.type && <span className="text-[9px] font-black text-indigo-400 bg-indigo-50/50 px-2 py-0.5 rounded-lg uppercase">{m.type}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-10 border-t border-slate-100 bg-white flex flex-col gap-3 shrink-0">
              <button onClick={() => { setIsDeptDetailsOpen(false); setSelectedDeptId(selectedDeptForDetails.id); setActiveView('planning'); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Voir planning</button>
              <button onClick={() => handleEditDept(selectedDeptForDetails)} className="w-full py-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl text-[10px] font-black uppercase">Modifier</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Suppression Département */}
      {isDeleteDeptConfirmOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsDeleteDeptConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Supprimer Département ?</h3>
            <p className="text-slate-500 mt-2 text-sm italic leading-relaxed">Cette opération supprimera toutes les activités liées.</p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDeleteDept} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">Confirmer</button>
              <button onClick={() => setIsDeleteDeptConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase border border-slate-200 hide-scrollbar overflow-y-auto">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Suppression Activité */}
      {isDeleteActivityConfirmOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsDeleteActivityConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Supprimer l'Activité ?</h3>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDeleteActivity} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">Confirmer</button>
              <button onClick={() => setIsDeleteActivityConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase border border-slate-200 hover:bg-slate-100 transition-all">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Planning;