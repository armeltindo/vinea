import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import { 
  Users, 
  Sparkles, 
  Calendar,
  UserX,
  Plus,
  ArrowRight,
  BarChart as BarChartIcon,
  Phone,
  MessageSquare,
  CheckCircle2,
  X,
  Send,
  Loader2,
  ClipboardList,
  Search,
  Check,
  Save,
  Clock,
  ChevronRight,
  Target,
  FileText,
  Trash2,
  Info,
  ArrowUpRight,
  Filter,
  AlertTriangle,
  AlertCircle,
  UserCheck,
  Baby,
  User as UserIcon,
  ChevronLeft,
  MessageCircle,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Activity,
  Edit,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  History as HistoryIcon,
  MessageSquareQuote,
  MoreVertical,
  UserPlus,
  ShieldCheck,
  UserRound,
  Shield,
  Zap,
  HeartPulse,
  BrainCircuit,
  MessageSquareText,
  RefreshCw,
  Copy,
  StickyNote,
  History,
  MapPin,
  TrendingDown
} from 'lucide-react';
import { analyzePageData } from '../lib/gemini';
import { 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
  Area 
} from 'recharts';
import { cn, generateId, getInitials, formatFirstName } from '../utils';
import { Member, MemberType, Visitor, OperationType, AttendanceSession, DepartmentActivity, ActivityStatus } from '../types';
import { SERVICES_LIST } from '../constants';
import { GoogleGenAI } from "@google/genai";

interface AbsentEntry {
  person: Member | Visitor;
  isVisitor: boolean;
  serviceDate: string;
  serviceType: string;
  recordId: string;
  consecutiveAbsences: number;
}

