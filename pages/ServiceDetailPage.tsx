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
    <div className="animate-in fade-in duration-500 pb-10 print:pb-0">

      {/* ── Back button ── */}
      <div className="mb-6 print:hidden">
        <button
          onClick={() => navigate('/services')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      {/* ── Hero Header ── */}
      <div className="relative px-8 py-14 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl overflow-hidden mb-8 print:rounded-none print:bg-white print:py-6">
        <div className="absolute top-0 right-0 p-6 opacity-[0.07] pointer-events-none print:hidden">
          <Church size={260} className="text-indigo-300" />
        </div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none print:hidden" />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Top row: badges + actions */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-semibold shadow-lg shadow-indigo-900/40">
                {service.serviceType}
              </span>
              {service.series && (
                <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium border border-white/10 text-white print:text-indigo-600 print:bg-indigo-50">
                  Série : {service.series}
                </span>
              )}
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 print:hidden shrink-0">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-medium transition-all border border-white/10"
              >
                <Printer size={13} /> Imprimer
              </button>
              <button
                onClick={() => navigate('/services', { state: { editId: service.id } })}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/30 hover:bg-indigo-500/40 rounded-xl text-white text-xs font-medium transition-all border border-indigo-400/20"
              >
                <Edit size={13} /> Modifier
              </button>
              {canDelete('services') && (
                <button
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 rounded-xl text-rose-300 text-xs font-medium transition-all border border-rose-400/20"
                >
                  <Trash2 size={13} /> Supprimer
                </button>
              )}
            </div>
          </div>

          {/* Theme title */}
          <div>
            <p className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wider">Thème du message</p>
            <h2 className="text-3xl font-bold leading-tight text-white max-w-3xl print:text-slate-900 transition-all duration-300">
              {service.theme.length > THEME_MAX_LENGTH ? (
                <>
                  <span className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsThemeExpanded(!isThemeExpanded)}>
                    {isThemeExpanded ? service.theme : service.theme.substring(0, THEME_MAX_LENGTH)}
                  </span>
                  {!isThemeExpanded && (
                    <button onClick={() => setIsThemeExpanded(true)} className="text-indigo-400 hover:text-indigo-300 ml-2 transition-colors">...</button>
                  )}
                  {isThemeExpanded && (
                    <button onClick={() => setIsThemeExpanded(false)} className="text-indigo-400 ml-2 text-sm font-medium">[Réduire]</button>
                  )}
                </>
              ) : service.theme}
            </h2>
          </div>

          {/* Metadata pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white/8 px-3 py-2 rounded-xl border border-white/10">
              <Calendar size={13} className="text-indigo-400 shrink-0" />
              <span className="text-xs font-medium text-slate-200">
                {new Date(service.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            {service.time && (
              <div className="flex items-center gap-2 bg-white/8 px-3 py-2 rounded-xl border border-white/10">
                <Clock size={13} className="text-indigo-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200">{service.time}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-white/8 px-3 py-2 rounded-xl border border-white/10">
              <Mic2 size={13} className="text-indigo-400 shrink-0" />
              <span className="text-xs font-medium text-slate-200">{service.speaker}</span>
            </div>
            {service.attendance && (
              <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-2 rounded-xl border border-emerald-400/20">
                <Users size={13} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-emerald-300">{service.attendance} fidèles</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {service.tags && service.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 print:hidden">
              {service.tags.map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-white/10 text-slate-300 rounded-lg text-xs font-medium border border-white/10">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Scripture ── */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-8 mb-8 relative overflow-hidden shadow-xl shadow-indigo-100 print:border print:border-slate-200 print:bg-white print:shadow-none">
        <div className="absolute -top-6 -right-6 opacity-10 pointer-events-none print:hidden">
          <Quote size={120} className="text-white" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <BookMarked size={14} className="text-indigo-200 print:text-indigo-600" />
            <h4 className="text-xs font-semibold text-indigo-200 uppercase tracking-wider print:text-slate-500">Fondement Biblique</h4>
          </div>
          <p className="text-2xl font-semibold italic leading-relaxed text-white print:text-slate-900">
            "{service.scripture || 'Verset non spécifié'}"
          </p>
        </div>
      </div>

      {/* ── Corps : 2 colonnes ── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Colonne principale */}
        <div className="flex-1 space-y-6">

          {/* Texte intégral */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm relative print:border-none print:shadow-none">
            <div className="flex items-center justify-between px-8 pt-8 pb-0 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Texte intégral du message</h4>
              </div>
              <button
                onClick={handleCopySermon}
                className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                title="Copier le texte"
              >
                {hasCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="px-8 py-8 print:p-0">
              <div className="text-slate-700 font-medium leading-[1.9] whitespace-pre-wrap text-base first-letter:text-5xl first-letter:font-semibold first-letter:text-indigo-600 first-letter:mr-3 first-letter:float-left">
                {service.content}
              </div>
            </div>
          </div>

        </div>

        {/* ── Barre latérale ── */}
        <div className="lg:w-80 xl:w-96 shrink-0 space-y-4 print:hidden">

          {/* Fiche du culte */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
              <Info size={13} className="text-indigo-500" />
              <h4 className="text-xs font-semibold text-slate-600">Fiche du culte</h4>
            </div>
            <div className="p-5 space-y-3">
              {service.moderator && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shrink-0">
                    <Users size={14} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Modérateur</p>
                    <p className="text-xs font-semibold text-slate-700">{service.moderator}</p>
                  </div>
                </div>
              )}
              {service.worshipLeader && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
                    <Music size={14} className="text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Louange</p>
                    <p className="text-xs font-semibold text-slate-700">{service.worshipLeader}</p>
                  </div>
                </div>
              )}
              {service.attendance && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
                    <Users size={14} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Participation</p>
                    <p className="text-xs font-semibold text-emerald-600">{service.attendance} fidèles</p>
                  </div>
                </div>
              )}
              {!service.moderator && !service.worshipLeader && !service.attendance && (
                <p className="text-xs text-slate-400 italic">Aucune information complémentaire.</p>
              )}
            </div>
          </div>

          {/* Assistant Social */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-100/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 size={14} className="text-emerald-200" />
                <h4 className="text-xs font-semibold text-emerald-100">Assistant Réseaux Sociaux</h4>
              </div>
              <button
                onClick={handleGenerateSocial}
                disabled={isGeneratingSocial}
                className="p-1.5 bg-white/15 hover:bg-white/25 rounded-xl transition-all"
                title="Générer avec l'IA"
              >
                {isGeneratingSocial ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              </button>
            </div>
            {service.socialSummary ? (
              <div className="space-y-3 animate-in zoom-in-95">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl text-xs text-white font-medium leading-relaxed italic border border-white/15">
                  "{service.socialSummary}"
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopySocial}
                    className="flex-1 py-2.5 bg-white text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-50 transition-all flex items-center justify-center gap-1.5 shadow-md"
                  >
                    {hasCopiedSocial ? <CheckCircle2 size={13} /> : <Copy size={13} />} Copier
                  </button>
                  <button
                    onClick={() => handleWhatsApp(service.socialSummary)}
                    className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl border border-white/20 transition-all"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-emerald-200 font-medium italic leading-relaxed">
                Générez un résumé prêt à publier avec l'IA.
              </p>
            )}
          </div>

          {/* Analyse IA */}
          <div className="bg-white rounded-2xl border border-indigo-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-indigo-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit size={14} className="text-indigo-500" />
                <h4 className="text-xs font-semibold text-slate-600">Analyse de fond — IA</h4>
              </div>
              {!service.aiAnalysis && (
                <button
                  onClick={handleRunAiAnalysis}
                  disabled={isAnalyzingSermon}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isAnalyzingSermon ? <><Loader2 size={11} className="animate-spin" /> Analyse...</> : <><Sparkles size={11} /> Analyser</>}
                </button>
              )}
            </div>
            <div className="p-5">
              {service.aiAnalysis ? (
                <div className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap animate-in fade-in">
                  {service.aiAnalysis}
                </div>
              ) : (
                <div className="text-center py-3 space-y-2">
                  <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-200">
                    <MessageSquareText size={20} />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">Gemini peut extraire les points clés du sermon.</p>
                </div>
              )}
              {!service.tags?.length && (
                <div className="mt-4 pt-4 border-t border-slate-50">
                  {isSuggestingTags ? (
                    <div className="flex items-center justify-center gap-2 py-1 text-xs text-slate-400">
                      <Loader2 size={11} className="animate-spin" /> Extraction des thèmes...
                    </div>
                  ) : (
                    <button
                      onClick={handleSuggestTags}
                      className="w-full py-2 text-xs font-medium text-slate-400 hover:text-indigo-500 transition-colors flex items-center justify-center gap-1.5 hover:bg-indigo-50 rounded-xl"
                    >
                      <Tags size={12} /> Extraire les thématiques
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Replay & Multimédia */}
          {(service.youtubeLink || service.facebookLink || service.audioLink) && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
                <Globe size={13} className="text-indigo-500" />
                <h4 className="text-xs font-semibold text-slate-600">Replay & Multimédia</h4>
              </div>
              <div className="p-5 space-y-2">
                {service.youtubeLink && (
                  <a href={service.youtubeLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all group/link">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover/link:scale-110 transition-transform"><Youtube size={16} /></div>
                      <span className="text-xs font-semibold">YouTube Live</span>
                    </div>
                    <ExternalLink size={12} className="opacity-40" />
                  </a>
                )}
                {service.facebookLink && (
                  <a href={service.facebookLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all group/link">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover/link:scale-110 transition-transform"><Facebook size={16} /></div>
                      <span className="text-xs font-semibold">Facebook Watch</span>
                    </div>
                    <ExternalLink size={12} className="opacity-40" />
                  </a>
                )}
                {service.audioLink && (
                  <a href={service.audioLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all group/link">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover/link:scale-110 transition-transform"><Headphones size={16} /></div>
                      <span className="text-xs font-semibold">Podcast Audio</span>
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
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
              <Trash2 size={40} />
            </div>
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
