import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Save, LogOut, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Loader2, Bell } from 'lucide-react';
import {
  getSpiritualExerciseTypes,
  getDailyExerciseByDate,
  getDailyExercises,
  upsertDailyExercise,
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

// ─── Calendrier mini ─────────────────────────────────────────

interface MiniCalendarProps {
  selectedDate: string;
  submittedDates: Set<string>;
  onSelect: (date: string) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ selectedDate, submittedDates, onSelect }) => {
  const today = toLocalDate(new Date());
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate();
  const firstDay = new Date(viewDate.year, viewDate.month, 1).getDay();
  // Ajuster premier jour (lundi = 0)
  const startOffset = (firstDay + 6) % 7;

  const prevMonth = () => {
    setViewDate(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 });
  };
  const nextMonth = () => {
    setViewDate(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 });
  };

  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const days = ['L','M','M','J','V','S','D'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-bold text-slate-700">{months[viewDate.month]} {viewDate.year}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {days.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const isSubmitted = submittedDates.has(dateStr);
          const isFuture = dateStr > today;

          return (
            <button
              key={day}
              onClick={() => !isFuture && onSelect(dateStr)}
              disabled={isFuture}
              className={cn(
                "relative w-full aspect-square rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center",
                isFuture && "text-slate-200 cursor-not-allowed",
                !isFuture && !isSelected && "text-slate-600 hover:bg-indigo-50",
                isSelected && "bg-indigo-600 text-white shadow-md shadow-indigo-200",
                isToday && !isSelected && "ring-2 ring-indigo-300 text-indigo-600"
              )}
            >
              {day}
              {isSubmitted && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
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
    if (!raw) { navigate('/exercice-spirituel'); return; }
    try {
      const s: MemberSession = JSON.parse(raw);
      setSession(s);
      // Si double rôle et pas encore de choix
      if (s.isDiscipleMaker && !localStorage.getItem('vinea_member_role_choice')) {
        setRoleChoice(null); // montrer écran de choix
      } else {
        setRoleChoice('member');
      }
    } catch {
      navigate('/exercice-spirituel');
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

  const handleLogout = () => {
    localStorage.removeItem('vinea_member_session');
    localStorage.removeItem('vinea_member_role_choice');
    navigate('/exercice-spirituel');
  };

  const handleRoleChoice = (role: 'member' | 'dm') => {
    localStorage.setItem('vinea_member_role_choice', role);
    setRoleChoice(role);
    if (role === 'dm') {
      // Pour le moment, rester sur la page membre (discipolat à implémenter côté admin)
      setRoleChoice('member');
    }
  };

  if (!session) return null;

  // ── Écran de choix de rôle ───────────────────────────────────
  if (session.isDiscipleMaker && roleChoice === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
            <span className="text-2xl font-black text-white">V</span>
          </div>
          <h2 className="text-white text-lg font-bold mb-1">Que voulez-vous faire ?</h2>
          <p className="text-indigo-200 text-sm mb-6">Bonjour {session.firstName}, choisissez votre espace.</p>
          <div className="space-y-3">
            <button
              onClick={() => handleRoleChoice('member')}
              className="w-full py-4 bg-white text-indigo-700 rounded-2xl text-sm font-bold hover:bg-indigo-50 transition-all shadow-lg"
            >
              Mes exercices spirituels
            </button>
            <button
              onClick={() => handleRoleChoice('dm')}
              className="w-full py-4 bg-white/10 text-white border border-white/20 rounded-2xl text-sm font-bold hover:bg-white/20 transition-all"
            >
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
      <header className="bg-indigo-700 text-white px-4 py-4 flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-sm font-bold">Exercices Spirituels</h1>
          <p className="text-indigo-200 text-xs mt-0.5">
            {session.gender === 'Masculin' ? 'Frère' : 'Sœur'} {session.firstName}
          </p>
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
          {session.isDiscipleMaker && (
            <button
              onClick={() => {
                localStorage.removeItem('vinea_member_role_choice');
                setRoleChoice(null);
              }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-medium transition-colors"
            >
              Changer
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
        {/* Calendrier */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 flex items-center gap-2">
            <Calendar size={14} />
            Date de la soumission
          </label>
          <MiniCalendar
            selectedDate={selectedDate}
            submittedDates={submittedDates}
            onSelect={setSelectedDate}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Exercices du <span className="font-bold text-slate-700">{formatDateLong(selectedDate)}</span>
            </p>
            {isSubmittedDate && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
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
                <button
                  key={ex.id}
                  onClick={() => setSelectedDate(ex.date)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-medium transition-all border",
                    selectedDate === ex.date
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    {formatDateLong(ex.date)}
                  </span>
                  <span className="text-slate-400">{ex.entries.length} entrée(s)</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciceSpirituelDashboard;
