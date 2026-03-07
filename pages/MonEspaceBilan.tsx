import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, ClipboardCheck, Save, LogOut, ArrowLeft,
  CheckCircle, CheckCircle2, Flame, Loader2, Lock, Calendar, ChevronRight
} from 'lucide-react';
import { getSpiritualGoals, upsertSpiritualGoals, getSpiritualPoints, upsertSpiritualPoints } from '../lib/db';
import { MemberSession, YearlySpiritualGoals, MonthlySpiritualPoint, SpiritualObjective } from '../types';
import { SPIRITUAL_EXERCISES_LIST } from '../constants';
import { cn, generateId } from '../utils';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const calculateScore = (results: Record<string, boolean>) => {
  const normalKeys = Object.keys(results).filter(k => k !== 'retraites_nb' && k !== 'retraites_hr');
  let score = normalKeys.filter(k => results[k] === true).length;
  if (results['retraites_nb'] === true || results['retraites_hr'] === true) score += 1;
  return score;
};

const MonEspaceBilan: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<MemberSession | null>(null);
  const [activeTab, setActiveTab] = useState<'objectifs' | 'bilan'>('objectifs');
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Goals state
  const [currentGoals, setCurrentGoals] = useState<YearlySpiritualGoals | null>(null);
  const [objectives, setObjectives] = useState<SpiritualObjective[]>([]);
  const [savingGoals, setSavingGoals] = useState(false);
  const [goalsSaved, setGoalsSaved] = useState(false);

  // Monthly bilan state
  const [monthlyPoints, setMonthlyPoints] = useState<MonthlySpiritualPoint[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const m = new Date().getMonth() - 1;
    return m < 0 ? 11 : m;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear();
  });
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [savingBilan, setSavingBilan] = useState(false);
  const [bilanSaved, setBilanSaved] = useState(false);

  // Session check
  useEffect(() => {
    const raw = localStorage.getItem('vinea_member_session');
    if (!raw) { navigate('/mon-espace'); return; }
    try {
      setSession(JSON.parse(raw));
    } catch {
      navigate('/mon-espace');
    }
  }, [navigate]);

  // Load data
  useEffect(() => {
    if (!session) return;
    setLoading(true);
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
      setLoading(false);
    });
  }, [session, currentYear]);

  // Sync bilan results when month/year/points/goals change
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-indigo-700 text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/mon-espace/dashboard')}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-bold leading-tight">Objectifs & Bilan</h1>
            <p className="text-indigo-200 text-xs">
              {session.gender === 'Masculin' ? 'Frère' : 'Sœur'} {session.firstName}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          title="Se déconnecter"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-4 sticky top-0 z-10">
        <div className="flex max-w-2xl mx-auto">
          <button
            onClick={() => setActiveTab('objectifs')}
            className={cn(
              'flex-1 py-3.5 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2',
              activeTab === 'objectifs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            )}
          >
            <Target size={15} /> Objectifs {currentYear}
          </button>
          <button
            onClick={() => setActiveTab('bilan')}
            className={cn(
              'flex-1 py-3.5 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2',
              activeTab === 'bilan'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            )}
          >
            <ClipboardCheck size={15} /> Bilan mensuel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* ── Tab Objectifs ─────────────────────────────────── */}
          {activeTab === 'objectifs' && (
            <>
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
                    <div
                      key={ex.id}
                      className={cn(
                        'bg-white rounded-2xl border-2 transition-all overflow-hidden',
                        obj.isEnabled ? 'border-indigo-200 shadow-sm' : 'border-slate-100'
                      )}
                    >
                      <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                            obj.isEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                          )}>
                            <Flame size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{ex.label}</p>
                            <p className="text-xs text-slate-400">{ex.frequency}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setObjectives(prev => prev.map(o =>
                            o.exerciseId === ex.id ? { ...o, isEnabled: !o.isEnabled } : o
                          ))}
                          className={cn(
                            'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0',
                            obj.isEnabled
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          )}
                        >
                          {obj.isEnabled ? 'Activé' : 'Activer'}
                        </button>
                      </div>

                      {obj.isEnabled && (
                        <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                              Objectif {ex.unit ? `(${ex.unit})` : ''}
                            </label>
                            {ex.valueType === 'select' ? (
                              <select
                                value={String(obj.targetValue)}
                                onChange={e => setObjectives(prev => prev.map(o =>
                                  o.exerciseId === ex.id ? { ...o, targetValue: e.target.value } : o
                                ))}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                              >
                                {ex.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            ) : ex.valueType === 'boolean' ? (
                              <button
                                onClick={() => setObjectives(prev => prev.map(o =>
                                  o.exerciseId === ex.id ? { ...o, targetValue: !o.targetValue } : o
                                ))}
                                className={cn(
                                  'w-full py-2.5 rounded-xl text-xs font-semibold border transition-all',
                                  obj.targetValue
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-400'
                                )}
                              >
                                {obj.targetValue ? 'Engagement ferme (Oui)' : 'Non activé'}
                              </button>
                            ) : (
                              <input
                                type="number"
                                step={ex.valueType === 'decimal' ? '0.1' : '1'}
                                value={String(obj.targetValue || '')}
                                onChange={e => setObjectives(prev => prev.map(o =>
                                  o.exerciseId === ex.id ? { ...o, targetValue: e.target.value } : o
                                ))}
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
                              onChange={e => setObjectives(prev => prev.map(o =>
                                o.exerciseId === ex.id ? { ...o, notes: e.target.value } : o
                              ))}
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
                  savingGoals
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : goalsSaved
                    ? 'bg-emerald-600 text-white shadow-emerald-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                )}
              >
                {savingGoals
                  ? <><Loader2 size={18} className="animate-spin" /> Enregistrement...</>
                  : goalsSaved
                  ? <><CheckCircle2 size={18} /> Objectifs enregistrés !</>
                  : <><Save size={18} /> Enregistrer mes objectifs</>}
              </button>
            </>
          )}

          {/* ── Tab Bilan mensuel ─────────────────────────────── */}
          {activeTab === 'bilan' && (
            <>
              {enabledObjectives.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                  <Target size={36} className="text-amber-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-amber-800">Définissez d'abord vos objectifs</p>
                  <p className="text-xs text-amber-600 mt-1.5 leading-relaxed">
                    Activez au moins un exercice dans l'onglet <strong>Objectifs {currentYear}</strong> pour pouvoir soumettre un bilan mensuel.
                  </p>
                  <button
                    onClick={() => setActiveTab('objectifs')}
                    className="mt-5 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 transition-colors"
                  >
                    Définir mes objectifs
                  </button>
                </div>
              ) : (
                <>
                  {/* Month/Year selector */}
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
                            return (
                              <option key={i} value={i} disabled={disabled}>
                                {m}{disabled ? ' (futur)' : ''}
                              </option>
                            );
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

                  {/* Blocked states */}
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
                      <p className="text-xs text-slate-400 mt-1.5">
                        L'évaluation ne peut pas être faite pour un mois à venir.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Exercise checklist */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100">
                          <h3 className="text-sm font-bold text-slate-800">
                            Bilan de {MONTHS[selectedMonth]} {selectedYear}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Cochez les exercices accomplis ce mois-ci
                          </p>
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
                                className={cn(
                                  'w-full flex items-center gap-4 px-5 py-4 text-left transition-all',
                                  isChecked ? 'bg-emerald-50' : 'hover:bg-slate-50'
                                )}
                              >
                                <div className={cn(
                                  'w-8 h-8 rounded-xl flex items-center justify-center border-2 shrink-0 transition-all',
                                  isChecked
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'bg-white border-slate-200 text-transparent'
                                )}>
                                  <CheckCircle size={16} strokeWidth={3} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn('text-sm font-semibold', isChecked ? 'text-emerald-800' : 'text-slate-700')}>
                                    {ex.label}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    Objectif : {ex.valueType === 'boolean' ? 'Fidélité' : `${obj.targetValue} ${ex.unit || ''}`}
                                  </p>
                                </div>
                                <span className={cn(
                                  'text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0',
                                  isChecked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                                )}>
                                  {isChecked ? 'À jour' : 'Non'}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500">Exercices validés</p>
                            <p className={cn(
                              'text-2xl font-bold',
                              currentScore >= 4 ? 'text-emerald-600' : currentScore >= 2 ? 'text-amber-500' : 'text-rose-500'
                            )}>
                              {currentScore}
                            </p>
                          </div>
                          <p className="text-xs text-slate-400">sur {enabledObjectives.length} engagements</p>
                        </div>
                      </div>

                      <button
                        onClick={handleSaveBilan}
                        disabled={savingBilan}
                        className={cn(
                          'w-full py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg',
                          savingBilan
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            : bilanSaved
                            ? 'bg-emerald-600 text-white shadow-emerald-200'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                        )}
                      >
                        {savingBilan
                          ? <><Loader2 size={18} className="animate-spin" /> Enregistrement...</>
                          : bilanSaved
                          ? <><CheckCircle2 size={18} /> Bilan enregistré !</>
                          : <><Save size={18} /> {existingBilan ? 'Mettre à jour le bilan' : 'Soumettre le bilan'}</>}
                      </button>
                    </>
                  )}

                  {/* Bilan history */}
                  {monthlyPoints.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        Historique des bilans
                      </h3>
                      <div className="space-y-2">
                        {[...monthlyPoints]
                          .sort((a, b) => b.year - a.year || b.month - a.month)
                          .slice(0, 12)
                          .map(point => (
                            <button
                              key={point.id}
                              onClick={() => { setSelectedMonth(point.month); setSelectedYear(point.year); }}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-all border',
                                selectedMonth === point.month && selectedYear === point.year
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                  : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
                              )}
                            >
                              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                              <span className="flex-1 text-left">{MONTHS[point.month]} {point.year}</span>
                              <span className={cn(
                                'font-bold',
                                point.score >= 4 ? 'text-emerald-600' : point.score >= 2 ? 'text-amber-500' : 'text-rose-500'
                              )}>
                                {point.score} ex.
                              </span>
                              <ChevronRight size={13} className="text-slate-300" />
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MonEspaceBilan;
