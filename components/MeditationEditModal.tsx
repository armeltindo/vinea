import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { createMeditation, updateMeditation } from '../lib/db';
import { cn, generateId } from '../utils';

export interface Meditation {
  id: string;
  title: string;
  scripture: string;
  questions: string;
  date: string;
  excerpt: string;
  likes: number;
  isRead: boolean;
}

interface MeditationEditModalProps {
  meditation: Meditation | null; // null = creating new
  onSave: (saved: Meditation) => void;
  onClose: () => void;
}

const MeditationEditModal: React.FC<MeditationEditModalProps> = ({ meditation, onSave, onClose }) => {
  const emptyForm = () => ({
    title: '',
    scripture: '',
    questions: '',
    date: new Date().toISOString().split('T')[0],
    excerpt: '',
  });

  const [formData, setFormData] = useState<Omit<Meditation, 'id' | 'likes' | 'isRead'>>(
    meditation ? {
      title: meditation.title,
      scripture: meditation.scripture,
      questions: meditation.questions,
      date: meditation.date,
      excerpt: meditation.excerpt,
    } : emptyForm()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(meditation ? {
      title: meditation.title,
      scripture: meditation.scripture,
      questions: meditation.questions,
      date: meditation.date,
      excerpt: meditation.excerpt,
    } : emptyForm());
    setErrors({});
  }, [meditation?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() && !formData.scripture.trim()) {
      setErrors({ title: 'Requis', scripture: 'Requis' });
      return;
    }
    setIsSubmitting(true);
    let saved: Meditation;
    if (meditation) {
      saved = { ...meditation, ...formData };
      await updateMeditation(meditation.id, formData);
    } else {
      saved = { ...formData, id: generateId(), likes: 0, isRead: false };
      await createMeditation(saved);
    }
    setIsSubmitting(false);
    onSave(saved);
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => !isSubmitting && onClose()} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-2xl overflow-hidden max-h-[90vh]">
        <div className="px-10 py-8 bg-indigo-600 text-white shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">{meditation ? 'Modifier' : 'Rédaction'}</h3>
            <p className="text-xs text-indigo-200 mt-0.5">Vinea Management</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar bg-slate-50/30">
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Date</label>
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-semibold shadow-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Thème</label>
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={cn('w-full px-5 py-3.5 bg-white border rounded-2xl text-sm font-semibold shadow-sm', errors.title ? 'border-rose-300' : 'border-slate-200 focus:border-indigo-400')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Versets</label>
              <input type="text" value={formData.scripture} onChange={e => setFormData({...formData, scripture: e.target.value})} className={cn('w-full px-5 py-3.5 bg-white border rounded-2xl text-sm font-bold shadow-sm', errors.scripture ? 'border-rose-300' : 'border-slate-200 focus:border-indigo-400')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Résumé</label>
              <textarea rows={6} value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-sm font-medium resize-none shadow-sm focus:border-indigo-400 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Questions</label>
              <textarea rows={4} value={formData.questions} onChange={e => setFormData({...formData, questions: e.target.value})} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-sm font-medium resize-none shadow-sm focus:border-indigo-400 outline-none" />
            </div>
          </div>
          <div className="pt-8 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-xs font-medium">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-medium shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {meditation ? 'Enregistrer' : 'Publier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MeditationEditModal;
