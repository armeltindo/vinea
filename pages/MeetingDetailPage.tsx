import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MeetingEditModal, { Meeting as MeetingType } from '../components/MeetingEditModal';
import {
  ArrowLeft, UsersRound, FileText, Clock, MapPin, Users, Loader2, Trash2,
  Plus, Check, ClipboardCheck, PenTool, Sparkles, MessageSquareText,
  ListChecks, Copy, X, ShieldCheck, UserX, Edit, CheckCircle2
} from 'lucide-react';
import { generateMeetingFlash, extractMeetingTasks } from '../lib/gemini';
import { getMeetings, updateMeeting, deleteMeeting, getMembers } from '../lib/db';
import { cn, generateId, getInitials, formatFirstName } from '../utils';
import { Member, MemberType } from '../types';
import { usePermissions } from '../context/PermissionsContext';
import { GoogleGenAI } from '@google/genai';

interface MeetingDecision {
  id: string;
  label: string;
  status: 'À faire' | 'En cours' | 'Réalisé';
  assignedTo?: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  status: 'Programmé' | 'Terminé';
  attendeeIds: string[];
  absenteeIds: string[];
  priority: 'Haute' | 'Moyenne' | 'Basse';
  summary?: string;
  decisions?: MeetingDecision[];
  aiPV?: string;
}

const priorityColor = (p: string) => {
  if (p === 'Haute') return 'bg-rose-500/20 text-rose-300 border-rose-400/20';
  if (p === 'Moyenne') return 'bg-amber-500/20 text-amber-300 border-amber-400/20';
  return 'bg-slate-500/20 text-slate-300 border-slate-400/20';
};

const MeetingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canDelete } = usePermissions();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isGeneratingPV, setIsGeneratingPV] = useState(false);
  const [isGeneratingFlash, setIsGeneratingFlash] = useState(false);
  const [isExtractingTasks, setIsExtractingTasks] = useState(false);
  const [isAddingDecision, setIsAddingDecision] = useState(false);
  const [newDecisionLabel, setNewDecisionLabel] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pvCopied, setPvCopied] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      getMeetings().then(data => data.map((m: any) => ({ ...m, aiPV: m.aiPv }))),
      getMembers()
    ]).then(([meetings, mbrs]) => {
      const found = (meetings as Meeting[]).find(m => m.id === id) ?? null;
      setMeeting(found);
      setNotFound(!found);
      setMembers(mbrs);
      setLoading(false);
    });
  }, [id]);

  const calculateQuorum = (attendeeIds: string[]) => {
    const totalLeaders = members.filter(m => m.type !== MemberType.MEMBRE_SIMPLE).length;
    const leaderAttendees = attendeeIds.filter(aid => {
      const m = members.find(mem => mem.id === aid);
      return m && m.type !== MemberType.MEMBRE_SIMPLE;
    }).length;
    if (totalLeaders === 0) return 100;
    return Math.round((leaderAttendees / totalLeaders) * 100);
  };

  const handleGeneratePV = async () => {
    if (!meeting) return;
    setIsGeneratingPV(true);
    const attendeesNames = meeting.attendeeIds.map(aid => {
      const m = members.find(mem => mem.id === aid);
      return m ? `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}` : 'Inconnu';
    });
    const absenteesNames = (meeting.absenteeIds || []).map(aid => {
      const m = members.find(mem => mem.id === aid);
      return m ? `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}` : 'Inconnu';
    });
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const prompt = `Rédige un procès-verbal de réunion professionnel et structuré pour l'église Vinea sur la base de ces notes :
      Titre : ${meeting.title}
      Date : ${meeting.date}
      Lieu : ${meeting.location}
      Participants : ${attendeesNames.join(', ')}
      Absents/Excusés : ${absenteesNames.join(', ') || 'Aucun'}
      Notes/Résumé : ${meeting.summary || 'Aucune note spécifique'}
      Décisions prises : ${meeting.decisions?.map(d => d.label).join(', ') || 'Aucune décision listée'}

      Le PV doit inclure : Un en-tête Vinea, la liste de présence complète, l'ordre du jour déduit, le résumé des débats et les résolutions adoptées.`;
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-preview-04-17', contents: prompt });
      const updated = { ...meeting, aiPV: response.text };
      setMeeting(updated);
      await updateMeeting(meeting.id, { aiPv: response.text });
    } catch (e) {
      console.error(e);
    }
    setIsGeneratingPV(false);
  };

  const handleGenerateFlash = async () => {
    if (!meeting) return;
    setIsGeneratingFlash(true);
    const flash = await generateMeetingFlash(meeting);
    if (flash) {
      window.open(`https://wa.me/?text=${encodeURIComponent(flash)}`, '_blank');
    }
    setIsGeneratingFlash(false);
  };

  const handleExtractTasks = async () => {
    if (!meeting?.summary) return;
    setIsExtractingTasks(true);
    const tasks = await extractMeetingTasks(meeting.summary);
    if (tasks && tasks.length > 0) {
      const newDecisions: MeetingDecision[] = tasks.map((t: any) => ({
        id: generateId(),
        label: t.title + (t.deadline ? ` (Échéance: ${t.deadline})` : ''),
        status: 'À faire',
        assignedTo: t.responsible || ''
      }));
      const updated = { ...meeting, decisions: [...(meeting.decisions || []), ...newDecisions] };
      setMeeting(updated);
      await updateMeeting(meeting.id, { decisions: updated.decisions });
    }
    setIsExtractingTasks(false);
  };

  const handleAddDecision = () => {
    if (!newDecisionLabel.trim() || !meeting) return;
    const newDecision: MeetingDecision = { id: generateId(), label: newDecisionLabel.trim(), status: 'À faire' };
    const updatedDecisions = [...(meeting.decisions || []), newDecision];
    const updated = { ...meeting, decisions: updatedDecisions };
    setMeeting(updated);
    setNewDecisionLabel('');
    setIsAddingDecision(false);
    updateMeeting(meeting.id, { decisions: updatedDecisions });
  };

  const handleDeleteDecision = (decisionId: string) => {
    if (!meeting) return;
    const updatedDecisions = (meeting.decisions || []).filter(d => d.id !== decisionId);
    const updated = { ...meeting, decisions: updatedDecisions };
    setMeeting(updated);
    updateMeeting(meeting.id, { decisions: updatedDecisions });
  };

  const updateDecisionStatus = (decisionId: string, newStatus: MeetingDecision['status']) => {
    if (!meeting) return;
    const updatedDecisions = (meeting.decisions || []).map(d => d.id === decisionId ? { ...d, status: newStatus } : d);
    const updated = { ...meeting, decisions: updatedDecisions };
    setMeeting(updated);
    updateMeeting(meeting.id, { decisions: updatedDecisions });
  };

  const toggleStatus = () => {
    if (!meeting) return;
    const newStatus = meeting.status === 'Programmé' ? 'Terminé' : 'Programmé';
    const updated = { ...meeting, status: newStatus as Meeting['status'] };
    setMeeting(updated);
    updateMeeting(meeting.id, { status: newStatus });
  };

  const confirmDelete = async () => {
    if (!meeting) return;
    await deleteMeeting(meeting.id);
    navigate('/meetings');
  };

  const handleCopyPV = () => {
    if (!meeting?.aiPV) return;
    navigator.clipboard.writeText(meeting.aiPV);
    setPvCopied(true);
    setTimeout(() => setPvCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-indigo-400 opacity-60" />
      </div>
    );
  }

  if (notFound || !meeting) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-40">
        <p className="text-sm font-medium">Réunion introuvable.</p>
        <button onClick={() => navigate('/meetings')} className="text-xs text-indigo-600 underline">Retour</button>
      </div>
    );
  }

  const quorum = calculateQuorum(meeting.attendeeIds);
  const decisionsCount = meeting.decisions?.length ?? 0;
  const doneCount = meeting.decisions?.filter(d => d.status === 'Réalisé').length ?? 0;

  return (
    <div className="animate-in fade-in duration-300 pb-16">

      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/meetings')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      {/* Hero Header */}
      <div className="relative px-8 py-14 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl overflow-hidden mb-8">
        <div className="absolute top-0 right-0 p-6 opacity-[0.07] pointer-events-none">
          <UsersRound size={260} className="text-indigo-300" />
        </div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Top row: badges + actions */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-semibold shadow-lg shadow-indigo-900/40">
                {meeting.category}
              </span>
              <span className={cn("px-3 py-1 rounded-full text-xs font-medium border", priorityColor(meeting.priority))}>
                Priorité {meeting.priority}
              </span>
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold border",
                meeting.status === 'Terminé'
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/20"
                  : "bg-amber-500/20 text-amber-300 border-amber-400/20"
              )}>
                {meeting.status}
              </span>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsEditOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/30 hover:bg-indigo-500/40 rounded-xl text-white text-xs font-medium transition-all border border-indigo-400/20"
              >
                <Edit size={13} /> Modifier
              </button>
              {canDelete('meetings') && (
                <button
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 rounded-xl text-rose-300 text-xs font-medium transition-all border border-rose-400/20"
                >
                  <Trash2 size={13} /> Supprimer
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <p className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wider">Ordre du jour</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight max-w-3xl">
              {meeting.title}
            </h1>
          </div>

          {/* Meta pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white/8 px-3 py-2 rounded-xl border border-white/10">
              <Clock size={13} className="text-indigo-400 shrink-0" />
              <span className="text-xs font-medium text-slate-200">
                {new Date(meeting.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · {meeting.time}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/8 px-3 py-2 rounded-xl border border-white/10">
              <MapPin size={13} className="text-indigo-400 shrink-0" />
              <span className="text-xs font-medium text-slate-200">{meeting.location}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/8 px-3 py-2 rounded-xl border border-white/10">
              <Users size={13} className="text-emerald-400 shrink-0" />
              <span className="text-xs font-medium text-slate-200">{meeting.attendeeIds.length} présents</span>
            </div>
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border",
              quorum >= 50 ? "bg-emerald-500/20 border-emerald-400/20" : "bg-rose-500/20 border-rose-400/20"
            )}>
              <ShieldCheck size={13} className={quorum >= 50 ? "text-emerald-400 shrink-0" : "text-rose-400 shrink-0"} />
              <span className={cn("text-xs font-semibold", quorum >= 50 ? "text-emerald-300" : "text-rose-300")}>
                Quorum {quorum}%
              </span>
            </div>
          </div>

          {/* AI Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
            <button
              onClick={handleGeneratePV}
              disabled={isGeneratingPV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-medium transition-all border border-white/10 disabled:opacity-50"
            >
              {isGeneratingPV ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Rédiger PV (IA)
            </button>
            <button
              onClick={handleGenerateFlash}
              disabled={isGeneratingFlash}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium transition-all border border-emerald-400/20 disabled:opacity-50"
            >
              {isGeneratingFlash ? <Loader2 size={13} className="animate-spin" /> : <MessageSquareText size={13} />}
              Flash Info WhatsApp
            </button>
            <button
              onClick={handleExtractTasks}
              disabled={isExtractingTasks || !meeting.summary}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-medium transition-all border border-white/10 disabled:opacity-50"
            >
              {isExtractingTasks ? <Loader2 size={13} className="animate-spin" /> : <ListChecks size={13} />}
              Extraire Tâches
            </button>
            <button
              onClick={toggleStatus}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ml-auto",
                meeting.status === 'Programmé'
                  ? "bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-200 border-emerald-400/20"
                  : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/20"
              )}
            >
              <CheckCircle2 size={13} />
              {meeting.status === 'Programmé' ? 'Clôturer la séance' : 'Réouvrir la séance'}
            </button>
          </div>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* LEFT — Main content */}
        <div className="flex-1 space-y-6">

          {/* Résolutions & Décisions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={14} className="text-emerald-500" />
                <h4 className="text-xs font-semibold text-slate-600">Résolutions & Décisions</h4>
                {decisionsCount > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-100">
                    {doneCount}/{decisionsCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsAddingDecision(!isAddingDecision)}
                className={cn('p-1.5 rounded-lg transition-all', isAddingDecision ? 'bg-rose-50 text-rose-500 rotate-45' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')}
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {isAddingDecision && (
                <div className="flex items-center gap-2 p-3 bg-slate-50 border border-indigo-200 rounded-xl animate-in slide-in-from-top-2 duration-200">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Décrire la résolution..."
                    value={newDecisionLabel}
                    onChange={(e) => setNewDecisionLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDecision()}
                    className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-slate-800 placeholder:text-slate-400"
                  />
                  <button onClick={handleAddDecision} disabled={!newDecisionLabel.trim()} className="p-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
                    <Check size={13} strokeWidth={3} />
                  </button>
                </div>
              )}
              {meeting.decisions?.map(decision => (
                <div key={decision.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl group hover:border-slate-200 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('w-1.5 h-8 rounded-full shrink-0', decision.status === 'Réalisé' ? 'bg-emerald-500' : decision.status === 'En cours' ? 'bg-blue-500' : 'bg-amber-400')} />
                    <div className="min-w-0">
                      <span className={cn('text-xs font-semibold block truncate', decision.status === 'Réalisé' && 'text-slate-400 line-through')}>
                        {decision.label}
                      </span>
                      {decision.assignedTo && <span className="text-[10px] text-slate-400 italic">Assigné : {decision.assignedTo}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <button onClick={() => handleDeleteDecision(decision.id)} className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all mr-1">
                      <Trash2 size={13} />
                    </button>
                    {(['À faire', 'En cours', 'Réalisé'] as const).map(st => (
                      <button key={st} onClick={() => updateDecisionStatus(decision.id, st)} className={cn('px-2 py-1 rounded-lg text-[10px] font-semibold transition-all', decision.status === st ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-200')}>
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!meeting.decisions?.length && !isAddingDecision && (
                <div className="text-center py-6 text-slate-400">
                  <ClipboardCheck size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs italic">Aucune résolution enregistrée.</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes de séance */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
              <PenTool size={14} className="text-indigo-600" />
              <h4 className="text-xs font-semibold text-slate-600">Notes de séance</h4>
            </div>
            <div className="px-6 py-6">
              {meeting.summary ? (
                <p className="text-sm text-slate-700 font-medium leading-relaxed italic whitespace-pre-wrap">
                  {meeting.summary}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  Aucune note — saisissez le résumé pour alimenter l'IA.
                </p>
              )}
            </div>
          </div>

          {/* PV IA */}
          {meeting.aiPV && (
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden animate-in fade-in">
              <div className="px-6 py-4 border-b border-indigo-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-indigo-500" />
                  <h4 className="text-xs font-semibold text-slate-600">Procès-Verbal généré par IA</h4>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCopyPV} className={cn("p-2 rounded-xl transition-all", pvCopied ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50")}>
                    {pvCopied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                  </button>
                  <button onClick={() => { const u = { ...meeting, aiPV: undefined }; setMeeting(u); updateMeeting(meeting.id, { aiPv: null }); }} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                    <X size={15} />
                  </button>
                </div>
              </div>
              <div className="px-6 py-6 prose prose-sm max-w-none text-slate-700 font-medium leading-relaxed italic whitespace-pre-wrap text-sm">
                {meeting.aiPV}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT — Sidebar */}
        <div className="lg:w-80 xl:w-96 shrink-0 space-y-4">

          {/* Quorum */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500" />
              <h4 className="text-xs font-semibold text-slate-600">Quorum de séance</h4>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-end justify-between">
                <span className={cn("text-3xl font-black", quorum >= 50 ? "text-emerald-600" : "text-rose-500")}>
                  {quorum}%
                </span>
                <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg", quorum >= 50 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-500 border border-rose-100")}>
                  {quorum >= 50 ? 'Atteint' : 'Non atteint'}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", quorum >= 50 ? "bg-emerald-500" : "bg-rose-400")}
                  style={{ width: `${quorum}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Basé sur {meeting.attendeeIds.length} présents sur {members.filter(m => m.type !== MemberType.MEMBRE_SIMPLE).length} responsables
              </p>
            </div>
          </div>

          {/* Participants présents */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
              <Users size={14} className="text-indigo-500" />
              <h4 className="text-xs font-semibold text-slate-600">Présents ({meeting.attendeeIds.length})</h4>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                {meeting.attendeeIds.map(aid => {
                  const m = members.find(mem => mem.id === aid);
                  return (
                    <div key={aid} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[9px] font-bold text-white uppercase overflow-hidden shrink-0">
                        {m?.photoUrl
                          ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                          : getInitials(m?.firstName, m?.lastName)
                        }
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-700 tracking-tight whitespace-nowrap">
                        {formatFirstName(m?.firstName || '')} <span className="uppercase">{m?.lastName}</span>
                      </span>
                    </div>
                  );
                })}
                {meeting.attendeeIds.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Aucun participant enregistré.</p>
                )}
              </div>
            </div>
          </div>

          {/* Absents */}
          {meeting.absenteeIds?.length > 0 && (
            <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-rose-50 flex items-center gap-2">
                <UserX size={14} className="text-rose-500" />
                <h4 className="text-xs font-semibold text-slate-600">Absents / Excusés ({meeting.absenteeIds.length})</h4>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap gap-2">
                  {meeting.absenteeIds.map(aid => {
                    const m = members.find(mem => mem.id === aid);
                    return (
                      <div key={aid} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 border border-rose-100 rounded-xl">
                        <div className="w-5 h-5 rounded-full bg-rose-300 flex items-center justify-center text-[9px] font-bold text-rose-700 uppercase overflow-hidden shrink-0">
                          {m?.photoUrl
                            ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                            : getInitials(m?.firstName, m?.lastName)
                          }
                        </div>
                        <span className="text-[10px] font-semibold text-rose-600 tracking-tight whitespace-nowrap">
                          {formatFirstName(m?.firstName || '')} <span className="uppercase">{m?.lastName}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Edit modal */}
      {isEditOpen && meeting && (
        <MeetingEditModal
          meeting={meeting as unknown as MeetingType}
          allMembers={members}
          onSave={(saved) => { setMeeting(saved as unknown as Meeting); setIsEditOpen(false); }}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {/* Delete confirm */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 text-center border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Supprimer ?</h3>
            <p className="text-slate-500 mt-2 text-sm font-medium leading-relaxed italic">Cette action retirera définitivement ce compte-rendu.</p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-xs font-medium shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">Confirmer</button>
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-xs font-medium border border-slate-200 hover:bg-slate-100 transition-all">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingDetailPage;
