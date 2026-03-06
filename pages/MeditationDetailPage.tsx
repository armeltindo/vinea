import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookMarked, Calendar, Clock, Copy, FileText, Heart, HelpCircle,
  Leaf, Loader2, MessageCircle, Quote, Trash2
} from 'lucide-react';
import { getMeditations, updateMeditation, deleteMeditation } from '../lib/db';
import { cn } from '../utils';
import { usePermissions } from '../context/PermissionsContext';

const THEME_MAX_LENGTH = 60;

const formatToUIDate = (isoDate: string | undefined) => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
};

const MeditationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canDelete } = usePermissions();

  const [meditation, setMeditation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isThemeExpanded, setIsThemeExpanded] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMeditations().then(list => {
      const found = list.find((m: any) => m.id === id) ?? null;
      setMeditation(found);
      setNotFound(!found);
      setLoading(false);
      // Mark as read automatically
      if (found && !found.isRead) {
        updateMeditation(found.id, { isRead: true });
      }
    });
  }, [id]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      setScrollProgress((scrollTop / (scrollHeight - clientHeight)) * 100);
    }
  };

  const handleLike = () => {
    if (!meditation) return;
    const newLikes = meditation.likes + 1;
    setMeditation({ ...meditation, likes: newLikes });
    updateMeditation(meditation.id, { likes: newLikes });
  };

  const handleShareWhatsApp = () => {
    if (!meditation) return;
    const text = `📖 *VINEA DEVOTIONAL*\n*${meditation.title.toUpperCase()}*\n\n🕊️ *LA PAROLE*\n"${meditation.scripture}"\n\n💡 *RÉFLEXION*\n${meditation.excerpt}\n\n🙏 *ACTION*\n${meditation.questions}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const handleCopy = () => {
    if (!meditation) return;
    navigator.clipboard.writeText(meditation.excerpt);
    alert('Texte copié avec succès !');
  };

  const confirmDelete = async () => {
    if (!meditation) return;
    await deleteMeditation(meditation.id);
    navigate('/meditations');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (notFound || !meditation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500 font-medium">Méditation introuvable.</p>
        <button onClick={() => navigate('/meditations')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium">
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 pb-20">
      {/* Back button */}
      <div className="mb-6">
        <button onClick={() => navigate('/meditations')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all shadow-sm">
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-100 z-50">
        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* Majestic Header */}
      <div className="px-10 py-16 bg-slate-950 text-white rounded-2xl relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Leaf size={240} className="rotate-45 text-indigo-400" />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-medium shadow-lg shadow-indigo-900/40">
              Vinea Devotional
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-2 tracking-wide">
              <Calendar size={12} className="text-indigo-400" />
              {new Date(meditation.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-400 mb-2">Thème de l'étude</p>
            <h3 className="text-xl font-semibold leading-snug max-w-2xl drop-shadow-md text-white transition-all duration-300">
              {meditation.title.length > THEME_MAX_LENGTH ? (
                <>
                  <span className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsThemeExpanded(!isThemeExpanded)}>
                    {isThemeExpanded ? meditation.title : meditation.title.substring(0, THEME_MAX_LENGTH)}
                  </span>
                  {!isThemeExpanded && (
                    <button onClick={() => setIsThemeExpanded(true)} className="text-indigo-400 hover:text-indigo-300 ml-2 transition-colors inline-block focus:outline-none select-none">...</button>
                  )}
                  {isThemeExpanded && (
                    <button onClick={() => setIsThemeExpanded(false)} className="text-indigo-400 hover:text-indigo-300 ml-2 text-xs font-medium transition-colors inline-block focus:outline-none select-none align-middle">[Réduire]</button>
                  )}
                </>
              ) : (
                meditation.title || 'Étude biblique'
              )}
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-indigo-300">
            <Clock size={14} /> Temps de lecture : ~5 minutes
          </div>
        </div>
      </div>

      {/* Reading Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="space-y-16"
      >
        <div className="max-w-2xl mx-auto space-y-16">

          {/* I. LA PAROLE */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-0.5 w-8 bg-indigo-600"></div>
              <h4 className="text-xs font-medium text-slate-500">Versets de référence</h4>
            </div>
            <div className="p-10 bg-slate-50 border border-slate-200 rounded-2xl text-3xl font-serif italic text-slate-900 leading-relaxed text-center group shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                <Quote size={80} />
              </div>
              "{meditation.scripture || 'Verset non renseigné'}"
            </div>
          </div>

          {/* II. RÉFLEXION */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-0.5 w-8 bg-indigo-600"></div>
              <h4 className="text-xs font-medium text-slate-500">Résumé & Réflexion</h4>
            </div>
            <div className="text-xl text-slate-700 font-medium leading-[1.8] text-justify first-letter:text-6xl first-letter:font-semibold first-letter:text-indigo-600 first-letter:mr-3 first-letter:float-left whitespace-pre-wrap italic bg-gradient-to-b from-white to-slate-50/50 p-4 rounded-3xl">
              {meditation.excerpt || 'Contenu en attente de rédaction...'}
            </div>
          </div>

          {/* III. QUESTIONS */}
          {meditation.questions && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-0.5 w-8 bg-indigo-600"></div>
                <h4 className="text-xs font-medium text-slate-500">Questions de réflexion</h4>
              </div>
              <div className="bg-indigo-50/50 p-10 rounded-2xl border border-indigo-100/50 space-y-8 shadow-sm">
                <div className="space-y-6">
                  {meditation.questions.split('\n').filter((q: string) => q.trim()).map((q: string, idx: number) => (
                    <div key={idx} className="flex gap-5 group">
                      <span className="w-10 h-10 rounded-2xl bg-white border border-indigo-200 flex items-center justify-center shrink-0 text-sm font-semibold text-indigo-600 shadow-md transition-transform group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600">
                        {idx + 1}
                      </span>
                      <p className="text-lg italic font-medium text-slate-800 leading-relaxed group-hover:text-indigo-950 transition-colors pt-1">
                        {q.trim()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* IV. FOOTER ACTIONS */}
          <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 pb-20">
            <button
              onClick={handleLike}
              className="flex items-center gap-3 px-8 py-4 bg-rose-50 text-rose-600 rounded-[1.5rem] border border-rose-100 hover:bg-rose-100 transition-all shadow-sm active:scale-95 group"
            >
              <Heart size={20} className={cn(meditation.likes > 0 && 'fill-rose-500', 'group-hover:scale-110 transition-transform')} />
              <span className="text-xs font-medium">{meditation.likes} Likes</span>
            </button>

            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={handleShareWhatsApp}
                className="flex-1 md:flex-none flex items-center justify-center gap-3 px-10 py-5 bg-emerald-600 text-white rounded-[1.8rem] text-xs font-medium hover:bg-emerald-700 shadow-2xl shadow-emerald-200 transition-all active:scale-95"
              >
                <MessageCircle size={20} /> Diffuser sur WhatsApp
              </button>
              <button
                onClick={handleCopy}
                className="p-5 bg-slate-100 text-slate-500 rounded-[1.5rem] hover:bg-slate-200 transition-all shadow-sm active:scale-95"
                title="Copier le résumé"
              >
                <Copy size={20} />
              </button>
              {canDelete('meditations') && (
                <button
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="p-5 bg-rose-50 text-rose-600 rounded-[1.5rem] border border-rose-100 hover:bg-rose-100 transition-all shadow-sm active:scale-95"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 text-center border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900">Supprimer ?</h3>
            <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed italic">Cette action est définitive.</p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-xs font-medium shadow-xl hover:bg-rose-700 active:scale-95 transition-all">Confirmer</button>
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-xs font-medium border border-slate-200 hover:bg-slate-100 transition-all">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeditationDetailPage;
