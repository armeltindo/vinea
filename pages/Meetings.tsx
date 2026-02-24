import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import { 
  UsersRound, Plus, Calendar, FileText, CheckCircle2, Clock, ChevronRight, Sparkles, Search, 
  AlertTriangle, AlertCircle, ClipboardCheck, X, MapPin, Users, Save, Loader2, Trash2, ArrowLeft, Check, 
  CalendarDays, PenTool, Download, History, ExternalLink, Bell, CheckCircle, UserCheck, 
  Target, Briefcase, ListChecks, ArrowRight, ShieldCheck, UserPlus, MessageSquareText,
  Share2, Send, Copy, MoreVertical, LayoutList, CheckSquare, UserX, BarChart3, TrendingDown,
  Maximize2
} from 'lucide-react';
import { analyzePageData, generateMeetingMinutes, generateMeetingFlash, extractMeetingTasks } from '../lib/gemini';
import { cn, generateId, getInitials, formatFirstName } from '../utils';
import { Member, MemberType } from '../types';
import { GoogleGenAI } from "@google/genai";

interface MeetingDecision {
  id: string;
  label: string;
  status: 'À faire' | 'En cours' | 'Réalisé';
  assignedTo?: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  status: 'Programmé' | 'Terminé';
  attendeeIds: string[];
  absenteeIds: string[];
  priority: 'Haute' | 'Moyenne' | 'Basse';
  summary?: string;
  decisions?: MeetingDecision[];
  aiPV?: string;
}

const CATEGORIES = ['Conseil', 'Département', 'Ouvriers', 'Jeunesse', 'Finances', 'Social'];

const Meetings: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>(() => {
    const saved = localStorage.getItem('vinea_meetings');
    return saved ? JSON.parse(saved) : [];
  });

  const [members] = useState<Member[]>(() => {
    const saved = localStorage.getItem('vinea_members');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toutes');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [isGeneratingPV, setIsGeneratingPV] = useState(false);
  const [isGeneratingFlash, setIsGeneratingFlash] = useState(false);
  const [isExtractingTasks, setIsExtractingTasks] = useState(false);

  // États pour l'ajout de résolution inline
  const [isAddingDecision, setIsAddingDecision] = useState(false);
  const [newDecisionLabel, setNewDecisionLabel] = useState('');

  // Nouvel état pour le suivi des présences
  const [isAttendanceTrackerOpen, setIsAttendanceTrackerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('vinea_meetings', JSON.stringify(meetings));
  }, [meetings]);

  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [meetingToDeleteId, setMeetingToDeleteId] = useState<string | null>(null);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [absenteeSearch, setAbsenteeSearch] = useState('');
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<Meeting, 'id' | 'status'>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    location: '',
    category: CATEGORIES[0],
    attendeeIds: [],
    absenteeIds: [],
    priority: 'Moyenne',
    summary: '',
    decisions: []
  });

  const pendingDecisions = useMemo(() => {
    return meetings.flatMap(m => (m.decisions || []).filter(d => d.status !== 'Réalisé').map(d => ({ ...d, meetingTitle: m.title, meetingId: m.id })));
  }, [meetings]);

  const finishedMeetings = useMemo(() => {
    return meetings.filter(m => m.status === 'Terminé').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [meetings]);

  const lastMeetingRecorded = useMemo(() => {
    return [...meetings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [meetings]);

  // Logique de calcul des présences par membre
  const attendanceStats = useMemo(() => {
    const stats: Record<string, { present: number, absent: number, total: number }> = {};
    
    meetings.forEach(m => {
      m.attendeeIds.forEach(id => {
        if (!stats[id]) stats[id] = { present: 0, absent: 0, total: 0 };
        stats[id].present += 1;
        stats[id].total += 1;
      });
      m.absenteeIds.forEach(id => {
        if (!stats[id]) stats[id] = { present: 0, absent: 0, total: 0 };
        stats[id].absent += 1;
        stats[id].total += 1;
      });
    });

    return Object.entries(stats).map(([id, s]) => {
      const member = members.find(m => m.id === id);
      return {
        id,
        name: member ? `${formatFirstName(member.firstName)} ${member.lastName.toUpperCase()}` : 'Inconnu',
        type: member?.type || 'Membre',
        photoUrl: member?.photoUrl,
        firstName: member?.firstName,
        lastName: member?.lastName,
        rate: Math.round((s.present / s.total) * 100),
        ...s
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [meetings, members]);

  const criticalAbsenteesCount = useMemo(() => {
    return attendanceStats.filter(s => s.rate < 60 && s.total > 1).length;
  }, [attendanceStats]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzePageData("Gestion des Réunions", { 
      meetings: meetings.map(m => ({ title: m.title, attendees: m.attendeeIds.length, absents: m.absenteeIds?.length || 0 })),
      pendingDecisions: pendingDecisions.length,
      stats: { total: meetings.length, completion: meetings.length > 0 ? `${Math.round((finishedMeetings.length / meetings.length) * 100)}%` : '0%' }
    });
    setAnalysis(result || null);
    setIsAnalyzing(false);
  };

  const handleGeneratePV = async (meeting: Meeting) => {
    setIsGeneratingPV(true);
    const attendeesNames = meeting.attendeeIds.map(id => {
      const m = members.find(mem => mem.id === id);
      return m ? `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}` : 'Inconnu';
    });
    
    const absenteesNames = (meeting.absenteeIds || []).map(id => {
      const m = members.find(mem => mem.id === id);
      return m ? `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}` : 'Inconnu';
    });
    
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const prompt = `Rédige un procès-verbal de réunion professionnel et structuré pour l'église Vinea sur la base de ces notes :
      Titre : ${meeting.title}
      Date : ${meeting.date}
      Lieu : ${meeting.location}
      Participants : ${attendeesNames.join(', ')}
      Absents/Excusés : ${absenteesNames.join(', ') || 'Aucun'}
      Notes/Résumé : ${meeting.summary || 'Aucune note spécifique'}
      Décisions prises : ${meeting.decisions?.map(d => d.label).join(', ') || 'Aucune décison listée'}
      
      Le PV doit inclure : Un en-tête Vinea, la liste de présence complète, l'ordre du jour déduit, le résumé des débats et les résolutions adoptées.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const updated = { ...meeting, aiPV: response.text };
      setMeetings(prev => prev.map(m => m.id === meeting.id ? updated : m));
      setSelectedMeeting(updated);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du PV.");
    }
    setIsGeneratingPV(false);
  };

  const handleGenerateFlash = async (meeting: Meeting) => {
    setIsGeneratingFlash(true);
    const flash = await generateMeetingFlash(meeting);
    if (flash) {
      const url = `https://wa.me/?text=${encodeURIComponent(flash)}`;
      window.open(url, '_blank');
    }
    setIsGeneratingFlash(false);
  };

  const handleExtractTasks = async (meeting: Meeting) => {
    if (!meeting.summary) return;
    setIsExtractingTasks(true);
    const tasks = await extractMeetingTasks(meeting.summary);
    if (tasks && tasks.length > 0) {
      const newDecisions: MeetingDecision[] = tasks.map((t: any) => ({
        id: generateId(),
        label: t.title + (t.deadline ? ` (Échéance: ${t.deadline})` : ''),
        status: 'À faire',
        assignedTo: t.responsible || ''
      }));
      
      const updated = { ...meeting, decisions: [...(meeting.decisions || []), ...newDecisions] };
      setMeetings(prev => prev.map(m => m.id === meeting.id ? updated : m));
      setSelectedMeeting(updated);
    }
    setIsExtractingTasks(false);
  };

  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = selectedCategory === 'Toutes' || m.category === selectedCategory;
      return matchesSearch && matchesCat;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());
  }, [meetings, searchTerm, selectedCategory]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      if (editingMeetingId) {
        setMeetings(meetings.map(m => m.id === editingMeetingId ? { ...m, ...formData } : m));
        if (selectedMeeting?.id === editingMeetingId) {
          setSelectedMeeting(prev => prev ? { ...prev, ...formData } : null);
        }
      } else {
        const newMeeting: Meeting = {
          ...formData,
          id: generateId(),
          status: 'Programmé'
        };
        setMeetings([newMeeting, ...meetings]);
      }
      setIsFormOpen(false);
      setIsSubmitting(false);
      setEditingMeetingId(null);
    }, 800);
  };

  const toggleStatus = (id: string) => {
    setMeetings(meetings.map(m => {
      if (m.id === id) {
        const newStatus = m.status === 'Programmé' ? 'Terminé' : 'Programmé';
        const updated = { ...m, status: newStatus as any };
        if (selectedMeeting?.id === id) setSelectedMeeting(updated);
        return updated;
      }
      return m;
    }));
  };

  const handleAddDecision = () => {
    if (!newDecisionLabel.trim() || !selectedMeeting) return;
    
    const newDecision: MeetingDecision = { 
      id: generateId(), 
      label: newDecisionLabel.trim(), 
      status: 'À faire' 
    };
    
    const updatedMeetings = meetings.map(m => 
      m.id === selectedMeeting.id 
        ? { ...m, decisions: [...(m.decisions || []), newDecision] } 
        : m
    );
    
    setMeetings(updatedMeetings);
    setSelectedMeeting(updatedMeetings.find(m => m.id === selectedMeeting.id) || null);
    setNewDecisionLabel('');
    setIsAddingDecision(false);
  };

  const handleDeleteDecision = (decisionId: string) => {
    if (!selectedMeeting) return;
    const updatedMeetings = meetings.map(m => 
      m.id === selectedMeeting.id 
        ? { ...m, decisions: (m.decisions || []).filter(d => d.id !== decisionId) } 
        : m
    );
    setMeetings(updatedMeetings);
    setSelectedMeeting(updatedMeetings.find(m => m.id === selectedMeeting.id) || null);
  };

  const updateDecisionStatus = (decisionId: string, newStatus: MeetingDecision['status']) => {
    if (!selectedMeeting) return;
    const updatedMeetings = meetings.map(m => 
      m.id === selectedMeeting.id 
        ? { ...m, decisions: (m.decisions || []).map(d => d.id === decisionId ? { ...d, status: newStatus } : d) } 
        : m
    );
    setMeetings(updatedMeetings);
    setSelectedMeeting(updatedMeetings.find(m => m.id === selectedMeeting.id) || null);
  };

  const toggleAttendeeInForm = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(id) 
        ? prev.attendeeIds.filter(i => i !== id) 
        : [...prev.attendeeIds, id],
      // Un membre ne peut pas être présent et absent en même temps
      absenteeIds: prev.absenteeIds.filter(i => i !== id)
    }));
  };

  const toggleAbsenteeInForm = (id: string) => {
    setFormData(prev => ({
      ...prev,
      absenteeIds: prev.absenteeIds.includes(id) 
        ? prev.absenteeIds.filter(i => i !== id) 
        : [...prev.absenteeIds, id],
      // Un membre ne peut pas être absent et présent en même temps
      attendeeIds: prev.attendeeIds.filter(i => i !== id)
    }));
  };

  const confirmDelete = () => {
    if (meetingToDeleteId) {
      setMeetings(meetings.filter(m => m.id !== meetingToDeleteId));
      setIsDeleteConfirmOpen(false);
      setMeetingToDeleteId(null);
      if (selectedMeeting?.id === meetingToDeleteId) {
        setSelectedMeeting(null);
      }
    }
  };

  const calculateQuorum = (attendeeIds: string[]) => {
    const totalLeaders = members.filter(m => m.type !== MemberType.MEMBRE_SIMPLE).length;
    const leaderAttendees = attendeeIds.filter(id => {
      const m = members.find(mem => mem.id === id);
      return m && m.type !== MemberType.MEMBRE_SIMPLE;
    }).length;
    if (totalLeaders === 0) return 100;
    return Math.round((leaderAttendees / totalLeaders) * 100);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Gestion des Réunions</h2>
          <p className="text-sm text-slate-500 font-medium italic">Vinea : Organisez vos comités et archivez vos décisions stratégiques.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAnalyze} disabled={isAnalyzing || meetings.length === 0} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-sm font-black hover:bg-indigo-100 transition-all uppercase tracking-widest disabled:opacity-50">
            <Sparkles size={16} /> {isAnalyzing ? 'Analyse...' : 'Synthèse Stratégique IA'}
          </button>
          <button onClick={() => { setEditingMeetingId(null); setFormData({ title: '', date: new Date().toISOString().split('T')[0], time: '18:00', location: '', category: CATEGORIES[0], attendeeIds: [], absenteeIds: [], priority: 'Moyenne', summary: '', decisions: [] }); setIsFormOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 uppercase tracking-widest">
            <Plus size={18} /> Nouvelle Réunion
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Réunions" subtitle="En cours" icon={<Calendar size={20} className="text-indigo-600" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black">{meetings.filter(m => m.status === 'Programmé').length}</span>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-widest">Actives</span>
          </div>
        </Card>
        <Card title="Décisions" subtitle="Actions à suivre" icon={<CheckSquare size={20} className="text-amber-500" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-amber-600">{pendingDecisions.length}</span>
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
          </div>
        </Card>
        <Card title="Quorum Moyen" subtitle="Fidélité leaders" icon={<UsersRound size={20} className="text-indigo-600" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black">{meetings.length > 0 ? `${Math.round(meetings.reduce((acc, m) => acc + calculateQuorum(m.attendeeIds), 0) / meetings.length)}%` : '--'}</span>
            <span className="text-[10px] font-black text-slate-400 uppercase">Score</span>
          </div>
        </Card>
        <Card title="Documentation" subtitle="PV Archivés" icon={<FileText size={20} className="text-emerald-600" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-emerald-600">{finishedMeetings.length}</span>
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
        </Card>
      </div>

      <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Agenda & Archives</h3>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-3 py-2 text-[10px] font-black uppercase border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all bg-white shadow-sm w-48 md:w-64" />
            </div>
          </div>

          <div className="space-y-4">
            {filteredMeetings.length > 0 ? filteredMeetings.map((meeting) => (
              <div key={meeting.id} onClick={() => setSelectedMeeting(meeting)} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden flex flex-col md:flex-row hover:border-indigo-300 transition-all group shadow-sm cursor-pointer active:scale-[0.99]">
                <div className={cn("md:w-32 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 shrink-0", meeting.status === 'Terminé' ? "bg-slate-50" : "bg-indigo-50/30")}>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(meeting.date).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}</span>
                  <span className="text-3xl font-black text-slate-800 leading-none my-1">{new Date(meeting.date).getDate()}</span>
                  <span className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1 uppercase tracking-widest"><Clock size={10} /> {meeting.time}</span>
                </div>
                <div className="flex-1 p-6 flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">{meeting.category}</span>
                      <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest", meeting.status === 'Terminé' ? "bg-slate-100 text-slate-400" : "bg-emerald-100 text-emerald-700")}>{meeting.status}</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-tight">{meeting.title}</h4>
                    <div className="flex items-center gap-4">
                      <p className="text-[10px] text-slate-500 flex items-center gap-1.5 font-bold uppercase tracking-widest"><MapPin size={12} className="text-rose-500" /> {meeting.location}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1.5 font-bold uppercase tracking-widest"><Users size={12} className="text-indigo-500" /> {meeting.attendeeIds.length} Présents</p>
                      {meeting.absenteeIds?.length > 0 && <p className="text-[10px] text-rose-400 flex items-center gap-1.5 font-bold uppercase tracking-widest"><UserX size={12} /> {meeting.absenteeIds.length} Absents</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                     <div className="flex -space-x-2">
                       {meeting.attendeeIds.slice(0, 3).map(id => {
                         const m = members.find(mem => mem.id === id);
                         return (
                           <div key={id} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black uppercase text-slate-400 overflow-hidden shadow-sm">
                             {m?.photoUrl ? (
                               <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                             ) : (
                               getInitials(m?.firstName, m?.lastName)
                             )}
                           </div>
                         );
                       })}
                       {meeting.attendeeIds.length > 3 && (
                         <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-800 text-white flex items-center justify-center text-[8px] font-black">+{meeting.attendeeIds.length - 3}</div>
                       )}
                     </div>
                     <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Résolutions</p>
                        <p className="text-xs font-black text-slate-800">{(meeting.decisions?.filter(d => d.status === 'Réalisé').length || 0)} / {(meeting.decisions?.length || 0)}</p>
                     </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-[2.5rem]"><UsersRound size={48} className="mx-auto text-slate-100 mb-4" /><p className="text-sm font-bold text-slate-400 italic">Aucune réunion au registre.</p></div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Actions en Attente" icon={<LayoutList size={18} />}>
            <div className="space-y-4">
              {pendingDecisions.slice(0, 6).map(decision => (
                <div key={decision.id} className="flex items-start gap-4 p-3 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all group">
                  <div className={cn("mt-1 w-2 h-2 rounded-full shadow-sm shrink-0", decision.status === 'En cours' ? "bg-blue-500" : "bg-amber-500")}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tighter truncate">{decision.label}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Réunion : {decision.meetingTitle}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedMeeting(meetings.find(m => m.id === decision.meetingId) || null); }} className="text-indigo-600 hover:text-indigo-800"><ChevronRight size={14}/></button>
                </div>
              ))}
              {pendingDecisions.length === 0 && (
                <div className="py-8 text-center text-slate-300 italic text-[10px] uppercase">Toutes les résolutions sont traitées</div>
              )}
            </div>
          </Card>

          <div 
            onClick={() => setIsAttendanceTrackerOpen(true)}
            className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-xl cursor-pointer hover:scale-[1.02] transition-all"
          >
             <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform"><UserCheck size={80} className="text-emerald-400"/></div>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Suivi Présences</p>
             <h3 className="text-2xl font-black mt-2">Zéro absent oublié.</h3>
             
             {lastMeetingRecorded && lastMeetingRecorded.absenteeIds?.length > 0 && (
               <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                  <p className="text-[8px] font-black text-rose-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <AlertTriangle size={10} /> {lastMeetingRecorded.absenteeIds.length} Absents lors du dernier comité
                  </p>
                  <div className="flex -space-x-1.5">
                     {lastMeetingRecorded.absenteeIds.slice(0, 5).map(id => {
                       const m = members.find(mem => mem.id === id);
                       return (
                         <div key={id} className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-[7px] font-black text-rose-300 shadow-sm uppercase overflow-hidden">
                           {m?.photoUrl ? (
                             <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                           ) : (
                             getInitials(m?.firstName, m?.lastName)
                           )}
                         </div>
                       );
                     })}
                     {lastMeetingRecorded.absenteeIds.length > 5 && (
                       <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[6px] font-black">+{lastMeetingRecorded.absenteeIds.length - 5}</div>
                     )}
                  </div>
               </div>
             )}

             {criticalAbsenteesCount > 0 && (
               <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 rounded-xl border border-rose-500/30 w-fit">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                  <span className="text-[8px] font-black text-rose-100 uppercase tracking-widest">{criticalAbsenteesCount} alertes de désengagement</span>
               </div>
             )}

             <p className="text-[9px] font-bold text-slate-500 mt-4 uppercase tracking-widest leading-relaxed">Vinea identifie les leaders qui s'éloignent de leurs responsabilités pour une restauration pastorale.</p>
             <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                Voir le dashboard d'assiduité <ArrowRight size={12} />
             </div>
          </div>
        </div>
      </div>

      {/* Side-over: Suivi d'Assiduité des Leaders */}
      {isAttendanceTrackerOpen && (
        <div className="fixed inset-0 z-[150] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsAttendanceTrackerOpen(false)} />
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-2xl bg-white shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col rounded-l-[3rem]">
              <div className="px-10 py-12 bg-slate-900 text-white rounded-tl-[3rem] shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><BarChart3 size={180} /></div>
                <button onClick={() => setIsAttendanceTrackerOpen(false)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white transition-colors"><ArrowLeft size={24} /></button>
                <div className="relative z-10 space-y-4">
                  <span className="px-3 py-1 bg-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Dashboard Gouvernance</span>
                  <h3 className="text-3xl font-black uppercase leading-tight tracking-tighter">Suivi d'Assiduité</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Analyse de la fidélité des membres aux réunions</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 space-y-8">
                 <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                       <TrendingDown size={16} className="text-rose-500" /> Alertes de désengagement
                    </h4>
                    <div className="space-y-3">
                       {attendanceStats.filter(s => s.rate < 60 && s.total > 1).map(stat => (
                         <div key={stat.id} className="bg-white p-5 rounded-[2rem] border border-rose-100 shadow-sm flex items-center justify-between group hover:border-rose-300 transition-all">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-lg font-black text-rose-600 uppercase overflow-hidden">
                                  {stat.photoUrl ? (
                                    <img src={stat.photoUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    getInitials(stat.firstName, stat.lastName)
                                  )}
                               </div>
                               <div>
                                  <p className="text-sm font-black text-slate-800 leading-none">{stat.name}</p>
                                  <p className="text-[9px] font-black text-rose-500 uppercase mt-1.5">{stat.type} • {stat.absent} absences</p>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-xl font-black text-rose-600">{stat.rate}%</p>
                               <span className="text-[8px] font-bold text-slate-400 uppercase">Assiduité</span>
                            </div>
                         </div>
                       ))}
                       {attendanceStats.filter(s => s.rate < 60 && s.total > 1).length === 0 && (
                         <p className="text-xs text-slate-400 italic text-center py-4">Aucune alerte critique détectée.</p>
                       )}
                    </div>
                 </div>

                 <div className="space-y-4 pt-4 border-t border-slate-200">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                       <CheckCircle size={16} className="text-emerald-500" /> Leaders les plus assidus
                    </h4>
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                       <table className="w-full text-left">
                          <thead>
                             <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Collaborateur</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Score</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Moyenne</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                             {attendanceStats.slice(0, 10).map((stat) => (
                               <tr key={stat.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400 uppercase overflow-hidden">
                                           {stat.photoUrl ? (
                                             <img src={stat.photoUrl} alt="" className="w-full h-full object-cover" />
                                           ) : (
                                             getInitials(stat.firstName, stat.lastName)
                                           )}
                                        </div>
                                        <div>
                                          <p className="text-xs font-black text-slate-800 tracking-tighter">{stat.name}</p>
                                          <p className="text-[8px] font-bold text-slate-400 uppercase">{stat.type}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="flex items-center justify-center gap-1">
                                        {[1,2,3,4,5].map(i => (
                                           <div key={i} className={cn("w-1.5 h-3 rounded-full", i <= (stat.rate/20) ? "bg-emerald-500" : "bg-slate-100")}></div>
                                        ))}
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     <span className={cn(
                                       "text-[10px] font-black px-2 py-1 rounded uppercase",
                                       stat.rate >= 80 ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                                     )}>
                                       {stat.rate}%
                                     </span>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>

              <div className="p-10 border-t border-slate-100 bg-white shrink-0">
                <button 
                  onClick={() => setIsAttendanceTrackerOpen(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl"
                >
                  Fermer le Suivi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Détails Réunion - Centré */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-[150] overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedMeeting(null)} />
          <div className="relative w-full max-w-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[3rem] overflow-hidden max-h-[90vh]">
            <div className="px-10 py-12 bg-indigo-600 text-white rounded-t-[3rem] shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10"><UsersRound size={180} /></div>
              <button onClick={() => setSelectedMeeting(null)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white transition-colors"><ArrowLeft size={24} /></button>
              <div className="relative z-10 space-y-4">
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">{selectedMeeting.category}</span>
                  <span className="px-3 py-1 bg-indigo-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/20">Quorum: {calculateQuorum(selectedMeeting.attendeeIds)}%</span>
                </div>
                <h3 className="text-3xl font-black uppercase leading-tight tracking-tighter">{selectedMeeting.title}</h3>
                <div className="flex items-center gap-4 text-indigo-100">
                  <span className="text-xs font-bold uppercase tracking-widest">{new Date(selectedMeeting.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} • {selectedMeeting.time}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 space-y-8">
              {/* Actions IA Bar */}
              <div className="flex flex-wrap gap-3">
                <button onClick={() => handleGeneratePV(selectedMeeting)} disabled={isGeneratingPV} className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg">
                  {isGeneratingPV ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Rédiger PV (IA)
                </button>
                <button onClick={() => handleGenerateFlash(selectedMeeting)} disabled={isGeneratingFlash} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg">
                  {isGeneratingFlash ? <Loader2 size={16} className="animate-spin" /> : <MessageSquareText size={16} />} Flash Info (WA)
                </button>
                <button onClick={() => handleExtractTasks(selectedMeeting)} disabled={isExtractingTasks || !selectedMeeting.summary} className="flex-1 py-3 bg-white border border-indigo-200 text-indigo-600 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all disabled:opacity-50">
                  {isExtractingTasks ? <Loader2 size={16} className="animate-spin" /> : <ListChecks size={16} />} Extraire Tâches
                </button>
              </div>

              {selectedMeeting.aiPV && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-200 shadow-xl space-y-4 animate-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Procès-Verbal Généré par IA</h4>
                    <div className="flex gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(selectedMeeting.aiPV!); alert("PV copié !"); }} className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors"><Copy size={16}/></button>
                      <button onClick={() => setMeetings(prev => prev.map(m => m.id === selectedMeeting.id ? { ...m, aiPV: undefined } : m))} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"><X size={16}/></button>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none text-slate-700 font-medium leading-relaxed italic whitespace-pre-wrap">
                    {selectedMeeting.aiPV}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={14} className="text-rose-500" /> Lieu</h4>
                  <p className="text-sm font-black text-slate-800 uppercase leading-none">{selectedMeeting.location}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-500" /> Quorum séance</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${calculateQuorum(selectedMeeting.attendeeIds)}%` }}></div>
                    </div>
                    <span className="text-xs font-black text-slate-800">{calculateQuorum(selectedMeeting.attendeeIds)}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Users size={14} className="text-indigo-500" /> Participants Présents ({selectedMeeting.attendeeIds.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeeting.attendeeIds.map(id => {
                      const m = members.find(mem => mem.id === id);
                      return (
                        <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full shadow-sm">
                           <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] font-black text-white uppercase overflow-hidden">
                             {m?.photoUrl ? (
                               <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                             ) : (
                               getInitials(m?.firstName, m?.lastName)
                             )}
                           </div>
                           <span className="text-[10px] font-black text-slate-700 tracking-tighter">{formatFirstName(m?.firstName || '')} <span className="uppercase">{m?.lastName}</span></span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedMeeting.absenteeIds?.length > 0 && (
                  <div className="pt-6 border-t border-slate-50">
                    <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2 mb-4"><UserX size={14} /> Absents / Excusés ({selectedMeeting.absenteeIds.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMeeting.absenteeIds.map(id => {
                        const m = members.find(mem => mem.id === id);
                        return (
                          <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50/50 border border-rose-100 rounded-full">
                             <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center text-[8px] font-black text-rose-600 uppercase overflow-hidden">
                               {m?.photoUrl ? (
                                 <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                               ) : (
                                 getInitials(m?.firstName, m?.lastName)
                               )}
                             </div>
                             <span className="text-[10px] font-black text-rose-700 tracking-tighter">{formatFirstName(m?.firstName || '')} <span className="uppercase">{m?.lastName}</span></span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                 <div className="flex items-center justify-between">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ClipboardCheck size={14} className="text-emerald-500" /> Résolutions & Décisions</h4>
                   <button onClick={() => setIsAddingDecision(!isAddingDecision)} className={cn("p-1.5 rounded-lg transition-all", isAddingDecision ? "bg-rose-50 text-rose-600 rotate-45" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100")}><Plus size={14} /></button>
                 </div>
                 <div className="space-y-3">
                   {/* Champ d'ajout inline */}
                   {isAddingDecision && (
                     <div className="flex items-center gap-2 p-3 bg-slate-50 border border-indigo-200 rounded-2xl animate-in slide-in-from-top-2 duration-200">
                       <input 
                        type="text" 
                        autoFocus
                        placeholder="Décrire la résolution..." 
                        value={newDecisionLabel}
                        onChange={(e) => setNewDecisionLabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDecision()}
                        className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400"
                       />
                       <button 
                        onClick={handleAddDecision}
                        disabled={!newDecisionLabel.trim()}
                        className="p-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
                       >
                         <Check size={14} strokeWidth={3} />
                       </button>
                     </div>
                   )}

                   {selectedMeeting.decisions?.map(decision => (
                     <div key={decision.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group transition-all">
                       <div className="flex items-center gap-3 min-w-0">
                         <div className={cn("w-2 h-8 rounded-full", decision.status === 'Réalisé' ? "bg-emerald-500" : decision.status === 'En cours' ? "bg-blue-500" : "bg-amber-500")}></div>
                         <div className="min-w-0">
                            <span className={cn("text-xs font-black uppercase block truncate tracking-tight", decision.status === 'Réalisé' && "text-slate-400 line-through")}>{decision.label}</span>
                            {decision.assignedTo && <span className="text-[8px] font-bold text-slate-400 uppercase italic">Assigné : {decision.assignedTo}</span>}
                         </div>
                       </div>
                       <div className="flex gap-1 shrink-0 ml-4">
                          <div className="flex gap-0.5 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDeleteDecision(decision.id)} className="p-1 text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
                          </div>
                          {(['À faire', 'En cours', 'Réalisé'] as const).map(st => (
                            <button key={st} onClick={() => updateDecisionStatus(decision.id, st)} className={cn("px-2 py-1 rounded text-[8px] font-black uppercase transition-all", decision.status === st ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-400 hover:bg-slate-100")}>{st}</button>
                          ))}
                       </div>
                     </div>
                   ))}
                   {!selectedMeeting.decisions?.length && !isAddingDecision && <p className="text-xs text-slate-400 italic text-center py-4">Aucune résolution enregistrée.</p>}
                 </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-100 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><PenTool size={14} className="text-indigo-600" /> Notes de séance</h4>
                <p className="text-sm text-slate-700 font-medium leading-relaxed italic whitespace-pre-wrap">{selectedMeeting.summary || "Saisissez les notes de séance pour alimenter l'IA."}</p>
              </div>
            </div>

            <div className="p-10 border-t border-slate-100 bg-white flex flex-col gap-3 rounded-b-[3rem] shrink-0">
              <div className="flex gap-3">
                <button onClick={() => toggleStatus(selectedMeeting.id)} className={cn("flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg", selectedMeeting.status === 'Programmé' ? "bg-emerald-600 text-white shadow-emerald-200" : "bg-amber-100 text-amber-700 shadow-amber-200")}>
                  {selectedMeeting.status === 'Programmé' ? 'Clôturer la séance' : 'Réouvrir la séance'}
                </button>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => { setEditingMeetingId(selectedMeeting.id); setFormData(selectedMeeting); setIsFormOpen(true); }} className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase border border-indigo-100 hover:bg-indigo-100 transition-colors">Modifier</button>
                 <button onClick={() => { setMeetingToDeleteId(selectedMeeting.id); setIsDeleteConfirmOpen(true); }} className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nouvelle Réunion / Formulaire complet - Centré */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => !isSubmitting && setIsFormOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-8 text-white shrink-0 flex items-center justify-between">
              <div><h3 className="text-xl font-black uppercase">{editingMeetingId ? 'Mise à jour' : 'Planification'}</h3><p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mt-0.5">Registre administratif Vinea</p></div>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-slate-50/30 pb-20">
              <div className="space-y-6">
                 <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Objet de la réunion</label><input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Ex: Conseil de Trésorerie" className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-black shadow-sm" /></div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label><input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Heure</label><input type="time" required value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold" /></div>
                 </div>

                 <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Localisation / Plateforme</label><input type="text" required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Ex: Salle Vinea ou Google Meet" className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-black shadow-sm" /></div>

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catégorie</label>
                   <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-[10px] font-black uppercase shadow-sm">
                     {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><UsersRound size={16} className="text-indigo-600" /> Participants Présents</h4>
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Quorum : {calculateQuorum(formData.attendeeIds)}%</span>
                    </div>
                    <div className="relative group"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="Chercher un membre présent..." value={attendeeSearch} onChange={(e) => setAttendeeSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-[10px] uppercase font-black bg-white border border-slate-200 rounded-xl outline-none shadow-inner" /></div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl bg-white shadow-sm">
                       {members.filter(m => m.type !== MemberType.MEMBRE_SIMPLE && `${m.firstName} ${m.lastName}`.toLowerCase().includes(attendeeSearch.toLowerCase())).map(m => (
                         <div key={m.id} onClick={() => toggleAttendeeInForm(m.id)} className={cn("flex items-center justify-between p-3 border-b border-slate-50 last:border-0 cursor-pointer transition-colors", formData.attendeeIds.includes(m.id) ? "bg-indigo-50/50" : "hover:bg-slate-50")}>
                            <div className="flex items-center gap-3">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase shadow-sm overflow-hidden", formData.attendeeIds.includes(m.id) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400")}>
                                 {m.photoUrl ? (
                                   <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                                 ) : (
                                   getInitials(m.firstName, m.lastName)
                                 )}
                              </div>
                              <span className={cn("text-[10px] font-black uppercase tracking-tighter", formData.attendeeIds.includes(m.id) ? "text-indigo-700" : "text-slate-600")}>{m.firstName} {m.lastName}</span>
                            </div>
                            {formData.attendeeIds.includes(m.id) && <Check size={14} className="text-indigo-600" strokeWidth={4} />}
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><UserX size={16} className="text-rose-500" /> Absents / Excusés</h4>
                    <div className="relative group"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="Chercher un membre absent..." value={absenteeSearch} onChange={(e) => setAbsenteeSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-[10px] uppercase font-black bg-white border border-slate-200 rounded-xl outline-none shadow-inner" /></div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl bg-white shadow-sm">
                       {members.filter(m => m.type !== MemberType.MEMBRE_SIMPLE && `${m.firstName} ${m.lastName}`.toLowerCase().includes(absenteeSearch.toLowerCase())).map(m => (
                         <div key={m.id} onClick={() => toggleAbsenteeInForm(m.id)} className={cn("flex items-center justify-between p-3 border-b border-slate-50 last:border-0 cursor-pointer transition-colors", formData.absenteeIds.includes(m.id) ? "bg-rose-50/50" : "hover:bg-slate-50")}>
                            <div className="flex items-center gap-3">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase shadow-sm overflow-hidden", formData.absenteeIds.includes(m.id) ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-400")}>
                                 {m.photoUrl ? (
                                   <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                                 ) : (
                                   getInitials(m.firstName, m.lastName)
                                 )}
                              </div>
                              <span className={cn("text-[10px] font-black uppercase tracking-tighter", formData.absenteeIds.includes(m.id) ? "text-rose-700" : "text-slate-600")}>{m.firstName} {m.lastName}</span>
                            </div>
                            {formData.absenteeIds.includes(m.id) && <Check size={14} className="text-rose-600" strokeWidth={4} />}
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes / Résumé de séance</label>
                   <textarea rows={6} value={formData.summary} onChange={(e) => setFormData({...formData, summary: e.target.value})} placeholder="Points abordés, ambiance, remarques..." className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[2rem] outline-none text-sm font-medium resize-none shadow-sm" />
                 </div>
              </div>

              <div className="pt-8 flex gap-4 p-10 bg-white border-t border-slate-100 rounded-b-[3rem] shrink-0">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">Annuler</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {editingMeetingId ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmation Suppression */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
               <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase">Supprimer ?</h3>
            <p className="text-slate-500 mt-2 text-sm font-medium leading-relaxed italic">Cette action retirera définitivement ce compte-rendu.</p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">Confirmer</button>
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase border border-slate-200 hover:bg-slate-100 transition-all">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meetings;