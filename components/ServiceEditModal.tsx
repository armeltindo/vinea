import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Save, Loader2, Layout, Youtube, Facebook, Headphones, Users, Search, UserCheck, ChevronDown } from 'lucide-react';
import { createChurchService, updateChurchService, createMemberAssignmentNotifications } from '../lib/db';
import { cn, generateId } from '../utils';
import { ChurchService, Member, ServicePersonnel, ServicePersonnelItem } from '../types';
import Avatar from './Avatar';
import { SERVICES_LIST } from '../constants';

interface ServiceEditModalProps {
  service: ChurchService | null; // null = creating new
  allServices: ChurchService[];   // for seriesList suggestions
  availableServiceTypes?: string[];
  members?: Member[];
  onSave: (saved: ChurchService) => void;
  onClose: () => void;
}

const ROLE_CONFIG: { key: keyof ServicePersonnel; label: string }[] = [
  { key: 'moderateur', label: 'Modérateur' },
  { key: 'priereOuverture', label: "Prière d'ouverture" },
  { key: 'adoration', label: 'Adoration' },
  { key: 'annonces', label: 'Annonces' },
  { key: 'accueil', label: 'Accueil' },
  { key: 'conducteurOuvriers', label: 'Conducteur groupe des ouvriers' },
  { key: 'conducteurFons', label: 'Conducteur groupe des fons' },
  { key: 'conducteurEnfants', label: 'Conducteur groupe des enfants' },
  { key: 'conducteurAdolescents', label: 'Conducteur groupe des adolescents' },
  { key: 'interpretationFon', label: 'Interprétation - Fon' },
  { key: 'interpretationPasteur', label: 'Interprétation - Pasteur' },
];

interface MultiMemberSearchProps {
  label: string;
  members: Member[];
  values: ServicePersonnelItem[];
  onChange: (vals: ServicePersonnelItem[]) => void;
}

