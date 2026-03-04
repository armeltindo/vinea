import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Users, ChevronDown, ChevronUp, CheckCircle2,
  AlertCircle, Loader2, BookOpen, UserX, Phone, MessageSquare,
  Calendar, ClipboardList, MapPin, Save, ChevronRight
} from 'lucide-react';
import {
  getDisciplesByMentorId,
  getDailyExercisesCountByMemberIds,
  getDailyExerciseDatesByMemberId,
  getVisitorsByParrainId,
  getRecentAttendanceSessions,
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
}

const ReportForm: React.FC<ReportFormProps> = ({ onSubmit, onCancel }) => {
  const [type, setType] = useState<FollowUpEntry['type']>('Appel');
  const [note, setNote] = useState('');
  const [nextStep, setNextStep] = useState('');
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
          Enregistrer
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

// ─── Carte disciple (exercices) ──────────────────────────────

interface DiscipeCardProps {
  disciple: Member;
  count7: number;
  count30: number;
}

const DiscipeCard: React.FC<DiscipeCardProps> = ({ disciple, count7, count30 }) => {
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
          <p className="text-sm font-semibold text-slate-800 truncate">
            {disciple.firstName} {disciple.lastName}
          </p>
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
  onReportSaved: () => void;
}

const AbsentCard: React.FC<AbsentCardProps> = ({ member, absenceDates, onReportSaved }) => {
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleReport = async (type: FollowUpEntry['type'], note: string, nextStep: string) => {
    const now = new Date().toISOString().split('T')[0];
    const entry = `[${now}] ${type} — ${note}${nextStep ? ` → Prochain pas : ${nextStep}` : ''}`;
    const updatedNotes = member.notes ? `${member.notes}\n${entry}` : entry;
    await updateMember(member.id, { notes: updatedNotes });
    setSaved(true);
    setShowForm(false);
    onReportSaved();
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
          <p className="text-sm font-semibold text-slate-800 truncate">{member.firstName} {member.lastName}</p>
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
}

const VisitorCard: React.FC<VisitorCardProps> = ({ visitor, onReportSaved }) => {
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
          <p className="text-sm font-semibold text-slate-800 truncate">{visitor.firstName} {visitor.lastName}</p>
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

  // ── Vérifier session ────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('vinea_member_session');
    if (!raw) { navigate('/exercice-spirituel'); return; }
    try {
      const s: MemberSession = JSON.parse(raw);
      if (!s.isDiscipleMaker) { navigate('/exercice-spirituel/dashboard'); return; }
      setSession(s);
    } catch {
      navigate('/exercice-spirituel');
    }
  }, [navigate]);

  // ── Charger toutes les données ───────────────────────────────
  useEffect(() => {
    if (!session) return;
    const load = async () => {
      setLoading(true);
      const [list, vis, sessions] = await Promise.all([
        getDisciplesByMentorId(session.memberId),
        getVisitorsByParrainId(session.memberId),
        getRecentAttendanceSessions(5),
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

      // Absences : disciples absents dans les sessions récentes
      const discipleIds = new Set(list.map(d => d.id));
      const absentMap: Record<string, string[]> = {};
      for (const s of sessions) {
        for (const absentId of (s.absentMembers ?? [])) {
          if (discipleIds.has(absentId)) {
            if (!absentMap[absentId]) absentMap[absentId] = [];
            absentMap[absentId].push(s.date);
          }
        }
      }
      const absentList = Object.entries(absentMap).map(([id, dates]) => ({
        member: list.find(m => m.id === id)!,
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
    navigate('/exercice-spirituel');
  };

  const goToMyExercises = () => {
    navigate('/exercice-spirituel/dashboard');
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

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* Stats résumé */}
        {!loading && (disciples.length > 0 || visitors.length > 0) && (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center shadow-sm">
              <p className="text-xl font-black text-slate-800">{disciples.length}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Disciples</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center shadow-sm">
              <p className="text-xl font-black text-emerald-600">{activeCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Actifs</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-3 text-center shadow-sm">
              <p className={cn("text-xl font-black", absentDisciples.length > 0 ? "text-amber-500" : "text-slate-300")}>
                {absentDisciples.length}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Absents</p>
            </div>
            <div className="bg-white rounded-2xl border border-violet-200 p-3 text-center shadow-sm">
              <p className={cn("text-xl font-black", visitors.length > 0 ? "text-violet-600" : "text-slate-300")}>
                {visitors.length}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Visiteurs</p>
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
                        onReportSaved={() => {}}
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
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExerciceSpirituelGroupe;
