import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2, Layout, Youtube, Facebook, Headphones } from 'lucide-react';
import { createChurchService, updateChurchService } from '../lib/db';
import { cn, generateId } from '../utils';
import { ChurchService } from '../types';
import { SERVICES_LIST } from '../constants';

interface ServiceEditModalProps {
  service: ChurchService | null; // null = creating new
  allServices: ChurchService[];   // for seriesList suggestions
  availableServiceTypes?: string[];
  onSave: (saved: ChurchService) => void;
  onClose: () => void;
}

const ServiceEditModal: React.FC<ServiceEditModalProps> = ({
  service,
  allServices,
  availableServiceTypes = SERVICES_LIST,
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
  });

  const [formData, setFormData] = useState<Omit<ChurchService, 'id'>>(
    service ? { ...service } : emptyForm()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(service ? { ...service } : emptyForm());
    setErrors({});
  }, [service?.id]);

  const seriesList = useMemo(() => {
    return Array.from(new Set(allServices.map(s => s.series).filter(Boolean))).sort();
  }, [allServices]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.theme.trim()) newErrors.theme = 'Le titre est requis';
    if (!formData.speaker.trim()) newErrors.speaker = "L'orateur est requis";
    if (!formData.content.trim()) newErrors.content = 'Le texte de la prédication est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    setIsSubmitting(false);
    onSave(saved);
  };

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
              <label className="text-xs font-medium text-slate-500 ml-1">Thème</label>
              <input type="text" required placeholder="Ex: La grâce" value={formData.theme} onChange={(e) => setFormData({...formData, theme: e.target.value})} className={cn('w-full px-5 py-3.5 bg-white border rounded-2xl outline-none text-sm font-semibold shadow-sm transition-all', errors.theme ? 'border-rose-300' : 'border-slate-200 focus:border-indigo-400')} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Orateur</label><input type="text" placeholder="Pasteur..." value={formData.speaker} onChange={(e) => setFormData({...formData, speaker: e.target.value})} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Versets</label><input type="text" placeholder="Jean 3:16" value={formData.scripture || ''} onChange={(e) => setFormData({...formData, scripture: e.target.value})} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold" /></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Contenu</label>
              <textarea rows={10} required placeholder="Notes..." value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} className={cn('w-full px-5 py-4 bg-white border rounded-xl outline-none text-sm font-medium resize-none shadow-sm transition-all', errors.content ? 'border-rose-300' : 'border-slate-200 focus:border-indigo-400')} />
            </div>

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
