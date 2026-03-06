import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, Mic2, Music, Users, Church,
  BookMarked, Quote, Copy, Check, Share2, Sparkles, Loader2,
  Globe, Youtube, Facebook, Headphones, ExternalLink, Printer,
  Edit, Trash2, Info, MessageSquareText, BrainCircuit, Send,
  CheckCircle2, AlertTriangle, Tags
} from 'lucide-react';
import { getChurchServices, updateChurchService, deleteChurchService } from '../lib/db';
import { analyzeSermon, generateSocialSummary, suggestSermonTags } from '../lib/gemini';
import { ChurchService } from '../types';
import { cn } from '../utils';
import { usePermissions } from '../context/PermissionsContext';

const THEME_MAX_LENGTH = 80;

const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canDelete } = usePermissions();

  const [service, setService] = useState<ChurchService | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isThemeExpanded, setIsThemeExpanded] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasCopiedSocial, setHasCopiedSocial] = useState(false);
  const [isAnalyzingSermon, setIsAnalyzingSermon] = useState(false);
  const [isGeneratingSocial, setIsGeneratingSocial] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    getChurchServices().then(services => {
      const found = services.find(s => s.id === id) ?? null;
      setService(found);
      setNotFound(!found);
      setLoading(false);
    });
  }, [id]);

  const handleRunAiAnalysis = async () => {
    if (!service?.content) return;
    setIsAnalyzingSermon(true);
    const analysis = await analyzeSermon(service.theme, service.content);
    if (analysis) {
      const updated = { ...service, aiAnalysis: analysis };
      setService(updated);
      await updateChurchService(service.id, { aiAnalysis: analysis });
    }
    setIsAnalyzingSermon(false);
  };

  const handleGenerateSocial = async () => {
    if (!service?.content) return;
    setIsGeneratingSocial(true);
    const summary = await generateSocialSummary(service.theme, service.content);
    if (summary) {
      const updated = { ...service, socialSummary: summary };
      setService(updated);
      await updateChurchService(service.id, { socialSummary: summary });
    }
    setIsGeneratingSocial(false);
  };

  const handleSuggestTags = async () => {
    if (!service?.content) return;
    setIsSuggestingTags(true);
    const tags = await suggestSermonTags(service.content);
    if (tags) {
      const updated = { ...service, tags };
      setService(updated);
      await updateChurchService(service.id, { tags });
    }
    setIsSuggestingTags(false);
  };

  const handleCopySermon = () => {
    if (!service?.content) return;
    navigator.clipboard.writeText(service.content);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleCopySocial = () => {
    if (!service?.socialSummary) return;
    navigator.clipboard.writeText(service.socialSummary);
    setHasCopiedSocial(true);
    setTimeout(() => setHasCopiedSocial(false), 2000);
  };

  const handleWhatsApp = (text?: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text || '')}`, '_blank');
  };

  const confirmDelete = async () => {
    if (!service) return;
    await deleteChurchService(service.id);
    navigate('/services');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-400 opacity-60" />
      </div>
    );
  }

  if (notFound || !service) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 opacity-40">
        <AlertTriangle size={48} />
        <p className="text-sm font-medium">Service introuvable</p>
        <button onClick={() => navigate('/services')} className="text-xs text-indigo-600 underline">Retour</button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10 space-y-0 print:space-y-0">

      {/* ── Barre de navigation ── */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <button
          onClick={() => navigate('/services')}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-xs text-slate-400">Services</p>
          <h1 className="text-base font-semibold text-slate-900 leading-tight truncate max-w-xl">{service.theme}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
          >
            <Printer size={14} /> Imprimer
          </button>
          <button
            onClick={() => navigate('/services', { state: { editId: service.id } })}
            className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-medium hover:bg-indigo-100 transition-all flex items-center gap-2"
          >
            <Edit size={14} /> Modifier
          </button>
          {canDelete('services') && (
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="p-2.5 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-100 transition-all"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Header ── */}
      <div className="bg-slate-900 text-white rounded-2xl px-8 py-10 relative overflow-hidden print:rounded-none print:bg-white print:text-slate-900 print:border-b-2 print:border-slate-100">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none print:hidden"><Church size={220} /></div>
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none print:hidden"></div>

        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-medium shadow-lg">{service.serviceType}</span>
            {service.series && (
              <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium border border-white/10 print:text-indigo-600 print:bg-indigo-50">
                Série : {service.series}
              </span>
            )}
          </div>

          <h2 className="text-3xl font-bold leading-tight max-w-3xl print:text-slate-900 transition-all duration-300">
            {service.theme.length > THEME_MAX_LENGTH ? (
              <>
                <span className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsThemeExpanded(!isThemeExpanded)}>
                  {isThemeExpanded ? service.theme : service.theme.substring(0, THEME_MAX_LENGTH)}
                </span>
                {!isThemeExpanded && (
                  <button onClick={() => setIsThemeExpanded(true)} className="text-indigo-400 hover:text-indigo-300 ml-2 transition-colors">...</button>
                )}
                {isThemeExpanded && (
                  <button onClick={() => setIsThemeExpanded(false)} className="text-indigo-400 ml-2 text-xs font-medium">[Réduire]</button>
                )}
              </>
            ) : service.theme}
          </h2>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-white/8 px-3 py-1.5 rounded-xl border border-white/10">
              <Calendar size={13} className="text-indigo-400 shrink-0" />
              <span className="text-xs font-medium text-slate-200 print:text-slate-900">
                {new Date(service.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            {service.time && (
              <div className="flex items-center gap-2 bg-white/8 px-3 py-1.5 rounded-xl border border-white/10">
                <Clock size={13} className="text-indigo-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200 print:text-slate-900">{service.time}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-white/8 px-3 py-1.5 rounded-xl border border-white/10">
              <Mic2 size={13} className="text-indigo-400 shrink-0" />
              <span className="text-xs font-medium text-slate-200 print:text-slate-900">{service.speaker}</span>
            </div>
            {service.attendance && (
              <div className="flex items-center gap-2 bg-white/8 px-3 py-1.5 rounded-xl border border-white/10">
                <Users size={13} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200 print:text-slate-900">{service.attendance} fidèles</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Corps : 2 colonnes ── */}
      <div className="flex flex-col lg:flex-row gap-6 mt-6">

        {/* Colonne principale */}
        <div className="flex-1 space-y-6">

          {/* Fondement Biblique */}
          <div className="bg-indigo-600 p-7 rounded-2xl text-white shadow-lg shadow-indigo-100 relative overflow-hidden group print:border print:border-slate-200 print:bg-white print:text-slate-900">
            <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:rotate-12 transition-transform pointer-events-none"><Quote size={80} /></div>
            <div className="flex items-center gap-2 mb-3">
              <BookMarked size={13} className="text-indigo-200 print:text-indigo-600" />
              <h4 className="text-xs font-medium text-indigo-200 print:text-slate-500">Fondement Biblique</h4>
            </div>
            <p className="text-xl font-semibold italic leading-snug print:text-slate-900">"{service.scripture || 'Verset non spécifié'}"</p>
          </div>

          {/* Texte intégral */}
          <div className="bg-white p-8 lg:p-10 rounded-2xl border border-slate-100 shadow-sm relative group print:p-0 print:border-none print:shadow-none">
            <div className="absolute top-6 right-6 print:hidden">
              <button onClick={handleCopySermon} className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Copier le texte">
                {hasCopied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
              </button>
            </div>
            <div className="flex items-center gap-3 mb-8 print:hidden">
              <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
              <h4 className="text-xs font-medium text-slate-500">Texte intégral</h4>
            </div>
            <div className="text-slate-700 font-medium leading-[1.85] whitespace-pre-wrap text-base first-letter:text-5xl first-letter:font-semibold first-letter:text-indigo-600 first-letter:mr-3 first-letter:float-left print:text-base">
              {service.content}
            </div>
            {service.tags && service.tags.length > 0 && (
              <div className="mt-10 pt-6 border-t border-slate-50 flex flex-wrap gap-2 print:hidden">
                {service.tags.map(tag => (
                  <span key={tag} className="px-3 py-1.5 bg-slate-50 text-slate-500 rounded-xl text-xs font-medium border border-slate-100 hover:border-indigo-200 hover:text-indigo-600 transition-colors">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Barre latérale outils */}
        <div className="lg:w-80 xl:w-96 shrink-0 space-y-4 print:hidden">

          {/* Fiche du culte */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 flex items-center gap-2"><Info size={13} className="text-indigo-500" /> Fiche du culte</h4>
            <div className="space-y-2.5">
              {service.time && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 shrink-0"><Clock size={14} className="text-indigo-500" /></div>
                  <div><p className="text-xs text-slate-400">Heure</p><p className="text-xs font-semibold text-slate-700">{service.time}</p></div>
                </div>
              )}
              {service.moderator && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 shrink-0"><Users size={14} className="text-slate-500" /></div>
                  <div><p className="text-xs text-slate-400">Modérateur</p><p className="text-xs font-semibold text-slate-700">{service.moderator}</p></div>
                </div>
              )}
              {service.worshipLeader && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 shrink-0"><Music size={14} className="text-indigo-400" /></div>
                  <div><p className="text-xs text-slate-400">Louange</p><p className="text-xs font-semibold text-slate-700">{service.worshipLeader}</p></div>
                </div>
              )}
              {service.attendance && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 shrink-0"><Users size={14} className="text-emerald-500" /></div>
                  <div><p className="text-xs text-slate-400">Participation</p><p className="text-xs font-semibold text-emerald-600">{service.attendance} fidèles</p></div>
                </div>
              )}
            </div>
          </div>

          {/* Assistant Social */}
          <div className="bg-emerald-600 p-5 rounded-2xl text-white shadow-lg shadow-emerald-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 size={14} className="text-emerald-100" />
                <h4 className="text-xs font-medium text-emerald-100">Assistant Social</h4>
              </div>
              <button onClick={handleGenerateSocial} disabled={isGeneratingSocial} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                {isGeneratingSocial ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              </button>
            </div>
            {service.socialSummary ? (
              <div className="space-y-3 animate-in zoom-in-95">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl text-xs text-white font-medium leading-relaxed italic border border-white/20">"{service.socialSummary}"</div>
                <div className="flex gap-2">
                  <button onClick={handleCopySocial} className="flex-1 py-2.5 bg-white text-emerald-700 rounded-xl text-xs font-medium hover:bg-emerald-50 transition-all flex items-center justify-center gap-1.5 shadow-md">
                    {hasCopiedSocial ? <CheckCircle2 size={13} /> : <Copy size={13} />} Copier
                  </button>
                  <button onClick={() => handleWhatsApp(service.socialSummary)} className="p-2.5 bg-emerald-500 text-white rounded-xl border border-white/20 hover:bg-emerald-400">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-emerald-100 font-medium italic opacity-80 leading-relaxed">Générez un résumé social avec l'IA.</p>
            )}
          </div>

          {/* Analyse IA */}
          <div className="bg-white rounded-2xl border-2 border-indigo-50 p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none"><BrainCircuit size={80} className="text-indigo-600" /></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-600" />
                <h4 className="text-xs font-medium text-slate-500">Analyse de fond</h4>
              </div>
              {!service.aiAnalysis && (
                <button onClick={handleRunAiAnalysis} disabled={isAnalyzingSermon} className="px-3 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 transition-all disabled:opacity-50">
                  {isAnalyzingSermon ? <Loader2 size={12} className="animate-spin" /> : 'Analyser'}
                </button>
              )}
            </div>
            {service.aiAnalysis ? (
              <div className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-2">{service.aiAnalysis}</div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-200"><MessageSquareText size={20} /></div>
                <p className="text-xs text-slate-400 font-medium">Gemini peut extraire les points clés.</p>
              </div>
            )}
            {!service.tags?.length && !isSuggestingTags && (
              <button onClick={handleSuggestTags} className="w-full py-2 text-xs font-medium text-slate-300 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1.5">
                <Tags size={12} /> Extraire thématiques
              </button>
            )}
            {isSuggestingTags && (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" /> Extraction...
              </div>
            )}
          </div>

          {/* Replay & Multimédia */}
          {(service.youtubeLink || service.facebookLink || service.audioLink) && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm">
              <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2"><Globe size={13} className="text-indigo-500" /> Replay & Multimédia</h4>
              <div className="space-y-2">
                {service.youtubeLink && (
                  <a href={service.youtubeLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all group/link">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover/link:scale-110 transition-transform"><Youtube size={16} /></div>
                      <span className="text-xs font-medium">YouTube Live</span>
                    </div>
                    <ExternalLink size={12} className="opacity-40" />
                  </a>
                )}
                {service.facebookLink && (
                  <a href={service.facebookLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all group/link">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover/link:scale-110 transition-transform"><Facebook size={16} /></div>
                      <span className="text-xs font-medium">Facebook Watch</span>
                    </div>
                    <ExternalLink size={12} className="opacity-40" />
                  </a>
                )}
                {service.audioLink && (
                  <a href={service.audioLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all group/link">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover/link:scale-110 transition-transform"><Headphones size={16} /></div>
                      <span className="text-xs font-medium">Podcast Audio</span>
                    </div>
                    <ExternalLink size={12} className="opacity-40" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmation suppression ── */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 text-center border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50"><Trash2 size={40} /></div>
            <h3 className="text-2xl font-bold text-slate-900">Supprimer ?</h3>
            <p className="text-slate-500 mt-3 text-sm font-medium">Cette action est irréversible.</p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-xs font-medium shadow-xl hover:bg-rose-700 transition-all">Supprimer</button>
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-xs font-medium border border-slate-200 hover:bg-slate-100 transition-all">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceDetailPage;
