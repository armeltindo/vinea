import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import { 
  Flame, 
  Target, 
  Plus, 
  Search, 
  History, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Save, 
  Loader2, 
  Trophy, 
  TrendingUp, 
  AlertTriangle, 
  ListChecks, 
  CheckCircle,
  Check,
  ShieldCheck,
  UserPlus,
  ArrowRight,
  CircleDashed,
  Users,
  ChevronRight,
  ChevronDown,
  ClipboardCheck,
  Calendar,
  ChevronLeft,
  Lock,
  Zap,
  Star,
  Edit
} from 'lucide-react';
import { analyzePageData } from '../lib/gemini';
import { cn, generateId, formatFirstName, getInitials, getDisplayNickname } from '../utils';
import { Member, MemberType, SpiritualExerciseDef, YearlySpiritualGoals, MonthlySpiritualPoint, SpiritualObjective } from '../types';
import { SPIRITUAL_EXERCISES_LIST } from '../constants';
import { getMembers, getSpiritualGoals, getSpiritualPoints, upsertSpiritualGoals, upsertSpiritualPoints } from '../lib/db';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/**
 * Calcule le score en fusionnant les retraites (nombre et durée)
 */
const calculateMergedScore = (results: Record<string, boolean>) => {
  const normalKeys = Object.keys(results).filter(k => k !== 'retraites_nb' && k !== 'retraites_hr');
  let score = normalKeys.filter(k => results[k] === true).length;
  
  if (results['retraites_nb'] === true || results['retraites_hr'] === true) {
    score += 1;
  }
  
  return score;
};

