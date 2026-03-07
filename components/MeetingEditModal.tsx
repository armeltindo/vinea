import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Search, UsersRound, UserX, Check } from 'lucide-react';
import { createMeeting, updateMeeting } from '../lib/db';
import { cn, generateId, getInitials } from '../utils';
import { Member, MemberType } from '../types';

interface MeetingDecision {
  id: string;
  label: string;
  status: 'À faire' | 'En cours' | 'Réalisé';
  assignedTo?: string;
}

export interface Meeting {
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

const CATEGORIES = ['Conseil', 'Département', 'Ouvriers', 'Jeunesse', 'Finances', 'Social'];

interface MeetingEditModalProps {
  meeting: Meeting | null; // null = creating new
  allMembers: Member[];
  onSave: (saved: Meeting) => void;
  onClose: () => void;
}

const MeetingEditModal: React.FC<MeetingEditModalProps> = ({ meeting, allMembers, onSave, onClose }) => {
  const emptyForm = () => ({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    location: '',
    category: CATEGORIES[0],
    attendeeIds: [] as string[],
    absenteeIds: [] as string[],
    priority: 'Moyenne' as const,
    summary: '',
    decisions: [] as MeetingDecision[],
  });

  const [formData, setFormData] = useState<Omit<Meeting, 'id' | 'status'>>(
    meeting ? { ...meeting } : emptyForm()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [absenteeSearch, setAbsenteeSearch] = useState('');

  useEffect(() => {
    setFormData(meeting ? { ...meeting } : emptyForm());
    setAttendeeSearch('');
    setAbsenteeSearch('');
  }, [meeting?.id]);

  const calculateQuorum = (attendeeIds: string[]) => {
    const totalLeaders = allMembers.filter(m => m.type !== MemberType.MEMBRE_SIMPLE).length;
    const leaderAttendees = attendeeIds.filter(id => {
      const m = allMembers.find(mem => mem.id === id);
      return m && m.type !== MemberType.MEMBRE_SIMPLE;
    }).length;
    if (totalLeaders === 0) return 100;
    return Math.round((leaderAttendees / totalLeaders) * 100);
  };

  const toggleAttendee = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(id)
        ? prev.attendeeIds.filter(i => i !== id)
        : [...prev.attendeeIds, id],
      absenteeIds: prev.absenteeIds.filter(i => i !== id),
    }));
  };

  const toggleAbsentee = (id: string) => {
    setFormData(prev => ({
      ...prev,
      absenteeIds: prev.absenteeIds.includes(id)
        ? prev.absenteeIds.filter(i => i !== id)
        : [...prev.absenteeIds, id],
      attendeeIds: prev.attendeeIds.filter(i => i !== id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let saved: Meeting;
    if (meeting) {
      saved = { ...meeting, ...formData };
      await updateMeeting(meeting.id, formData);
    } else {
      saved = { ...formData, id: generateId(), status: 'Programmé' };
      await createMeeting(saved);
    }
    setIsSubmitting(false);
    onSave(saved);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => !isSubmitting && onClose()} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="bg-indigo-600 p-8 text-white shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">{meeting ? 'Mise à jour' : 'Planification'}</h3>
            <p className="text-xs text-indigo-200 mt-0.5">Registre administratif Vinea</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-slate-50/30 pb-20">
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Objet de la réunion</label>
              <input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Ex: Conseil de Trésorerie" className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-semibold shadow-sm" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Date</label><input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Heure</label><input type="time" required value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold" /></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Localisation / Plateforme</label>
              <input type="text" required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Ex: Salle Vinea ou Google Meet" className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-semibold shadow-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Catégorie</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-normal shadow-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Présents */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-medium text-slate-700 flex items-center gap-2"><UsersRound size={16} className="text-indigo-600" /> Participants Présents</h4>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Quorum : {calculateQuorum(formData.attendeeIds)}%</span>
              </div>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input type="text" placeholder="Chercher un membre présent..." value={attendeeSearch} onChange={(e) => setAttendeeSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm font-normal bg-white border border-slate-200 rounded-xl outline-none shadow-inner" />
              </div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl bg-white shadow-sm">
                {allMembers.filter(m => m.type !== MemberType.MEMBRE_SIMPLE && `${m.firstName} ${m.lastName}`.toLowerCase().includes(attendeeSearch.toLowerCase())).map(m => (
                  <div key={m.id} onClick={() => toggleAttendee(m.id)} className={cn('flex items-center justify-between p-3 border-b border-slate-50 last:border-0 cursor-pointer transition-colors', formData.attendeeIds.includes(m.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50')}>
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium shadow-sm overflow-hidden', formData.attendeeIds.includes(m.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400')}>
                        {m.photoUrl ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" /> : getInitials(m.firstName, m.lastName)}
                      </div>
                      <span className={cn('text-xs font-semibold', formData.attendeeIds.includes(m.id) ? 'text-indigo-700' : 'text-slate-600')}>{m.firstName} {m.lastName}</span>
                    </div>
                    {formData.attendeeIds.includes(m.id) && <Check size={14} className="text-indigo-600" strokeWidth={4} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Absents */}
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-slate-700 flex items-center gap-2"><UserX size={16} className="text-rose-500" /> Absents / Excusés</h4>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input type="text" placeholder="Chercher un membre absent..." value={absenteeSearch} onChange={(e) => setAbsenteeSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm font-normal bg-white border border-slate-200 rounded-xl outline-none shadow-inner" />
              </div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl bg-white shadow-sm">
                {allMembers.filter(m => m.type !== MemberType.MEMBRE_SIMPLE && `${m.firstName} ${m.lastName}`.toLowerCase().includes(absenteeSearch.toLowerCase())).map(m => (
                  <div key={m.id} onClick={() => toggleAbsentee(m.id)} className={cn('flex items-center justify-between p-3 border-b border-slate-50 last:border-0 cursor-pointer transition-colors', formData.absenteeIds.includes(m.id) ? 'bg-rose-50/50' : 'hover:bg-slate-50')}>
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium shadow-sm overflow-hidden', formData.absenteeIds.includes(m.id) ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400')}>
                        {m.photoUrl ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" /> : getInitials(m.firstName, m.lastName)}
                      </div>
                      <span className={cn('text-xs font-semibold', formData.absenteeIds.includes(m.id) ? 'text-rose-700' : 'text-slate-600')}>{m.firstName} {m.lastName}</span>
                    </div>
                    {formData.absenteeIds.includes(m.id) && <Check size={14} className="text-rose-600" strokeWidth={4} />}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Notes / Résumé de séance</label>
              <textarea rows={6} value={formData.summary || ''} onChange={(e) => setFormData({...formData, summary: e.target.value})} placeholder="Points abordés, ambiance, remarques..." className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium resize-none shadow-sm" />
            </div>
          </div>

          <div className="pt-8 flex gap-4 p-10 bg-white border-t border-slate-100 rounded-b-[3rem] shrink-0">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-500 rounded-2xl text-sm font-medium shadow-sm">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {meeting ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MeetingEditModal;
