import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Save, LogOut, CheckCircle2, AlertCircle, Loader2, Bell, Users,
  Trash2, ClipboardCheck, Target, Flame, CheckCircle, Lock, ArrowLeft,
  Plus, ChevronRight, Church, UserCheck
} from 'lucide-react';
import {
  getSpiritualExerciseTypes,
  getDailyExerciseByDate,
  getDailyExercises,
  upsertDailyExercise,
  deleteDailyExercise,
  getSpiritualGoals,
  upsertSpiritualGoals,
  getSpiritualPoints,
  upsertSpiritualPoints,
  getServicesByMemberId,
  getMemberAssignmentNotifications,
  markNotificationRead,
} from '../lib/db';
import {
  SpiritualExerciseType, DailyExercise, MemberSession,
  YearlySpiritualGoals, MonthlySpiritualPoint, SpiritualObjective,
  ChurchService, ServicePersonnel
} from '../types';
import { SPIRITUAL_EXERCISES_LIST } from '../constants';
import { cn, generateId } from '../utils';

const ROLE_LABELS: Record<string, string> = {
  moderateur: 'Modérateur',
  priereOuverture: "Prière d'ouverture",
  adoration: 'Adoration',
  annonces: 'Annonces',
  accueil: 'Accueil',
  conducteurOuvriers: 'Conducteur groupe des ouvriers',
  conducteurFons: 'Conducteur groupe des fons',
  conducteurEnfants: 'Conducteur groupe des enfants',
  conducteurAdolescents: 'Conducteur groupe des adolescents',
};

const getMemberRoleInService = (memberId: string, personnel?: ServicePersonnel): string | null => {
  if (!personnel) return null;
  for (const [role, item] of Object.entries(personnel)) {
    if ((item as any)?.memberId === memberId) return ROLE_LABELS[role] ?? role;
  }
  return null;
};

// ─── Helpers ────────────────────────────────────────────────

const toLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const yesterday = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDate(d);
};

const formatDate = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-');
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
};

const formatDateLong = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-');
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
};

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const calculateScore = (results: Record<string, boolean>) => {
  const normalKeys = Object.keys(results).filter(k => k !== 'retraites_nb' && k !== 'retraites_hr');
  let score = normalKeys.filter(k => results[k] === true).length;
  if (results['retraites_nb'] === true || results['retraites_hr'] === true) score += 1;
  return score;
};

type ActiveView = null | 'exercices' | 'bilan' | 'objectifs';
type HistoryTab = 'exercices' | 'bilans';

// ─── Page principale ─────────────────────────────────────────

const ExerciceSpirituelDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<MemberSession | null>(null);
  const [roleChoice, setRoleChoice] = useState<'member' | 'dm' | null>(null);

  // ── Daily exercises state ──
  const [exerciseTypes, setExerciseTypes] = useState<SpiritualExerciseType[]>([]);
  const [selectedDate, setSelectedDate] = useState(yesterday());
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({});
  const [detailValues, setDetailValues] = useState<Record<string, string>>({});
  const [allExercises, setAllExercises] = useState<DailyExercise[]>([]);
  const [submittedDates, setSubmittedDates] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  // ── Goals & bilan state ──
  const [objectives, setObjectives] = useState<SpiritualObjective[]>([]);
  const [currentGoals, setCurrentGoals] = useState<YearlySpiritualGoals | null>(null);
  const [savingGoals, setSavingGoals] = useState(false);
  const [goalsSaved, setGoalsSaved] = useState(false);
  const [monthlyPoints, setMonthlyPoints] = useState<MonthlySpiritualPoint[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const m = new Date().getMonth() - 1;
    return m < 0 ? 11 : m;
  });
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()
  );
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [savingBilan, setSavingBilan] = useState(false);
  const [bilanSaved, setBilanSaved] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(true);

  // ── Assigned services state ──
  const [assignedServices, setAssignedServices] = useState<ChurchService[]>([]);
  const [assignmentNotifs, setAssignmentNotifs] = useState<any[]>([]);

  // ── UI state ──
  const [activeView, setActiveView] = useState<ActiveView>(null);
  const [historyTab, setHistoryTab] = useState<HistoryTab>('exercices');

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // ── Session ──────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('vinea_member_session');
    if (!raw) { navigate('/mon-espace'); return; }
    try {
      const s: MemberSession = JSON.parse(raw);
      setSession(s);
      if (s.isDiscipleMaker) {
        const saved = localStorage.getItem('vinea_member_role_choice') as 'member' | null;
        setRoleChoice(saved ?? null);
      } else {
        setRoleChoice('member');
      }
    } catch {
      navigate('/mon-espace');
    }
  }, [navigate]);

  // ── Load exercise types ───────────────────────────────────
  useEffect(() => {
    getSpiritualExerciseTypes().then(types =>
      setExerciseTypes(types.filter(t => t.active))
    );
  }, []);

  // ── Load all daily exercises ──────────────────────────────
  const loadAllExercises = useCallback(async (memberId: string) => {
    const all = await getDailyExercises(memberId);
    setAllExercises(all);
    setSubmittedDates(new Set(all.map(e => e.date)));
    const missing: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = toLocalDate(d);
      if (!all.some(e => e.date === ds)) missing.push(formatDate(ds));
    }
    if (missing.length > 0) { setNotifications(missing); }
  }, []);

  useEffect(() => {
    if (session) loadAllExercises(session.memberId);
  }, [session, loadAllExercises]);

  // ── Load assigned services & notifications ────────────────
  useEffect(() => {
    if (!session) return;
    Promise.all([
      getServicesByMemberId(session.memberId),
      getMemberAssignmentNotifications(session.memberId),
    ]).then(([services, notifs]) => {
      setAssignedServices(services);
      setAssignmentNotifs(notifs);
    });
  }, [session]);

  // ── Load goals & bilan ────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    setLoadingGoals(true);
    Promise.all([
      getSpiritualGoals(session.memberId),
      getSpiritualPoints(session.memberId),
    ]).then(([goals, points]) => {
      const yearGoal = (goals as YearlySpiritualGoals[]).find(g => g.year === currentYear) ?? null;
      setCurrentGoals(yearGoal);
      setObjectives(
        yearGoal?.objectives ??
        SPIRITUAL_EXERCISES_LIST.map(ex => ({
          exerciseId: ex.id,
          targetValue: ex.valueType === 'boolean' ? false : (ex.valueType === 'select' ? (ex.options?.[0] ?? '') : 0),
          isEnabled: false,
          notes: '',
        }))
      );
      setMonthlyPoints(points as MonthlySpiritualPoint[]);
      setLoadingGoals(false);
    });
  }, [session, currentYear]);

  // ── Load selected date form ───────────────────────────────
  useEffect(() => {
    if (!session) return;
    setLoadingForm(true);
    getDailyExerciseByDate(session.memberId, selectedDate).then(exercise => {
      if (exercise) {
        const vals: Record<string, string | boolean> = {};
        const details: Record<string, string> = {};
        exercise.entries.forEach(entry => {
          if (entry.valueBool !== undefined && entry.valueBool !== null) vals[entry.typeId] = entry.valueBool;
          else if (entry.valueText !== undefined) vals[entry.typeId] = entry.valueText ?? '';
          if (entry.detailText) details[entry.typeId] = entry.detailText;
        });
        setFormValues(vals);
        setDetailValues(details);
      } else {
        setFormValues({});
        setDetailValues({});
      }
      setLoadingForm(false);
    });
  }, [session, selectedDate]);

  // ── Sync bilan results when month/year changes ─────────────
  useEffect(() => {
    const existing = monthlyPoints.find(p => p.month === selectedMonth && p.year === selectedYear);
    if (existing) {
      setResults({ ...existing.results });
    } else {
      const init: Record<string, boolean> = {};
      (currentGoals?.objectives ?? []).filter(o => o.isEnabled).forEach(o => { init[o.exerciseId] = false; });
      setResults(init);
    }
  }, [selectedMonth, selectedYear, monthlyPoints, currentGoals]);

  const enabledObjectives = useMemo(() => objectives.filter(o => o.isEnabled), [objectives]);

  const isFutureMonth = useMemo(() => {
    if (selectedYear > currentYear) return true;
    if (selectedYear === currentYear && selectedMonth > currentMonth) return true;
    return false;
  }, [selectedMonth, selectedYear, currentYear, currentMonth]);

  const isDeadlinePassed = useMemo(() => {
    const deadline = new Date(selectedYear + 1, 0, 15, 23, 59, 59);
    return new Date() > deadline;
  }, [selectedYear]);

  const currentScore = useMemo(() => calculateScore(results), [results]);

  const existingBilan = useMemo(
    () => monthlyPoints.find(p => p.month === selectedMonth && p.year === selectedYear),
    [monthlyPoints, selectedMonth, selectedYear]
  );

  // ── Handlers ──────────────────────────────────────────────
  const handleSaveExercise = async () => {
    if (!session) return;
    setSaving(true);
    setSaveSuccess(false);
    const entries = exerciseTypes.map(type => {
      const val = formValues[type.id];
      const detail = detailValues[type.id];
      if (type.fieldType === 'boolean') return { typeId: type.id, valueBool: val === true, detailText: detail || undefined };
      return { typeId: type.id, valueText: String(val ?? ''), detailText: detail || undefined };
    });
    await upsertDailyExercise(session.memberId, selectedDate, entries);
    setSaving(false);
    setSaveSuccess(true);
    await loadAllExercises(session.memberId);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDeleteExercise = async (memberId: string, date: string) => {
    await deleteDailyExercise(memberId, date);
    setAllExercises(prev => prev.filter(e => e.date !== date));
    setSubmittedDates(prev => { const s = new Set(prev); s.delete(date); return s; });
    if (selectedDate === date) { setFormValues({}); setDetailValues({}); }
  };

  const handleSaveGoals = async () => {
    if (!session) return;
    setSavingGoals(true);
    const newGoals: YearlySpiritualGoals = {
      id: currentGoals?.id || generateId(),
      memberId: session.memberId,
      year: currentYear,
      objectives,
      createdAt: currentGoals?.createdAt || new Date().toISOString(),
    };
    await upsertSpiritualGoals(newGoals);
    setCurrentGoals(newGoals);
    setSavingGoals(false);
    setGoalsSaved(true);
    setTimeout(() => setGoalsSaved(false), 2500);
  };

  const handleSaveBilan = async () => {
    if (!session || isFutureMonth || isDeadlinePassed || enabledObjectives.length === 0) return;
    setSavingBilan(true);
    const score = calculateScore(results);
    const newPoint: MonthlySpiritualPoint = {
      id: existingBilan?.id || generateId(),
      memberId: session.memberId,
      month: selectedMonth,
      year: selectedYear,
      results,
      score,
      createdAt: existingBilan?.createdAt || new Date().toISOString(),
    };
    await upsertSpiritualPoints(newPoint);
    setMonthlyPoints(prev => {
      const filtered = prev.filter(p => !(p.month === selectedMonth && p.year === selectedYear));
      return [newPoint, ...filtered];
    });
    setSavingBilan(false);
    setBilanSaved(true);
    setTimeout(() => setBilanSaved(false), 2500);
  };

  const handleLogout = () => {
    localStorage.removeItem('vinea_member_session');
    localStorage.removeItem('vinea_member_role_choice');
    navigate('/mon-espace');
  };

  if (!session) return null;

  // ── Écran de choix de rôle (DM uniquement) ───────────────
  if (session.isDiscipleMaker && roleChoice === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 border-2 border-white/30 shadow-xl">
            {session.photoUrl ? (
              <img src={session.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <span className="text-2xl font-black text-white">
                  {session.firstName.charAt(0)}{session.lastName.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <h2 className="text-white text-lg font-bold mb-1">
            {session.gender === 'Masculin' ? 'Frère' : 'Sœur'} {session.firstName}
          </h2>
          <p className="text-indigo-200 text-sm mb-8">Que souhaitez-vous faire ?</p>
          <div className="space-y-3">
            <button
              onClick={() => { localStorage.setItem('vinea_member_role_choice', 'member'); setRoleChoice('member'); }}
              className="w-full py-4 bg-white text-indigo-700 rounded-2xl text-sm font-bold hover:bg-indigo-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Calendar size={18} />
              Mon espace spirituel
            </button>
            <button
              onClick={() => navigate('/mon-espace/groupe')}
              className="w-full py-4 bg-indigo-500/40 text-white border border-white/20 rounded-2xl text-sm font-bold hover:bg-indigo-500/60 transition-all flex items-center justify-center gap-2"
            >
              <Users size={18} />
              Mon groupe de discipolat
            </button>
          </div>
          <button onClick={handleLogout} className="mt-6 text-indigo-300/60 text-xs hover:text-indigo-200 transition-colors">
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  // ── Header commun ─────────────────────────────────────────
  const header = (
    <header className="bg-indigo-700 text-white px-4 py-3 flex items-center justify-between shadow-lg shrink-0">
      <div className="flex items-center gap-3">
        {activeView !== null ? (
          <button
            onClick={() => setActiveView(null)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
        ) : (
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/30 shrink-0">
            {session.photoUrl ? (
              <img src={session.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs font-bold">
                {session.firstName.charAt(0)}{session.lastName.charAt(0)}
              </div>
            )}
          </div>
        )}
        <div>
          <h1 className="text-sm font-bold leading-tight">
            {activeView === 'exercices' ? 'Points journaliers'
              : activeView === 'bilan' ? 'Points mensuels'
              : activeView === 'objectifs' ? 'Définir mes exercices'
              : 'Mon Espace - MIDC'}
          </h1>
          <p className="text-indigo-200 text-xs">
            {session.gender === 'Masculin' ? 'Frère' : 'Sœur'} {session.firstName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {activeView === null && (notifications.length > 0 || assignmentNotifs.filter(n => !n.isRead).length > 0) && (
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {notifications.length + assignmentNotifs.filter(n => !n.isRead).length}
            </span>
          </button>
        )}
        {activeView === null && session.isDiscipleMaker && (
          <button
            onClick={() => navigate('/mon-espace/groupe')}
            className="px-3 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Users size={14} />
            Mon groupe
          </button>
        )}
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          title="Se déconnecter"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );

  // ════════════════════════════════════════════════════════════
  // ── VUE : Exercices quotidiens ────────────────────────────
  // ════════════════════════════════════════════════════════════
  if (activeView === 'exercices') {
    const isSubmittedDate = submittedDates.has(selectedDate);
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {header}
        <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-5 flex-1">
          {/* Date picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 flex items-center gap-2">
              <Calendar size={14} />
              Date de la soumission
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                max={toLocalDate(new Date())}
                onChange={e => e.target.value && setSelectedDate(e.target.value)}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-sm"
              />
              {isSubmittedDate && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium shrink-0">
                  <CheckCircle2 size={13} /> Déjà soumis
                </span>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">
                {isSubmittedDate ? 'Modifier mes exercices' : 'Saisir mes exercices'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Les champs avec ● apparaissent selon votre réponse</p>
            </div>

            {loadingForm ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-indigo-400" />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {exerciseTypes.map(type => {
                  const val = formValues[type.id];
                  const detail = detailValues[type.id] ?? '';
                  const showDetail = type.hasDetail && (
                    type.fieldType === 'boolean' ? val === true : (String(val ?? '').trim() !== '' && String(val ?? '') !== '0')
                  );
                  return (
                    <div key={type.id} className="px-6 py-4 space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <label className="text-sm font-medium text-slate-700 flex-1">{type.label}</label>
                        {type.fieldType === 'boolean' ? (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setFormValues(v => ({ ...v, [type.id]: true }))}
                              className={cn(
                                "px-4 py-2 rounded-xl text-xs font-semibold border transition-all",
                                val === true ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-300"
                              )}
                            >Oui</button>
                            <button
                              onClick={() => { setFormValues(v => ({ ...v, [type.id]: false })); setDetailValues(d => ({ ...d, [type.id]: '' })); }}
                              className={cn(
                                "px-4 py-2 rounded-xl text-xs font-semibold border transition-all",
                                val === false ? "bg-rose-500 text-white border-rose-500 shadow-sm" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-rose-300"
                              )}
                            >Non</button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={String(val ?? '')}
                            onChange={e => setFormValues(v => ({ ...v, [type.id]: e.target.value }))}
                            placeholder="..."
                            className="w-36 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-right focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                          />
                        )}
                      </div>
                      {showDetail && type.detailLabel && (
                        <div className="ml-4 border-l-2 border-indigo-100 pl-4">
                          <label className="text-xs text-slate-400 mb-1 block">{type.detailLabel}</label>
                          <input
                            type="text"
                            value={detail}
                            onChange={e => setDetailValues(d => ({ ...d, [type.id]: e.target.value }))}
                            placeholder="Précisez..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={handleSaveExercise}
                disabled={saving || loadingForm}
                className={cn(
                  "w-full py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg",
                  saving || loadingForm ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    : saveSuccess ? "bg-emerald-600 text-white shadow-emerald-200"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
                )}
              >
                {saving ? <><Loader2 size={18} className="animate-spin" /> Enregistrement...</>
                  : saveSuccess ? <><CheckCircle2 size={18} /> Enregistré !</>
                  : <><Save size={18} /> {isSubmittedDate ? 'Mettre à jour' : 'Enregistrer'}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ── VUE : Bilan mensuel ───────────────────────────────────
  // ════════════════════════════════════════════════════════════
  if (activeView === 'bilan') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {header}
        {loadingGoals ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-4 flex-1">
            {enabledObjectives.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                <Target size={36} className="text-amber-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-amber-800">Définissez d'abord vos objectifs</p>
                <p className="text-xs text-amber-600 mt-1.5 leading-relaxed">
                  Activez au moins un exercice dans <strong>Mes objectifs</strong> pour pouvoir soumettre un bilan mensuel.
                </p>
                <button
                  onClick={() => setActiveView('objectifs')}
                  className="mt-5 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 transition-colors"
                >
                  Définir mes objectifs
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Période du bilan</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Mois</label>
                      <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                      >
                        {MONTHS.map((m, i) => {
                          const disabled = (selectedYear === currentYear && i > currentMonth) || selectedYear > currentYear;
                          return <option key={i} value={i} disabled={disabled}>{m}{disabled ? ' (futur)' : ''}</option>;
                        })}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Année</label>
                      <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                      >
                        <option value={currentYear}>{currentYear}</option>
                        {new Date().getMonth() === 0 && new Date().getDate() <= 15 && (
                          <option value={currentYear - 1}>{currentYear - 1}</option>
                        )}
                      </select>
                    </div>
                  </div>
                  {existingBilan && (
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> Bilan déjà soumis — vous pouvez le modifier
                    </p>
                  )}
                </div>

                {isDeadlinePassed ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                    <Lock size={36} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-500">Période expirée</p>
                    <p className="text-xs text-slate-400 mt-1.5">
                      Le délai de soumission pour {selectedYear} est expiré (limite : 15 janvier {selectedYear + 1}).
                    </p>
                  </div>
                ) : isFutureMonth ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                    <Calendar size={36} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-500">Mois futur</p>
                    <p className="text-xs text-slate-400 mt-1.5">L'évaluation ne peut pas être faite pour un mois à venir.</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800">Bilan de {MONTHS[selectedMonth]} {selectedYear}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Cochez les exercices accomplis ce mois-ci</p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {enabledObjectives.map(obj => {
                          const ex = SPIRITUAL_EXERCISES_LIST.find(e => e.id === obj.exerciseId);
                          if (!ex) return null;
                          const isChecked = results[ex.id] === true;
                          return (
                            <button
                              key={ex.id}
                              onClick={() => setResults(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                              className={cn('w-full flex items-center gap-4 px-5 py-4 text-left transition-all', isChecked ? 'bg-emerald-50' : 'hover:bg-slate-50')}
                            >
                              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center border-2 shrink-0 transition-all', isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-transparent')}>
                                <CheckCircle size={16} strokeWidth={3} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm font-semibold', isChecked ? 'text-emerald-800' : 'text-slate-700')}>{ex.label}</p>
                                <p className="text-xs text-slate-400">Objectif : {ex.valueType === 'boolean' ? 'Fidélité' : `${obj.targetValue} ${ex.unit || ''}`}</p>
                              </div>
                              <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0', isChecked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400')}>
                                {isChecked ? 'À jour' : 'Non'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500">Exercices validés</p>
                          <p className={cn('text-2xl font-bold', currentScore >= 4 ? 'text-emerald-600' : currentScore >= 2 ? 'text-amber-500' : 'text-rose-500')}>{currentScore}</p>
                        </div>
                        <p className="text-xs text-slate-400">sur {enabledObjectives.length} engagements</p>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveBilan}
                      disabled={savingBilan}
                      className={cn(
                        'w-full py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg',
                        savingBilan ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                          : bilanSaved ? 'bg-emerald-600 text-white shadow-emerald-200'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                      )}
                    >
                      {savingBilan ? <><Loader2 size={18} className="animate-spin" /> Enregistrement...</>
                        : bilanSaved ? <><CheckCircle2 size={18} /> Bilan enregistré !</>
                        : <><Save size={18} /> {existingBilan ? 'Mettre à jour le bilan' : 'Soumettre le bilan'}</>}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ── VUE : Objectifs annuels ───────────────────────────────
  // ════════════════════════════════════════════════════════════
  if (activeView === 'objectifs') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {header}
        {loadingGoals ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-4 flex-1">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
              <p className="text-sm font-semibold text-indigo-800 mb-1">Mes engagements {currentYear}</p>
              <p className="text-xs text-indigo-500 leading-relaxed">
                Activez les disciplines que vous souhaitez pratiquer cette année et définissez vos objectifs. Ces informations guideront vos bilans mensuels.
              </p>
            </div>

            <div className="space-y-3">
              {SPIRITUAL_EXERCISES_LIST.map(ex => {
                const obj = objectives.find(o => o.exerciseId === ex.id) ?? {
                  exerciseId: ex.id,
                  targetValue: ex.valueType === 'boolean' ? false : (ex.valueType === 'select' ? (ex.options?.[0] ?? '') : 0),
                  isEnabled: false,
                  notes: '',
                };
                return (
                  <div key={ex.id} className={cn('bg-white rounded-2xl border-2 transition-all overflow-hidden', obj.isEnabled ? 'border-indigo-200 shadow-sm' : 'border-slate-100')}>
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', obj.isEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400')}>
                          <Flame size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{ex.label}</p>
                          <p className="text-xs text-slate-400">{ex.frequency}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setObjectives(prev => prev.map(o => o.exerciseId === ex.id ? { ...o, isEnabled: !o.isEnabled } : o))}
                        className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0', obj.isEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}
                      >
                        {obj.isEnabled ? 'Activé' : 'Activer'}
                      </button>
                    </div>

                    {obj.isEnabled && (
                      <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
                        <div>
                          <label className="text-xs font-medium text-slate-500 mb-1.5 block">Objectif {ex.unit ? `(${ex.unit})` : ''}</label>
                          {ex.valueType === 'select' ? (
                            <select
                              value={String(obj.targetValue)}
                              onChange={e => setObjectives(prev => prev.map(o => o.exerciseId === ex.id ? { ...o, targetValue: e.target.value } : o))}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                            >
                              {ex.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : ex.valueType === 'boolean' ? (
                            <button
                              onClick={() => setObjectives(prev => prev.map(o => o.exerciseId === ex.id ? { ...o, targetValue: !o.targetValue } : o))}
                              className={cn('w-full py-2.5 rounded-xl text-xs font-semibold border transition-all', obj.targetValue ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400')}
                            >
                              {obj.targetValue ? 'Engagement ferme (Oui)' : 'Non activé'}
                            </button>
                          ) : (
                            <input
                              type="number"
                              step={ex.valueType === 'decimal' ? '0.1' : '1'}
                              value={String(obj.targetValue || '')}
                              onChange={e => setObjectives(prev => prev.map(o => o.exerciseId === ex.id ? { ...o, targetValue: e.target.value } : o))}
                              placeholder="0"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                            />
                          )}
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 mb-1.5 block">Note (facultatif)</label>
                          <input
                            type="text"
                            value={obj.notes || ''}
                            onChange={e => setObjectives(prev => prev.map(o => o.exerciseId === ex.id ? { ...o, notes: e.target.value } : o))}
                            placeholder="Précisions..."
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none italic"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSaveGoals}
              disabled={savingGoals}
              className={cn(
                'w-full py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg',
                savingGoals ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : goalsSaved ? 'bg-emerald-600 text-white shadow-emerald-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
              )}
            >
              {savingGoals ? <><Loader2 size={18} className="animate-spin" /> Enregistrement...</>
                : goalsSaved ? <><CheckCircle2 size={18} /> Objectifs enregistrés !</>
                : <><Save size={18} /> Enregistrer mes objectifs</>}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ── VUE PAR DÉFAUT : Accueil + Historiques ────────────────
  // ════════════════════════════════════════════════════════════
  const historyTabs: { id: HistoryTab; label: string; count: number; color: string }[] = [
    { id: 'exercices', label: 'Exercices journaliers', count: allExercises.length, color: 'indigo' },
    { id: 'bilans', label: 'Points mensuels', count: monthlyPoints.length, color: 'emerald' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {header}

      {/* Notification panel */}
      {showNotifs && notifications.length > 0 && (
        <div className="mx-4 mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-800 mb-1">Jours sans exercices soumis :</p>
                <ul className="space-y-0.5">
                  {notifications.map(n => <li key={n} className="text-xs text-amber-700">• {n}</li>)}
                </ul>
                <button onClick={() => setShowNotifs(false)} className="mt-2 text-xs text-amber-600 font-medium hover:text-amber-800 transition-colors">Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto w-full px-4 py-5 space-y-5 flex-1">

        {/* ── 3 boutons d'action ── */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setActiveView('exercices')}
            className="flex flex-col items-center gap-2 p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Plus size={20} />
            </div>
            <span className="text-xs font-bold leading-tight text-center">Points<br/>journaliers</span>
          </button>
          <button
            onClick={() => setActiveView('bilan')}
            className="flex flex-col items-center gap-2 p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <ClipboardCheck size={20} />
            </div>
            <span className="text-xs font-bold leading-tight text-center">Points<br/>mensuels</span>
          </button>
          <button
            onClick={() => setActiveView('objectifs')}
            className="flex flex-col items-center gap-2 p-4 bg-violet-600 text-white rounded-2xl shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Target size={20} />
            </div>
            <span className="text-xs font-bold leading-tight text-center">Définir<br/>exercices</span>
          </button>
        </div>

        {/* ── Stats rapides ── */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-3 px-2">
            <p className="text-lg font-black text-indigo-600">{allExercises.length}</p>
            <p className="text-[10px] text-slate-400 font-semibold">Journaliers</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-3 px-2">
            <p className="text-lg font-black text-emerald-600">{monthlyPoints.length}</p>
            <p className="text-[10px] text-slate-400 font-semibold">Mensuels</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-3 px-2">
            <p className="text-lg font-black text-violet-600">{enabledObjectives.length}</p>
            <p className="text-[10px] text-slate-400 font-semibold">Exercices</p>
          </div>
        </div>

        {/* ── Mes Activités Programmées ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
              <Church size={15} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Mes activités programmées</h2>
              <p className="text-xs text-slate-400">
                {assignedServices.length > 0 ? `${assignedServices.length} culte(s) avec une affectation` : 'Aucune affectation pour le moment'}
              </p>
            </div>
            {assignmentNotifs.filter(n => !n.isRead).length > 0 && (
              <span className="ml-auto px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                {assignmentNotifs.filter(n => !n.isRead).length} nouveau(x)
              </span>
            )}
          </div>
          {assignedServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 px-4 bg-amber-50 border border-amber-100 rounded-2xl text-center">
              <Church size={28} className="text-amber-300 mb-2" />
              <p className="text-xs text-slate-500">Vous n'avez pas encore d'affectation à un culte ou une activité.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignedServices
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map(service => {
                  const role = session ? getMemberRoleInService(session.memberId, service.servicePersonnel) : null;
                  const isPast = new Date(service.date) < new Date();
                  return (
                    <div
                      key={service.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-2xl border',
                        isPast ? 'bg-slate-50 border-slate-100' : 'bg-amber-50 border-amber-200'
                      )}
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                        isPast ? 'bg-slate-200' : 'bg-amber-500'
                      )}>
                        <UserCheck size={15} className={isPast ? 'text-slate-500' : 'text-white'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{service.serviceType}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(service.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {service.time ? ` · ${service.time}` : ''}
                        </p>
                        {role && (
                          <p className={cn('text-xs font-semibold mt-0.5', isPast ? 'text-slate-400' : 'text-amber-700')}>
                            {role}
                          </p>
                        )}
                      </div>
                      {!isPast && (
                        <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg shrink-0">
                          À venir
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* ── Notification d'affectation (nouvelles) ── */}
        {showNotifs && assignmentNotifs.filter(n => !n.isRead).length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Bell size={14} className="text-indigo-600" />
              <p className="text-xs font-bold text-indigo-800">Nouvelles affectations</p>
            </div>
            {assignmentNotifs.filter(n => !n.isRead).map(notif => (
              <div key={notif.id} className="flex items-start gap-2 p-2 bg-white rounded-xl border border-indigo-100">
                <CheckCircle2 size={13} className="text-indigo-500 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-700 flex-1">{notif.message}</p>
                <button
                  onClick={() => {
                    markNotificationRead(notif.id);
                    setAssignmentNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
                  }}
                  className="text-indigo-400 hover:text-indigo-600 shrink-0 text-[10px] font-semibold"
                >
                  Lu
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Onglets historiques ── */}
        <div className="space-y-3">
          {/* Tab bar pill style */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
            {historyTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setHistoryTab(tab.id)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                  historyTab === tab.id
                    ? 'bg-white shadow-sm text-slate-800'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    'w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black',
                    historyTab === tab.id
                      ? tab.id === 'bilans' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                      : 'bg-slate-200 text-slate-500'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* ── Onglet Exercices ── */}
          {historyTab === 'exercices' && (
            <div className="p-4 space-y-2">
              {allExercises.length === 0 ? (
                <div className="py-10 text-center">
                  <Calendar size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-400">Aucun exercice soumis</p>
                  <button
                    onClick={() => setActiveView('exercices')}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 mx-auto"
                  >
                    <Plus size={13} /> Saisir mes exercices
                  </button>
                </div>
              ) : allExercises.map(ex => (
                <div
                  key={ex.id}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium bg-slate-50 border border-transparent text-slate-600 transition-all"
                >
                  <button
                    onClick={() => { setSelectedDate(ex.date); setActiveView('exercices'); }}
                    className="flex-1 flex items-center justify-between text-left"
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      {formatDateLong(ex.date)}
                    </span>
                    <span className="text-slate-400 shrink-0 ml-2">{ex.entries.length} entrée(s)</span>
                  </button>
                  <button
                    onClick={() => session && handleDeleteExercise(session.memberId, ex.date)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                    title="Supprimer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Onglet Bilans ── */}
          {historyTab === 'bilans' && (
            <div className="p-4 space-y-2">
              {monthlyPoints.length === 0 ? (
                <div className="py-10 text-center">
                  <ClipboardCheck size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-400">Aucun bilan soumis</p>
                  <button
                    onClick={() => setActiveView('bilan')}
                    className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 mx-auto"
                  >
                    <Plus size={13} /> Soumettre un bilan
                  </button>
                </div>
              ) : [...monthlyPoints]
                .sort((a, b) => b.year - a.year || b.month - a.month)
                .map(point => (
                  <button
                    key={point.id}
                    onClick={() => { setSelectedMonth(point.month); setSelectedYear(point.year); setActiveView('bilan'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium bg-slate-50 border border-transparent text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span className="flex-1 text-left">{MONTHS[point.month]} {point.year}</span>
                    <span className={cn('font-bold', point.score >= 4 ? 'text-emerald-600' : point.score >= 2 ? 'text-amber-500' : 'text-rose-500')}>
                      {point.score} ex.
                    </span>
                    <ChevronRight size={13} className="text-slate-300" />
                  </button>
                ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciceSpirituelDashboard;
