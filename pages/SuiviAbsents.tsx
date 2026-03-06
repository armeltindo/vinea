import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Phone, MessageSquareQuote, UserX, ShieldCheck,
  UserPlus, AlertTriangle, UserCheck, Calendar, Filter, X,
  History as HistoryIcon, Shield, UserRound, MessageSquareText,
  RefreshCw, Loader2, CheckCircle2, AlertCircle, ChevronDown,
  StickyNote, Users, ClipboardList
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import {
  getAttendanceSessions, getMembers, getVisitors,
  getChurchSettings, getAppConfig, setAppConfig
} from '../lib/db';
import { Member, MemberType, Visitor } from '../types';
import { cn, generateId, getInitials, formatFirstName } from '../utils';
import { useNotifications } from '../context/NotificationsContext';

// ─── Types ───────────────────────────────────────────────────

const parsePortalNotes = (notes: string): { date: string; type: string; note: string; nextStep?: string }[] => {
  if (!notes?.trim()) return [];
  return notes.split('\n').filter(l => l.trim()).map(line => {
    const m = line.match(/^\[(\d{4}-\d{2}-\d{2})\]\s+(\w+)\s+—\s+(.+?)(?:\s+→\s+Prochain pas : (.+))?$/);
    if (!m) return null;
    return { date: m[1], type: m[2], note: m[3], nextStep: m[4] };
  }).filter(Boolean) as { date: string; type: string; note: string; nextStep?: string }[];
};

interface AbsentEntry {
  person: Member | Visitor;
  isVisitor: boolean;
  serviceDate: string;
  serviceType: string;
  recordId: string;
  consecutiveAbsences: number;
}

type SortKey = 'name' | 'date' | 'absences';
type AssignFilter = 'all' | 'assigned' | 'unassigned';
type CriticalFilter = 'all' | 'critical' | 'normal';

// ─── Page principale ──────────────────────────────────────────

