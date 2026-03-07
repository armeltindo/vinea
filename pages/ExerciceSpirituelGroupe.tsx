import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Users, ChevronDown, ChevronUp, CheckCircle2,
  AlertCircle, Loader2, BookOpen, UserX, Phone, MessageSquare,
  Calendar, ClipboardList, MapPin, Save, ChevronRight,
  Pencil, Trash2, X, ArrowLeft
} from 'lucide-react';
import {
  getDisciplesByMentorId,
  getDailyExercisesCountByMemberIds,
  getDailyExerciseDatesByMemberId,
  getVisitorsByParrainId,
  getRecentAttendanceSessions,
  getAppConfig,
  getMembers,
  updateVisitor,
  updateMember,
} from '../lib/db';
import { Member, MemberSession, Visitor, FollowUpEntry, AttendanceSession } from '../types';
import { cn, generateId } from '../utils';

// ─── Helpers ────────────────────────────────────────────────

const toLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const nDaysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDate(d);
};

const formatDateShort = (dateStr: string): string => {
  const [, m, d] = dateStr.split('-');
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
};

const adherenceColor = (count: number, total: number): string => {
  const ratio = total === 0 ? 0 : count / total;
  if (ratio >= 0.8) return 'bg-emerald-100 text-emerald-700';
  if (ratio >= 0.5) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
};

const FOLLOW_UP_TYPES: FollowUpEntry['type'][] = ['Appel', 'Visite', 'Message', 'Rencontre'];

// ─── Formulaire de rapport inline ────────────────────────────

interface ReportFormProps {
  onSubmit: (type: FollowUpEntry['type'], note: string, nextStep: string) => Promise<void>;
  onCancel: () => void;
  initialType?: FollowUpEntry['type'];
  initialNote?: string;
  initialNextStep?: string;
  submitLabel?: string;
}

const ReportForm: React.FC<ReportFormProps> = ({ onSubmit, onCancel, initialType, initialNote, initialNextStep, submitLabel }) => {
  const [type, setType] = useState<FollowUpEntry['type']>(initialType ?? 'Appel');
  const [note, setNote] = useState(initialNote ?? '');
  const [nextStep, setNextStep] = useState(initialNextStep ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    await onSubmit(type, note.trim(), nextStep.trim());
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="px-5 pb-5 pt-3 border-t border-slate-100 space-y-3">
      {/* Type */}
      <div className="flex gap-2 flex-wrap">
        {FOLLOW_UP_TYPES.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
              type === t
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {/* Note */}
      <div>
        <label className="text-xs font-semibold text-slate-400 mb-1 block">Rapport / Observation *</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          placeholder="Décrivez le contact, l'état spirituel, les besoins..."
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-300 outline-none transition-all resize-none"
          required
        />
      </div>
      {/* Prochain pas */}
      <div>
        <label className="text-xs font-semibold text-slate-400 mb-1 block">Prochain pas (optionnel)</label>
        <input
          type="text"
          value={nextStep}
          onChange={e => setNextStep(e.target.value)}
          placeholder="Ex : Appel dans 3 jours, Visite dimanche..."
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-300 outline-none transition-all"
        />
      </div>
      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !note.trim()}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            saving || !note.trim()
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          )}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {submitLabel ?? 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-3 rounded-xl text-sm font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
        >
          Annuler
        </button>
      </div>
    </form>
  );
};

// ─── Modale détail / historique ──────────────────────────────

type ModalTarget =
  | { type: 'member'; person: Member; count7: number; count30: number }
  | { type: 'visitor'; person: Visitor };

interface PersonDetailModalProps {
  target: ModalTarget;
  onClose: () => void;
  onUpdate: (updated: Member | Visitor) => void;
  session: MemberSession;
}

