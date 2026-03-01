import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import { 
  Target, 
  Users, 
  BookOpen, 
  Sparkles, 
  ChevronRight, 
  Zap,
  CheckCircle2,
  X,
  Search,
  Check,
  User,
  ShieldCheck,
  Plus,
  ArrowLeft,
  MoreVertical,
  Trash2,
  BarChart3,
  Edit,
  Clock,
  Save,
  MessageCircle,
  Calendar as CalendarIcon,
  UserPlus,
  UserCheck,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Info,
  TrendingDown,
  Activity,
  AlertCircle,
  PieChart as PieIcon,
  Loader2,
  Search as SearchIcon,
  CircleDashed
} from 'lucide-react';
import { Member, MemberType, Visitor, VisitorStatus } from '../types';
import { analyzePageData } from '../lib/gemini';
import { cn, generateId, getInitials, getInitialsFromString, formatFirstName } from '../utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getMembers, getVisitors, getDiscipleshipPairs, createDiscipleshipPair, updateDiscipleshipPair, deleteDiscipleshipPair, getDiscipleshipEnrollments, upsertDiscipleshipEnrollment, deleteDiscipleshipEnrollment } from '../lib/db';

interface Pathway {
  id: string;
  title: string;
  color: string;
  desc: string;
}

interface Enrollment {
  id: string;
  memberId: string;
  pathwayId: string;
  progress: number;
  startDate: string;
  lastUpdate: string;
}

interface DiscipleshipPair {
  id: string;
  mentorId: string;
  mentorName: string;
  discipleId: string;
  discipleName: string;
  startDate: string;
  progress: number;
  status: 'Actif' | 'Terminé' | 'En pause';
  lastMeeting?: string;
}

const PATHWAYS: Pathway[] = [
  { id: 'p1', title: 'Nouveaux Convertis', color: 'bg-emerald-500', desc: "Premiers pas dans la foi et bases bibliques fondamentales." },
  { id: 'p2', title: 'Affermissement', color: 'bg-indigo-500', desc: "Consolidation de la vie de prière et étude de la doctrine." },
  { id: 'p3', title: 'Leadership', color: 'bg-amber-500', desc: "Développement des dons spirituels et gestion de ministère." },
  { id: 'p4', title: 'Service & Ministère', color: 'bg-rose-500', desc: "Mise en pratique et déploiement dans les départements." },
];