const SpiritualGrowth: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [yearlyGoals, setYearlyGoals] = useState<YearlySpiritualGoals[]>([]);
  const [monthlyPoints, setMonthlyPoints] = useState<MonthlySpiritualPoint[]>([]);

  useEffect(() => {
    Promise.all([getMembers(), getSpiritualGoals(), getSpiritualPoints()]).then(([mbrs, goals, points]) => {
      setMembers(mbrs);
      setYearlyGoals(goals as any);
      setMonthlyPoints(points as any);
    });
  }, []);

  const [isNewGoalModalOpen, setIsNewGoalModalOpen] = useState(false);
  const [isPointModalOpen, setIsPointModalOpen] = useState(false);
  const [isEditGoalsModalOpen, setIsEditGoalsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [editingPoint, setEditingPoint] = useState<MonthlySpiritualPoint | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const today = new Date();
  const currentYear = today.getFullYear();


  // Liste des membres qui ont des objectifs pour l'année en cours
  const trackedMembers = useMemo(() => {
    const idsWithGoals = new Set(yearlyGoals.filter(g => g.year === currentYear).map(g => g.memberId));
    return members.filter(m => idsWithGoals.has(m.id))
      .filter(m => {
        const search = searchTerm.toLowerCase();
        return `${m.firstName} ${m.lastName}`.toLowerCase().includes(search) || 
               (m.nickname || '').toLowerCase().includes(search);
      });
  }, [members, yearlyGoals, currentYear, searchTerm]);

  const staffMemberTypes = [
    MemberType.PASTEUR, 
    MemberType.ASSISTANT, 
    MemberType.CO_DIRIGEANT, 
    MemberType.OUVRIER
  ];

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const data = {
      trackedCount: trackedMembers.length,
      totalGoals: yearlyGoals.length,
      averageScore: monthlyPoints.length > 0 ? (monthlyPoints.reduce((acc, p) => acc + p.score, 0) / monthlyPoints.length).toFixed(1) : 0,
    };
    const result = await analyzePageData("Croissance Spirituelle", data);
    setAnalysis(result || null);
    setIsAnalyzing(false);
  };

  const handleSaveGoals = (memberId: string, goalsData: SpiritualObjective[]) => {
    const existingGoal = yearlyGoals.find(g => g.memberId === memberId && g.year === currentYear);
    const newGoals: YearlySpiritualGoals = {
      id: existingGoal?.id || generateId(),
      memberId,
      year: currentYear,
      objectives: goalsData,
      createdAt: existingGoal?.createdAt || new Date().toISOString()
    };
    setYearlyGoals(prev => {
      const filtered = prev.filter(g => !(g.memberId === memberId && g.year === currentYear));
      return [newGoals, ...filtered];
    });
    upsertSpiritualGoals(newGoals);
    setIsNewGoalModalOpen(false);
    setIsEditGoalsModalOpen(false);
  };

  const handleSavePoint = (results: Record<string, boolean>, month: number, year: number) => {
    const score = calculateMergedScore(results);
    const newPoint: MonthlySpiritualPoint = {
      id: editingPoint?.id || generateId(),
      memberId: selectedMemberId,
      month,
      year,
      results,
      score,
      createdAt: editingPoint?.createdAt || new Date().toISOString()
    };
    setMonthlyPoints(prev => {
      const filtered = prev.filter(p => !(p.memberId === selectedMemberId && p.month === month && p.year === year));
      return [newPoint, ...filtered];
    });
    upsertSpiritualPoints(newPoint);
    setIsPointModalOpen(false);
    setEditingPoint(null);
  };

  const openEditPoint = (point: MonthlySpiritualPoint) => {
    setEditingPoint(point);
    setIsPointModalOpen(true);
    setIsHistoryModalOpen(false); // On ferme l'historique pour laisser place à l'édition
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Flame className="text-indigo-600" size={28} />
            Spirituel
          </h2>
          <p className="text-sm text-slate-500 font-medium italic">Discipline et croissance spirituelle des membres.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAnalyze} disabled={isAnalyzing} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-medium disabled:opacity-50 transition-all hover:bg-indigo-100">
            <Sparkles size={16} /> {isAnalyzing ? '...' : 'Analyse IA'}
          </button>
          <button 
            onClick={() => setIsNewGoalModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Plus size={18} /> Définir un objectif
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Membres suivis" subtitle={`Objectifs ${currentYear} fixés`} icon={<Target size={20} className="text-indigo-600" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-slate-900">{trackedMembers.length}</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
               <History size={20} />
            </div>
          </div>
        </Card>
        <Card title="Bilans (M-1)" subtitle="Ouvriers à jour" icon={<ClipboardCheck size={20} className="text-emerald-500" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-emerald-600">
              {monthlyPoints.filter(p => p.month === (new Date().getMonth() - 1 < 0 ? 11 : new Date().getMonth() - 1)).length}
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Mensuel</span>
          </div>
        </Card>
        <Card title="Engagement Moyen" subtitle="Exercices validés par mois" icon={<Trophy size={20} className="text-amber-500" />}>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-semibold text-amber-500">
              {monthlyPoints.length > 0 ? (monthlyPoints.reduce((a, b) => a + b.score, 0) / monthlyPoints.length).toFixed(1) : 0}
            </span>
            <TrendingUp size={24} className="text-amber-500 mb-1" />
          </div>
        </Card>
      </div>

      <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />

      <Card title="Registre de Suivi" icon={<Users size={18} />} subtitle="Cliquez sur une ligne pour voir l'historique détaillé">
        <div className="mb-6 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
          <input 
            type="text" placeholder="RECHERCHER DANS LE SUIVI..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none text-sm font-normal tracking-wide focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
          />
        </div>
        
        <div className="space-y-4">
          {trackedMembers.length > 0 ? trackedMembers.map(member => {
            const points = monthlyPoints
              .filter(p => p.memberId === member.id && p.year === currentYear)
              .sort((a, b) => a.month - b.month);
            
            const lastPoint = points.length > 0 ? points[points.length - 1] : null;
            const isStaff = staffMemberTypes.includes(member.type);

            return (
              <div 
                key={member.id} 
                onClick={() => { setSelectedMemberId(member.id); setIsHistoryModalOpen(true); }}
                className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6 group hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-4 w-full lg:w-auto">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-semibold text-xl overflow-hidden shadow-inner group-hover:scale-105 transition-transform shrink-0 relative group/photo">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(member.firstName, member.lastName)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate tracking-tight">
                      {formatFirstName(member.firstName)} <span className="uppercase">{member.lastName}</span>
                    </h4>
                    <p className="text-xs text-slate-400 font-bold">{getDisplayNickname(member.firstName, member.nickname, member.gender)}</p>
                    
                    <div className="mt-3 flex flex-wrap gap-2 items-center">
                       {points.length > 0 ? (
                         <>
                           <span className="text-xs font-medium text-slate-500 mr-1">Points :</span>
                           {points.slice(-4).map(p => (
                             <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-full">
                                <span className="text-xs font-medium text-slate-500">{MONTHS[p.month].substring(0, 3)}.</span>
                                <span className={cn("text-xs font-semibold", p.score >= 5 ? "text-emerald-600" : p.score >= 3 ? "text-amber-500" : "text-rose-500")}>{p.score}</span>
                             </div>
                           ))}
                           {points.length > 4 && <span className="text-xs font-semibold text-indigo-400">...</span>}
                         </>
                       ) : (
                         <span className="text-xs font-bold text-slate-300 italic">En attente de premier bilan</span>
                       )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end" onClick={e => e.stopPropagation()}>
                  <div className="hidden lg:flex items-center gap-2 mr-4 px-4 py-2 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">{member.type}</span>
                    {lastPoint && (
                      <span className="text-xs font-semibold text-slate-600er">Score : {lastPoint.score}</span>
                    )}
                  </div>

                  <button 
                    onClick={() => { setSelectedMemberId(member.id); setIsEditGoalsModalOpen(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all text-xs font-medium"
                  >
                    <Target size={16} /> Objectifs
                  </button>

                  {isStaff && (
                    <button 
                      onClick={() => { setSelectedMemberId(member.id); setEditingPoint(null); setIsPointModalOpen(true); }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                      <ListChecks size={16} /> Point Mensuel
                    </button>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="py-24 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
               <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                  <CircleDashed size={32} className="text-slate-200" />
               </div>
               <p className="text-sm font-semibold text-slate-400">Aucun membre en suivi</p>
               <p className="text-xs text-slate-400 font-bold mt-2 max-w-xs mx-auto leading-relaxed">Cliquez sur "Définir un objectif" pour ajouter un fidèle au registre de croissance spirituelle.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Modal: Historique de Fidélité */}
      {isHistoryModalOpen && selectedMemberId && (
        <MemberSpiritualHistoryModal 
          member={members.find(m => m.id === selectedMemberId)!} 
          allPoints={monthlyPoints.filter(p => p.memberId === selectedMemberId)}
          onEditPoint={openEditPoint}
          onClose={() => setIsHistoryModalOpen(false)}
        />
      )}

      {/* Modal: Nouveau Flux (Recherche + Objectifs) */}
      {isNewGoalModalOpen && (
        <NewGoalWizard 
          members={members}
          onClose={() => setIsNewGoalModalOpen(false)}
          onSave={handleSaveGoals}
        />
      )}

      {/* Modal: Modification des Objectifs */}
      {isEditGoalsModalOpen && selectedMemberId && (
        <GoalsFormModal 
          member={members.find(m => m.id === selectedMemberId)!} 
          currentGoals={yearlyGoals.find(g => g.memberId === selectedMemberId && g.year === currentYear)}
          onClose={() => setIsEditGoalsModalOpen(false)}
          onSave={(data) => handleSaveGoals(selectedMemberId, data)}
        />
      )}

      {/* Modal: Réalisation/Modification du Point Mensuel */}
      {isPointModalOpen && selectedMemberId && (
        <MonthlyPointModal 
          member={members.find(m => m.id === selectedMemberId)!} 
          goals={yearlyGoals.find(g => g.memberId === selectedMemberId && g.year === currentYear)}
          editingPoint={editingPoint}
          onClose={() => { setIsPointModalOpen(false); setEditingPoint(null); }}
          onSave={handleSavePoint}
        />
      )}
    </div>
  );
};

// --- Modale Historique Individuel ---

const MemberSpiritualHistoryModal: React.FC<{
  member: Member;
  allPoints: MonthlySpiritualPoint[];
  onEditPoint: (point: MonthlySpiritualPoint) => void;
  onClose: () => void;
}> = ({ member, allPoints, onEditPoint, onClose }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    allPoints.forEach(p => years.add(p.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [allPoints, currentYear]);

  const yearPoints = useMemo(() => {
    return allPoints.filter(p => p.year === selectedYear).sort((a, b) => a.month - b.month);
  }, [allPoints, selectedYear]);

  const averageYearScore = useMemo(() => {
    if (yearPoints.length === 0) return 0;
    return (yearPoints.reduce((acc, p) => acc + p.score, 0) / yearPoints.length).toFixed(1);
  }, [yearPoints]);

  // Calcul des activités où le membre est TOUJOURS à jour (Constance)
  const consistentActivities = useMemo(() => {
    if (allPoints.length < 2) return [];

    const allExerciseIds = SPIRITUAL_EXERCISES_LIST.map(ex => ex.id);
    
    return allExerciseIds.filter(exId => {
      const hasBeenEvaluatedAtLeastOnce = allPoints.some(p => p.results[exId] !== undefined);
      if (!hasBeenEvaluatedAtLeastOnce) return false;

      return allPoints.every(p => {
        if (p.results[exId] === undefined) return true;
        return p.results[exId] === true;
      });
    }).map(id => SPIRITUAL_EXERCISES_LIST.find(ex => ex.id === id));
  }, [allPoints]);

  const toggleMonthExpand = (index: number) => {
    setExpandedMonth(expandedMonth === index ? null : index);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="bg-slate-900 p-8 text-white shrink-0 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10"><History size={160} /></div>
           <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={24} /></button>
           <h3 className="text-xl font-semibold">Journal de Fidélité</h3>
           <p className="text-xs text-slate-400 mt-1">Parcours de : {formatFirstName(member.firstName)} <span className="uppercase">{member.lastName}</span></p>
        </div>

        {consistentActivities.length > 0 && (
          <div className="px-8 py-4 bg-indigo-600 text-white flex flex-col md:flex-row items-center gap-4 shrink-0 relative overflow-hidden">
             <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Star size={100} /></div>
             <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-lg animate-pulse">
                   <Trophy size={20} className="text-amber-300" />
                </div>
                <div>
                   <h4 className="text-xs font-medium">Constance Spirituelle</h4>
                   <p className="text-xs font-bold text-indigo-200">Validé à chaque évaluation</p>
                </div>
             </div>
             <div className="flex flex-wrap gap-2 relative z-10">
                {consistentActivities.map(ex => (
                  <div key={ex?.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-sm transition-all hover:scale-105">
                     <Zap size={10} className="text-amber-300 fill-amber-300" />
                     <span className="text-xs font-semibolder">{ex?.label}</span>
                  </div>
                ))}
             </div>
          </div>
        )}

        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
           <div className="flex gap-2">
             {availableYears.map(year => (
               <button 
                 key={year} 
                 onClick={() => setSelectedYear(year)}
                 className={cn(
                   "px-4 py-2 rounded-xl text-xs font-medium transition-all",
                   selectedYear === year ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-white text-slate-400 border border-slate-200 hover:bg-slate-100"
                 )}
               >
                 {year}
               </button>
             ))}
           </div>
           <div className="text-right">
              <p className="text-xs font-medium text-slate-500">Moyenne annuelle</p>
              <p className="text-xl font-semibold text-indigo-600">{averageYearScore} exos</p>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
           <div className="space-y-3">
              {MONTHS.map((monthName, monthIndex) => {
                const point = yearPoints.find(p => p.month === monthIndex);
                const isExpanded = expandedMonth === monthIndex;

                return (
                  <div key={monthName} className="flex flex-col gap-2">
                    <div 
                      onClick={() => point && toggleMonthExpand(monthIndex)}
                      className={cn(
                        "p-5 rounded-xl border-2 transition-all flex items-center justify-between",
                        point ? "bg-white border-slate-100 shadow-sm cursor-pointer hover:border-indigo-300 hover:scale-[1.01]" : "bg-slate-100/50 border-dashed border-slate-200 opacity-60",
                        isExpanded && "border-indigo-50 shadow-indigo-100 shadow-lg ring-4 ring-indigo-500/5"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-xs uppercase shadow-inner",
                          point ? "bg-indigo-50 text-indigo-600" : "bg-white text-slate-300"
                        )}>
                          {monthName.substring(0, 3)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{monthName}</p>
                          <p className="text-xs text-slate-400">{point ? `Évalué le ${new Date(point.createdAt).toLocaleDateString()}` : 'Non évalué'}</p>
                        </div>
                      </div>
                      {point ? (
                        <div className="flex items-center gap-3">
                           <div className="text-right">
                             <p className={cn("text-lg font-semibold", point.score >= 5 ? "text-emerald-600" : point.score >= 3 ? "text-amber-500" : "text-rose-500")}>
                               {point.score} <span className="text-xs uppercase">exos</span>
                             </p>
                           </div>
                           <div className={cn("transition-transform duration-300", isExpanded ? "rotate-90 text-indigo-600" : "text-slate-200")}>
                             <ChevronRight size={18} strokeWidth={3} />
                           </div>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-300">Données manquantes</span>
                      )}
                    </div>

                    {/* Zone de détails expansive */}
                    {isExpanded && point && (
                      <div className="px-6 pb-4 pt-2 animate-in slide-in-from-top-4 duration-300">
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-6 space-y-4 shadow-inner">
                           <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                             <h4 className="text-xs font-semibold text-indigo-400 flex items-center gap-2">
                               <ListChecks size={14} /> Détail des exercices validés
                             </h4>
                             <button 
                               onClick={(e) => { e.stopPropagation(); onEditPoint(point); }}
                               className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-xl text-xs font-medium hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                             >
                               <Edit size={10} /> Modifier ce bilan
                             </button>
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {SPIRITUAL_EXERCISES_LIST.map(ex => {
                                if (point.results[ex.id] === undefined) return null;
                                const isDone = point.results[ex.id];
                                return (
                                  <div key={ex.id} className="flex items-center gap-2">
                                     <div className={cn(
                                       "w-5 h-5 rounded-lg flex items-center justify-center border",
                                       isDone ? "bg-emerald-500 border-emerald-600 text-white" : "bg-white border-slate-200 text-slate-300"
                                     )}>
                                       {isDone ? <Check size={12} strokeWidth={4} /> : <X size={10} />}
                                     </div>
                                     <span className={cn("text-xs font-medium truncate", isDone ? "text-slate-700" : "text-slate-400")}>
                                       {ex.label}
                                     </span>
                                  </div>
                                );
                              })}
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
           </div>
        </div>

        <div className="p-8 border-t border-slate-100 bg-white shrink-0">
           <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-medium hover:bg-slate-800 transition-all shadow-xl active:scale-95">
              Fermer le journal
           </button>
        </div>
      </div>
    </div>
  );
};

// --- Wizard pour ajouter un nouveau suivi ---

const NewGoalWizard: React.FC<{ 
  members: Member[]; 
  onClose: () => void; 
  onSave: (memberId: string, data: SpiritualObjective[]) => void;
}> = ({ members, onClose, onSave }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const filtered = useMemo(() => {
    if (search.length < 2) return [];
    return members.filter(m => 
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      (m.nickname || '').toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5);
  }, [members, search]);

  if (step === 1) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="bg-indigo-600 p-8 text-white">
             <div className="flex justify-between items-center mb-2">
               <h3 className="text-xl font-semibold">Définir un objectif</h3>
               <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white"><X size={20} /></button>
             </div>
             <p className="text-xs text-indigo-200">Étape 1 : Choisir le membre</p>
          </div>
          <div className="p-8 space-y-6">
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input 
                  type="text" autoFocus
                  placeholder="NOM OU PETIT NOM..." 
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-normal focus:bg-white focus:border-indigo-400 transition-all shadow-sm"
                />
             </div>

             <div className="space-y-2">
                {filtered.map(m => (
                  <button 
                    key={m.id}
                    onClick={() => { setSelectedMember(m); setStep(2); }}
                    className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 overflow-hidden">
                          {m.photoUrl ? (
                            <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            getInitials(m.firstName, m.lastName)
                          )}
                       </div>
                       <div className="text-left">
                          <p className="text-xs font-semibold text-slate-800">{formatFirstName(m.firstName)} <span className="uppercase">{m.lastName}</span></p>
                          <p className="text-xs text-slate-400">{m.type}</p>
                       </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
                {search.length >= 2 && filtered.length === 0 && (
                  <p className="text-center py-6 text-xs text-slate-400 italic">Aucun résultat pour "{search}"</p>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GoalsFormModal 
      member={selectedMember!} 
      onClose={onClose}
      onSave={(data) => onSave(selectedMember!.id, data)}
    />
  );
};

// --- Sous-composant Modale de Formulaire ---

const GoalsFormModal: React.FC<{ 
  member: Member; 
  currentGoals?: YearlySpiritualGoals; 
  onClose: () => void; 
  onSave: (data: SpiritualObjective[]) => void;
}> = ({ member, currentGoals, onClose, onSave }) => {
  const [objectives, setObjectives] = useState<SpiritualObjective[]>(() => {
    if (currentGoals) return currentGoals.objectives;
    return SPIRITUAL_EXERCISES_LIST.map(ex => ({
      exerciseId: ex.id,
      targetValue: ex.valueType === 'boolean' ? false : (ex.valueType === 'select' ? ex.options![0] : 0),
      isEnabled: false,
      notes: ''
    }));
  });

  const toggleExercise = (id: string) => {
    setObjectives(prev => prev.map(o => o.exerciseId === id ? { ...o, isEnabled: !o.isEnabled } : o));
  };

  const updateValue = (id: string, val: any) => {
    setObjectives(prev => prev.map(o => o.exerciseId === id ? { ...o, targetValue: val } : o));
  };

  const updateNotes = (id: string, text: string) => {
    setObjectives(prev => prev.map(o => o.exerciseId === id ? { ...o, notes: text } : o));
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="bg-indigo-600 p-8 text-white shrink-0 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10"><Target size={160} /></div>
           <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={24} /></button>
           <h3 className="text-xl font-semibold">Configuration Spirituelle {new Date().getFullYear()}</h3>
           <p className="text-xs text-indigo-200 mt-1">Définition des engagements : {formatFirstName(member.firstName)} <span className="uppercase">{member.lastName}</span></p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30 space-y-6">
           <div className="space-y-4">
              {SPIRITUAL_EXERCISES_LIST.map(ex => {
                const obj = objectives.find(o => o.exerciseId === ex.id)!;
                return (
                  <div key={ex.id} className={cn(
                    "p-6 bg-white border-2 rounded-2xl transition-all group",
                    obj.isEnabled ? "border-indigo-50 ring-4 ring-indigo-500/5 shadow-lg" : "border-slate-100 opacity-60 hover:opacity-100"
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                         <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm", obj.isEnabled ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400")}>
                           <Flame size={20} />
                         </div>
                         <div>
                            <h5 className="text-sm font-semibold text-slate-900">{ex.label}</h5>
                            <p className="text-xs text-slate-400">Fréquence : {ex.frequency}</p>
                         </div>
                      </div>
                      <button onClick={() => toggleExercise(ex.id)} className={cn("px-4 py-2 rounded-xl text-xs font-medium transition-all", obj.isEnabled ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}>
                        {obj.isEnabled ? 'Activé' : 'Inclure'}
                      </button>
                    </div>

                    {obj.isEnabled && (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                               <label className="text-xs font-medium text-slate-500 ml-1">Objectif ({ex.unit || '---'})</label>
                               {ex.valueType === 'select' ? (
                                 <select value={obj.targetValue} onChange={(e) => updateValue(ex.id, e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-normal shadow-inner">
                                   {ex.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                 </select>
                               ) : ex.valueType === 'boolean' ? (
                                 <button onClick={() => updateValue(ex.id, !obj.targetValue)} className={cn("w-full py-3 rounded-2xl text-xs font-medium shadow-inner border transition-all", obj.targetValue ? "bg-indigo-50 border-indigo-600 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-400")}>
                                   {obj.targetValue ? 'OUI (Engagement Ferme)' : 'NON (Désactivé)'}
                                 </button>
                               ) : (
                                 <div className="relative group">
                                    <input 
                                      type="number" step={ex.valueType === 'decimal' ? '0.1' : '1'} 
                                      value={obj.targetValue || ''} onChange={(e) => updateValue(ex.id, e.target.value)}
                                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-semibold text-indigo-600 shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      placeholder="0"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-300">{ex.unit}</span>
                                 </div>
                               )}
                            </div>
                            <div className="space-y-1.5">
                               <label className="text-xs font-medium text-slate-500 ml-1">Observations / Précisions</label>
                               <input type="text" value={obj.notes || ''} onChange={(e) => updateNotes(ex.id, e.target.value)} placeholder="Note facultative..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-medium shadow-inner italic" />
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                );
              })}
           </div>
        </div>

        <div className="p-8 border-t border-slate-100 bg-white shrink-0">
           <button onClick={() => onSave(objectives)} className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-xs font-medium shadow-xl shadow-indigo-200 hover:bg-indigo-700 flex items-center justify-center gap-3 active:scale-95 transition-all">
              <Save size={18} /> Enregistrer les objectifs
           </button>
        </div>
      </div>
    </div>
  );
};

const MonthlyPointModal: React.FC<{
  member: Member;
  goals: YearlySpiritualGoals | undefined;
  editingPoint: MonthlySpiritualPoint | null;
  onClose: () => void;
  onSave: (results: Record<string, boolean>, month: number, year: number) => void;
}> = ({ member, goals, editingPoint, onClose, onSave }) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  const evalYear = useMemo(() => {
    if (editingPoint) return editingPoint.year;
    if (currentMonth === 0 && currentDay <= 15) {
      return currentYear - 1;
    }
    return currentYear;
  }, [currentYear, currentMonth, currentDay, editingPoint]);

  const [month, setMonth] = useState(() => {
    if (editingPoint) return editingPoint.month;
    const m = currentMonth - 1;
    return m < 0 ? 11 : m;
  });
  
  const [year, setYear] = useState(evalYear);

  const isDeadlinePassed = useMemo(() => {
    if (editingPoint) return false; // On permet de modifier un point déjà créé même si l'année est passée (sous réserve de droits admin idéalement)
    const deadline = new Date(year + 1, 0, 15, 23, 59, 59);
    return today > deadline;
  }, [year, today, editingPoint]);

  const isFutureMonth = useMemo(() => {
    if (year > currentYear) return true;
    if (year === currentYear && month > currentMonth) return true;
    return false;
  }, [year, month, currentYear, currentMonth]);

  const [results, setResults] = useState<Record<string, boolean>>(() => {
    if (editingPoint) return { ...editingPoint.results };
    const init: Record<string, boolean> = {};
    if (goals) {
      goals.objectives.filter(o => o.isEnabled).forEach(o => init[o.exerciseId] = false);
    }
    return init;
  });

  const enabledObjectives = goals?.objectives.filter(o => o.isEnabled) || [];

  const toggleResult = (id: string) => {
    if (isDeadlinePassed || isFutureMonth) return;
    setResults(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentScore = useMemo(() => {
    return calculateMergedScore(results);
  }, [results]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className={cn(
          "p-8 text-white shrink-0 relative overflow-hidden transition-colors",
          editingPoint ? "bg-indigo-600" : (isDeadlinePassed || isFutureMonth ? "bg-slate-500" : "bg-emerald-600")
        )}>
           <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldCheck size={160} /></div>
           <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={24} /></button>
           <h3 className="text-xl font-semibold">
             {editingPoint ? 'Modification de Redevabilité' : 'Point de Redevabilité Mensuelle'}
           </h3>
           <p className="text-xs text-white/80 mt-1">Bilan pour : {formatFirstName(member.firstName)} <span className="uppercase">{member.lastName}</span></p>
        </div>
        
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-4 shrink-0">
           <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-500 ml-1">Mois du bilan</label>
              <select 
                value={month} 
                disabled={!!editingPoint} // On ne change pas le mois d'un bilan existant ici pour éviter les doublons complexes
                onChange={(e) => setMonth(Number(e.target.value))} 
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm font-normal shadow-sm disabled:opacity-60"
              >
                {MONTHS.map((m, i) => {
                  const disabled = (year === currentYear && i > currentMonth) || (year > currentYear);
                  return <option key={i} value={i} disabled={disabled}>{m} {disabled ? '(Futur)' : ''}</option>;
                })}
              </select>
           </div>
           <div className="w-full md:w-32 space-y-1">
              <label className="text-xs font-medium text-slate-500 ml-1">Année</label>
              <select 
                value={year} 
                disabled={!!editingPoint}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-semibold shadow-sm disabled:opacity-60"
              >
                <option value={currentYear}>{currentYear}</option>
                {currentMonth === 0 && currentDay <= 15 && <option value={currentYear - 1}>{currentYear - 1}</option>}
              </select>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30 space-y-4">
           {isDeadlinePassed ? (
             <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Lock size={32} />
                </div>
                <div className="max-w-xs mx-auto">
                  <p className="text-sm font-semibold text-slate-900">Accès Verrouillé</p>
                  <p className="text-xs text-slate-500 font-bold mt-2 leading-relaxed">
                    Le délai de redevabilité pour l'année {year} est expiré (limite : 15 janvier {year + 1}). 
                  </p>
                </div>
             </div>
           ) : isFutureMonth ? (
            <div className="py-20 text-center space-y-4">
               <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                 <Calendar size={32} />
               </div>
               <div className="max-w-xs mx-auto">
                 <p className="text-sm font-semibold text-slate-900">Mois non entamé</p>
                 <p className="text-xs text-slate-500 font-bold mt-2 leading-relaxed">
                   L'évaluation ne peut pas être faite pour un mois futur.
                 </p>
               </div>
            </div>
           ) : enabledObjectives.length > 0 ? enabledObjectives.map(obj => {
            const ex = SPIRITUAL_EXERCISES_LIST.find(e => e.id === obj.exerciseId)!;
            const isChecked = results[ex.id];
            return (
              <div 
                key={ex.id} 
                onClick={() => toggleResult(ex.id)}
                className={cn(
                  "p-5 bg-white border-2 rounded-xl shadow-sm flex items-center justify-between cursor-pointer transition-all group",
                  isChecked ? "border-emerald-500 bg-emerald-50/20 shadow-lg" : "border-slate-100 hover:border-emerald-200"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    isChecked ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-300"
                  )}>
                    <CheckCircle size={20} strokeWidth={isChecked ? 3 : 2} />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-slate-900">{ex.label}</h5>
                    <p className="text-xs font-medium text-indigo-600 mt-0.5">Objectif cible : {ex.valueType === 'boolean' ? 'Fidélité' : `${obj.targetValue} ${ex.unit || ''}`}</p>
                  </div>
                </div>
                
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                  isChecked ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                )}>
                  {isChecked ? 'À JOUR ✓' : 'NON À JOUR'}
                </div>
              </div>
            );
           }) : (
             <div className="py-20 text-center text-slate-300 italic text-xs border border-dashed border-slate-200 rounded-2xl px-8">
               {goals ? "Aucun objectif activé pour ce membre." : "Aucun objectif défini pour l'année " + year + "."}
             </div>
           )}
        </div>

        <div className="p-8 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
           <div>
              <p className="text-xs font-medium text-slate-500">Exercices Validés</p>
              <p className={cn("text-3xl font-semibold transition-colors", currentScore >= 4 ? "text-emerald-600" : currentScore >= 2 ? "text-amber-500" : "text-rose-500")}>
                {currentScore}
              </p>
           </div>
           <button 
             disabled={enabledObjectives.length === 0 || isDeadlinePassed || isFutureMonth}
             onClick={() => onSave(results, month, year)} 
             className={cn(
               "px-8 py-4 text-white rounded-2xl text-xs font-medium shadow-xl flex items-center gap-3 active:scale-95 transition-all disabled:opacity-50",
               editingPoint ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
             )}
           >
              {editingPoint ? <Save size={18} /> : <CheckCircle2 size={18} />}
              {editingPoint ? 'Mettre à jour le bilan' : 'Valider le bilan mensuel'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default SpiritualGrowth;