const SuiviAbsents: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification, refreshNotifications } = useNotifications();

  // ── Données
  const [history, setHistory] = useState<any[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [followUpHistory, setFollowUpHistory] = useState<Record<string, any[]>>({});
  const [churchName, setChurchName] = useState('Vinea');
  const [loading, setLoading] = useState(true);

  // ── Filtres
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [assignFilter, setAssignFilter] = useState<AssignFilter>('all');
  const [criticalFilter, setCriticalFilter] = useState<CriticalFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('absences');

  // ── Modale suivi
  const [followUpMember, setFollowUpMember] = useState<Member | Visitor | null>(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [currentNote, setCurrentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [followUpSuccess, setFollowUpSuccess] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);

  // ── Chargement
  useEffect(() => {
    const load = async () => {
      const [h, m, v, settings, savedAssignments, savedFollowUp] = await Promise.all([
        getAttendanceSessions(),
        getMembers(),
        getVisitors(),
        getChurchSettings(),
        getAppConfig('attendance_assignments'),
        getAppConfig('attendance_followup_history'),
      ]);
      setHistory(h as any[]);
      setMembers(m);
      setVisitors(v);
      if (settings?.name) setChurchName(settings.name);
      if (savedAssignments) setAssignments(savedAssignments);
      if (savedFollowUp) setFollowUpHistory(savedFollowUp);
      setLoading(false);
    };
    load();
  }, []);

  // ── Persistance assignments / suivi (skip on initial mount before data is loaded)
  useEffect(() => { if (!loading) setAppConfig('attendance_assignments', assignments); }, [assignments, loading]);
  useEffect(() => { if (!loading) setAppConfig('attendance_followup_history', followUpHistory); }, [followUpHistory, loading]);

  // ── Dérivés
  const sortedHistory = useMemo(() =>
    [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [history]
  );

  const allPeople = useMemo(() => [
    ...members.map(m => ({ ...m, isVisitor: false })),
    ...visitors.map(v => ({ ...v, isVisitor: true, type: 'Visiteur' as any, photoUrl: undefined }))
  ], [members, visitors]);

  const staffMembers = useMemo(() =>
    members
      .filter(m => [MemberType.PASTEUR, MemberType.ASSISTANT, MemberType.CO_DIRIGEANT, MemberType.OUVRIER].includes(m.type))
      .sort((a, b) => a.firstName.localeCompare(b.firstName)),
    [members]
  );

  const availableServiceTypes = useMemo(() => {
    const types = new Set(history.map(h => h.service));
    return Array.from(types).sort();
  }, [history]);

  const getConsecutiveAbsences = (personId: string): number => {
    let count = 0;
    const sunday = sortedHistory.filter(h => h.service === 'Culte de dimanche');
    for (const s of sunday) {
      if (s.absentMembers?.includes(personId)) count++;
      else break;
    }
    return count;
  };

  const allAbsentsList = useMemo((): AbsentEntry[] => {
    if (!allPeople.length) return [];
    const entries: AbsentEntry[] = [];
    sortedHistory.slice(0, 5).forEach(service => {
      (service.absentMembers ?? []).forEach((id: string) => {
        const person = allPeople.find(p => p.id === id);
        if (person) {
          entries.push({
            person,
            isVisitor: (person as any).isVisitor,
            serviceDate: service.date,
            serviceType: service.service,
            recordId: service.id,
            consecutiveAbsences: getConsecutiveAbsences(id),
          });
        }
      });
    });
    return entries;
  }, [allPeople, sortedHistory]);

  const filteredEntries = useMemo(() => {
    let list = allAbsentsList;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => `${e.person.firstName} ${e.person.lastName}`.toLowerCase().includes(q));
    }
    if (serviceFilter !== 'all') {
      list = list.filter(e => e.serviceType === serviceFilter);
    }
    if (assignFilter === 'assigned') {
      list = list.filter(e => !!assignments[`${e.person.id}_${e.serviceDate}`]);
    } else if (assignFilter === 'unassigned') {
      list = list.filter(e => !assignments[`${e.person.id}_${e.serviceDate}`]);
    }
    if (criticalFilter === 'critical') {
      list = list.filter(e => e.consecutiveAbsences >= 2);
    } else if (criticalFilter === 'normal') {
      list = list.filter(e => e.consecutiveAbsences < 2);
    }

    list = [...list].sort((a, b) => {
      if (sortKey === 'name') return a.person.firstName.localeCompare(b.person.firstName, 'fr');
      if (sortKey === 'date') return new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime();
      return b.consecutiveAbsences - a.consecutiveAbsences;
    });

    return list;
  }, [allAbsentsList, search, serviceFilter, assignFilter, criticalFilter, sortKey, assignments]);

  // ── Stats rapides
  const stats = useMemo(() => {
    const total = allAbsentsList.length;
    const critical = allAbsentsList.filter(e => e.consecutiveAbsences >= 2).length;
    const assigned = allAbsentsList.filter(e => !!assignments[`${e.person.id}_${e.serviceDate}`]).length;
    const withReport = allAbsentsList.filter(e => followUpHistory[e.person.id]?.some(h => h.serviceDate === e.serviceDate)).length;
    return { total, critical, assigned, withReport };
  }, [allAbsentsList, assignments, followUpHistory]);

  // ── Actions
  const handleAssign = (personId: string, date: string, staffId: string) => {
    const key = `${personId}_${date}`;
    // Update local state
    setAssignments(prev => {
      const updated = { ...prev, [key]: staffId };
      // Persist immediately — don't rely solely on the useEffect
      setAppConfig('attendance_assignments', updated);
      return updated;
    });
    const person = allPeople.find(p => p.id === personId);
    const staff = staffMembers.find(s => s.id === staffId);
    if (person && staff) {
      addNotification({
        id: `assign-absent-${personId}-${date}`,
        type: 'assignment',
        title: 'Absent affecté',
        message: `${formatFirstName(person.firstName)} ${person.lastName.toUpperCase()} a été affecté(e) à ${formatFirstName(staff.firstName)} ${staff.lastName.toUpperCase()} pour le suivi.`,
        date: new Date().toISOString().split('T')[0],
        isRead: false,
        link: 'attendance',
        targetId: personId,
      });
      setTimeout(() => refreshNotifications(), 500);
    }
  };

  const openFollowUp = (person: Member | Visitor, date: string) => {
    setFollowUpMember(person);
    setFollowUpDate(date);
    setCurrentNote('');
    setGeneratedMessage(null);
    setFollowUpSuccess(false);
    const key = `${person.id}_${date}`;
    const staffId = assignments[key];
    const staff = staffMembers.find(s => s.id === staffId);
    setStaffSearch(staff ? `${formatFirstName(staff.firstName)} ${staff.lastName.toUpperCase()}` : '');
    setIsStaffDropdownOpen(false);
  };

  const submitFollowUp = () => {
    if (!followUpMember || !currentNote.trim()) return;
    setIsSubmitting(true);
    const key = `${followUpMember.id}_${followUpDate}`;
    const staffId = assignments[key];
    const staff = members.find(m => m.id === staffId);
    const author = staff ? `${formatFirstName(staff.firstName)} ${staff.lastName.toUpperCase()}` : 'Admin';
    setTimeout(() => {
      const memberId = followUpMember.id;
      const entry = { id: generateId(), date: new Date().toISOString(), serviceDate: followUpDate, note: currentNote, author };
      setFollowUpHistory(prev => {
        const updated = { ...prev, [memberId]: [entry, ...(prev[memberId] || [])] };
        // Persist immediately
        setAppConfig('attendance_followup_history', updated);
        return updated;
      });
      setFollowUpSuccess(true);
      setIsSubmitting(false);
      setTimeout(() => { setFollowUpMember(null); setFollowUpSuccess(false); }, 1500);
    }, 1000);
  };

  const generateRelanceMessage = async (person: Member | Visitor, absences: number) => {
    setIsGeneratingMessage(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Rédige un message WhatsApp court, chaleureux et pastoral pour un fidèle nommé ${formatFirstName(person.firstName)} ${person.lastName.toUpperCase()} qui a manqué ${absences} services de suite à l'église ${churchName}. Le ton doit être bienveillant, exprimant que l'église pense à lui, sans être culpabilisant. Propose aussi de prier pour lui s'il a un besoin particulier. Utilise exclusivement le texte de la version Louis Segond 1910 si tu cites un verset.`,
        config: { systemInstruction: `Tu es un pasteur aimant et attentionné de l'église ${churchName}. Tu n'utilises que la version Louis Segond 1910 for all biblical citations.` },
      });
      setGeneratedMessage(response.text || "Bonjour, nous avons remarqué votre absence et voulions simplement vous dire que vous nous manquez.");
    } catch {}
    setIsGeneratingMessage(false);
  };

  // ─── Rendu ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin opacity-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* ── En-tête ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/attendance')}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suivi des Absents</h1>
          <p className="text-xs text-slate-400 mt-0.5">Registre pastoral · Affectation &amp; relances</p>
        </div>
      </div>

      {/* ── Statistiques ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Absences', value: stats.total, icon: <UserX size={18} />, color: 'indigo' },
          { label: 'Critiques', value: stats.critical, icon: <AlertTriangle size={18} />, color: 'rose' },
          { label: 'Affectées', value: stats.assigned, icon: <ShieldCheck size={18} />, color: 'emerald' },
          { label: 'Avec rapport', value: stats.withReport, icon: <ClipboardList size={18} />, color: 'violet' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              s.color === 'indigo' && "bg-indigo-50 text-indigo-600",
              s.color === 'rose' && "bg-rose-50 text-rose-500",
              s.color === 'emerald' && "bg-emerald-50 text-emerald-600",
              s.color === 'violet' && "bg-violet-50 text-violet-600",
            )}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtres ── */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Rechercher un absent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
          />
        </div>

        {/* Service */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          <select
            value={serviceFilter}
            onChange={e => setServiceFilter(e.target.value)}
            className="pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all appearance-none cursor-pointer"
          >
            <option value="all">Tous les cultes</option>
            {availableServiceTypes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
        </div>

        {/* Affectation */}
        <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl gap-1">
          {(['all', 'assigned', 'unassigned'] as AssignFilter[]).map(v => (
            <button
              key={v}
              onClick={() => setAssignFilter(v)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                assignFilter === v ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {v === 'all' ? 'Tous' : v === 'assigned' ? 'Affectés' : 'Non affectés'}
            </button>
          ))}
        </div>

        {/* Criticité */}
        <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl gap-1">
          {(['all', 'critical', 'normal'] as CriticalFilter[]).map(v => (
            <button
              key={v}
              onClick={() => setCriticalFilter(v)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                criticalFilter === v ? "bg-white shadow-sm" : "text-slate-400 hover:text-slate-600",
                criticalFilter === v && v === 'critical' ? "text-rose-600" : "",
                criticalFilter === v && v !== 'critical' ? "text-indigo-600" : "",
              )}
            >
              {v === 'all' ? 'Tous' : v === 'critical' ? '⚠ Critiques' : 'Normaux'}
            </button>
          ))}
        </div>

        {/* Tri */}
        <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl gap-1">
          {([['absences', 'Absences'], ['date', 'Date'], ['name', 'Nom']] as [SortKey, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                sortKey === k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Liste ── */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl py-20 flex flex-col items-center justify-center opacity-30 shadow-sm">
          <UserCheck size={48} />
          <p className="text-sm font-medium mt-3">Aucun absent trouvé</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredEntries.map((entry, idx) => {
            const { person } = entry;
            const key = `${person.id}_${entry.serviceDate}`;
            const staffId = assignments[key];
            const staff = staffMembers.find(s => s.id === staffId);
            const isCritical = entry.consecutiveAbsences >= 2;
            const hasReport = followUpHistory[person.id]?.some(h => h.serviceDate === entry.serviceDate);

            return (
              <div
                key={`${person.id}-${idx}`}
                className={cn(
                  "bg-white border rounded-2xl p-5 shadow-sm flex flex-col gap-4 transition-all",
                  isCritical ? "border-rose-200" : "border-slate-100",
                  hasReport && "opacity-70"
                )}
              >
                {/* Identité */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden text-sm font-semibold",
                      isCritical ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-slate-50 border-slate-100 text-slate-500"
                    )}>
                      {isCritical ? (
                        <AlertTriangle size={20} />
                      ) : (person as Member).photoUrl ? (
                        <img src={(person as Member).photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(person.firstName, person.lastName)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {formatFirstName(person.firstName)} <span className="uppercase">{person.lastName}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(entry.serviceDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-400 truncate max-w-[110px]">{entry.serviceType}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => window.open(`tel:${person.phone}`)}
                      className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                    >
                      <Phone size={14} />
                    </button>
                    <button
                      onClick={() => openFollowUp(person, entry.serviceDate)}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                    >
                      <MessageSquareQuote size={14} />
                    </button>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-lg",
                    isCritical ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    {entry.consecutiveAbsences}× conséc.
                  </span>
                  {hasReport && (
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <StickyNote size={10} /> Rapport
                    </span>
                  )}
                  {entry.isVisitor && (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">Visiteur</span>
                  )}
                </div>

                {/* Affectation */}
                <div className="pt-3 border-t border-slate-50">
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                    <UserRound size={11} className="text-indigo-400" /> Affecté à
                  </p>
                  <button
                    onClick={() => openFollowUp(person, entry.serviceDate)}
                    className={cn(
                      "w-full px-4 py-3 border rounded-xl flex items-center justify-between transition-all text-left",
                      staffId
                        ? "bg-indigo-50 border-indigo-100 text-indigo-700"
                        : "bg-white border-dashed border-rose-200 text-rose-500 hover:border-rose-400"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden",
                        staffId ? "bg-indigo-600 text-white" : "bg-rose-100 text-rose-400"
                      )}>
                        {staffId ? (
                          staff?.photoUrl
                            ? <img src={staff.photoUrl} alt="" className="w-full h-full object-cover" />
                            : <ShieldCheck size={14} />
                        ) : (
                          <UserPlus size={14} />
                        )}
                      </div>
                      <span className="text-xs font-semibold truncate">
                        {staff
                          ? `${formatFirstName(staff.firstName)} ${staff.lastName.toUpperCase()}`
                          : 'Choisir un responsable...'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modale Suivi ── */}
      {followUpMember && (
        <div className="fixed inset-0 z-[280] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSubmitting && setFollowUpMember(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="bg-indigo-600 p-8 text-white shrink-0 relative">
              <div className="absolute top-0 right-0 p-10 opacity-10"><ShieldCheck size={140} /></div>
              <div className="flex justify-between items-start mb-2 relative z-10">
                <h3 className="text-xl font-semibold">Relance des Absents</h3>
                <button onClick={() => setFollowUpMember(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <p className="text-xs text-indigo-200 relative z-10">
                {formatFirstName(followUpMember.firstName)} {followUpMember.lastName.toUpperCase()} · Absence du {new Date(followUpDate).toLocaleDateString('fr-FR')}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/30">

              {/* Historique admin */}
              {(followUpHistory[followUpMember.id]?.length ?? 0) > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
                    <HistoryIcon size={12} className="text-indigo-500" /> Historique des échanges
                  </h4>
                  <div className="space-y-3">
                    {followUpHistory[followUpMember.id].map(r => (
                      <div key={r.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-indigo-600">Le {new Date(r.date).toLocaleDateString()}</span>
                            {r.serviceDate === followUpDate && <span className="text-xs font-semibold bg-rose-50 text-rose-500 px-1 rounded border border-rose-100">Ciblée</span>}
                          </div>
                          <span className="text-xs text-slate-400">Par : {r.author}</span>
                        </div>
                        <p className="text-xs text-slate-600 italic leading-relaxed">"{r.note}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes portail */}
              {!('followUpHistory' in followUpMember) && (() => {
                const notes = parsePortalNotes((followUpMember as Member).notes ?? '');
                if (!notes.length) return null;
                return (
                  <div className="space-y-4">
                    <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
                      <HistoryIcon size={12} className="text-violet-500" /> Comptes rendus portail
                    </h4>
                    <div className="space-y-3">
                      {notes.map((n, i) => (
                        <div key={i} className="p-4 bg-white border border-violet-100 rounded-2xl shadow-sm space-y-2">
                          <div className="flex justify-between border-b border-slate-50 pb-1.5">
                            <span className="text-xs font-semibold text-violet-600">{n.type}</span>
                            <span className="text-xs text-slate-400">{new Date(n.date).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <p className="text-xs text-slate-600 italic leading-relaxed">"{n.note}"</p>
                          {n.nextStep && <p className="text-xs text-amber-600">→ {n.nextStep}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Affectation */}
              <div className="space-y-4">
                <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
                  <Shield size={12} className="text-indigo-500" /> Affectation Pastorale
                </h4>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-500">Responsable du suivi</label>
                    {assignments[`${followUpMember.id}_${followUpDate}`] ? (
                      <span className="text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">Assigné</span>
                    ) : (
                      <span className="text-xs font-medium bg-rose-50 text-rose-600 px-2 py-0.5 rounded flex items-center gap-1">
                        <AlertCircle size={8} /> Non affecté
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400"><UserRound size={16} /></div>
                    <input
                      type="text"
                      placeholder="Rechercher un ouvrier..."
                      value={staffSearch}
                      onFocus={() => setIsStaffDropdownOpen(true)}
                      onChange={e => { setStaffSearch(e.target.value); setIsStaffDropdownOpen(true); }}
                      className={cn(
                        "w-full pl-12 pr-4 py-3.5 border rounded-2xl outline-none text-sm font-normal transition-all",
                        assignments[`${followUpMember.id}_${followUpDate}`]
                          ? "bg-indigo-50 border-indigo-100 text-indigo-700"
                          : "bg-white border-rose-200 text-rose-600"
                      )}
                    />
                    {isStaffDropdownOpen && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl custom-scrollbar">
                        {staffMembers.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(staffSearch.toLowerCase())).map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              handleAssign(followUpMember.id, followUpDate, s.id);
                              setStaffSearch(`${formatFirstName(s.firstName)} ${s.lastName.toUpperCase()}`);
                              setIsStaffDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 text-xs font-medium hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center gap-3"
                          >
                            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 text-xs font-semibold text-slate-500 uppercase">
                              {s.photoUrl ? <img src={s.photoUrl} alt="" className="w-full h-full object-cover" /> : getInitials(s.firstName, s.lastName)}
                            </div>
                            {formatFirstName(s.firstName)} {s.lastName.toUpperCase()}
                          </button>
                        ))}
                        {staffMembers.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(staffSearch.toLowerCase())).length === 0 && (
                          <div className="p-4 text-center text-xs text-slate-400 italic">Aucun résultat</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Générateur IA */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
                    <MessageSquareText size={12} className="text-emerald-500" /> Générateur de relance IA
                  </h4>
                  <button
                    onClick={() => generateRelanceMessage(followUpMember, getConsecutiveAbsences(followUpMember.id))}
                    disabled={isGeneratingMessage}
                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    {isGeneratingMessage ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                    {generatedMessage ? 'Régénérer' : 'Générer un brouillon'}
                  </button>
                </div>
                {generatedMessage ? (
                  <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-3xl relative">
                    <p className="text-xs text-emerald-800 italic leading-relaxed font-medium">"{generatedMessage}"</p>
                    <button
                      onClick={() => window.open(`https://wa.me/${followUpMember.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`, '_blank')}
                      className="mt-3 w-full py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-semibold hover:bg-emerald-700 transition-all"
                    >
                      Envoyer via WhatsApp
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => generateRelanceMessage(followUpMember, getConsecutiveAbsences(followUpMember.id))}
                    className="p-5 bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all"
                  >
                    {isGeneratingMessage ? <Loader2 size={24} className="animate-spin text-indigo-400" /> : <MessageSquareText size={24} className="text-slate-300" />}
                    <p className="text-xs text-slate-400 mt-2">{isGeneratingMessage ? 'Génération en cours...' : 'Cliquer pour générer'}</p>
                  </div>
                )}
              </div>

              {/* Formulaire note */}
              {followUpSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3 animate-in zoom-in-95">
                  <CheckCircle2 size={40} className="text-emerald-500" />
                  <p className="text-sm font-semibold text-emerald-700">Rapport enregistré !</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
                    <StickyNote size={12} className="text-indigo-500" /> Nouveau rapport de relance
                  </h4>
                  <textarea
                    value={currentNote}
                    onChange={e => setCurrentNote(e.target.value)}
                    placeholder="Décrivez le contact ou la relance effectuée..."
                    rows={4}
                    className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-normal outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-300 transition-all resize-none bg-white"
                  />
                  <button
                    onClick={submitFollowUp}
                    disabled={!currentNote.trim() || isSubmitting}
                    className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                    {isSubmitting ? 'Enregistrement...' : 'Enregistrer le rapport'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuiviAbsents;
