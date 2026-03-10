import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../context/PermissionsContext';
import MeetingEditModal, { Meeting } from '../components/MeetingEditModal';
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
import { analyzePageData } from '../lib/gemini';
import { cn, getInitials, formatFirstName } from '../utils';
import { Member, MemberType } from '../types';
import { getMeetings, deleteMeeting, getMembers } from '../lib/db';


const Meetings: React.FC = () => {
  const navigate = useNavigate();
  const { canDelete } = usePermissions();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    Promise.all([
      getMeetings().then(data => data.map((m: any) => ({ ...m, aiPV: m.aiPv }))),
      getMembers(),
    ]).then(([mtgs, mbrs]) => {
      setMeetings(mtgs as any);
      setMembers(mbrs);
    });
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toutes');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Nouvel état pour le suivi des présences
  const [isAttendanceTrackerOpen, setIsAttendanceTrackerOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [meetingToDeleteId, setMeetingToDeleteId] = useState<string | null>(null);

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

  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = selectedCategory === 'Toutes' || m.category === selectedCategory;
      return matchesSearch && matchesCat;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [meetings, searchTerm, selectedCategory]);

  const handleModalSave = (saved: Meeting) => {
    setMeetings(prev =>
      prev.find(m => m.id === saved.id)
        ? prev.map(m => m.id === saved.id ? saved : m)
        : [saved, ...prev]
    );
    setIsFormOpen(false);
    setEditingMeeting(null);
  };

  const confirmDelete = async () => {
    if (meetingToDeleteId) {
      setMeetings(meetings.filter(m => m.id !== meetingToDeleteId));
      setIsDeleteConfirmOpen(false);
      await deleteMeeting(meetingToDeleteId);
      setMeetingToDeleteId(null);
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
          <h2 className="text-2xl font-bold text-slate-900">Gestion des Réunions</h2>
          <p className="text-sm text-slate-500 font-medium italic">Organisez vos comités et archivez vos décisions stratégiques.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAnalyze} disabled={isAnalyzing || meetings.length === 0} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-all disabled:opacity-50">
            <Sparkles size={16} /> {isAnalyzing ? 'Analyse...' : 'Synthèse Stratégique IA'}
          </button>
          <button onClick={() => { setEditingMeeting(null); setIsFormOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            <Plus size={18} /> Nouvelle Réunion
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Réunions" subtitle="En cours" icon={<Calendar size={20} className="text-indigo-600" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-semibold">{meetings.filter(m => m.status === 'Programmé').length}</span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Actives</span>
          </div>
        </Card>
        <Card title="Décisions" subtitle="Actions à suivre" icon={<CheckSquare size={20} className="text-amber-500" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-amber-600">{pendingDecisions.length}</span>
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
          </div>
        </Card>
        <Card title="Quorum Moyen" subtitle="Fidélité leaders" icon={<UsersRound size={20} className="text-indigo-600" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-semibold">{meetings.length > 0 ? `${Math.round(meetings.reduce((acc, m) => acc + calculateQuorum(m.attendeeIds), 0) / meetings.length)}%` : '--'}</span>
            <span className="text-xs font-medium text-slate-500">Score</span>
          </div>
        </Card>
        <Card title="Documentation" subtitle="PV Archivés" icon={<FileText size={20} className="text-emerald-600" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-emerald-600">{finishedMeetings.length}</span>
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
        </Card>
      </div>

      <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-slate-500">Agenda & Archives</h3>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all bg-white shadow-sm w-48 md:w-64" />
            </div>
          </div>

          {filteredMeetings.length > 0 && (searchTerm || selectedCategory !== 'Toutes') && (
            <p className="text-xs text-slate-400 font-medium -mt-2">
              {filteredMeetings.length} réunion{filteredMeetings.length > 1 ? 's' : ''} trouvée{filteredMeetings.length > 1 ? 's' : ''}
            </p>
          )}

          <div className="space-y-4">
            {filteredMeetings.length > 0 ? filteredMeetings.map((meeting) => (
              <div key={meeting.id} onClick={() => navigate(`/meetings/${meeting.id}`)} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col md:flex-row hover:border-indigo-300 transition-all group shadow-sm cursor-pointer active:scale-[0.99]">
                <div className={cn("md:w-32 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 shrink-0", meeting.status === 'Terminé' ? "bg-slate-50" : "bg-indigo-50/30")}>
                  <span className="text-xs font-medium text-slate-500">{new Date(meeting.date).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}</span>
                  <span className="text-3xl font-semibold text-slate-800 leading-none my-1">{new Date(meeting.date).getDate()}</span>
                  <span className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1"><Clock size={10} /> {meeting.time}</span>
                </div>
                <div className="flex-1 p-6 flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium border border-slate-200">{meeting.category}</span>
                      <span className={cn("px-2 py-0.5 rounded-lg text-xs font-medium", meeting.status === 'Terminé' ? "bg-slate-100 text-slate-400" : "bg-emerald-100 text-emerald-700")}>{meeting.status}</span>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">{meeting.title}</h4>
                    <div className="flex items-center gap-4">
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 font-bold"><MapPin size={12} className="text-rose-500" /> {meeting.location}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 font-bold"><Users size={12} className="text-indigo-500" /> {meeting.attendeeIds.length} Présents</p>
                      {meeting.absenteeIds?.length > 0 && <p className="text-xs text-rose-400 flex items-center gap-1.5 font-bold"><UserX size={12} /> {meeting.absenteeIds.length} Absents</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                     <div className="flex -space-x-2">
                       {meeting.attendeeIds.slice(0, 3).map(id => {
                         const m = members.find(mem => mem.id === id);
                         return (
                           <div key={id} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-400 overflow-hidden shadow-sm">
                             {m?.photoUrl ? (
                               <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                             ) : (
                               getInitials(m?.firstName, m?.lastName)
                             )}
                           </div>
                         );
                       })}
                       {meeting.attendeeIds.length > 3 && (
                         <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">+{meeting.attendeeIds.length - 3}</div>
                       )}
                     </div>
                     <div className="text-right">
                        <p className="text-xs font-medium text-slate-500">Résolutions</p>
                        <p className="text-xs font-semibold text-slate-800">{(meeting.decisions?.filter(d => d.status === 'Réalisé').length || 0)} / {(meeting.decisions?.length || 0)}</p>
                     </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-2xl"><UsersRound size={48} className="mx-auto text-slate-100 mb-4" /><p className="text-sm font-bold text-slate-400 italic">Aucune réunion au registre.</p></div>
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
                    <p className="text-xs font-semibold text-slate-800 truncate">{decision.label}</p>
                    <p className="text-xs text-slate-400 mt-1">Réunion : {decision.meetingTitle}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${decision.meetingId}`); }} className="text-indigo-600 hover:text-indigo-800"><ChevronRight size={14}/></button>
                </div>
              ))}
              {pendingDecisions.length === 0 && (
                <div className="py-8 text-center text-slate-300 italic text-xs">Toutes les résolutions sont traitées</div>
              )}
            </div>
          </Card>

          <div 
            onClick={() => setIsAttendanceTrackerOpen(true)}
            className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden group shadow-xl cursor-pointer hover:scale-[1.02] transition-all"
          >
             <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform"><UserCheck size={80} className="text-emerald-400"/></div>
             <p className="text-xs font-medium text-indigo-400">Suivi Présences</p>
             <h3 className="text-2xl font-semibold mt-2">Zéro absent oublié.</h3>
             
             {lastMeetingRecorded && lastMeetingRecorded.absenteeIds?.length > 0 && (
               <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                  <p className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle size={10} /> {lastMeetingRecorded.absenteeIds.length} Absents lors du dernier comité
                  </p>
                  <div className="flex -space-x-1.5">
                     {lastMeetingRecorded.absenteeIds.slice(0, 5).map(id => {
                       const m = members.find(mem => mem.id === id);
                       return (
                         <div key={id} className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-xs font-semibold text-rose-300 shadow-sm uppercase overflow-hidden">
                           {m?.photoUrl ? (
                             <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                           ) : (
                             getInitials(m?.firstName, m?.lastName)
                           )}
                         </div>
                       );
                     })}
                     {lastMeetingRecorded.absenteeIds.length > 5 && (
                       <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[6px] font-semibold">+{lastMeetingRecorded.absenteeIds.length - 5}</div>
                     )}
                  </div>
               </div>
             )}

             {criticalAbsenteesCount > 0 && (
               <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 rounded-xl border border-rose-500/30 w-fit">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                  <span className="text-xs font-semibold text-rose-100">{criticalAbsenteesCount} alertes de désengagement</span>
               </div>
             )}

             <p className="text-xs font-bold text-slate-500 mt-4 leading-relaxed">Identifiez les leaders qui s'éloignent de leurs responsabilités pour une restauration pastorale.</p>
             <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-indigo-300">
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
                  <span className="px-3 py-1 bg-indigo-600 rounded-full text-xs font-medium">Dashboard Gouvernance</span>
                  <h3 className="text-3xl font-semibold leading-tight">Suivi d'Assiduité</h3>
                  <p className="text-xs text-slate-400 font-bold">Analyse de la fidélité des membres aux réunions</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 space-y-8">
                 <div className="space-y-4">
                    <h4 className="text-xs font-medium text-slate-700 flex items-center gap-2">
                       <TrendingDown size={16} className="text-rose-500" /> Alertes de désengagement
                    </h4>
                    <div className="space-y-3">
                       {attendanceStats.filter(s => s.rate < 60 && s.total > 1).map(stat => (
                         <div key={stat.id} className="bg-white p-5 rounded-xl border border-rose-100 shadow-sm flex items-center justify-between group hover:border-rose-300 transition-all">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-lg font-semibold text-rose-600 uppercase overflow-hidden">
                                  {stat.photoUrl ? (
                                    <img src={stat.photoUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    getInitials(stat.firstName, stat.lastName)
                                  )}
                               </div>
                               <div>
                                  <p className="text-sm font-semibold text-slate-800 leading-none">{stat.name}</p>
                                  <p className="text-xs font-medium text-rose-500 mt-1.5">{stat.type} • {stat.absent} absences</p>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-xl font-semibold text-rose-600">{stat.rate}%</p>
                               <span className="text-xs text-slate-400">Assiduité</span>
                            </div>
                         </div>
                       ))}
                       {attendanceStats.filter(s => s.rate < 60 && s.total > 1).length === 0 && (
                         <p className="text-xs text-slate-400 italic text-center py-4">Aucune alerte critique détectée.</p>
                       )}
                    </div>
                 </div>

                 <div className="space-y-4 pt-4 border-t border-slate-200">
                    <h4 className="text-xs font-medium text-slate-700 flex items-center gap-2">
                       <CheckCircle size={16} className="text-emerald-500" /> Leaders les plus assidus
                    </h4>
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                       <table className="w-full text-left">
                          <thead>
                             <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-medium text-slate-500">Collaborateur</th>
                                <th className="px-6 py-4 text-xs font-medium text-slate-500 text-center">Score</th>
                                <th className="px-6 py-4 text-xs font-medium text-slate-500 text-right">Moyenne</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                             {attendanceStats.slice(0, 10).map((stat) => (
                               <tr key={stat.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 overflow-hidden">
                                           {stat.photoUrl ? (
                                             <img src={stat.photoUrl} alt="" className="w-full h-full object-cover" />
                                           ) : (
                                             getInitials(stat.firstName, stat.lastName)
                                           )}
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-slate-800 tracking-tighter">{stat.name}</p>
                                          <p className="text-xs text-slate-400">{stat.type}</p>
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
                                       "text-xs font-semibold px-2 py-1 rounded uppercase",
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
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-medium hover:bg-slate-800 shadow-xl"
                >
                  Fermer le Suivi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Modal: Nouvelle Réunion / Formulaire complet */}
      {isFormOpen && (
        <MeetingEditModal
          meeting={editingMeeting}
          allMembers={members}
          onSave={handleModalSave}
          onClose={() => { setIsFormOpen(false); setEditingMeeting(null); }}
        />
      )}


      {/* Modal: Confirmation Suppression */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 text-center border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
               <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Supprimer ?</h3>
            <p className="text-slate-500 mt-2 text-sm font-medium leading-relaxed italic">Cette action retirera définitivement ce compte-rendu.</p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-xs font-medium shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">Confirmer</button>
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-xs font-medium border border-slate-200 hover:bg-slate-100 transition-all">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meetings;