const Attendance: React.FC = () => {
  const [history, setHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('vinea_attendance_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem('vinea_members');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [visitors, setVisitors] = useState<Visitor[]>(() => {
    try {
      const saved = localStorage.getItem('vinea_visitors');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const churchName = useMemo(() => {
    const saved = localStorage.getItem('vinea_church_info');
    return saved ? JSON.parse(saved).name : 'Vinea';
  }, []);

  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('vinea_attendance_assignments_v2');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });

  const [availableServices, setAvailableServices] = useState<string[]>(SERVICES_LIST);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chartRange, setChartRange] = useState<number>(5);
  const [chartServiceFilter, setChartServiceFilter] = useState<string>('Culte de dimanche');
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'total', direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    service: availableServices[0],
    men: 0,
    women: 0,
    children: 0,
    notes: '',
    absentMembers: [] as string[]
  });

  const [formMemberSearch, setFormMemberSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isAbsentsModalOpen, setIsAbsentsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [recordToDeleteId, setRecordToDeleteId] = useState<string | null>(null);
  
  const [isAssignmentActionModalOpen, setIsAssignmentActionModalOpen] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState<AbsentEntry | null>(null);
  const [staffSearchTerm, setStaffSearchTerm] = useState('');

  const [followUpHistory, setFollowUpHistory] = useState<Record<string, any[]>>(() => {
    try {
      const saved = localStorage.getItem('vinea_attendance_followup_history');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });

  const [followUpMember, setFollowUpMember] = useState<Member | Visitor | null>(null);
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [currentNote, setCurrentNote] = useState('');
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [followUpSuccess, setFollowUpSuccess] = useState(false);
  const [absentSearchTerm, setAbsentSearchTerm] = useState('');
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);

  // New states for staff search in follow-up modal
  const [followUpStaffSearch, setFollowUpStaffSearch] = useState('');
  const [isFollowUpStaffDropdownOpen, setIsFollowUpStaffDropdownOpen] = useState(false);

  const staffMembers = useMemo(() => {
    return members
      .filter(m => [
        MemberType.PASTEUR, 
        MemberType.ASSISTANT, 
        MemberType.CO_DIRIGEANT, 
        MemberType.OUVRIER
      ].includes(m.type))
      .sort((a, b) => a.firstName.localeCompare(b.firstName)); 
  }, [members]);

  const allPeople = useMemo(() => [
    ...members.map(m => ({ ...m, isVisitor: false })),
    ...visitors.map(v => ({ ...v, isVisitor: true, type: 'Visiteur' as any, photoUrl: undefined }))
  ], [members, visitors]);

  const filteredStaff = useMemo(() => {
    return staffMembers.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(staffSearchTerm.toLowerCase())
    );
  }, [staffMembers, staffSearchTerm]);

  useEffect(() => {
    const loadData = () => {
      const savedM = localStorage.getItem('vinea_members');
      if (savedM) setMembers(JSON.parse(savedM));
      const savedV = localStorage.getItem('vinea_visitors');
      if (savedV) setVisitors(JSON.parse(savedV));
    };
    loadData();
    window.addEventListener('vinea_members_updated', loadData);
    window.addEventListener('vinea_visitors_updated', loadData);
    return () => {
      window.removeEventListener('vinea_members_updated', loadData);
      window.removeEventListener('vinea_visitors_updated', loadData);
    };
  }, []);

  useEffect(() => {
    const savedServices = localStorage.getItem('vinea_service_types');
    if (savedServices) {
      setAvailableServices(JSON.parse(savedServices));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vinea_attendance_history', JSON.stringify(history));
    window.dispatchEvent(new Event('vinea_attendance_updated'));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('vinea_attendance_followup_history', JSON.stringify(followUpHistory));
  }, [followUpHistory]);

  useEffect(() => {
    localStorage.setItem('vinea_attendance_assignments_v2', JSON.stringify(assignments));
  }, [assignments]);

  const chronortedHistory = useMemo(() => {
    return [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [history]);

  const lastService = useMemo(() => 
    chronortedHistory[0] || { id: '', total: 0, date: 'Aucun relevé', men: 0, women: 0, children: 0, service: 'N/A', absentMembers: [] }
  , [chronortedHistory]);

  const attendanceTrend = useMemo(() => {
    const previousService = chronortedHistory[1] || null;
    if (!previousService || previousService.total === 0) return null;
    const diff = lastService.total - previousService.total;
    const percent = Math.round((Math.abs(diff) / previousService.total) * 100);
    return { isUp: diff >= 0, percent };
  }, [lastService, chronortedHistory]);

  const getConsecutiveAbsences = (personId: string): number => {
    let count = 0;
    const sundayServices = chronortedHistory.filter(h => h.service === 'Culte de dimanche');
    for (const service of sundayServices) {
      if (service.absentMembers?.includes(personId)) {
        count++;
      } else {
        break;
      }
    }
    return count;
  };

  const allAbsentsList = useMemo((): AbsentEntry[] => {
    if (allPeople.length === 0) return [];
    const relevantServices = chronortedHistory.slice(0, 5);
    const entries: AbsentEntry[] = [];
    relevantServices.forEach(service => {
      if (service.absentMembers && Array.isArray(service.absentMembers)) {
        service.absentMembers.forEach((id: string) => {
          const person = allPeople.find(p => p.id === id);
          if (person) {
            entries.push({
              person,
              isVisitor: person.isVisitor,
              serviceDate: service.date,
              serviceType: service.service,
              recordId: service.id,
              consecutiveAbsences: getConsecutiveAbsences(id)
            });
          }
        });
      }
    });
    return entries;
  }, [allPeople, chronortedHistory]);

  const filteredAbsentMembers = useMemo(() => {
    return allAbsentsList.filter(entry => 
      `${entry.person.firstName} ${entry.person.lastName}`.toLowerCase().includes(absentSearchTerm.toLowerCase())
    );
  }, [allAbsentsList, absentSearchTerm]);

  const sortedAndFilteredHistory = useMemo(() => {
    let filtered = history.filter(h => 
      h.service.toLowerCase().includes(historySearchTerm.toLowerCase()) || 
      h.date.includes(historySearchTerm)
    );
    return filtered.sort((a, b) => {
      const aVal = sortConfig.key === 'date' ? new Date(a.date).getTime() : a.total;
      const bVal = sortConfig.key === 'date' ? new Date(b.date).getTime() : b.total;
      if (sortConfig.direction === 'asc') return aVal - bVal;
      return bVal - aVal;
    });
  }, [history, historySearchTerm, sortConfig]);

  const chartData = useMemo(() => {
    const filteredByService = chartServiceFilter === 'Tous les services' 
      ? [...history]
      : history.filter(h => h.service === chartServiceFilter);
      
    const data = filteredByService.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return chartRange === 0 ? data : data.slice(-chartRange);
  }, [history, chartRange, chartServiceFilter]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzePageData("Analyse des Présences & Relances", { 
      historique: chronortedHistory.slice(0, 10),
      absentsRecents: allAbsentsList.length,
      relances_effectuees: Object.values(followUpHistory).flat().length,
      taux_affectation: Math.round((Object.keys(assignments).length / (allAbsentsList.length || 1)) * 100)
    });
    setAnalysis(result || null);
    setIsAnalyzing(false);
  };

  const handleGenerateRelanceMessage = async (person: Member | Visitor, absences: number) => {
    setIsGeneratingMessage(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Rédige un message WhatsApp court, chaleureux et pastoral pour un fidèle nommé ${formatFirstName(person.firstName)} ${person.lastName.toUpperCase()} qui a manqué ${absences} services de suite à l'église ${churchName}. Le ton doit être bienveillant, exprimant que l'église pense à lui, sans être culpabilisant. Propose aussi de prier pour lui s'il a un besoin particulier. Utilise exclusivement le texte de la version Louis Segond 1910 si tu cites un verset.`,
        config: {
          systemInstruction: `Tu es un pasteur aimant et attentionné de l'église ${churchName}. Tu n'utilises que la version Louis Segond 1910 for all biblical citations.`,
        },
      });
      setGeneratedMessage(response.text || "Bonjour, nous avons remarqué votre absence et voulions simplement vous dire que vous nous manquez. Comment allez-vous ?");
    } catch (error) {
      console.error(error);
    }
    setIsGeneratingMessage(false);
  };

  const handleSort = (key: 'date' | 'total') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleOpenFollowUp = (person: Member | Visitor, date: string) => {
    setFollowUpMember(person);
    setFollowUpDate(date);
    setCurrentNote('');
    setGeneratedMessage(null);
    setFollowUpSuccess(false);
    
    // Initialize search text based on current assignment
    const assignmentKey = `${person.id}_${date}`;
    const assignedStaffId = assignments[assignmentKey];
    const assignedStaff = staffMembers.find(s => s.id === assignedStaffId);
    setFollowUpStaffSearch(assignedStaff ? `${formatFirstName(assignedStaff.firstName)} ${assignedStaff.lastName.toUpperCase()}` : '');
    setIsFollowUpStaffDropdownOpen(false);
  };

  const openAssignmentModal = (entry: AbsentEntry) => {
    setAssignmentTarget(entry);
    setStaffSearchTerm('');
    setIsAssignmentActionModalOpen(true);
  };

  const handleAssignStaff = (personId: string, date: string, staffId: string) => {
    const key = `${personId}_${date}`;
    setAssignments(prev => ({
      ...prev,
      [key]: staffId
    }));
  };

  const handleAssignStaffFromModal = (staffId: string) => {
    if (!assignmentTarget) return;
    const key = `${assignmentTarget.person.id}_${assignmentTarget.serviceDate}`;
    setAssignments(prev => ({
      ...prev,
      [key]: staffId
    }));
    setIsAssignmentActionModalOpen(false);
    setAssignmentTarget(null);
  };

  const submitFollowUp = () => {
    if (!followUpMember || !currentNote.trim()) return;
    setIsSubmittingFollowUp(true);
    
    const assignmentKey = `${followUpMember.id}_${followUpDate}`;
    const assignedStaffId = assignments[assignmentKey];
    const assignedStaff = members.find(m => m.id === assignedStaffId);
    const authorName = assignedStaff ? `${formatFirstName(assignedStaff.firstName)} ${assignedStaff.lastName.toUpperCase()}` : 'Admin';

    setTimeout(() => {
      const newEntry = {
        id: generateId(),
        date: new Date().toISOString(),
        serviceDate: followUpDate,
        note: currentNote,
        author: authorName
      };

      setFollowUpHistory(prev => {
        const history = prev[followUpMember.id] || [];
        return {
          ...prev,
          [followUpMember.id]: [newEntry, ...history]
        };
      });

      setFollowUpSuccess(true);
      setIsSubmittingFollowUp(false);
      
      setTimeout(() => {
        setFollowUpMember(null);
        setFollowUpDate('');
        setFollowUpSuccess(false);
      }, 1500);
    }, 1000);
  };

  const toggleAbsentInForm = (id: string) => {
    setAttendanceForm(prev => {
      const current = prev.absentMembers || [];
      const updated = current.includes(id) 
        ? current.filter(item => item !== id)
        : [...current, id];
      return { ...prev, absentMembers: updated };
    });
  };

  const handleAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAttendance(true);
    const total = Number(attendanceForm.men) + Number(attendanceForm.women) + Number(attendanceForm.children);
    setTimeout(() => {
      if (editingRecordId) {
        setHistory(prev => prev.map(h => h.id === editingRecordId ? { ...attendanceForm, id: editingRecordId, total } : h));
      } else {
        const newEntry = { ...attendanceForm, id: generateId(), total };
        setHistory([newEntry, ...history]);
      }
      setIsFormOpen(false);
      setEditingRecordId(null);
      setIsSubmittingAttendance(false);
      setAttendanceForm({
        date: new Date().toISOString().split('T')[0],
        service: availableServices[0],
        men: 0,
        women: 0,
        children: 0,
        notes: '',
        absentMembers: []
      });
    }, 1000);
  };

  const handleEditRecord = (record: any) => {
    setEditingRecordId(record.id);
    setAttendanceForm({
      date: record.date,
      service: record.service,
      men: record.men || 0,
      women: record.women || 0,
      children: record.children || 0,
      notes: record.notes || '',
      absentMembers: record.absentMembers || []
    });
    setIsRecordModalOpen(false);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Gestion des Présences</h2>
          <p className="text-sm text-slate-500 font-medium italic">{churchName} : Identifiez les fidèles fragiles et restaurez leur zèle.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAnalyze} disabled={isAnalyzing || history.length === 0} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-indigo-100">
            <Sparkles size={16} /> {isAnalyzing ? '...' : 'Analyse Stratégique'}
          </button>
          <button onClick={() => { setEditingRecordId(null); setIsFormOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all uppercase tracking-widest shadow-lg active:scale-95">
            <Plus size={18} /> Faire le Relevé
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Dernière Présence" subtitle={lastService.date === 'Aucun relevé' ? 'Aucune donnée' : new Date(lastService.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} icon={<Users size={20} className="text-indigo-600" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-slate-900">{lastService.total}</span>
            {attendanceTrend && (
               <span className={cn(
                "text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest",
                attendanceTrend.isUp ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
              )}>
                {attendanceTrend.isUp ? '+' : '-'}{attendanceTrend.percent}%
              </span>
            )}
          </div>
        </Card>

        <Card title="Absences Critiques" subtitle="2+ absences de suite" icon={<HeartPulse size={20} className="text-rose-600" />} className="cursor-pointer border-rose-100 hover:border-rose-300 transition-all group" onClick={() => setIsAbsentsModalOpen(true)}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-rose-600">{allAbsentsList.filter(a => a.consecutiveAbsences >= 2).length}</span>
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 group-hover:animate-pulse">
               <AlertTriangle size={20} />
            </div>
          </div>
        </Card>

        <Card title="Relance IA" subtitle="Messages suggérés" icon={<BrainCircuit size={20} className="text-indigo-600" />} className="cursor-pointer border-indigo-100 hover:border-indigo-300 transition-all group" onClick={() => setIsAbsentsModalOpen(true)}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-indigo-600">{allAbsentsList.length}</span>
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
               <ArrowRight size={20} />
            </div>
          </div>
        </Card>

        <Card title="Total Relances" subtitle="Période en cours" icon={<MessageSquareQuote size={20} className="text-emerald-600" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-emerald-600">{Object.values(followUpHistory).flat().length}</span>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
               <CheckCircle2 size={20} />
            </div>
          </div>
        </Card>
      </div>

      <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Évolution de Participation" className="lg:col-span-2" icon={<BarChartIcon size={18} />}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hommes</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-indigo-400"></div>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Femmes</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-indigo-100"></div>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enfants</span>
                </div>
             </div>
             
             <div className="flex items-center gap-2 flex-wrap">
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Filter size={12} />
                  </div>
                  <select 
                    value={chartServiceFilter}
                    onChange={(e) => setChartServiceFilter(e.target.value)}
                    className="pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm appearance-none cursor-pointer hover:bg-slate-50 transition-all min-w-[180px]"
                  >
                    <option value="Tous les services">Tous les services</option>
                    {availableServices.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronRight size={12} className="rotate-90" />
                  </div>
                </div>

                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                  {[5, 10, 0].map(val => (
                    <button 
                      key={val} 
                      onClick={() => setChartRange(val)} 
                      className={cn(
                        "px-3 py-1 text-[9px] font-black uppercase rounded-lg transition-all", 
                        chartRange === val ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {val === 0 ? 'Tout' : `${val}S`}
                    </button>
                  ))}
                </div>
             </div>
          </div>

          <div className="h-[350px] w-full mt-6 relative">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} tickFormatter={(val) => new Date(val).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <Tooltip />
                  <Bar dataKey="men" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} barSize={40} />
                  <Bar dataKey="women" stackId="a" fill="#818cf8" radius={[0, 0, 0, 0]} barSize={40} />
                  <Bar dataKey="children" stackId="a" fill="#c7d2fe" radius={[12, 12, 0, 0]} barSize={40} />
                  <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20"><BarChartIcon size={64} /><p className="text-xs font-black uppercase mt-4">Aucune donnée historique</p></div>
            )}
          </div>
        </Card>

        <Card title="Registre des Absents" icon={<ArrowRight size={18} className="text-indigo-400" />} subtitle="Registre détaillé du suivi">
           <div className="mb-4 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Réchercher un absent..." 
                value={absentSearchTerm} 
                onChange={(e) => setAbsentSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-3 py-2 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-300 transition-all shadow-sm" 
              />
           </div>
           
           <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
             {filteredAbsentMembers.length > 0 ? filteredAbsentMembers.map((entry, idx) => {
               const person = entry.person;
               const assignedStaffId = assignments[`${person.id}_${entry.serviceDate}`];
               const assignedStaff = staffMembers.find(s => s.id === assignedStaffId);
               const isHighlyCritical = entry.consecutiveAbsences >= 2;
               const hasReport = followUpHistory[person.id]?.some(h => h.serviceDate === entry.serviceDate);

               return (
                 <div key={`${person.id}-${idx}`} onClick={() => handleOpenFollowUp(person, entry.serviceDate)} className={cn("flex flex-col p-4 bg-white border rounded-2xl transition-all group cursor-pointer even:bg-slate-50/30 hover:border-indigo-300", isHighlyCritical ? "border-rose-100" : "border-slate-100", hasReport && "opacity-75 grayscale-[0.5]")}>
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase border transition-transform group-hover:scale-105 overflow-hidden", isHighlyCritical ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-slate-50 border-slate-100 text-slate-400")}>
                            {isHighlyCritical ? (
                              <AlertTriangle size={18}/>
                            ) : (person as Member).photoUrl ? (
                              <img src={(person as Member).photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(person.firstName, person.lastName)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[120px] leading-tight">
                              {formatFirstName(person.firstName)} <span className="uppercase">{person.lastName}</span>
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase truncate">Dernier : {new Date(entry.serviceDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                          </div>
                       </div>
                       <div className="flex flex-col items-end gap-1">
                          <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest", entry.consecutiveAbsences >= 2 ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500")}>
                            {entry.consecutiveAbsences}X Conséc.
                          </span>
                       </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-50">
                       <div className="flex items-center gap-1.5 min-w-0">
                          {assignedStaff ? (
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1"><ShieldCheck size={10}/> {formatFirstName(assignedStaff.firstName)}</span>
                          ) : (
                            <span className="text-[9px] font-black text-rose-400 flex items-center gap-1 italic"><UserPlus size={10}/> Non affecté</span>
                          )}
                          {hasReport && <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1"><StickyNote size={10}/> Rapport</span>}
                       </div>
                       <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); window.open(`tel:${person.phone}`); }} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-rose-600 hover:text-white transition-all"><Phone size={12}/></button>
                          <ChevronRight size={14} className="text-slate-200 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                       </div>
                    </div>
                 </div>
               );
             }) : (
               <div className="py-20 text-center opacity-30">
                 <UserCheck size={48} className="mx-auto" />
                 <p className="text-[11px] font-black uppercase mt-2">Aucun absent trouvé</p>
               </div>
             )}
           </div>
           <button onClick={() => setIsAbsentsModalOpen(true)} className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md">Voir tout le registre</button>
        </Card>
      </div>

      {/* --- TABLEAU DES PRÉSENCES --- */}
      <Card title="Historique des Relevés" icon={<HistoryIcon size={18} className="text-indigo-600" />} subtitle="Cliquez sur une ligne pour voir le détail de la séance" className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative group flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="RECHERCHER PAR CULTE OU DATE..." 
                value={historySearchTerm} 
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-[10px] font-black uppercase tracking-widest focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
              />
           </div>
           <div className="flex gap-2">
              <button onClick={() => handleSort('date')} className={cn("px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2", sortConfig.key === 'date' ? "text-indigo-600 border-indigo-200" : "text-slate-400")}>
                <Calendar size={14} /> Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
              </button>
              <button onClick={() => handleSort('total')} className={cn("px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2", sortConfig.key === 'total' ? "text-indigo-600 border-indigo-200" : "text-slate-400")}>
                <Users size={14} /> Total {sortConfig.key === 'total' && (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
              </button>
           </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar border border-slate-100 rounded-[2rem]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Service</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">H</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">F</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">E</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Total</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedAndFilteredHistory.length > 0 ? sortedAndFilteredHistory.map((record) => (
                <tr 
                  key={record.id} 
                  onClick={() => { setSelectedRecord(record); setIsRecordModalOpen(true); }}
                  className="hover:bg-indigo-50/20 transition-all group cursor-pointer active:scale-[0.998]"
                >
                  <td className="px-8 py-5">
                    <span className="text-xs font-black text-slate-700 uppercase">{new Date(record.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                       <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{record.service}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-center text-xs font-bold text-blue-600">{record.men || 0}</td>
                  <td className="px-4 py-5 text-center text-xs font-bold text-pink-600">{record.women || 0}</td>
                  <td className="px-4 py-5 text-center text-xs font-bold text-amber-600">{record.children || 0}</td>
                  <td className="px-8 py-5 text-right">
                    <span className="text-sm font-black text-slate-900">{record.total}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                       <button onClick={() => handleEditRecord(record)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit size={14}/></button>
                       <button onClick={() => { setRecordToDeleteId(record.id); setIsDeleteConfirmOpen(true); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center opacity-30">
                    <ClipboardList size={40} className="mx-auto mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Aucun relevé enregistré</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Détails du Relevé - Centré */}
      {isRecordModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsRecordModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[2.5rem] overflow-hidden max-h-[90vh]">
            <div className="px-10 py-10 bg-indigo-600 text-white shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10"><Users size={180} /></div>
              <button onClick={() => setIsRecordModalOpen(false)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white transition-colors text-white"><X size={20} /></button>
              <div className="relative z-10 space-3 mt-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Fiche de Séance</span>
                <h3 className="text-2xl font-black uppercase leading-tight tracking-tighter">{selectedRecord.service}</h3>
                <div className="flex items-center gap-3 text-indigo-100">
                  <Calendar size={14} />
                  <span className="text-xs font-bold uppercase tracking-widest">{new Date(selectedRecord.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hommes</p>
                  <p className="text-2xl font-black text-blue-600">{selectedRecord.men || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Femmes</p>
                  <p className="text-2xl font-black text-pink-600">{selectedRecord.women || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Enfants</p>
                  <p className="text-2xl font-black text-amber-500">{selectedRecord.children || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-indigo-100 shadow-sm text-center bg-indigo-50/30">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Total</p>
                  <p className="text-2xl font-black text-indigo-700">{selectedRecord.total}</p>
                </div>
              </div>

              {selectedRecord.notes && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <StickyNote size={14} className="text-indigo-500" /> Notes de séance
                  </h4>
                  <p className="text-xs text-slate-700 font-medium italic whitespace-pre-wrap">
                    "{selectedRecord.notes}"
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <UserX size={14} className="text-rose-500" /> Absences Nominatives ({selectedRecord.absentMembers?.length || 0})
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedRecord.absentMembers?.length > 0 ? selectedRecord.absentMembers.map((id: string) => {
                    const person = allPeople.find(p => p.id === id);
                    return (
                      <div key={id} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-2xl group hover:border-rose-200 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                             {person && (person as Member).photoUrl ? (
                               <img src={(person as Member).photoUrl} alt="" className="w-full h-full object-cover" />
                             ) : (
                               <UserIcon size={12} className="text-slate-300" />
                             )}
                          </div>
                          <div>
                             <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{person ? `${formatFirstName(person.firstName)} ${person.lastName.toUpperCase()}` : 'Inconnu'}</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase">{person?.type || 'Membre'}</p>
                          </div>
                        </div>
                        <button onClick={() => person && handleOpenFollowUp(person, selectedRecord.date)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-rose-600 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                           <MessageSquareQuote size={14} />
                        </button>
                      </div>
                    );
                  }) : (
                    <div className="py-8 text-center bg-white/50 border border-dashed border-slate-200 rounded-[2rem] opacity-40">
                       <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aucune absence signalée</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-white flex gap-3 shrink-0">
              <button 
                onClick={() => handleEditRecord(selectedRecord)}
                className="flex-[2] py-3.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
              >
                <Edit size={16} /> Modifier
              </button>
              <button 
                onClick={() => { setRecordToDeleteId(selectedRecord.id); setIsDeleteConfirmOpen(true); }}
                className="flex-1 py-3.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registre d'Absences Complet - Centré */}
      {isAbsentsModalOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsAbsentsModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[3rem] overflow-hidden max-h-[90vh]">
              <div className="px-10 py-12 bg-rose-600 text-white shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><UserX size={180} /></div>
                <button onClick={() => setIsAbsentsModalOpen(false)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white transition-colors text-white"><ChevronLeft size={24} /></button>
                <div className="relative z-10 space-y-4">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Soin Pastoral</span>
                  <h3 className="text-4xl font-black uppercase leading-tight tracking-tighter">Registre des Absences</h3>
                  <p className="text-xs font-bold text-rose-100 uppercase tracking-widest">{allAbsentsList.length} absences nominatives à traiter</p>
                </div>
              </div>
              <div className="p-8 bg-slate-50 border-b border-slate-100 shrink-0">
                 <div className="relative group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={18} />
                   <input type="text" placeholder="Réchercher un fidèle absent..." value={absentSearchTerm} onChange={(e) => setAbsentSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold shadow-sm focus:ring-4 focus:ring-rose-500/5 focus:border-rose-300 transition-all" />
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 space-y-6">
                {filteredAbsentMembers.length > 0 ? filteredAbsentMembers.map((entry, idx) => {
                   const person = entry.person;
                   const assignmentKey = `${person.id}_${entry.serviceDate}`;
                   const assignedId = assignments[assignmentKey];
                   const assignedStaff = staffMembers.find(s => s.id === assignedId);
                   const isCritical = entry.consecutiveAbsences >= 2;
                   const hasReport = followUpHistory[person.id]?.some(h => h.serviceDate === entry.serviceDate);
                   
                   return (
                    <div key={`${person.id}-${idx}`} className={cn("bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-5 group transition-all even:bg-slate-50/50", isCritical ? "border-rose-200" : "border-slate-100 hover:border-rose-200", hasReport && "opacity-75")}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center text-lg font-black uppercase transition-all shadow-sm shrink-0 overflow-hidden", isCritical ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-slate-50 border-slate-100 text-slate-400 group-hover:text-rose-600")}>
                                {isCritical ? (
                                  <AlertTriangle size={24} />
                                ) : (person as Member).photoUrl ? (
                                  <img src={(person as Member).photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  getInitials(person.firstName, person.lastName)
                                )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900 tracking-tight truncate">
                                {formatFirstName(person.firstName)} <span className="uppercase">{person.lastName}</span>
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                 <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                                    <Calendar size={10} /> {new Date(entry.serviceDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                 </p>
                                 <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter", isCritical ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-600")}>
                                    {entry.consecutiveAbsences} Dimanches
                                 </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => window.open(`tel:${person.phone}`)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Phone size={18} /></button>
                            <button onClick={() => handleOpenFollowUp(person, entry.serviceDate)} className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm rounded-xl">
                              <MessageSquareQuote size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-50">
                           <div className="flex items-center justify-between mb-3">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                               <UserRound size={12} className="text-indigo-500" /> Affecté à
                             </label>
                             {assignedId && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-tighter">Assigné</span>}
                           </div>
                           
                           <button 
                             onClick={() => openAssignmentModal(entry)}
                             className={cn(
                               "w-full px-5 py-4 border rounded-2xl flex items-center justify-between transition-all group/btn",
                               assignedId ? "bg-indigo-50 border-indigo-100 text-indigo-700" : "bg-white border-rose-100 text-rose-500 border-dashed hover:border-rose-300"
                             )}
                           >
                             <div className="flex items-center gap-3">
                               <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden", assignedId ? "bg-indigo-600 text-white" : "bg-rose-400")}>
                                 {assignedId ? (
                                   assignedStaff?.photoUrl ? <img src={assignedStaff.photoUrl} alt="" className="w-full h-full object-cover" /> : <ShieldCheck size={16} />
                                 ) : (
                                   <UserPlus size={16} />
                                 )}
                               </div>
                               <span className="text-xs font-black uppercase tracking-tight">
                                 {assignedStaff ? `${formatFirstName(assignedStaff.firstName)} ${assignedStaff.lastName.toUpperCase()}` : "Choisir un responsable..."}
                               </span>
                             </div>
                             <ChevronRight size={16} className={cn("transition-transform group-hover/btn:translate-x-1", assignedId ? "text-indigo-300" : "text-rose-200")} />
                           </button>
                        </div>
                    </div>
                  );
                }) : (
                  <div className="py-20 text-center opacity-30"><UserCheck size={48} className="mx-auto" /><p className="text-xs font-black uppercase">Aucun absent trouvé</p></div>
                )}
              </div>
          </div>
        </div>
      )}

      {/* Modal: Rapport de Relance & Historique */}
      {followUpMember && (
        <div className="fixed inset-0 z-[280] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !isSubmittingFollowUp && setFollowUpMember(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-8 text-white shrink-0 relative">
              <div className="absolute top-0 right-0 p-10 opacity-10">
                <ShieldCheck size={140} />
              </div>
              <div className="flex justify-between items-start mb-2 relative z-10">
                <h3 className="text-xl font-black uppercase tracking-tight">Relance des Absents</h3>
                <button onClick={() => setFollowUpMember(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={20} /></button>
              </div>
              <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest relative z-10">
                Fidèle : {formatFirstName(followUpMember.firstName)} {followUpMember.lastName.toUpperCase()} • Absence du {new Date(followUpDate).toLocaleDateString()}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-slate-50/30">
               {followUpHistory[followUpMember.id] && followUpHistory[followUpMember.id].length > 0 && (
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <HistoryIcon size={12} className="text-indigo-500" /> Historique des Échanges
                    </h4>
                    <div className="space-y-3">
                       {followUpHistory[followUpMember.id].map(report => (
                         <div key={report.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2 group hover:border-indigo-200 transition-all">
                            <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                               <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-indigo-600 uppercase">Le {new Date(report.date).toLocaleDateString()}</span>
                                  {report.serviceDate === followUpDate && <span className="text-[7px] font-black bg-rose-50 text-rose-500 px-1 rounded uppercase tracking-tighter border border-rose-100">Ciblée</span>}
                               </div>
                               <span className="text-[8px] font-bold text-slate-400 uppercase">Par : {report.author}</span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium italic leading-relaxed">"{report.note}"</p>
                         </div>
                       ))}
                    </div>
                 </div>
               )}

               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Shield size={12} className="text-indigo-500" /> Affectation Pastorale
                  </h4>
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Responsable du suivi</label>
                       {assignments[`${followUpMember.id}_${followUpDate}`] ? (
                         <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded uppercase">Assigné</span>
                       ) : (
                         <span className="text-[8px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                           <AlertCircle size={8}/> Non affecté
                         </span>
                       )}
                    </div>
                    
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400">
                        <UserRound size={16} />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Rechercher un ouvrier..." 
                        value={followUpStaffSearch}
                        onFocus={() => setIsFollowUpStaffDropdownOpen(true)}
                        onChange={(e) => {
                          setFollowUpStaffSearch(e.target.value);
                          setIsFollowUpStaffDropdownOpen(true);
                        }}
                        className={cn(
                          "w-full pl-12 pr-4 py-3.5 border rounded-2xl outline-none text-xs font-black uppercase tracking-tight transition-all",
                          assignments[`${followUpMember.id}_${followUpDate}`] ? "bg-indigo-50 border-indigo-100 text-indigo-700" : "bg-white border-rose-200 text-rose-600"
                        )}
                      />
                      {isFollowUpStaffDropdownOpen && (
                        <div className="absolute z-30 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl custom-scrollbar">
                          {staffMembers.filter(s => 
                            `${s.firstName} ${s.lastName}`.toLowerCase().includes(followUpStaffSearch.toLowerCase())
                          ).map(staff => (
                            <button 
                              key={staff.id} type="button"
                              onClick={() => { 
                                handleAssignStaff(followUpMember.id, followUpDate, staff.id); 
                                setFollowUpStaffSearch(`${formatFirstName(staff.firstName)} ${staff.lastName.toUpperCase()}`);
                                setIsFollowUpStaffDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 text-[10px] font-black uppercase hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center gap-3"
                            >
                               <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 text-[8px] font-black text-slate-500 uppercase">
                                  {staff.photoUrl ? (
                                    <img src={staff.photoUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    getInitials(staff.firstName, staff.lastName)
                                  )}
                               </div>
                               {formatFirstName(staff.firstName)} {staff.lastName.toUpperCase()}
                            </button>
                          ))}
                          {staffMembers.filter(s => 
                            `${s.firstName} ${s.lastName}`.toLowerCase().includes(followUpStaffSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase italic">Aucun résultat</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <MessageSquareText size={12} className="text-emerald-500" /> Générateur de relance IA
                    </h4>
                    <button 
                      onClick={() => handleGenerateRelanceMessage(followUpMember, getConsecutiveAbsences(followUpMember.id))}
                      disabled={isGeneratingMessage}
                      className="text-[9px] font-black text-indigo-600 uppercase hover:underline flex items-center gap-1"
                    >
                      {isGeneratingMessage ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                      {generatedMessage ? 'Régénérer' : 'Générer un brouillon'}
                    </button>
                  </div>
                  {generatedMessage ? (
                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-3xl animate-in zoom-in-95 relative group">
                      <p className="text-xs text-emerald-800 italic leading-relaxed font-medium">"{generatedMessage}"</p>
                      <button 
                        onClick={() => {
                          const url = `https://wa.me/${followUpMember.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`;
                          window.open(url, '_blank');
                        }}
                        className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase hover:text-emerald-800"
                      >
                        <Send size={10} /> Envoyer via WhatsApp
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => handleGenerateRelanceMessage(followUpMember, getConsecutiveAbsences(followUpMember.id))} className="p-5 bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all">
                      <BrainCircuit size={24} className="text-slate-300 mb-2" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Générer un message personnalisé avec Gemini</p>
                    </div>
                  )}
               </div>

               <div className="pt-6 border-t border-slate-200">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Plus size={12} className="text-indigo-600" /> Nouveau Rapport de Suivi
                  </h4>
                  <div className="space-y-4">
                    <textarea 
                      rows={4} value={currentNote} onChange={(e) => setCurrentNote(e.target.value)} 
                      disabled={followUpSuccess}
                      placeholder="Résumez l'échange : pourquoi était-il absent ? Va-t-il bien ? Quelles sont les nouvelles ?" 
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-3xl outline-none text-sm font-medium resize-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-300 transition-all shadow-sm disabled:opacity-50" 
                    />
                    <div className="flex gap-3">
                      <button onClick={() => setFollowUpMember(null)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest">Fermer</button>
                      <button 
                        onClick={submitFollowUp} 
                        disabled={isSubmittingFollowUp || !currentNote.trim() || followUpSuccess} 
                        className={cn(
                          "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center justify-center gap-2 transition-all tracking-widest",
                          followUpSuccess ? "bg-emerald-600 text-white shadow-emerald-200" : "bg-indigo-600 text-white shadow-indigo-100 disabled:opacity-50"
                        )}
                      >
                        {isSubmittingFollowUp ? <Loader2 size={16} className="animate-spin" /> : followUpSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />} 
                        {followUpSuccess ? 'Rapport Enregistré' : 'Valider le rapport'}
                      </button>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Affectation Responsable Directe */}
      {isAssignmentActionModalOpen && assignmentTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAssignmentActionModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[70vh]">
            <div className="bg-slate-900 p-8 text-white shrink-0 relative">
              <button onClick={() => setIsAssignmentActionModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={20} /></button>
              <h3 className="text-xl font-black uppercase tracking-tight">Affectation Suivi</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {formatFirstName(assignmentTarget.person.firstName)} {assignmentTarget.person.lastName.toUpperCase()}
              </p>
            </div>
            <div className="p-6 bg-slate-50 border-b border-slate-200 shrink-0">
               <div className="relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                 <input type="text" autoFocus placeholder="Chercher un ouvrier..." value={staffSearchTerm} onChange={(e) => setStaffSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-bold shadow-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-300 transition-all" />
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar bg-slate-50/30">
               {filteredStaff.map(staff => (
                 <button key={staff.id} onClick={() => handleAssignStaffFromModal(staff.id)} className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 group transition-all shadow-sm">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase overflow-hidden">
                        {staff.photoUrl ? (
                          <img src={staff.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(staff.firstName, staff.lastName)
                        )}
                     </div>
                     <span className="text-xs font-black text-slate-900">
                        {formatFirstName(staff.firstName)} <span className="uppercase">{staff.lastName}</span>
                     </span>
                   </div>
                   <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                 </button>
               ))}
               {filteredStaff.length === 0 && (
                 <div className="py-8 text-center text-slate-300 italic text-xs uppercase tracking-widest">Aucun membre du personnel trouvé</div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Formulaire Relevé de Présence - Centré */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 overflow-hidden">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => !isSubmittingAttendance && setIsFormOpen(false)} />
           <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[2.5rem] overflow-hidden max-h-[90vh]">
                 <div className="px-8 py-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><ClipboardList size={160} /></div>
                    <div className="relative z-10">
                       <h3 className="text-xl font-black tracking-tighter uppercase">{editingRecordId ? 'Modification Relevé' : 'Saisie Présence'}</h3>
                       <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mt-1 opacity-80">Statistiques {churchName}</p>
                    </div>
                    <button onClick={() => setIsFormOpen(false)} className="relative z-10 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                 </div>
                 
                 <form onSubmit={handleAttendanceSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/30 pb-10">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5">
                       <div className="flex items-center gap-2 mb-1"><div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div><h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Informations Service</h4></div>
                       <div className="space-y-4">
                          <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Culte / Réunion</label><select value={attendanceForm.service} onChange={e => setAttendanceForm({...attendanceForm, service: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-[10px] font-black uppercase shadow-inner">{availableServices.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                          <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date du relevé</label><input type="date" required value={attendanceForm.date} onChange={e => setAttendanceForm({...attendanceForm, date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-black shadow-inner" /></div>
                       </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5">
                       <div className="flex items-center gap-2 mb-1"><div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div><h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Chiffres Globaux</h4></div>
                       <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hommes</label>
                            <input 
                              type="number" min="0" value={attendanceForm.men || ''} 
                              onChange={e => setAttendanceForm({...attendanceForm, men: parseInt(e.target.value) || 0})} 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-blue-600 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Femmes</label>
                            <input 
                              type="number" min="0" value={attendanceForm.women || ''} 
                              onChange={e => setAttendanceForm({...attendanceForm, women: parseInt(e.target.value) || 0})} 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-pink-600 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Enfants</label>
                            <input 
                              type="number" min="0" value={attendanceForm.children || ''} 
                              onChange={e => setAttendanceForm({...attendanceForm, children: parseInt(e.target.value) || 0})} 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-amber-600 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            />
                          </div>
                       </div>
                       <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total calculé :</span>
                          <span className="text-2xl font-black text-slate-900">{(Number(attendanceForm.men) || 0) + (Number(attendanceForm.women) || 0) + (Number(attendanceForm.children) || 0)}</span>
                       </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] border border-rose-100 shadow-sm space-y-5">
                       <div className="flex items-center gap-2 mb-1"><div className="w-1.5 h-4 bg-rose-500 rounded-full"></div><h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Liste d'Absents Nominatifs</h4></div>
                       <p className="text-[10px] text-slate-400 italic">Inclut les membres et les visiteurs.</p>
                       <div className="relative group">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input type="text" placeholder="Réchercher pour cocher..." value={formMemberSearch} onChange={e => setFormMemberSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-[10px] font-black uppercase shadow-inner transition-all focus:bg-white" />
                       </div>
                       <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                          {allPeople.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(formMemberSearch.toLowerCase())).map(p => (
                            <div 
                              key={p.id} 
                              onClick={() => toggleAbsentInForm(p.id)}
                              className={cn("flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border", attendanceForm.absentMembers.includes(p.id) ? "bg-rose-50 border-rose-200" : "bg-white border-slate-100 hover:border-rose-100")}
                            >
                               <div className="flex items-center gap-3">
                                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black uppercase shadow-sm overflow-hidden", attendanceForm.absentMembers.includes(p.id) ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-400")}>
                                     {(p as Member).photoUrl ? (
                                       <img src={(p as Member).photoUrl} alt="" className="w-full h-full object-cover" />
                                     ) : (
                                       getInitials(p.firstName, p.lastName)
                                     )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className={cn("text-[10px] font-black uppercase tracking-tighter", attendanceForm.absentMembers.includes(p.id) ? "text-rose-700" : "text-slate-600")}>{p.firstName} {p.lastName}</span>
                                    {p.isVisitor && <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Visiteur</span>}
                                  </div>
                               </div>
                               <div className={cn("w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all", attendanceForm.absentMembers.includes(p.id) ? "bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-200" : "border-slate-200 bg-white")}>
                                  {attendanceForm.absentMembers.includes(p.id) && <Check size={12} strokeWidth={4} />}
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="flex gap-3">
                       <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">Annuler</button>
                       <button type="submit" disabled={isSubmittingAttendance} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-indigo-200">
                          {isSubmittingAttendance ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Valider Relevé
                       </button>
                    </div>
                 </form>
           </div>
        </div>
      )}

      {/* Modal: Confirmation Suppression - Correction de largeur */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsDeleteConfirmOpen(false)} />
           <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-slate-100 animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
                 <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase">Supprimer ?</h3>
              <p className="text-slate-500 mt-2 text-sm font-medium leading-relaxed italic">Cette action retirera définitivement ce relevé de l'historique.</p>
              <div className="flex flex-col gap-3 mt-8">
                 <button onClick={() => { if(recordToDeleteId) { setHistory(prev => prev.filter(h => h.id !== recordToDeleteId)); setRecordToDeleteId(null); setIsDeleteConfirmOpen(false); setIsRecordModalOpen(false); } }} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">Confirmer</button>
                 <button onClick={() => setIsDeleteConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase border border-slate-200 hover:bg-slate-100 transition-all">Annuler</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;