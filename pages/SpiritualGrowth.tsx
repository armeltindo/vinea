import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import {
  Flame,
  Target,
  Search,
  History,
  Sparkles,
  X,
  Loader2,
  Trophy,
  TrendingUp,
  ClipboardCheck,
  Calendar,
  Trash2,
  Smartphone,
  ArrowRight,
  Users,
  CircleDashed
} from 'lucide-react';
import { analyzePageData } from '../lib/gemini';
import { cn, formatFirstName, getInitials } from '../utils';
import { Member, YearlySpiritualGoals, MonthlySpiritualPoint, DailyExercise } from '../types';
import { getMembers, getSpiritualGoals, getSpiritualPoints, getDailyExercisesCountByMemberIds, getDailyExercises, deleteDailyExercise } from '../lib/db';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const toLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const SpiritualGrowth: React.FC = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [yearlyGoals, setYearlyGoals] = useState<YearlySpiritualGoals[]>([]);
  const [monthlyPoints, setMonthlyPoints] = useState<MonthlySpiritualPoint[]>([]);
  const [portalCounts7, setPortalCounts7] = useState<Record<string, number>>({});
  const [portalCounts30, setPortalCounts30] = useState<Record<string, number>>({});
  const [portalDetailMember, setPortalDetailMember] = useState<Member | null>(null);
  const [portalDetailExercises, setPortalDetailExercises] = useState<DailyExercise[]>([]);
  const [portalDetailLoading, setPortalDetailLoading] = useState(false);
  const [portalSearchTerm, setPortalSearchTerm] = useState('');

  useEffect(() => {
    Promise.all([getMembers(), getSpiritualGoals(), getSpiritualPoints()]).then(([mbrs, goals, points]) => {
      setMembers(mbrs);
      setYearlyGoals(goals as any);
      setMonthlyPoints(points as any);

      const activeIds = (mbrs as Member[]).filter(m => m.memberAccountActive).map(m => m.id);
      if (activeIds.length > 0) {
        const ago7 = toLocalDate(new Date(Date.now() - 7 * 86400000));
        const ago30 = toLocalDate(new Date(Date.now() - 30 * 86400000));
        Promise.all([
          getDailyExercisesCountByMemberIds(activeIds, ago7),
          getDailyExercisesCountByMemberIds(activeIds, ago30),
        ]).then(([c7, c30]) => {
          setPortalCounts7(c7);
          setPortalCounts30(c30);
        });
      }
    });
  }, []);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const openPortalDetail = async (member: Member) => {
    setPortalDetailMember(member);
    setPortalDetailLoading(true);
    const exs = await getDailyExercises(member.id);
    setPortalDetailExercises(exs);
    setPortalDetailLoading(false);
  };

  const handleDeletePortalExercise = async (memberId: string, date: string) => {
    await deleteDailyExercise(memberId, date);
    setPortalDetailExercises(prev => prev.filter(e => e.date !== date));
  };

  const today = new Date();
  const currentYear = today.getFullYear();

  const trackedMembers = useMemo(() => {
    const idsWithGoals = new Set(yearlyGoals.filter(g => g.year === currentYear).map(g => g.memberId));
    return members.filter(m => idsWithGoals.has(m.id));
  }, [members, yearlyGoals, currentYear]);

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

  const filteredPortalMembers = useMemo(() => {
    const active = members.filter(m => m.memberAccountActive);
    if (!portalSearchTerm.trim()) return active;
    const s = portalSearchTerm.toLowerCase();
    return active.filter(m =>
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(s) ||
      (m.nickname || '').toLowerCase().includes(s)
    );
  }, [members, portalSearchTerm]);

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

      {/* Portail membres — exercices quotidiens */}
      <Card
        title="Portail — Exercices Quotidiens"
        subtitle="Soumissions des membres via le portail mobile"
        icon={<Calendar size={18} className="text-violet-500" />}
      >
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative group flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-600 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Rechercher un membre..."
              value={portalSearchTerm}
              onChange={(e) => setPortalSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-normal tracking-wide focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/5 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => navigate('/spiritual/bilans-mensuels')}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 shrink-0"
          >
            <Smartphone size={16} /> Bilans Mensuels
            <ArrowRight size={15} />
          </button>
        </div>

        {filteredPortalMembers.length === 0 ? (
          <div className="py-16 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
              <Users size={24} className="text-slate-200" />
            </div>
            <p className="text-sm font-semibold text-slate-400">
              {members.filter(m => m.memberAccountActive).length === 0
                ? 'Aucun membre avec un compte actif'
                : 'Aucun résultat'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPortalMembers.map(m => {
              const c7 = portalCounts7[m.id] ?? 0;
              const c30 = portalCounts30[m.id] ?? 0;
              const ratio7 = c7 / 7;
              const ratio30 = c30 / 30;
              const color7 = ratio7 >= 0.8 ? 'bg-emerald-100 text-emerald-700' : ratio7 >= 0.5 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
              const color30 = ratio30 >= 0.8 ? 'bg-emerald-100 text-emerald-700' : ratio30 >= 0.5 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
              return (
                <div key={m.id} onClick={() => openPortalDetail(m)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-pointer">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-600">
                        {getInitials(m.firstName, m.lastName)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{formatFirstName(m.firstName)} {m.lastName.toUpperCase()}</p>
                    <p className="text-xs text-slate-400">{m.memberUsername || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', color7)}>{c7}/7j</span>
                    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', color30)}>{c30}/30j</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal: Détail exercices quotidiens d'un membre du portail */}
      {portalDetailMember && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPortalDetailMember(null)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-violet-600 px-6 py-5 text-white shrink-0">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/30 shrink-0">
                    {portalDetailMember.photoUrl ? (
                      <img src={portalDetailMember.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/20 flex items-center justify-center text-sm font-bold">
                        {getInitials(portalDetailMember.firstName, portalDetailMember.lastName)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-base leading-tight">{portalDetailMember.firstName} {portalDetailMember.lastName}</p>
                    <p className="text-xs text-violet-200">Exercices quotidiens — {portalDetailExercises.length} soumissions</p>
                  </div>
                </div>
                <button onClick={() => setPortalDetailMember(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {portalDetailLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-violet-400" />
                </div>
              ) : portalDetailExercises.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-12">Aucun exercice enregistré</p>
              ) : (
                portalDetailExercises.map(ex => (
                  <div key={ex.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-600">
                        {new Date(ex.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <button
                        onClick={() => portalDetailMember && handleDeletePortalExercise(portalDetailMember.id, ex.date)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ex.entries.map(e => (
                        <span key={e.id} className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium',
                          e.valueBool === false ? 'bg-rose-50 text-rose-500 line-through' : 'bg-emerald-50 text-emerald-700'
                        )}>
                          {e.typeId}
                          {e.valueText ? ` : ${e.valueText}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpiritualGrowth;
