import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, Copy, Heart,
  Leaf, Loader2, MessageCircle, Quote, Trash2
} from 'lucide-react';
import { getMeditations, updateMeditation, deleteMeditation } from '../lib/db';
import { cn } from '../utils';
import { usePermissions } from '../context/PermissionsContext';

const THEME_MAX_LENGTH = 60;

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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getMeditations().then(list => {
      const found = list.find((m: any) => m.id === id) ?? null;
      setMeditation(found);
      setNotFound(!found);
      setLoading(false);
      if (found && !found.isRead) {
        updateMeditation(found.id, { isRead: true });
      }
    });
  }, [id]);

  // Track window scroll for progress bar
  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLike = () => {
    if (!meditation) return;
    const newLikes = meditation.likes + 1;
    setMeditation({ ...meditation, likes: newLikes });
    updateMeditation(meditation.id, { likes: newLikes });
  };

  const handleShareWhatsApp = () => {
    if (!meditation) return;
    const text = `📖 *VINEA DEVOTIONAL*\n*${meditation.title.toUpperCase()}*\n\n🕊️ *LA PAROLE*\n"${meditation.scripture}"\n\n💡 *RÉFLEXION*\n${meditation.excerpt}\n\n🙏 *APPLICATION*\n${meditation.questions}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const handleCopy = () => {
    if (!meditation) return;
    navigator.clipboard.writeText(meditation.excerpt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmDelete = async () => {
    if (!meditation) return;
    await deleteMeditation(meditation.id);
    navigate('/meditations');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-indigo-400 opacity-60" />
      </div>
    );
  }

  if (notFound || !meditation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-40">
        <p className="text-sm font-medium">Méditation introuvable.</p>
        <button onClick={() => navigate('/meditations')} className="text-xs text-indigo-600 underline">Retour</button>
      </div>
    );
  }

  const questions = meditation.questions
    ? meditation.questions.split('\n').filter((q: string) => q.trim())
    : [];

  return (
    <div className="animate-in fade-in duration-300 pb-16">

      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 z-50 bg-slate-100/80">
        <div
          className="h-full bg-indigo-500 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/meditations')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      {/* Hero Header */}
      <div className="relative px-8 py-14 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-2xl overflow-hidden mb-10">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Leaf size={260} className="rotate-45 text-indigo-300" />
        </div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Top row: badge + date + actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-semibold shadow-lg shadow-indigo-900/40">
                Vinea Devotional
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Calendar size={11} className="text-indigo-400" />
                {new Date(meditation.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            {/* Inline actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-rose-300 text-xs font-semibold transition-all border border-white/10 group"
              >
                <Heart size={13} className={cn(meditation.likes > 0 && 'fill-rose-400', 'group-hover:scale-110 transition-transform')} />
                {meditation.likes}
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium transition-all border border-emerald-400/20"
              >
                <MessageCircle size={13} /> Partager
              </button>
              <button
                onClick={handleCopy}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all border border-white/10"
                title="Copier la réflexion"
              >
                <Copy size={13} />
              </button>
              {canDelete('meditations') && (
                <button
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="p-2 bg-rose-500/20 hover:bg-rose-500/30 rounded-xl text-rose-300 transition-all border border-rose-400/20"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <p className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wider">Thème de l'étude</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug max-w-3xl">
              {meditation.title.length > THEME_MAX_LENGTH ? (
                <>
                  <span className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsThemeExpanded(!isThemeExpanded)}>
                    {isThemeExpanded ? meditation.title : meditation.title.substring(0, THEME_MAX_LENGTH)}
                  </span>
                  {!isThemeExpanded && (
                    <button onClick={() => setIsThemeExpanded(true)} className="text-indigo-400 hover:text-indigo-300 ml-2 transition-colors focus:outline-none select-none">...</button>
                  )}
                  {isThemeExpanded && (
                    <button onClick={() => setIsThemeExpanded(false)} className="text-indigo-400 ml-2 text-sm font-medium focus:outline-none select-none">[Réduire]</button>
                  )}
                </>
              ) : meditation.title || 'Étude biblique'}
            </h1>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock size={12} className="text-indigo-400" /> ~5 min de lecture
            </span>
            {meditation.likes > 0 && (
              <span className="flex items-center gap-1.5">
                <Heart size={12} className="text-rose-400 fill-rose-400" /> {meditation.likes} j'aime
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reading content */}
      <div className="max-w-3xl mx-auto space-y-14">

        {/* I — LA PAROLE */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-0.5 w-8 bg-indigo-600 rounded-full shrink-0" />
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">I — La Parole</h4>
          </div>
          <div className="relative bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center overflow-hidden group shadow-inner">
            <div className="absolute top-0 right-0 p-6 opacity-[0.04] pointer-events-none group-hover:scale-110 transition-transform">
              <Quote size={100} />
            </div>
            <p className="text-3xl font-serif italic text-slate-800 leading-relaxed relative z-10">
              "{meditation.scripture || 'Verset non renseigné'}"
            </p>
          </div>
        </div>

        {/* II — RÉFLEXION */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-0.5 w-8 bg-indigo-600 rounded-full shrink-0" />
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">II — Réflexion</h4>
          </div>
          <div className="bg-gradient-to-b from-white to-slate-50/60 border border-slate-100 rounded-3xl px-8 py-10 shadow-sm">
            <div className="text-xl text-slate-700 font-medium leading-[1.9] text-justify first-letter:text-6xl first-letter:font-semibold first-letter:text-indigo-600 first-letter:mr-3 first-letter:float-left whitespace-pre-wrap italic">
              {meditation.excerpt || 'Contenu en attente de rédaction...'}
            </div>
          </div>
        </div>

        {/* III — APPLICATION */}
        {questions.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-0.5 w-8 bg-indigo-600 rounded-full shrink-0" />
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">III — Application</h4>
            </div>
            <div className="bg-gradient-to-br from-indigo-50/80 to-slate-50 border border-indigo-100/60 rounded-2xl p-8 space-y-6 shadow-sm">
              {questions.map((q: string, idx: number) => (
                <div key={idx} className="flex gap-5 group">
                  <span className="w-10 h-10 rounded-2xl bg-white border border-indigo-200 flex items-center justify-center shrink-0 text-sm font-bold text-indigo-600 shadow-md transition-all group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600">
                    {idx + 1}
                  </span>
                  <p className="text-base italic font-medium text-slate-700 leading-relaxed group-hover:text-indigo-900 transition-colors pt-2.5">
                    {q.trim()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-8 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={handleLike}
            className="flex items-center gap-2.5 px-6 py-3.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 hover:bg-rose-100 transition-all shadow-sm active:scale-95 group text-xs font-semibold"
          >
            <Heart size={18} className={cn(meditation.likes > 0 && 'fill-rose-500', 'group-hover:scale-110 transition-transform')} />
            {meditation.likes} J'aime
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl text-xs font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95"
            >
              <MessageCircle size={16} /> Diffuser sur WhatsApp
            </button>
            <button
              onClick={handleCopy}
              className={cn(
                "p-3.5 rounded-2xl transition-all shadow-sm active:scale-95 text-xs font-semibold flex items-center gap-2",
                copied
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
              title="Copier la réflexion"
            >
              <Copy size={16} />
              {copied && <span>Copié</span>}
            </button>
            {canDelete('meditations') && (
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 hover:bg-rose-100 transition-all shadow-sm active:scale-95"
              >
                <Trash2 size={16} />
              </button>
            )}
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