const MultiMemberSearchField: React.FC<MultiMemberSearchProps> = ({ label, members, values, onChange }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(() => new Set(values.map(v => v.memberId)), [values]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return members
      .filter(m => !selectedIds.has(m.id))
      .filter(m => !query.trim() ||
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        `${m.lastName} ${m.firstName}`.toLowerCase().includes(q)
      ).slice(0, 8);
  }, [query, members, selectedIds]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (m: Member) => {
    onChange([...values, { memberId: m.id, memberName: `${m.firstName} ${m.lastName}` }]);
    setQuery('');
    setOpen(false);
  };

  const handleRemove = (memberId: string) => {
    onChange(values.filter(v => v.memberId !== memberId));
  };

  return (
    <div className="space-y-1.5" ref={wrapRef}>
      <label className="text-xs font-medium text-slate-500 ml-1">{label}</label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map(v => {
            const member = members.find(m => m.id === v.memberId);
            const parts = v.memberName.trim().split(/\s+/);
            return (
              <div key={v.memberId} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                <Avatar firstName={parts[0]} lastName={parts.slice(1).join(' ')} photoUrl={member?.photoUrl} size="xs" shape="circle" />
                <span className="text-xs font-semibold text-indigo-800">{v.memberName}</span>
                <button type="button" onClick={() => handleRemove(v.memberId)} className="text-indigo-400 hover:text-indigo-600 ml-0.5">
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
        <input
          type="text"
          placeholder={values.length > 0 ? 'Ajouter un membre...' : 'Rechercher un membre...'}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-medium shadow-sm focus:border-indigo-300"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-44 overflow-y-auto">
            {filtered.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelect(m)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 text-left transition-colors"
              >
                <Avatar firstName={m.firstName} lastName={m.lastName} photoUrl={m.photoUrl} size="sm" shape="circle" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{m.firstName} {m.lastName}</p>
                  {m.type && <p className="text-xs text-slate-400 truncate">{m.type}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ServiceEditModal: React.FC<ServiceEditModalProps> = ({
  service,
  allServices,
  availableServiceTypes = SERVICES_LIST,
  members = [],
  onSave,
  onClose,
}) => {
  const emptyForm = (): Omit<ChurchService, 'id'> => ({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    serviceType: 'Culte de dimanche',
    series: '',
    theme: '',
    scripture: '',
    speaker: '',
    moderator: '',
    worshipLeader: '',
    content: '',
    attendance: undefined,
    youtubeLink: '',
    facebookLink: '',
    audioLink: '',
    tags: [],
    servicePersonnel: {},
  });

  const [formData, setFormData] = useState<Omit<ChurchService, 'id'>>(
    service ? { ...service } : emptyForm()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPersonnel, setShowPersonnel] = useState(false);

  useEffect(() => {
    setFormData(service ? { ...service } : emptyForm());
    setErrors({});
  }, [service?.id]);

  const seriesList = useMemo(() => {
    return Array.from(new Set(allServices.map(s => s.series).filter(Boolean))).sort();
  }, [allServices]);

  const validateForm = () => {
    // Tous les champs sont facultatifs lors d'une programmation anticipée
    setErrors({});
    return true;
  };

  const handlePersonnelChange = (role: keyof ServicePersonnel, vals: ServicePersonnelItem[]) => {
    setFormData(prev => ({
      ...prev,
      servicePersonnel: { ...prev.servicePersonnel, [role]: vals.length > 0 ? vals : undefined },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    let saved: ChurchService;
    if (service) {
      saved = { ...service, ...formData };
      await updateChurchService(service.id, formData);
    } else {
      saved = { ...formData as ChurchService, id: generateId() };
      await createChurchService(saved);
    }

    // Send notifications to assigned members
    if (saved.servicePersonnel && Object.values(saved.servicePersonnel).some(v => v?.memberId)) {
      await createMemberAssignmentNotifications(saved, saved.servicePersonnel);
    }

    setIsSubmitting(false);
    onSave(saved);
  };

  const assignedCount = Object.values(formData.servicePersonnel ?? {}).reduce((acc, items) => acc + (items?.length ?? 0), 0);

  return (
    <div className="fixed inset-0 z-[180] overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => !isSubmitting && onClose()} />
      <div className="relative w-full max-w-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-2xl overflow-hidden max-h-[90vh]">
        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 rounded-t-[3rem] text-white shrink-0">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">{service ? 'Modifier' : 'Nouveau'}</h3>
            <p className="text-xs text-indigo-200 mt-0.5">Vinea Homiletic Centre</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2.5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-slate-50/30">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Date</label><input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold shadow-sm" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Heure</label><input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold shadow-sm" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Type</label><select value={formData.serviceType} onChange={(e) => setFormData({...formData, serviceType: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-normal shadow-sm">{availableServiceTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Série</label>
              <input type="text" placeholder="Ex: Fondements" list="series-suggestions-modal" value={formData.series || ''} onChange={(e) => setFormData({...formData, series: e.target.value})} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold shadow-sm" />
              <datalist id="series-suggestions-modal">{seriesList.map(s => <option key={s} value={s} />)}</datalist>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Thème <span className="text-slate-300">(facultatif)</span></label>
              <input type="text" placeholder="Ex: La grâce — peut être renseigné plus tard" value={formData.theme} onChange={(e) => setFormData({...formData, theme: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-semibold shadow-sm focus:border-indigo-400 transition-all" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Orateur <span className="text-slate-300">(facultatif)</span></label><input type="text" placeholder="Pasteur..." value={formData.speaker} onChange={(e) => setFormData({...formData, speaker: e.target.value})} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Versets <span className="text-slate-300">(facultatif)</span></label><input type="text" placeholder="Jean 3:16" value={formData.scripture || ''} onChange={(e) => setFormData({...formData, scripture: e.target.value})} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold" /></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Contenu <span className="text-slate-300">(facultatif)</span></label>
              <textarea rows={6} placeholder="Notes de prédication — peut être renseigné plus tard" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium resize-none shadow-sm focus:border-indigo-400 transition-all" />
            </div>

            {/* ── Section Programmation du personnel ── */}
            {members.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPersonnel(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-indigo-600" />
                    <span className="text-xs font-semibold text-slate-700">Programmation des activités</span>
                    {assignedCount > 0 && (
                      <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full font-bold">{assignedCount}</span>
                    )}
                  </div>
                  <ChevronDown size={14} className={cn('text-slate-400 transition-transform', showPersonnel && 'rotate-180')} />
                </button>

                {showPersonnel && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                    <p className="text-xs text-slate-500 font-medium italic">
                      Assignez les membres programmés pour chaque activité. Plusieurs personnes peuvent être ajoutées par rôle. Ils recevront une notification dans leur espace.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ROLE_CONFIG.map(({ key, label }) => (
                        <MultiMemberSearchField
                          key={key}
                          label={label}
                          members={members}
                          values={(formData.servicePersonnel as any)?.[key] ?? []}
                          onChange={vals => handlePersonnelChange(key, vals)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-medium text-slate-700 flex items-center gap-2"><Layout size={14} className="text-indigo-600" /> Hub Multimédia</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 flex items-center gap-1.5 ml-1"><Youtube size={12} /> YouTube</label><input type="url" value={formData.youtubeLink || ''} onChange={(e) => setFormData({...formData, youtubeLink: e.target.value})} placeholder="https://..." className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs" /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 flex items-center gap-1.5 ml-1"><Facebook size={12} /> Facebook</label><input type="url" value={formData.facebookLink || ''} onChange={(e) => setFormData({...formData, facebookLink: e.target.value})} placeholder="https://..." className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs" /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 flex items-center gap-1.5 ml-1"><Headphones size={12} /> Audio</label><input type="url" value={formData.audioLink || ''} onChange={(e) => setFormData({...formData, audioLink: e.target.value})} placeholder="https://..." className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs" /></div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-500 rounded-2xl text-sm font-medium shadow-sm">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-medium shadow-xl shadow-indigo-100 flex items-center justify-center gap-3">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSubmitting ? '...' : 'Publier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceEditModal;
