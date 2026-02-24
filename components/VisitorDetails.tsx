import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Phone, MessageCircle, Mail, MapPin, Calendar, 
  User, Info, History, Sparkles, Zap, Clock, 
  Edit, Trash2, Share2, UserCircle, MessageSquare,
  Loader2, Copy, Send, Plus, Maximize2, MessageSquareText,
  CheckCircle2,
  Target,
  Heart,
  Baby,
  Briefcase,
  ShieldCheck,
  UserRound,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { Visitor, VisitorStatus, FollowUpEntry, VisitorQualification, Member } from '../types';
import { formatPhone } from '../constants';
import { cn, generateId, getInitials } from '../utils';
import { suggestVisitorFollowUp, generateWelcomeMessage } from '../lib/gemini';
import { getMembers } from '../lib/db';

interface VisitorDetailsProps {
  visitor: Visitor | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (visitor: Visitor) => void;
  onDelete: (id: string) => void;
  onAddFollowUp: (visitorId: string, entry: FollowUpEntry) => void;
  onConvertToMember?: (visitor: Visitor) => void;
}

const QUALIFICATION_META = [
  { id: 'seekingChurch', label: 'Cherche une église', icon: <Target size={12} />, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  { id: 'needsPrayer', label: 'Besoin de prière', icon: <Heart size={12} />, color: 'bg-rose-50 text-rose-600 border-rose-100' },
  { id: 'livesNearby', label: 'Habite le quartier', icon: <MapPin size={12} />, color: 'bg-amber-50 text-amber-600 border-amber-100' },
  { id: 'hasChildren', label: 'A des enfants', icon: <Baby size={12} />, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { id: 'firstTimeChristian', label: 'Nouvelle conversion', icon: <Zap size={12} />, color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'wantsToServe', label: 'Souhaite servir', icon: <Briefcase size={12} />, color: 'bg-slate-50 text-slate-600 border-slate-100' },
];

const VisitorDetails: React.FC<VisitorDetailsProps> = ({ 
  visitor, isOpen, onClose, onEdit, onDelete, onAddFollowUp, onConvertToMember
}) => {
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const [newEntry, setNewEntry] = useState({ 
    type: 'Appel' as FollowUpEntry['type'], 
    note: '', 
    nextStep: '', 
    nextStepDate: '' 
  });

  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    getMembers().then(setMembers);
  }, []);
  
  const parrain = useMemo(() => {
    if (!visitor?.parrainId) return null;
    return members.find(m => m.id === visitor.parrainId);
  }, [visitor, members]);

  const accompanimentProgress = useMemo(() => {
    // Fix: Return an object with zeros instead of the number 0 to satisfy the type expectation for properties like daysLeft and percent
    if (!visitor) return { daysPassed: 0, daysLeft: 0, percent: 0 };
    const startDate = new Date(visitor.visitDate);
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      daysPassed: Math.max(0, diffDays),
      daysLeft: Math.max(0, 90 - diffDays),
      percent: Math.min(100, Math.round((diffDays / 90) * 100))
    };
  }, [visitor]);

  if (!visitor) return null;

  const activeQualifications = QUALIFICATION_META.filter(q => !!(visitor.qualification as any)?.[q.id]);

  const handleGetAiSuggestion = async () => {
    setIsSuggesting(true);
    const suggestion = await suggestVisitorFollowUp(visitor);
    setAiSuggestion(suggestion);
    setIsSuggesting(false);
  };

  const handleGenerateWelcome = async () => {
    setIsGeneratingMessage(true);
    const message = await generateWelcomeMessage(visitor);
    setWelcomeMessage(message);
    setIsGeneratingMessage(false);
  };

  const handleCopyMessage = () => {
    if (welcomeMessage) {
      navigator.clipboard.writeText(welcomeMessage);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  const handleAddEntry = () => {
    if (!newEntry.note.trim()) return;
    const entry: FollowUpEntry = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      ...newEntry
    };
    onAddFollowUp(visitor.id, entry);
    setNewEntry({ type: 'Appel', note: '', nextStep: '', nextStepDate: '' });
  };

  const handleWhatsApp = (targetPhone?: string, text?: string) => {
    const phoneToUse = targetPhone || visitor.whatsappPhone || visitor.phone;
    if (phoneToUse) {
      const cleanPhone = phoneToUse.replace(/\D/g, '');
      const encodedText = text ? `?text=${encodeURIComponent(text)}` : '';
      window.open(`https://wa.me/${cleanPhone}${encodedText}`, '_blank');
    }
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[100] overflow-hidden transition-all duration-300 flex items-center justify-center p-4",
      isOpen ? "pointer-events-auto" : "pointer-events-none"
    )}>
      <div className={cn(
        "absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300",
        isOpen ? "opacity-100" : "opacity-0"
      )} onClick={onClose} />
      
      <div className={cn(
        "relative w-full max-w-lg bg-white shadow-2xl transition-all duration-300 transform flex flex-col rounded-[3rem] overflow-hidden max-h-[90vh]",
        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
      )}>
        {/* Header */}
        <div className="relative h-40 bg-gradient-to-br from-indigo-600 to-indigo-800 overflow-hidden shrink-0 flex items-center px-10">
          <button onClick={onClose} className="absolute top-6 left-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-6 mt-4">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-3xl font-black uppercase">
              {getInitials(visitor.firstName, visitor.lastName)}
            </div>
            <div>
              <h3 className="text-2xl font-black text-white leading-tight">{visitor.firstName} {visitor.lastName}</h3>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mt-2",
                visitor.status === VisitorStatus.EN_ATTENTE ? "bg-amber-400 text-amber-900" :
                (visitor.status === VisitorStatus.CONTACT_1 || visitor.status === VisitorStatus.RENCONTRE) ? "bg-blue-400 text-blue-900" :
                "bg-emerald-400 text-emerald-900"
              )}>
                {visitor.status}
              </span>
            </div>
          </div>
        </div>

        {/* Action Quick Bar */}
        <div className="px-10 py-6 flex gap-3 border-b border-slate-50 shrink-0">
          <a href={`tel:${visitor.phone}`} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all">
            <Phone size={14} /> Appeler
          </a>
          <button onClick={() => handleWhatsApp()} className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 border border-emerald-100 transition-all">
            <MessageCircle size={20} />
          </button>
          <button onClick={() => onEdit(visitor)} className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 border border-slate-100 transition-all">
            <Edit size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
          
          {/* Section: Parrainage */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500" /> Accompagnement Spirituel
            </h4>
            
            {parrain ? (
              <div className="bg-white p-6 rounded-[2.5rem] border border-emerald-100 shadow-sm space-y-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform">
                  <ShieldCheck size={60} className="text-emerald-600" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-black uppercase overflow-hidden">
                      {parrain.photoUrl ? (
                        <img src={parrain.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(parrain.firstName, parrain.lastName)
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parrain désigné</p>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{parrain.firstName} {parrain.lastName}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleWhatsApp(parrain.phone || parrain.whatsappPhone, `Bonjour ${parrain.firstName}, je te contacte au sujet du suivi de ${visitor.firstName} ${visitor.lastName} dont tu es le parrain.`)}
                    className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    title="Contacter le parrain"
                  >
                    <MessageCircle size={18} />
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Période d'immersion (90j)</span>
                    <span className="text-emerald-600">{accompanimentProgress.daysLeft} jours restants</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000" 
                      style={{ width: `${accompanimentProgress.percent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => onEdit(visitor)}
                className="w-full flex flex-col items-center justify-center gap-3 py-8 bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem] group hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 text-slate-300 flex items-center justify-center group-hover:scale-110 group-hover:text-emerald-500 group-hover:shadow-lg transition-all">
                  <UserPlus size={24} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-emerald-600">Désigner un parrain</span>
              </button>
            )}
          </div>

          {/* Qualification Badges */}
          {activeQualifications.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={14} className="text-indigo-600" /> Profil qualifié
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeQualifications.map(q => (
                  <span key={q.id} className={cn("px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase flex items-center gap-2", q.color)}>
                    {q.icon} {q.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Section - Welcome Assistant */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span role="img" aria-label="sparkles">✨</span> Assistant Premier Contact
                </h4>
             </div>
             
             {!welcomeMessage ? (
                <button 
                  onClick={handleGenerateWelcome}
                  disabled={isGeneratingMessage}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-white border-2 border-dashed border-indigo-200 text-indigo-600 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:border-indigo-300 transition-all disabled:opacity-50"
                >
                  {isGeneratingMessage ? <Loader2 size={16} className="animate-spin" /> : <MessageSquareText size={16} />}
                  {isGeneratingMessage ? 'Rédaction pastorale...' : 'Générer message de bienvenue'}
                </button>
             ) : (
                <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-[2.5rem] animate-in zoom-in-95 duration-300 space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform">
                    <Sparkles size={60} className="text-indigo-600" />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[8px] font-black uppercase">Brouillon IA</span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed italic">
                    {welcomeMessage}
                  </p>
                  <div className="pt-4 border-t border-indigo-100 flex gap-2">
                     <button 
                      onClick={handleCopyMessage}
                      className="flex-1 py-2.5 bg-white border border-indigo-200 text-indigo-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all"
                     >
                       {hasCopied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
                       {hasCopied ? 'Copié !' : 'Copier'}
                     </button>
                     <button 
                      onClick={() => handleWhatsApp(undefined, welcomeMessage)}
                      className="flex-[2] py-2.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
                     >
                       <MessageCircle size={14} /> Envoyer WhatsApp
                     </button>
                     <button onClick={() => setWelcomeMessage(null)} className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors">
                        <Trash2 size={16} />
                     </button>
                  </div>
                </div>
             )}

             <button 
                onClick={handleGetAiSuggestion}
                disabled={isSuggesting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Suggérer actions de suivi
              </button>

              {aiSuggestion && (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-indigo-600" />
                    <h5 className="text-[10px] font-black text-slate-500 uppercase">Conseils Gemini</h5>
                  </div>
                  <p className="text-sm text-slate-600 italic leading-relaxed whitespace-pre-wrap">{aiSuggestion}</p>
                </div>
              )}
          </div>

          {/* Main Info Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Première visite</p>
              <p className="text-sm font-bold text-slate-800">{new Date(visitor.visitDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Service</p>
              <p className="text-sm font-bold text-slate-800">{visitor.service}</p>
            </div>
            <div className="space-y-1 text-indigo-700">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Téléphone</p>
              <p className="text-sm font-bold flex items-center gap-1.5"><Phone size={12} /> {visitor.phone ? formatPhone(visitor.phone) : '---'}</p>
            </div>
            <div className="space-y-1 text-emerald-700">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</p>
              <p className="text-sm font-bold flex items-center gap-1.5"><MessageCircle size={12} /> {visitor.whatsappPhone ? formatPhone(visitor.whatsappPhone) : (visitor.phone ? formatPhone(visitor.phone) : '---')}</p>
            </div>
            <div className="col-span-2 space-y-1 pt-2 border-t border-slate-200/50">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notes de visite</p>
              <p className="text-sm font-medium text-slate-700 italic leading-relaxed">"{visitor.notes || 'Aucune note'}"</p>
            </div>
          </div>

          {/* History Timeline */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <History size={14} /> Historique du suivi
            </h4>
            
            <div className="relative space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {visitor.followUpHistory?.length ? (
                visitor.followUpHistory.map((entry) => (
                  <div key={entry.id} className="relative pl-8">
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center z-10 shadow-sm">
                      <Clock size={10} className="text-indigo-600" />
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{entry.type}</span>
                        <span className="text-[9px] font-bold text-slate-400">{new Date(entry.date).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium">{entry.note}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs font-bold text-slate-400 italic">Aucun historique de suivi.</p>
                </div>
              )}
            </div>

            {/* Add Entry Form */}
            <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 space-y-4">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Plus size={14} /> Nouvelle interaction
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <select 
                  value={newEntry.type}
                  onChange={(e) => setNewEntry({...newEntry, type: e.target.value as FollowUpEntry['type']})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option>Appel</option>
                  <option>Visite</option>
                  <option>Message</option>
                  <option>Rencontre</option>
                </select>
                <input 
                  type="date" 
                  value={newEntry.nextStepDate}
                  onChange={(e) => setNewEntry({...newEntry, nextStepDate: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
              <textarea 
                rows={3}
                placeholder="Notes de l'échange..."
                value={newEntry.note}
                onChange={(e) => setNewEntry({...newEntry, note: e.target.value})}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium resize-none focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
              />
              <button 
                onClick={handleAddEntry}
                disabled={!newEntry.note.trim()}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send size={14} /> Enregistrer le suivi
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-50 bg-slate-50/30 flex flex-wrap gap-3 shrink-0">
          {visitor.status !== VisitorStatus.MEMBRE && onConvertToMember && (
            <button 
              onClick={() => onConvertToMember(visitor)}
              className="w-full mb-1 py-4 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all active:scale-95"
            >
              <UserCheck size={20} /> Convertir en Membre
            </button>
          )}
          <button 
            onClick={() => onEdit(visitor)}
            className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <Edit size={16} /> Modifier
          </button>
          <button 
            onClick={() => onDelete(visitor.id)}
            className="px-6 py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisitorDetails;