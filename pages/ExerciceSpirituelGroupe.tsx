import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Users, ChevronDown, ChevronUp, CheckCircle2,
  AlertCircle, Loader2, BookOpen, UserX
} from 'lucide-react';
import {
  getDisciplesByMentorId,
  getDailyExercisesCountByMemberIds,
  getDailyExerciseDatesByMemberId,
} from '../lib/db';
import { Member, MemberSession } from '../types';
import { cn } from '../utils';

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
  const [y, m, d] = dateStr.split('-');
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
};

const adherenceColor = (count: number, total: number): string => {
  const ratio = total === 0 ? 0 : count / total;
  if (ratio >= 0.8) return 'bg-emerald-100 text-emerald-700';
  if (ratio >= 0.5) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
};

// ─── Composant carte disciple ────────────────────────────────

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
              <span className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold",
                adherenceColor(count7, 7)
              )}>
                {count7}/7j
              </span>
              <span className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold",
                adherenceColor(count30, 30)
              )}>
                {count30}/30j
              </span>
              {expanded
                ? <ChevronUp size={16} className="text-slate-400" />
                : <ChevronDown size={16} className="text-slate-400" />
              }
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
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                Dernières soumissions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dates.map(d => (
                  <span
                    key={d}
                    className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-medium flex items-center gap-1"
                  >
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

// ─── Page principale ─────────────────────────────────────────

const ExerciceSpirituelGroupe: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<MemberSession | null>(null);
  const [disciples, setDisciples] = useState<Member[]>([]);
  const [counts7, setCounts7] = useState<Record<string, number>>({});
  const [counts30, setCounts30] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

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

  // ── Charger les disciples ────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    const load = async () => {
      setLoading(true);
      const list = await getDisciplesByMentorId(session.memberId);
      setDisciples(list);

      const ids = list.filter(d => d.memberAccountActive).map(d => d.id);
      if (ids.length > 0) {
        const [c7, c30] = await Promise.all([
          getDailyExercisesCountByMemberIds(ids, nDaysAgo(7)),
          getDailyExercisesCountByMemberIds(ids, nDaysAgo(30)),
        ]);
        setCounts7(c7);
        setCounts30(c30);
      }
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

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Stats résumé */}
        {!loading && disciples.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
              <p className="text-2xl font-black text-slate-800">{disciples.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">Disciples</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
              <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
              <p className="text-xs text-slate-400 mt-0.5">Comptes actifs</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
              <p className={cn(
                "text-2xl font-black",
                inactiveCount > 0 ? "text-amber-500" : "text-slate-300"
              )}>
                {inactiveCount}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Sans compte</p>
            </div>
          </div>
        )}

        {/* Légende */}
        {activeCount > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-medium">
              <CheckCircle2 size={11} /> ≥ 80 % — Fidèle
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-medium">
              <AlertCircle size={11} /> 50–79 % — Irrégulier
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-700 font-medium">
              <UserX size={11} /> &lt; 50 % — Absent
            </span>
          </div>
        )}

        {/* Liste des disciples */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
            <p className="text-sm text-slate-400">Chargement du groupe...</p>
          </div>
        ) : disciples.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
              <Users size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">Aucun disciple assigné</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Les membres assignés à votre suivi apparaîtront ici une fois configurés par l'administrateur.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {disciples.length} disciple{disciples.length > 1 ? 's' : ''}
              {activeCount > 0 && (
                <span className="ml-2 text-slate-300 normal-case font-normal">
                  · cliquer pour voir les soumissions
                </span>
              )}
            </p>
            {disciples.map(disciple => (
              <DiscipeCard
                key={disciple.id}
                disciple={disciple}
                count7={counts7[disciple.id] ?? 0}
                count30={counts30[disciple.id] ?? 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciceSpirituelGroupe;