const Discipleship: React.FC = () => {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Data States ---
  const [members, setMembers] = useState<Member[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [activePairs, setActivePairs] = useState<DiscipleshipPair[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  useEffect(() => {
    Promise.all([getMembers(), getVisitors(), getDiscipleshipPairs(), getDiscipleshipEnrollments()]).then(([mbrs, vis, pairs, enrolls]) => {
      setMembers(mbrs);
      setVisitors(vis);
      const mappedPairs = pairs.map((p: any) => {
        const mentor = mbrs.find(m => m.id === p.mentorId);
        const disciple = mbrs.find(m => m.id === p.discipleId);
        return {
          ...p,
          mentorName: mentor ? `${formatFirstName(mentor.firstName)} ${mentor.lastName.toUpperCase()}` : p.mentorId,
          discipleName: disciple ? `${formatFirstName(disciple.firstName)} ${disciple.lastName.toUpperCase()}` : p.discipleId,
        };
      });
      setActivePairs(mappedPairs as any);
      setEnrollments(enrolls as Enrollment[]);
      const detailId = new URLSearchParams(window.location.search).get('detail');
      if (detailId) {
        const found = mappedPairs.find((x: any) => x.id === detailId);
        if (found) { setSelectedPair(found as any); setIsPairDetailsOpen(true); }
      }
    });
  }, []);

  // --- UI States ---
  const [selectedPathway, setSelectedPathway] = useState<Pathway | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isPairDetailsOpen, setIsPairDetailsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pairToDeleteId, setPairToDeleteId] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState<DiscipleshipPair | null>(null);
  const [isFidelityModalOpen, setIsFidelityModalOpen] = useState(false);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [mentorSearch, setMentorSearch] = useState('');
  const [discipleSearch, setDiscipleSearch] = useState('');
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  
  // Form states
  const [newEnrollment, setNewEnrollment] = useState({ memberId: '', progress: 0 });
  const [editingPair, setEditingPair] = useState<DiscipleshipPair | null>(null);
  const [pairFormData, setPairFormData] = useState<Partial<DiscipleshipPair>>({
    mentorId: '',
    discipleId: '',
    progress: 0,
    status: 'Actif',
    startDate: new Date().toISOString().split('T')[0]
  });

  // --- Retention Logic ---
  const retentionStats = useMemo(() => {
    if (visitors.length === 0) return { rate: 0, total: 0, integrated: 0, pending: 0, ongoing: 0 };
    
    const integrated = visitors.filter(v => v.status === VisitorStatus.MEMBRE).length;
    const ongoing = visitors.filter(v => v.status === VisitorStatus.CONTACT_1 || v.status === VisitorStatus.RENCONTRE).length;
    const pending = visitors.filter(v => v.status === VisitorStatus.EN_ATTENTE).length;
    
    return {
      rate: Math.round((integrated / visitors.length) * 100),
      total: visitors.length,
      integrated,
      pending,
      ongoing
    };
  }, [visitors]);

  const retentionChartData = useMemo(() => [
    { name: 'Intégrés', value: retentionStats.integrated, color: '#10b981' },
    { name: 'En Suivi', value: retentionStats.ongoing, color: '#6366f1' },
    { name: 'En Attente', value: retentionStats.pending, color: '#f59e0b' },
  ], [retentionStats]);

  const filteredPairs = useMemo(() => {
    return activePairs.filter(pair => 
      pair.mentorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.discipleName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activePairs, searchQuery]);

  // Les enrollments sont désormais persistés dans la table discipleship_enrollments (Supabase)

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzePageData("Discipolat & Mentorat", { pairs: activePairs, enrollments: enrollments, retention: retentionStats });
    setAnalysis(result || null);
    setIsAnalyzing(false);
  };

  const getMemberInfo = (id: string) => members.find(m => m.id === id);

  const getPathwayParticipants = (pathwayId: string) => enrollments.filter(e => e.pathwayId === pathwayId);
  
  const getPathwayProgress = (pathwayId: string) => {
    const participants = getPathwayParticipants(pathwayId);
    return participants.length ? Math.round(participants.reduce((a, c) => a + c.progress, 0) / participants.length) : 0;
  };

  const handleOpenPairDetails = (pair: DiscipleshipPair) => {
    setSelectedPair(pair);
    setIsPairDetailsOpen(true);
    navigate(`?detail=${pair.id}`, { replace: true });
  };

  const handleOpenPairModal = (pair: DiscipleshipPair | null = null) => {
    setIsPairDetailsOpen(false);
    navigate('', { replace: true });
    if (pair) {
      setEditingPair(pair);
      setPairFormData(pair);
      setMentorSearch(pair.mentorName);
      setDiscipleSearch(pair.discipleName);
    } else {
      setEditingPair(null);
      setPairFormData({
        mentorId: '',
        discipleId: '',
        progress: 0,
        status: 'Actif',
        startDate: new Date().toISOString().split('T')[0]
      });
      setMentorSearch('');
      setDiscipleSearch('');
    }
    setIsPairModalOpen(true);
  };

  const handleUpdateMentorSearch = (val: string) => {
    setMentorSearch(val);
    if (pairFormData.mentorId) {
      const currentMember = getMemberInfo(pairFormData.mentorId);
      if (val !== `${formatFirstName(currentMember?.firstName || '')} ${currentMember?.lastName?.toUpperCase()}`) {
        setPairFormData(prev => ({ ...prev, mentorId: '' }));
      }
    }
  };

  const handleUpdateDiscipleSearch = (val: string) => {
    setDiscipleSearch(val);
    if (pairFormData.discipleId) {
      const currentMember = getMemberInfo(pairFormData.discipleId);
      if (val !== `${formatFirstName(currentMember?.firstName || '')} ${currentMember?.lastName?.toUpperCase()}`) {
        setPairFormData(prev => ({ ...prev, discipleId: '' }));
      }
    }
  };

  const handleSavePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairFormData.mentorId || !pairFormData.discipleId) return;
    if (pairFormData.mentorId === pairFormData.discipleId) {
      alert("Le mentor et le disciple doivent être des personnes différentes.");
      return;
    }
    const mentor = getMemberInfo(pairFormData.mentorId!);
    const disciple = getMemberInfo(pairFormData.discipleId!);
    const pairData: DiscipleshipPair = {
      ...(pairFormData as DiscipleshipPair),
      id: editingPair?.id || generateId(),
      mentorName: `${formatFirstName(mentor?.firstName || '')} ${mentor?.lastName?.toUpperCase()}`,
      discipleName: `${formatFirstName(disciple?.firstName || '')} ${disciple?.lastName?.toUpperCase()}`,
    };
    if (editingPair) {
      setActivePairs(prev => prev.map(p => p.id === editingPair.id ? pairData : p));
      if (selectedPair?.id === editingPair.id) setSelectedPair(pairData);
      await updateDiscipleshipPair(editingPair.id, { mentorId: pairData.mentorId, discipleId: pairData.discipleId, startDate: pairData.startDate, progress: pairData.progress, status: pairData.status, lastMeeting: pairData.lastMeeting });
    } else {
      setActivePairs(prev => [pairData, ...prev]);
      await createDiscipleshipPair({ id: pairData.id, mentorId: pairData.mentorId, discipleId: pairData.discipleId, startDate: pairData.startDate, progress: pairData.progress, status: pairData.status, lastMeeting: pairData.lastMeeting });
    }
    setIsPairModalOpen(false);
  };

  const handleDeletePair = (id: string) => {
    setPairToDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeletePair = async () => {
    if (pairToDeleteId) {
      setActivePairs(prev => prev.filter(p => p.id !== pairToDeleteId));
      setIsPairModalOpen(false);
      setIsPairDetailsOpen(false);
      navigate('', { replace: true });
      setIsDeleteConfirmOpen(false);
      setEditingPair(null);
      setSelectedPair(null);
      await deleteDiscipleshipPair(pairToDeleteId);
      setPairToDeleteId(null);
    }
  };

  const handleAddEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPathway || !newEnrollment.memberId) return;

    const isAlreadyEnrolled = enrollments.some(e => e.memberId === newEnrollment.memberId && e.pathwayId === selectedPathway.id);
    if (isAlreadyEnrolled) {
      alert("Ce membre est déjà inscrit dans ce parcours.");
      return;
    }

    const enrollment: Enrollment = {
      id: generateId(),
      memberId: newEnrollment.memberId,
      pathwayId: selectedPathway.id,
      progress: Number(newEnrollment.progress) || 0,
      startDate: new Date().toISOString().split('T')[0],
      lastUpdate: new Date().toISOString().split('T')[0]
    };

    setEnrollments(prev => [...prev, enrollment]);
    await upsertDiscipleshipEnrollment(enrollment);
    setIsEnrollModalOpen(false);
    setNewEnrollment({ memberId: '', progress: 0 });
    setEnrollmentSearch('');
  };

  const handleUpdateProgress = async (enrollmentId: string, newProgress: number) => {
    const lastUpdate = new Date().toISOString().split('T')[0];
    setEnrollments(prev => prev.map(e =>
      e.id === enrollmentId
        ? { ...e, progress: Math.min(100, Math.max(0, newProgress)), lastUpdate }
        : e
    ));
    const updated = enrollments.find(e => e.id === enrollmentId);
    if (updated) {
      await upsertDiscipleshipEnrollment({ ...updated, progress: Math.min(100, Math.max(0, newProgress)), lastUpdate });
    }
  };

  const handleUnenroll = async (enrollmentId: string) => {
    if (window.confirm("Voulez-vous vraiment retirer ce membre du parcours ?")) {
      setEnrollments(prev => prev.filter(e => e.id !== enrollmentId));
      await deleteDiscipleshipEnrollment(enrollmentId);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Centre de Discipolat</h2>
          <p className="text-sm text-slate-500 font-medium italic">Accompagnez chaque fidèle dans sa croissance spirituelle.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Chercher mentor ou disciple..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-300 outline-none text-sm font-normal tracking-wide transition-all shadow-sm w-64"
            />
          </div>
          <button onClick={handleAnalyze} disabled={isAnalyzing} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-medium transition-all shadow-sm hover:bg-indigo-100">
             <Sparkles size={16} className={isAnalyzing ? "animate-pulse" : ""} /> {isAnalyzing ? 'Analyse...' : 'Analyse IA'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <Card title="Binômes Mentorat" icon={<Users size={18} className="text-indigo-600" />} subtitle="Relation un-à-un">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {filteredPairs.length > 0 ? filteredPairs.map((pair) => {
                 const discipleMember = getMemberInfo(pair.discipleId);
                 return (
                   <div 
                    key={pair.id} 
                    onClick={() => handleOpenPairDetails(pair)}
                    className="p-4 bg-white border border-slate-200 rounded-3xl group hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer relative overflow-hidden"
                   >
                     <div className="flex justify-between items-start mb-4 relative z-10">
                       <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-emerald-600 font-semibold text-lg shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                           {discipleMember?.photoUrl ? (
                             <img src={discipleMember.photoUrl} alt="" className="w-full h-full object-cover" />
                           ) : (
                             getInitialsFromString(pair.discipleName)
                           )}
                         </div>
                         <div className="min-w-0">
                           <p className="text-sm font-semibold text-slate-900 tracking-tight truncate w-32">{pair.discipleName}</p>
                           <p className="text-xs text-emerald-600 font-bold">Disciple</p>
                         </div>
                       </div>
                       <span className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded border",
                          pair.status === 'Actif' ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-amber-600 bg-amber-50 border-amber-100"
                       )}>
                          {pair.status}
                       </span>
                     </div>
                     <div className="space-y-3 relative z-10">
                        <div className="flex justify-between text-xs font-semibolder">
                           <span className="text-slate-500 truncate w-40">Mentor : {pair.mentorName}</span>
                           <span className="text-indigo-600">{pair.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${pair.progress}%` }}></div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 text-xs text-slate-400">
                           <Clock size={12} className="text-indigo-300" /> {pair.lastMeeting ? `Vu le ${new Date(pair.lastMeeting).toLocaleDateString('fr-FR')}` : 'Aucune séance'}
                        </div>
                     </div>
                   </div>
                 );
               }) : searchQuery ? (
                 <div className="col-span-full py-12 text-center opacity-30">
                    <SearchIcon size={40} className="mx-auto" />
                    <p className="text-xs font-medium mt-3">Aucun binôme ne correspond à votre recherche</p>
                 </div>
               ) : null}
               {!searchQuery && (
                 <button 
                  onClick={() => handleOpenPairModal()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all gap-3 group min-h-[160px]"
                 >
                   <div className="w-14 h-14 rounded-[1.5rem] bg-slate-50 border border-slate-100 text-slate-300 flex items-center justify-center group-hover:scale-110 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-lg transition-all">
                      <UserPlus size={28} />
                   </div>
                   <span className="text-xs font-medium">Nouveau Binôme</span>
                 </button>
               )}
             </div>
           </Card>

           <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />
        </div>

        <div className="space-y-6">
          <Card title="Parcours" icon={<BookOpen size={18} className="text-indigo-600" />} subtitle="Étapes de maturité">
             <div className="space-y-3">
               {PATHWAYS.map((pathway) => (
                 <div 
                  key={pathway.id} 
                  onClick={() => setSelectedPathway(pathway)}
                  className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 hover:shadow-md transition-all cursor-pointer group"
                 >
                   <div className={cn("w-1.5 h-10 rounded-full shrink-0", pathway.color)}></div>
                   <div className="flex-1 min-w-0">
                     <h4 className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{pathway.title}</h4>
                     <p className="text-xs text-slate-500 font-bold mt-0.5">
                       {getPathwayParticipants(pathway.id).length} inscrits • {getPathwayProgress(pathway.id)}% moy.
                     </p>
                   </div>
                   <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-50 group-hover:translate-x-1 transition-all" />
                 </div>
               ))}
             </div>
          </Card>

          <div 
            onClick={() => setIsFidelityModalOpen(true)}
            className="bg-slate-900 rounded-2xl p-8 text-white overflow-hidden relative group cursor-pointer hover:scale-[1.02] transition-transform shadow-xl shadow-slate-200"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
              <ShieldCheck size={80} />
            </div>
            <div className="relative z-10 space-y-6">
              <div>
                <p className="text-xs font-semibold text-indigo-400 mb-1">Indice de Rétention</p>
                <span className="text-4xl font-bold">{retentionStats.rate}%</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-indigo-300">
                <ChevronRight size={14} /> Voir l'analyse complète
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-over: Détails de Rétention & Fidélité */}
      {isFidelityModalOpen && (
        <div className="fixed inset-0 z-[150] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsFidelityModalOpen(false)} />
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-xl bg-white shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col rounded-l-[3rem]">
              <div className="px-10 py-12 bg-slate-900 text-white rounded-tl-[3rem] shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <ShieldCheck size={180} />
                </div>
                <button onClick={() => setIsFidelityModalOpen(false)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white transition-colors text-white">
                  <ArrowLeft size={24} />
                </button>
                
                <div className="relative z-10 space-y-4">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium">
                    Analyse Stratégique
                  </span>
                  <h3 className="text-3xl font-semibold leading-tight">
                    Indice de Rétention
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    Mesure de la transformation des visiteurs en fidèles
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center">
                    <p className="text-xs font-medium text-slate-500 mb-1">Visiteurs Totaux</p>
                    <p className="text-3xl font-bold text-slate-900">{retentionStats.total}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center">
                    <p className="text-xs font-medium text-slate-500 mb-1">Score de Santé</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className={cn(
                        "text-3xl font-semibold",
                        retentionStats.rate > 60 ? "text-emerald-500" : retentionStats.rate > 30 ? "text-amber-500" : "text-rose-500"
                      )}>{retentionStats.rate}%</span>
                      {retentionStats.rate > 50 ? <TrendingUp size={20} className="text-emerald-500" /> : <TrendingDown size={20} className="text-rose-500" />}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                   <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2 mb-6">
                     <PieIcon size={14} className="text-indigo-600" /> Répartition du Suivi
                   </h4>
                   <div className="h-64 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie
                           data={retentionChartData}
                           cx="50%" cy="50%"
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={5}
                           dataKey="value"
                         >
                           {retentionChartData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                         </Pie>
                         <Tooltip />
                         <Legend verticalAlign="bottom" height={36}/>
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-slate-500">Résumé des indicateurs</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><UserCheck size={16}/></div>
                        <span className="text-xs font-medium text-slate-700">Visiteurs Intégrés</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{retentionStats.integrated}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Activity size={16}/></div>
                        <span className="text-xs font-medium text-slate-700">Suivi en cours</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{retentionStats.ongoing}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><Clock size={16}/></div>
                        <span className="text-xs font-medium text-slate-700">En attente (Risque)</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{retentionStats.pending}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-3">
                   <div className="flex items-center gap-2">
                     <Sparkles size={18} className="text-indigo-600" />
                     <h4 className="text-xs font-semibold text-indigo-800">Conseil Stratégique Vinea</h4>
                   </div>
                   <p className="text-xs text-indigo-700 font-medium leading-relaxed italic">
                     {retentionStats.rate < 40 
                       ? "Votre taux de rétention est faible. Nous recommandons d'augmenter le nombre de binômes de mentorat pour les nouveaux convertis afin de stabiliser l'assemblée."
                       : "Bonne dynamique d'intégration. Continuez à automatiser les rappels de suivi pour ne perdre aucun visiteur en phase d'attente."}
                   </p>
                </div>
              </div>

              <div className="p-10 border-t border-slate-100 bg-white shrink-0">
                <button 
                  onClick={() => setIsFidelityModalOpen(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-medium hover:bg-slate-800 transition-all shadow-xl"
                >
                  Fermer l'Analyse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Détails du Binôme */}
      {isPairDetailsOpen && selectedPair && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => { setIsPairDetailsOpen(false); navigate('', { replace: true }); }} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-2xl overflow-hidden max-h-[90vh]">
              <div className="px-10 py-12 bg-indigo-600 text-white shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Users size={180} />
                </div>
                <button onClick={() => { setIsPairDetailsOpen(false); navigate('', { replace: true }); }} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white transition-colors">
                  <ArrowLeft size={24} />
                </button>
                
                <div className="relative z-10 space-y-4">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium">
                    Binôme de Mentorat
                  </span>
                  <h3 className="text-3xl font-semibold leading-tight tracking-tighter">
                    {selectedPair.discipleName} & {selectedPair.mentorName}
                  </h3>
                  <div className="flex items-center gap-2 text-indigo-100">
                    <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded uppercase border border-white/20",
                        selectedPair.status === 'Actif' ? "bg-emerald-50/50" : "bg-amber-50/50"
                    )}>
                      {selectedPair.status}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-indigo-300 mx-2"></span>
                    <span className="text-xs font-bold">Débuté le {new Date(selectedPair.startDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                   <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-3">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-semibold text-2xl shadow-sm overflow-hidden">
                        {getMemberInfo(selectedPair.discipleId)?.photoUrl ? (
                          <img src={getMemberInfo(selectedPair.discipleId)!.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getInitialsFromString(selectedPair.discipleName)
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Disciple</p>
                        <p className="text-sm font-semibold text-slate-800 tracking-tight">{selectedPair.discipleName}</p>
                      </div>
                   </div>
                   <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-3">
                      <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-2xl shadow-sm overflow-hidden">
                        {getMemberInfo(selectedPair.mentorId)?.photoUrl ? (
                          <img src={getMemberInfo(selectedPair.mentorId)!.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getInitialsFromString(selectedPair.mentorName)
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Mentor</p>
                        <p className="text-sm font-semibold text-slate-800 tracking-tight">{selectedPair.mentorName}</p>
                      </div>
                   </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                   <div className="flex items-center justify-between">
                      <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
                        <TrendingUp size={14} className="text-indigo-600" /> État de la croissance
                      </h4>
                      <span className="text-xl font-semibold text-indigo-600">{selectedPair.progress}%</span>
                   </div>
                   <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-1000" style={{ width: `${selectedPair.progress}%` }}></div>
                   </div>
                   <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><Clock size={16} /></div>
                         <div>
                            <p className="text-xs font-medium text-slate-500">Dernier rdv</p>
                            <p className="text-xs font-bold text-slate-700">{selectedPair.lastMeeting ? new Date(selectedPair.lastMeeting).toLocaleDateString() : '---'}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><CalendarIcon size={16} /></div>
                         <div>
                            <p className="text-xs font-medium text-slate-500">Durée</p>
                            <p className="text-xs font-bold text-slate-700">~ {Math.floor((new Date().getTime() - new Date(selectedPair.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} mois</p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4">
                   <Info size={20} className="text-amber-500 shrink-0 mt-0.5" />
                   <p className="text-xs text-amber-700 font-medium leading-relaxed">
                     Le mentorat est une relation sacrée de transmission. Encouragez le binôme à se rencontrer au moins une fois toutes les deux semaines.
                   </p>
                </div>
              </div>

              <div className="p-10 border-t border-slate-100 bg-white flex gap-4 shrink-0">
                <button 
                  onClick={() => handleOpenPairModal(selectedPair)}
                  className="flex-1 py-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl text-xs font-medium hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  <Edit size={16} /> Modifier le suivi
                </button>
                <button 
                  onClick={() => handleDeletePair(selectedPair.id)}
                  className="px-6 py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-xs font-medium hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Modal: Formulaire Binôme */}
      {isPairModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsPairModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="bg-indigo-600 p-8 text-white relative shrink-0">
               <button onClick={() => setIsPairModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
               <h3 className="text-xl font-semibold">{editingPair ? 'Modifier le Binôme' : 'Nouveau Binôme'}</h3>
            </div>
            <form onSubmit={handleSavePair} className="flex-1 p-8 space-y-6 bg-slate-50/30 overflow-y-auto custom-scrollbar">
               <div className="space-y-5">
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-medium text-slate-500 ml-1 flex items-center gap-2">
                      <User size={12} className="text-indigo-600" /> Mentor (Accompagnateur)
                    </label>
                    <div className="relative group">
                       <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
                       <input 
                        type="text" required
                        placeholder="Rechercher un membre..."
                        value={mentorSearch}
                        onChange={(e) => handleUpdateMentorSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-normal focus:ring-4 focus:ring-indigo-500/5 transition-all"
                       />
                    </div>
                    {mentorSearch && !pairFormData.mentorId && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl custom-scrollbar">
                        {members.filter(m => m.type !== MemberType.MEMBRE_SIMPLE && `${m.firstName} ${m.lastName}`.toLowerCase().includes(mentorSearch.toLowerCase())).map(m => (
                          <button 
                            key={m.id} type="button"
                            onClick={() => { setPairFormData({...pairFormData, mentorId: m.id}); setMentorSearch(`${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`); }}
                            className="w-full text-left px-4 py-3 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border-b border-slate-50 last:border-0 flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-medium overflow-hidden">
                              {m.photoUrl ? (
                                <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                getInitials(m.firstName, m.lastName)
                              )}
                            </div>
                            {formatFirstName(m.firstName)} {m.lastName.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-medium text-slate-500 ml-1 flex items-center gap-2">
                      <Zap size={12} className="text-indigo-600" /> Disciple (Fidèle accompagné)
                    </label>
                    <div className="relative group">
                       <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
                       <input 
                        type="text" required
                        placeholder="Rechercher un fidèle..."
                        value={discipleSearch}
                        onChange={(e) => handleUpdateDiscipleSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-normal focus:ring-4 focus:ring-indigo-500/5 transition-all"
                       />
                    </div>
                    {discipleSearch && !pairFormData.discipleId && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl custom-scrollbar">
                        {members.filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(discipleSearch.toLowerCase())).map(m => (
                          <button 
                            key={m.id} type="button"
                            onClick={() => { setPairFormData({...pairFormData, discipleId: m.id}); setDiscipleSearch(`${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`); }}
                            className="w-full text-left px-4 py-3 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border-b border-slate-50 last:border-0 flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-medium overflow-hidden">
                              {m.photoUrl ? (
                                <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                getInitials(m.firstName, m.lastName)
                              )}
                            </div>
                            {formatFirstName(m.firstName)} {m.lastName.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-xs font-medium text-slate-500 ml-1">Date début</label>
                       <input type="date" required value={pairFormData.startDate} onChange={(e) => setPairFormData({...pairFormData, startDate: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-bold" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-xs font-medium text-slate-500 ml-1">Progression (%)</label>
                       <input type="number" min="0" max="100" value={pairFormData.progress} onChange={(e) => setPairFormData({...pairFormData, progress: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-semibold text-indigo-600" />
                    </div>
                  </div>
               </div>

               <div className="flex gap-3 pt-6">
                  {editingPair && (
                    <button type="button" onClick={() => handleDeletePair(editingPair.id)} className="p-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl hover:bg-rose-100 transition-colors">
                      <Trash2 size={22} />
                    </button>
                  )}
                  <button type="submit" disabled={!pairFormData.mentorId || !pairFormData.discipleId} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
                     <Save size={20} className="inline mr-2" /> Enregistrer
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Side-over: Parcours */}
      {selectedPathway && (
        <div className="fixed inset-0 z-[150] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500" onClick={() => setSelectedPathway(null)} />
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-lg bg-white shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col rounded-l-[3rem]">
              <div className={cn("px-10 py-12 text-white rounded-tl-[3rem] shrink-0 relative overflow-hidden", selectedPathway.color)}>
                <button onClick={() => setSelectedPathway(null)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white">
                  <ArrowLeft size={24} />
                </button>
                <div className="relative z-10 space-y-4">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium">Programme</span>
                  <h3 className="text-3xl font-semibold leading-tight">{selectedPathway.title}</h3>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                <p className="text-sm font-semibold text-slate-900">{getPathwayParticipants(selectedPathway.id).length} inscrits</p>
                <button 
                  onClick={() => { setEnrollmentSearch(''); setNewEnrollment({ memberId: '', progress: 0 }); setIsEnrollModalOpen(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-medium"
                >
                  <UserPlus size={16} /> Inscrire
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-6 bg-slate-50/30">
                {getPathwayParticipants(selectedPathway.id).map(enrollment => {
                  const m = getMemberInfo(enrollment.memberId);
                  return (
                    <div key={enrollment.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-600 font-semibold text-xs overflow-hidden">
                            {m?.photoUrl ? (
                              <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(m?.firstName, m?.lastName)
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 tracking-tight">
                              {formatFirstName(m?.firstName || '')} <span className="uppercase">{m?.lastName}</span>
                            </p>
                            <p className="text-xs text-slate-400">Le {new Date(enrollment.startDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button onClick={() => handleUnenroll(enrollment.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
                      </div>
                      <div className="space-y-3">
                         <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                            <span>Progression</span>
                            <span className="text-indigo-600">{enrollment.progress}%</span>
                         </div>
                         <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600" style={{ width: `${enrollment.progress}%` }}></div>
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inscription Parcours */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsEnrollModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="bg-indigo-600 p-8 text-white relative">
               <button onClick={() => setIsEnrollModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
               <h3 className="text-xl font-semibold">Inscription</h3>
               <p className="text-xs font-bold text-indigo-100 mt-1">{selectedPathway?.title}</p>
            </div>
            <form onSubmit={handleAddEnrollment} className="p-8 space-y-6">
               <div className="space-y-4">
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-medium text-slate-500 ml-1">Fidèle</label>
                    <input 
                      type="text" placeholder="Chercher un membre..."
                      value={enrollmentSearch}
                      onChange={(e) => { setEnrollmentSearch(e.target.value); if (newEnrollment.memberId) setNewEnrollment({ ...newEnrollment, memberId: '' }); }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold"
                    />
                    {enrollmentSearch && !newEnrollment.memberId && (
                      <div className="max-h-40 overflow-y-auto mt-2 border border-slate-100 rounded-2xl shadow-xl bg-white absolute z-10 w-full custom-scrollbar">
                        {members.filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(enrollmentSearch.toLowerCase())).map(m => (
                          <button 
                            key={m.id} type="button"
                            onClick={() => { setNewEnrollment({...newEnrollment, memberId: m.id}); setEnrollmentSearch(`${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`); }}
                            className="w-full text-left px-4 py-3 text-xs font-medium hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-medium overflow-hidden">
                              {m.photoUrl ? (
                                <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                getInitials(m.firstName, m.lastName)
                              )}
                            </div>
                            {formatFirstName(m.firstName)} {m.lastName.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 ml-1">Progression (%)</label>
                    <input type="number" min="0" max="100" value={newEnrollment.progress} onChange={(e) => setNewEnrollment({...newEnrollment, progress: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-semibold text-indigo-600" />
                  </div>
               </div>
               <button type="submit" disabled={!newEnrollment.memberId} className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
                  Valider l'inscription
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Compact Width */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 text-center border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900">Dissoudre ?</h3>
            <p className="text-slate-500 mt-2 text-sm font-medium leading-relaxed italic">
              Voulez-vous vraiment mettre fin à ce binôme de mentorat ? Cette action est irréversible.
            </p>
            <div className="flex flex-col gap-3 mt-8">
              <button 
                onClick={confirmDeletePair} 
                className="w-full py-4 bg-rose-600 text-white rounded-2xl text-xs font-medium shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
              >
                Confirmer la dissolution
              </button>
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)} 
                className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-xs font-medium border border-slate-200 hover:bg-slate-100 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Discipleship;