const PersonDetailModal: React.FC<PersonDetailModalProps> = ({ target, onClose, onUpdate, session }) => {
  const { person, type } = target;
  const isMember = type === 'member';

  const getHistory = (): FollowUpEntry[] => {
    if (isMember) return (person as Member).followUpHistory ?? [];
    return (person as Visitor).followUpHistory ?? [];
  };

  const [history, setHistory] = useState<FollowUpEntry[]>(getHistory);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exerciseDates, setExerciseDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);

  useEffect(() => {
    if (isMember && (person as Member).memberAccountActive) {
      setLoadingDates(true);
      getDailyExerciseDatesByMemberId(person.id, 30).then(d => {
        setExerciseDates(d);
        setLoadingDates(false);
      });
    }
  }, [person.id, isMember]);

  const persist = async (newHistory: FollowUpEntry[]) => {
    setSaving(true);
    if (isMember) {
      await updateMember(person.id, { followUpHistory: newHistory });
      onUpdate({ ...(person as Member), followUpHistory: newHistory });
    } else {
      await updateVisitor(person.id, { followUpHistory: newHistory });
      onUpdate({ ...(person as Visitor), followUpHistory: newHistory });
    }
    setHistory(newHistory);
    setSaving(false);
  };

  const handleAdd = async (t: FollowUpEntry['type'], note: string, nextStep: string) => {
    const entry: FollowUpEntry = { id: generateId(), date: new Date().toISOString().split('T')[0], type: t, note, nextStep: nextStep || undefined, submittedBy: { firstName: session.firstName, lastName: session.lastName } };
    await persist([...history, entry]);
    setShowAddForm(false);
  };

  const handleEdit = async (id: string, t: FollowUpEntry['type'], note: string, nextStep: string) => {
    await persist(history.map(e => e.id === id ? { ...e, type: t, note, nextStep: nextStep || undefined } : e));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await persist(history.filter(e => e.id !== id));
  };

  const m = isMember ? (person as Member) : null;
  const v = !isMember ? (person as Visitor) : null;
  const displayName = `${person.firstName} ${person.lastName}`;

  const statusColor: Record<string, string> = {
    'En attente': 'bg-slate-100 text-slate-500',
    '1er Contact': 'bg-blue-100 text-blue-600',
    'Visite/Rencontre': 'bg-violet-100 text-violet-600',
    'Intégration/Membre': 'bg-emerald-100 text-emerald-600',
  };

  return (
    <>
      {/* Backdrop desktop */}
      <div className="hidden md:block fixed inset-0 z-[199] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:rounded-3xl md:shadow-2xl md:h-[90vh] md:overflow-hidden">
      {/* Header */}
      <div className={cn("px-4 py-4 flex items-center gap-3 shadow-sm shrink-0", isMember ? "bg-indigo-700" : "bg-violet-700")}>
        <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/30 shrink-0">
          {(person as Member).photoUrl ? (
            <img src={(person as Member).photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/20 flex items-center justify-center text-sm font-bold text-white">
              {person.firstName.charAt(0)}{person.lastName.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{displayName}</p>
          <p className="text-xs text-white/70">{isMember ? (person.gender === 'Masculin' ? 'Frère · Disciple' : 'Sœur · Disciple') : `Visiteur · ${v!.status}`}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

        {/* Infos contact */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 shadow-sm">
          {person.phone && (
            <a href={`tel:${person.phone}`} className="flex items-center gap-3 text-sm text-slate-700 hover:text-indigo-600 transition-colors">
              <Phone size={15} className="text-slate-400 shrink-0" />
              <span className="font-medium">{person.phone}</span>
            </a>
          )}
          {!person.phone && <p className="text-xs text-slate-400 italic">Aucun numéro enregistré</p>}
          {v && v.visitDate && (
            <p className="flex items-center gap-3 text-xs text-slate-500">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              1ère visite : {formatDateShort(v.visitDate)}
            </p>
          )}
          {v && (
            <p className="mt-1">
              <span className={cn("px-2 py-0.5 rounded-lg text-xs font-medium", statusColor[v.status] ?? 'bg-slate-100 text-slate-500')}>
                {v.status}
              </span>
            </p>
          )}
        </div>

        {/* Exercices spirituels (disciples uniquement) */}
        {isMember && (person as Member).memberAccountActive && (
          <div className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Exercices spirituels</p>
            <div className="flex gap-3">
              <span className={cn("flex-1 text-center px-3 py-2 rounded-xl text-xs font-bold", adherenceColor((target as any).count7, 7))}>
                {(target as any).count7}/7 jours
              </span>
              <span className={cn("flex-1 text-center px-3 py-2 rounded-xl text-xs font-bold", adherenceColor((target as any).count30, 30))}>
                {(target as any).count30}/30 jours
              </span>
            </div>
            {loadingDates ? (
              <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin text-indigo-400" /></div>
            ) : exerciseDates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {exerciseDates.map(d => (
                  <span key={d} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-medium flex items-center gap-1">
                    <CheckCircle2 size={9} /> {formatDateShort(d)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {isMember && !(person as Member).memberAccountActive && (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
            <p className="text-xs text-slate-400">Aucun compte exercices actif</p>
          </div>
        )}

        {/* Historique des rapports */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Rapports de suivi ({history.length})
            </p>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
              >
                + Ajouter
              </button>
            )}
          </div>

          {showAddForm && (
            <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden">
              <div className="px-5 pt-4 pb-2">
                <p className="text-xs font-semibold text-indigo-600">Nouveau rapport</p>
              </div>
              <ReportForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} submitLabel="Ajouter" />
            </div>
          )}

          {history.length === 0 && !showAddForm && (
            <p className="text-xs text-slate-400 text-center py-6 italic">Aucun rapport enregistré</p>
          )}

          {[...history].reverse().map(entry => (
            <div key={entry.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {editingId === entry.id ? (
                <>
                  <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-amber-600">Modifier le rapport</p>
                    <button onClick={() => setEditingId(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={14} /></button>
                  </div>
                  <ReportForm
                    onSubmit={(t, n, s) => handleEdit(entry.id, t, n, s)}
                    onCancel={() => setEditingId(null)}
                    initialType={entry.type}
                    initialNote={entry.note}
                    initialNextStep={entry.nextStep ?? ''}
                    submitLabel="Enregistrer"
                  />
                </>
              ) : (
                <div className="px-4 py-3 flex items-start gap-3">
                  <span className={cn("px-2 py-0.5 rounded-lg text-xs font-medium shrink-0 mt-0.5", isMember ? "bg-indigo-100 text-indigo-600" : "bg-violet-100 text-violet-600")}>
                    {entry.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700">{entry.note}</p>
                    {entry.nextStep && (
                      <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                        <ChevronRight size={10} /> {entry.nextStep}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {formatDateShort(entry.date)}
                      {entry.submittedBy && (
                        <span className="ml-1">· par {entry.submittedBy.firstName} {entry.submittedBy.lastName}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditingId(entry.id)}
                      className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                      disabled={saving}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      disabled={saving}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
    </>
  );
};

// ─── Carte disciple (exercices) ──────────────────────────────

interface DiscipeCardProps {
  disciple: Member;
  count7: number;
  count30: number;
  onOpenDetail: (member: Member) => void;
}

const DiscipeCard: React.FC<DiscipeCardProps> = ({ disciple, count7, count30, onOpenDetail }) => {
  const [expanded, setExpanded] = useState(false);
  const [dates, setDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);

  const handleExpand = useCallback(async () => {
    if (!expanded && disciple.memberAccountActive) {
      setLoadingDates(true);
      const d = await getDailyExerciseDatesByMemberId(disciple.id, 30);
      setDates(d);
      setLoadingDates(false);
    }
    setExpanded(e => !e);
  }, [expanded, disciple.id, disciple.memberAccountActive]);

  const hasAccount = disciple.memberAccountActive;

  return (
    <div className={cn(
      "bg-white rounded-2xl border shadow-sm overflow-hidden transition-all",
      expanded ? "border-indigo-200" : "border-slate-200"
    )}>
      <button
        onClick={hasAccount ? handleExpand : undefined}
        className={cn(
          "w-full px-5 py-4 flex items-center gap-4 text-left",
          hasAccount && "hover:bg-slate-50 transition-colors"
        )}
      >
        {/* Avatar / Photo */}
        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-100">
          {disciple.photoUrl ? (
            <img src={disciple.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={cn(
              "w-full h-full flex items-center justify-center text-sm font-bold",
              hasAccount ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
            )}>
              {disciple.firstName.charAt(0)}{disciple.lastName.charAt(0)}
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <button
            onClick={e => { e.stopPropagation(); onOpenDetail(disciple); }}
            className="text-sm font-semibold text-slate-800 hover:text-indigo-600 transition-colors truncate block text-left"
          >
            {disciple.firstName} {disciple.lastName}
          </button>
          <p className="text-xs text-slate-400 mt-0.5">
            {disciple.gender === 'Masculin' ? 'Frère' : 'Sœur'}
          </p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {hasAccount ? (
            <>
              <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", adherenceColor(count7, 7))}>{count7}/7j</span>
              <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", adherenceColor(count30, 30))}>{count30}/30j</span>
              {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-400">
              Pas de compte
            </span>
          )}
        </div>
      </button>

      {/* Détail — dates soumises */}
      {expanded && hasAccount && (
        <div className="px-5 pb-4 border-t border-slate-100 pt-3">
          {loadingDates ? (
            <div className="flex justify-center py-3">
              <Loader2 size={18} className="animate-spin text-indigo-400" />
            </div>
          ) : dates.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">Aucune soumission</p>
          ) : (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Dernières soumissions</p>
              <div className="flex flex-wrap gap-1.5">
                {dates.map(d => (
                  <span key={d} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-medium flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    {formatDateShort(d)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Carte absent ────────────────────────────────────────────

interface AbsentCardProps {
  member: Member;
  absenceDates: string[];
  onReportSaved: (updated: Member) => void;
  onOpenDetail: (member: Member) => void;
  session: MemberSession;
}

const AbsentCard: React.FC<AbsentCardProps> = ({ member, absenceDates, onReportSaved, onOpenDetail, session }) => {
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleReport = async (type: FollowUpEntry['type'], note: string, nextStep: string) => {
    const entry: FollowUpEntry = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      type,
      note,
      nextStep: nextStep || undefined,
      submittedBy: { firstName: session.firstName, lastName: session.lastName },
    };
    const updatedHistory = [...(member.followUpHistory ?? []), entry];
    await updateMember(member.id, { followUpHistory: updatedHistory });
    const updated = { ...member, followUpHistory: updatedHistory };
    setSaved(true);
    setShowForm(false);
    onReportSaved(updated);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-amber-100">
          {member.photoUrl ? (
            <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-600">
              {member.firstName.charAt(0)}{member.lastName.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onOpenDetail(member)}
            className="text-sm font-semibold text-slate-800 hover:text-indigo-600 transition-colors truncate block text-left"
          >
            {member.firstName} {member.lastName}
          </button>
          <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
            <AlertCircle size={10} />
            Absent : {absenceDates.map(formatDateShort).join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && <CheckCircle2 size={16} className="text-emerald-500" />}
          {member.phone && (
            <a
              href={`tel:${member.phone}`}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              title="Appeler"
            >
              <Phone size={14} className="text-slate-500" />
            </a>
          )}
          <button
            onClick={() => setShowForm(f => !f)}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              showForm
                ? "bg-slate-100 text-slate-600"
                : "bg-amber-600 text-white hover:bg-amber-700"
            )}
          >
            <ClipboardList size={13} />
            {showForm ? 'Annuler' : 'Rapport'}
          </button>
        </div>
      </div>
      {showForm && (
        <ReportForm onSubmit={handleReport} onCancel={() => setShowForm(false)} />
      )}
    </div>
  );
};

// ─── Carte visiteur ──────────────────────────────────────────

interface VisitorCardProps {
  visitor: Visitor;
  onReportSaved: (updated: Visitor) => void;
  onOpenDetail: (visitor: Visitor) => void;
  session: MemberSession;
}

const VisitorCard: React.FC<VisitorCardProps> = ({ visitor, onReportSaved, onOpenDetail, session }) => {
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const history = visitor.followUpHistory ?? [];
  const lastEntry = history.length > 0 ? history[history.length - 1] : null;

  const handleReport = async (type: FollowUpEntry['type'], note: string, nextStep: string) => {
    const entry: FollowUpEntry = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      type,
      note,
      nextStep: nextStep || undefined,
      submittedBy: { firstName: session.firstName, lastName: session.lastName },
    };
    const updatedHistory = [...history, entry];
    await updateVisitor(visitor.id, { followUpHistory: updatedHistory });
    setSaved(true);
    setShowForm(false);
    onReportSaved({ ...visitor, followUpHistory: updatedHistory });
    setTimeout(() => setSaved(false), 3000);
  };

  const statusColor: Record<string, string> = {
    'En attente': 'bg-slate-100 text-slate-500',
    '1er Contact': 'bg-blue-100 text-blue-600',
    'Visite/Rencontre': 'bg-violet-100 text-violet-600',
    'Intégration/Membre': 'bg-emerald-100 text-emerald-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-violet-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-600 shrink-0">
          {visitor.firstName.charAt(0)}{visitor.lastName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onOpenDetail(visitor)}
            className="text-sm font-semibold text-slate-800 hover:text-violet-600 transition-colors truncate block text-left"
          >
            {visitor.firstName} {visitor.lastName}
          </button>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={cn("px-2 py-0.5 rounded-lg text-xs font-medium", statusColor[visitor.status] ?? 'bg-slate-100 text-slate-500')}>
              {visitor.status}
            </span>
            {lastEntry && (
              <span className="text-xs text-slate-400">
                Dernier suivi : {formatDateShort(lastEntry.date)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && <CheckCircle2 size={16} className="text-emerald-500" />}
          {visitor.phone && (
            <a href={`tel:${visitor.phone}`} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors" title="Appeler">
              <Phone size={14} className="text-slate-500" />
            </a>
          )}
          {history.length > 0 && (
            <button onClick={() => setExpanded(e => !e)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
              {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
            </button>
          )}
          <button
            onClick={() => setShowForm(f => !f)}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              showForm
                ? "bg-slate-100 text-slate-600"
                : "bg-violet-600 text-white hover:bg-violet-700"
            )}
          >
            <ClipboardList size={13} />
            {showForm ? 'Annuler' : 'Rapport'}
          </button>
        </div>
      </div>

      {/* Historique des rapports */}
      {expanded && history.length > 0 && (
        <div className="px-5 pb-4 border-t border-slate-100 pt-3 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Historique des rapports</p>
          {[...history].reverse().map(entry => (
            <div key={entry.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <span className="px-2 py-0.5 bg-violet-100 text-violet-600 rounded-lg text-xs font-medium shrink-0">{entry.type}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-700">{entry.note}</p>
                {entry.nextStep && (
                  <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                    <ChevronRight size={10} /> {entry.nextStep}
                  </p>
                )}
              </div>
              <span className="text-xs text-slate-400 shrink-0">{formatDateShort(entry.date)}</span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ReportForm onSubmit={handleReport} onCancel={() => setShowForm(false)} />
      )}
    </div>
  );
};

// ─── Page principale ─────────────────────────────────────────

type TabId = 'disciples' | 'absences' | 'visitors';

const ExerciceSpirituelGroupe: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<MemberSession | null>(null);
  const [disciples, setDisciples] = useState<Member[]>([]);
  const [counts7, setCounts7] = useState<Record<string, number>>({});
  const [counts30, setCounts30] = useState<Record<string, number>>({});
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [absentDisciples, setAbsentDisciples] = useState<{ member: Member; dates: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('disciples');
  const [detailModal, setDetailModal] = useState<ModalTarget | null>(null);

  // ── Vérifier session ────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('vinea_member_session');
    if (!raw) { navigate('/mon-espace', { replace: true }); return; }
    try {
      const s: MemberSession = JSON.parse(raw);
      if (!s.isDiscipleMaker) { navigate('/mon-espace/dashboard', { replace: true }); return; }
      setSession(s);
    } catch {
      navigate('/mon-espace', { replace: true });
    }
  }, [navigate]);

  // ── Charger toutes les données ───────────────────────────────
  useEffect(() => {
    if (!session) return;
    const load = async () => {
      setLoading(true);
      const [list, vis, sessions, rawAssignments] = await Promise.all([
        getDisciplesByMentorId(session.memberId),
        getVisitorsByParrainId(session.memberId),
        getRecentAttendanceSessions(5),
        getAppConfig('attendance_assignments'),
      ]);
      setDisciples(list);
      setVisitors(vis);

      // Stats exercices
      const ids = list.filter(d => d.memberAccountActive).map(d => d.id);
      if (ids.length > 0) {
        const [c7, c30] = await Promise.all([
          getDailyExercisesCountByMemberIds(ids, nDaysAgo(7)),
          getDailyExercisesCountByMemberIds(ids, nDaysAgo(30)),
        ]);
        setCounts7(c7);
        setCounts30(c30);
      }

      // Absences : disciples absents + membres affectés via Attendance
      const assignments: Record<string, string> = rawAssignments ?? {};
      const discipleIds = new Set(list.map(d => d.id));
      const absentMap: Record<string, string[]> = {};
      const assignedExtraIds = new Set<string>();

      for (const s of sessions) {
        for (const absentId of (s.absentMembers ?? [])) {
          if (discipleIds.has(absentId)) {
            if (!absentMap[absentId]) absentMap[absentId] = [];
            absentMap[absentId].push(s.date);
          } else if (assignments[`${absentId}_${s.date}`] === session.memberId) {
            if (!absentMap[absentId]) absentMap[absentId] = [];
            absentMap[absentId].push(s.date);
            assignedExtraIds.add(absentId);
          }
        }
      }

      // Charger les membres affectés qui ne sont pas des disciples directs
      let extraMembers: Member[] = [];
      if (assignedExtraIds.size > 0) {
        const allMembers = await getMembers();
        extraMembers = allMembers.filter(m => assignedExtraIds.has(m.id));
      }

      const combinedList = [...list, ...extraMembers];
      const absentList = Object.entries(absentMap).map(([id, dates]) => ({
        member: combinedList.find(m => m.id === id)!,
        dates,
      })).filter(x => x.member);
      setAbsentDisciples(absentList);

      setLoading(false);
    };
    load();
  }, [session]);

  const handleLogout = () => {
    localStorage.removeItem('vinea_member_session');
    localStorage.removeItem('vinea_member_role_choice');
    navigate('/mon-espace');
  };

  const goToMyExercises = () => {
    navigate('/mon-espace/dashboard');
  };

  const openMemberDetail = (member: Member) => {
    setDetailModal({ type: 'member', person: member, count7: counts7[member.id] ?? 0, count30: counts30[member.id] ?? 0 });
  };

  const openVisitorDetail = (visitor: Visitor) => {
    setDetailModal({ type: 'visitor', person: visitor });
  };

  const handleModalUpdate = (updated: Member | Visitor) => {
    if (detailModal?.type === 'member') {
      const m = updated as Member;
      setDisciples(prev => prev.map(d => d.id === m.id ? m : d));
      setAbsentDisciples(prev => prev.map(a => a.member.id === m.id ? { ...a, member: m } : a));
      setDetailModal(prev => prev ? { ...prev, person: m } as ModalTarget : null);
    } else {
      const v = updated as Visitor;
      setVisitors(prev => prev.map(x => x.id === v.id ? v : x));
      setDetailModal(prev => prev ? { ...prev, person: v } as ModalTarget : null);
    }
  };

  if (!session) return null;

  const activeCount = disciples.filter(d => d.memberAccountActive).length;
  const inactiveCount = disciples.length - activeCount;

  const tabs: { id: TabId; label: string; count: number; color: string }[] = [
    { id: 'disciples', label: 'Disciples', count: disciples.length, color: 'indigo' },
    { id: 'absences', label: 'Absences', count: absentDisciples.length, color: 'amber' },
    { id: 'visitors', label: 'Visiteurs', count: visitors.length, color: 'violet' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-indigo-700 text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/mon-espace/dashboard')}
            className="w-9 h-9 rounded-xl overflow-hidden border border-white/30 shrink-0 cursor-pointer"
          >
            {session.photoUrl ? (
              <img src={session.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs font-bold">
                {session.firstName.charAt(0)}{session.lastName.charAt(0)}
              </div>
            )}
          </button>
          <div>
            <h1 className="text-sm font-bold leading-tight">Mon groupe de discipolat</h1>
            <p className="text-indigo-200 text-xs">
              {session.gender === 'Masculin' ? 'Frère' : 'Sœur'} {session.firstName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToMyExercises}
            className="px-3 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <BookOpen size={14} />
            Mes exercices
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            title="Se déconnecter"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">

        {/* Stats résumé */}
        {!loading && (disciples.length > 0 || visitors.length > 0) && (
          <div className="grid grid-cols-4 gap-2 md:gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 text-center shadow-sm">
              <p className="text-xl md:text-2xl font-black text-slate-800">{disciples.length}</p>
              <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">Disciples</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 text-center shadow-sm">
              <p className="text-xl md:text-2xl font-black text-emerald-600">{activeCount}</p>
              <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">Actifs</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-3 md:p-4 text-center shadow-sm">
              <p className={cn("text-xl md:text-2xl font-black", absentDisciples.length > 0 ? "text-amber-500" : "text-slate-300")}>
                {absentDisciples.length}
              </p>
              <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">Absents</p>
            </div>
            <div className="bg-white rounded-2xl border border-violet-200 p-3 md:p-4 text-center shadow-sm">
              <p className={cn("text-xl md:text-2xl font-black", visitors.length > 0 ? "text-violet-600" : "text-slate-300")}>
                {visitors.length}
              </p>
              <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">Visiteurs</p>
            </div>
          </div>
        )}

        {/* Onglets */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === tab.id
                  ? "bg-white shadow-sm text-slate-800"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  "w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black",
                  activeTab === tab.id
                    ? tab.id === 'absences' ? 'bg-amber-100 text-amber-600'
                      : tab.id === 'visitors' ? 'bg-violet-100 text-violet-600'
                      : 'bg-indigo-100 text-indigo-600'
                    : 'bg-slate-200 text-slate-500'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenu de l'onglet actif */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
            <p className="text-sm text-slate-400">Chargement...</p>
          </div>
        ) : (
          <>
            {/* ─── Onglet Disciples ─── */}
            {activeTab === 'disciples' && (
              <div className="space-y-3">
                {/* Légende */}
                {activeCount > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-medium">
                      <CheckCircle2 size={11} /> ≥ 80 % fidèle
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-medium">
                      <AlertCircle size={11} /> 50–79 % irrégulier
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-700 font-medium">
                      <UserX size={11} /> &lt; 50 % absent
                    </span>
                  </div>
                )}
                {disciples.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                      <Users size={24} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500">Aucun disciple assigné</p>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Les membres assignés à votre suivi apparaîtront ici une fois configurés par l'administrateur.
                    </p>
                  </div>
                ) : (
                  disciples.map(disciple => (
                    <DiscipeCard
                      key={disciple.id}
                      disciple={disciple}
                      count7={counts7[disciple.id] ?? 0}
                      count30={counts30[disciple.id] ?? 0}
                      onOpenDetail={openMemberDetail}
                    />
                  ))
                )}
              </div>
            )}

            {/* ─── Onglet Absences ─── */}
            {activeTab === 'absences' && (
              <div className="space-y-3">
                {absentDisciples.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                      <CheckCircle2 size={24} className="text-emerald-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500">Aucune absence récente</p>
                    <p className="text-xs text-slate-400">Vos disciples étaient présents aux derniers cultes.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-400">
                      Disciples absents lors des 5 dernières sessions · Appuyez sur <strong>Rapport</strong> pour enregistrer un suivi
                    </p>
                    {absentDisciples.map(({ member, dates }) => (
                      <AbsentCard
                        key={member.id}
                        member={member}
                        absenceDates={dates}
                        onReportSaved={updated => {
                          setDisciples(prev => prev.map(d => d.id === updated.id ? updated : d));
                          setAbsentDisciples(prev => prev.map(a => a.member.id === updated.id ? { ...a, member: updated } : a));
                        }}
                        onOpenDetail={openMemberDetail}
                        session={session!}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ─── Onglet Visiteurs ─── */}
            {activeTab === 'visitors' && (
              <div className="space-y-3">
                {visitors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                      <MessageSquare size={24} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500">Aucun visiteur assigné</p>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Les visiteurs qui vous sont confiés apparaîtront ici.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-400">
                      {visitors.length} visiteur{visitors.length > 1 ? 's' : ''} assigné{visitors.length > 1 ? 's' : ''} · Appuyez sur <strong>Rapport</strong> pour enregistrer un suivi
                    </p>
                    {visitors.map(visitor => (
                      <VisitorCard
                        key={visitor.id}
                        visitor={visitor}
                        onReportSaved={updated =>
                          setVisitors(prev => prev.map(v => v.id === updated.id ? updated : v))
                        }
                        onOpenDetail={openVisitorDetail}
                        session={session!}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {detailModal && (
        <PersonDetailModal
          target={detailModal}
          onClose={() => setDetailModal(null)}
          onUpdate={handleModalUpdate}
          session={session!}
        />
      )}
    </div>
  );
};

export default ExerciceSpirituelGroupe;
