import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Save, LogOut, CheckCircle2, AlertCircle, Loader2, Bell, Users, Trash2, ClipboardCheck } from 'lucide-react';
import {
  getSpiritualExerciseTypes,
  getDailyExerciseByDate,
  getDailyExercises,
  upsertDailyExercise,
  deleteDailyExercise,
} from '../lib/db';
import { SpiritualExerciseType, DailyExercise, MemberSession } from '../types';
import { cn } from '../utils';

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

// ─── Page principale ─────────────────────────────────────────

const ExerciceSpirituelDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<MemberSession | null>(null);
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
  const [roleChoice, setRoleChoice] = useState<'member' | 'dm' | null>(null);

  // ── Vérifier session ────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('vinea_member_session');
    if (!raw) { navigate('/mon-espace'); return; }
    try {
      const s: MemberSession = JSON.parse(raw);
      setSession(s);
      // Les faiseurs de disciples voient toujours l'écran de choix au démarrage
      if (s.isDiscipleMaker) {
        setRoleChoice(null);
      } else {
        setRoleChoice('member');
      }
    } catch {
      navigate('/mon-espace');
    }
  }, [navigate]);

  // ── Charger les types d'exercices ───────────────────────────
  useEffect(() => {
    getSpiritualExerciseTypes().then(types =>
      setExerciseTypes(types.filter(t => t.active))
    );
  }, []);

  // ── Charger tout l'historique du membre ─────────────────────
  const loadAllExercises = useCallback(async (memberId: string) => {
    const all = await getDailyExercises(memberId);
    setAllExercises(all);
    setSubmittedDates(new Set(all.map(e => e.date)));

    // Construire notifications pour jours manquants (7 derniers jours)
    const today = toLocalDate(new Date());
    const missing: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = toLocalDate(d);
      if (!all.some(e => e.date === ds)) {
        missing.push(formatDate(ds));
      }
    }
    if (missing.length > 0) {
      setNotifications(missing);
      setShowNotifs(true);
    }
  }, []);

  useEffect(() => {
    if (session) loadAllExercises(session.memberId);
  }, [session, loadAllExercises]);

  // ── Charger les données du jour sélectionné ─────────────────
  useEffect(() => {
    if (!session) return;
    setLoadingForm(true);
    getDailyExerciseByDate(session.memberId, selectedDate).then(exercise => {
      if (exercise) {
        const vals: Record<string, string | boolean> = {};
        const details: Record<string, string> = {};
        exercise.entries.forEach(entry => {
          if (entry.valueBool !== undefined && entry.valueBool !== null) {
            vals[entry.typeId] = entry.valueBool;
          } else if (entry.valueText !== undefined) {
            vals[entry.typeId] = entry.valueText ?? '';
          }
          if (entry.detailText) {
            details[entry.typeId] = entry.detailText;
          }
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

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    setSaveSuccess(false);

    const entries = exerciseTypes.map(type => {
      const val = formValues[type.id];
      const detail = detailValues[type.id];
      if (type.fieldType === 'boolean') {
        return { typeId: type.id, valueBool: val === true, detailText: detail || undefined };
      } else {
        return { typeId: type.id, valueText: String(val ?? ''), detailText: detail || undefined };
      }
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

  const handleLogout = () => {
    localStorage.removeItem('vinea_member_session');
    localStorage.removeItem('vinea_member_role_choice');
    navigate('/mon-espace');
  };

  const handleRoleChoice = (role: 'member' | 'dm') => {
    if (role === 'dm') {
      navigate('/mon-espace/groupe');
    } else {
      setRoleChoice('member');
    }
  };

  if (!session) return null;

  // ── Écran de choix de rôle ───────────────────────────────────
  if (session.isDiscipleMaker && roleChoice === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl w-full max-w-sm text-center">
          {/* Avatar / Photo */}
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
              onClick={() => handleRoleChoice('member')}
              className="w-full py-4 bg-white text-indigo-700 rounded-2xl text-sm font-bold hover:bg-indigo-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Calendar size={18} />
              Mes exercices spirituels
            </button>
            <button
              onClick={() => navigate('/mon-espace/bilan')}
              className="w-full py-4 bg-indigo-500/40 text-white border border-white/20 rounded-2xl text-sm font-bold hover:bg-indigo-500/60 transition-all flex items-center justify-center gap-2"
            >
              <ClipboardCheck size={18} />
              Objectifs & Bilan mensuel
            </button>
            <button
              onClick={() => handleRoleChoice('dm')}
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

  const isSubmittedDate = submittedDates.has(selectedDate);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-indigo-700 text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/30 shrink-0">
            {session.photoUrl ? (
              <img src={session.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs font-bold">
                {session.firstName.charAt(0)}{session.lastName.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">Mon Espace - MIDC</h1>
            <p className="text-indigo-200 text-xs">
              {session.gender === 'Masculin' ? 'Frère' : 'Sœur'} {session.firstName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            </button>
          )}
          <button
            onClick={() => navigate('/mon-espace/bilan')}
            className="px-3 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <ClipboardCheck size={14} />
            Bilan
          </button>
          {session.isDiscipleMaker && (
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

      {/* Notification panneau */}
      {showNotifs && notifications.length > 0 && (
        <div className="mx-4 mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800 mb-1">
                  Jours sans exercices spirituels soumis :
                </p>
                <ul className="space-y-0.5">
                  {notifications.map(n => (
                    <li key={n} className="text-xs text-amber-700">• {n}</li>
                  ))}
                </ul>
                <button
                  onClick={() => setShowNotifs(false)}
                  className="mt-2 text-xs text-amber-600 font-medium hover:text-amber-800 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Sélecteur de date */}
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

        {/* Formulaire */}
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
                              val === true
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-300"
                            )}
                          >
                            Oui
                          </button>
                          <button
                            onClick={() => {
                              setFormValues(v => ({ ...v, [type.id]: false }));
                              setDetailValues(d => ({ ...d, [type.id]: '' }));
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-semibold border transition-all",
                              val === false
                                ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                                : "bg-slate-50 text-slate-500 border-slate-200 hover:border-rose-300"
                            )}
                          >
                            Non
                          </button>
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
              onClick={handleSave}
              disabled={saving || loadingForm}
              className={cn(
                "w-full py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg",
                saving || loadingForm
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : saveSuccess
                  ? "bg-emerald-600 text-white shadow-emerald-200"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
              )}
            >
              {saving ? (
                <><Loader2 size={18} className="animate-spin" /> Enregistrement...</>
              ) : saveSuccess ? (
                <><CheckCircle2 size={18} /> Enregistré !</>
              ) : (
                <><Save size={18} /> {isSubmittedDate ? 'Mettre à jour' : 'Enregistrer'}</>
              )}
            </button>
          </div>
        </div>

        {/* Historique récent */}
        {allExercises.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Historique récent
            </h3>
            <div className="space-y-2">
              {allExercises.slice(0, 7).map(ex => (
                <div
                  key={ex.id}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium transition-all border",
                    selectedDate === ex.date
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-slate-50 border-transparent text-slate-600"
                  )}
                >
                  <button
                    onClick={() => setSelectedDate(ex.date)}
                    className="flex-1 flex items-center justify-between text-left"
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      {formatDateLong(ex.date)}
                    </span>
                    <span className="text-slate-400">{ex.entries.length} entrée(s)</span>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciceSpirituelDashboard;
