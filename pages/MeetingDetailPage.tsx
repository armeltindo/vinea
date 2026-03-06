import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UsersRound, FileText, Clock, MapPin, Users, Loader2, Trash2,
  Plus, Check, ClipboardCheck, PenTool, Sparkles, MessageSquareText,
  ListChecks, Copy, X, ShieldCheck, UserX
} from 'lucide-react';
import { analyzePageData, generateMeetingMinutes, generateMeetingFlash, extractMeetingTasks } from '../lib/gemini';
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
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      const updated = { ...meeting, aiPV: response.text };
      setMeeting(updated);
      await updateMeeting(meeting.id, { aiPv: response.text });
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la génération du PV.');
    }
    setIsGeneratingPV(false);
  };

  const handleGenerateFlash = async () => {
    if (!meeting) return;
    setIsGeneratingFlash(true);
    const flash = await generateMeetingFlash(meeting);
    if (flash) {
      const url = `https://wa.me/?text=${encodeURIComponent(flash)}`;
      window.open(url, '_blank');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (notFound || !meeting) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500 font-medium">Réunion introuvable.</p>
        <button onClick={() => navigate('/meetings')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium">
          Retour aux réunions
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 pb-20">
      {/* Top nav */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <button onClick={() => navigate('/meetings')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all shadow-sm">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/meetings', { state: { editId: meeting.id } })}
            className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-medium hover:bg-indigo-100 transition-all"
          >
            Modifier
          </button>
          {canDelete('meetings') && (
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="p-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-100 transition-all"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="px-10 py-12 bg-indigo-600 text-white rounded-2xl relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 p-8 opacity-10"><UsersRound size={180} /></div>
        <div className="relative z-10 space-y-4">
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium">{meeting.category}</span>
            <span className="px-3 py-1 bg-indigo-500 rounded-full text-xs font-medium border border-white/20">Quorum: {calculateQuorum(meeting.attendeeIds)}%</span>
          </div>
          <h3 className="text-3xl font-semibold leading-tight">{meeting.title}</h3>
          <div className="flex items-center gap-4 text-indigo-100">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <Clock size={12} /> {new Date(meeting.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} • {meeting.time}
            </span>
            <span className="text-xs font-bold flex items-center gap-1.5">
              <MapPin size={12} /> {meeting.location}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Actions IA */}
        <div className="flex flex-wrap gap-3">
          <button onClick={handleGeneratePV} disabled={isGeneratingPV} className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-xs font-medium flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg">
            {isGeneratingPV ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Rédiger PV (IA)
          </button>
          <button onClick={handleGenerateFlash} disabled={isGeneratingFlash} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg">
            {isGeneratingFlash ? <Loader2 size={16} className="animate-spin" /> : <MessageSquareText size={16} />} Flash Info (WA)
          </button>
          <button onClick={handleExtractTasks} disabled={isExtractingTasks || !meeting.summary} className="flex-1 py-3 bg-white border border-indigo-200 text-indigo-600 rounded-2xl text-xs font-medium flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all disabled:opacity-50">
            {isExtractingTasks ? <Loader2 size={16} className="animate-spin" /> : <ListChecks size={16} />} Extraire Tâches
          </button>
        </div>

        {/* PV IA */}
        {meeting.aiPV && (
          <div className="bg-white p-8 rounded-2xl border border-indigo-200 shadow-xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h4 className="text-xs font-semibold text-indigo-600 flex items-center gap-2"><FileText size={14} /> Procès-Verbal Généré par IA</h4>
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(meeting.aiPV!); alert('PV copié !'); }} className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors"><Copy size={16} /></button>
                <button onClick={() => { const updated = { ...meeting, aiPV: undefined }; setMeeting(updated); updateMeeting(meeting.id, { aiPv: null }); }} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"><X size={16} /></button>
              </div>
            </div>
            <div className="prose prose-sm max-w-none text-slate-700 font-medium leading-relaxed italic whitespace-pre-wrap">{meeting.aiPV}</div>
          </div>
        )}

        {/* Lieu + Quorum */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2"><MapPin size={14} className="text-rose-500" /> Lieu</h4>
            <p className="text-sm font-semibold text-slate-800 leading-none">{meeting.location}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-500" /> Quorum séance</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${calculateQuorum(meeting.attendeeIds)}%` }}></div>
              </div>
              <span className="text-xs font-semibold text-slate-800">{calculateQuorum(meeting.attendeeIds)}%</span>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div>
            <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2 mb-4"><Users size={14} className="text-indigo-500" /> Participants Présents ({meeting.attendeeIds.length})</h4>
            <div className="flex flex-wrap gap-2">
              {meeting.attendeeIds.map(aid => {
                const m = members.find(mem => mem.id === aid);
                return (
                  <div key={aid} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full shadow-sm">
                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-semibold text-white uppercase overflow-hidden">
                      {m?.photoUrl ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" /> : getInitials(m?.firstName, m?.lastName)}
                    </div>
                    <span className="text-xs font-medium text-slate-700 tracking-tighter">{formatFirstName(m?.firstName || '')} <span className="uppercase">{m?.lastName}</span></span>
                  </div>
                );
              })}
            </div>
          </div>

          {meeting.absenteeIds?.length > 0 && (
            <div className="pt-6 border-t border-slate-50">
              <h4 className="text-xs font-semibold text-rose-400 flex items-center gap-2 mb-4"><UserX size={14} /> Absents / Excusés ({meeting.absenteeIds.length})</h4>
              <div className="flex flex-wrap gap-2">
                {meeting.absenteeIds.map(aid => {
                  const m = members.find(mem => mem.id === aid);
                  return (
                    <div key={aid} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50/50 border border-rose-100 rounded-full">
                      <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center text-xs font-semibold text-rose-600 uppercase overflow-hidden">
                        {m?.photoUrl ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" /> : getInitials(m?.firstName, m?.lastName)}
                      </div>
                      <span className="text-xs font-semibold text-rose-700 tracking-tighter">{formatFirstName(m?.firstName || '')} <span className="uppercase">{m?.lastName}</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Résolutions */}
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2"><ClipboardCheck size={14} className="text-emerald-500" /> Résolutions & Décisions</h4>
            <button onClick={() => setIsAddingDecision(!isAddingDecision)} className={cn('p-1.5 rounded-lg transition-all', isAddingDecision ? 'bg-rose-50 text-rose-600 rotate-45' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')}><Plus size={14} /></button>
          </div>
          <div className="space-y-3">
            {isAddingDecision && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-indigo-200 rounded-2xl animate-in slide-in-from-top-2 duration-200">
                <input
                  type="text"
                  autoFocus
                  placeholder="Décrire la résolution..."
                  value={newDecisionLabel}
                  onChange={(e) => setNewDecisionLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDecision()}
                  className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400"
                />
                <button onClick={handleAddDecision} disabled={!newDecisionLabel.trim()} className="p-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
                  <Check size={14} strokeWidth={3} />
                </button>
              </div>
            )}
            {meeting.decisions?.map(decision => (
              <div key={decision.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn('w-2 h-8 rounded-full', decision.status === 'Réalisé' ? 'bg-emerald-500' : decision.status === 'En cours' ? 'bg-blue-500' : 'bg-amber-500')}></div>
                  <div className="min-w-0">
                    <span className={cn('text-xs font-medium block truncate tracking-tight', decision.status === 'Réalisé' && 'text-slate-400 line-through')}>{decision.label}</span>
                    {decision.assignedTo && <span className="text-xs text-slate-400 italic">Assigné : {decision.assignedTo}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 ml-4">
                  <div className="flex gap-0.5 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDeleteDecision(decision.id)} className="p-1 text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
                  </div>
                  {(['À faire', 'En cours', 'Réalisé'] as const).map(st => (
                    <button key={st} onClick={() => updateDecisionStatus(decision.id, st)} className={cn('px-2 py-1 rounded text-xs font-medium transition-all', decision.status === st ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-400 hover:bg-slate-100')}>{st}</button>
                  ))}
                </div>
              </div>
            ))}
            {!meeting.decisions?.length && !isAddingDecision && <p className="text-xs text-slate-400 italic text-center py-4">Aucune résolution enregistrée.</p>}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white p-8 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
          <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2"><PenTool size={14} className="text-indigo-600" /> Notes de séance</h4>
          <p className="text-sm text-slate-700 font-medium leading-relaxed italic whitespace-pre-wrap">{meeting.summary || "Saisissez les notes de séance pour alimenter l'IA."}</p>
        </div>

        {/* Clôture */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
          <button onClick={toggleStatus} className={cn('w-full py-4 rounded-2xl text-xs font-medium transition-all shadow-lg', meeting.status === 'Programmé' ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-amber-100 text-amber-700 shadow-amber-200')}>
            {meeting.status === 'Programmé' ? 'Clôturer la séance' : 'Réouvrir la séance'}
          </button>
        </div>
      </div>

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
