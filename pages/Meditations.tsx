import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import { 
  BookOpen, 
  Sparkles, 
  Calendar, 
  ChevronRight, 
  Plus, 
  Search,
  Heart, 
  Share2, 
  Clock, 
  Languages, 
  Loader2, 
  X, 
  Save, 
  Send, 
  Trash2, 
  BookMarked, 
  Quote, 
  ArrowLeft, 
  Copy, 
  Check, 
  TrendingUp, 
  Download, 
  ArrowUpFromLine, 
  CheckCircle2, 
  Info, 
  HelpCircle, 
  Eye, 
  Timer, 
  CheckCircle, 
  History as HistoryIcon, 
  Leaf, 
  ScrollText, 
  Lightbulb, 
  PenTool, 
  FileSpreadsheet,
  Upload,
  MessageCircle,
  Hash,
  ListChecks,
  FileText,
  MessageSquare,
  Maximize2
} from 'lucide-react';
import { analyzePageData, generateMeditation, suggestMeditationTitle, suggestMeditationSummary } from '../lib/gemini';
import { cn, generateId, formatFirstName } from '../utils';
import { getMeditations, createMeditation, updateMeditation, deleteMeditation } from '../lib/db';

const formatToUIDate = (isoDate: string | undefined) => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
};

const parseFromUIDate = (uiDate: string | undefined) => {
  if (!uiDate || !uiDate.includes('-')) return '';
  const parts = uiDate.split('-');
  if (parts.length !== 3) return '';
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

// Fonction de parsing CSV robuste gérant les retours à la ligne dans les cellules
const parseCSV = (text: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentField += '"';
      i++; // Skip double quote
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ';' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentField = '';
        currentRow = [];
      }
      if (char === '\r' && nextChar === '\n') i++; // Handle CRLF
    } else {
      currentField += char;
    }
  }
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }
  return rows;
};

const Meditations: React.FC = () => {
  const navigate = useNavigate();
  const [meditations, setMeditations] = useState<any[]>([]);

  useEffect(() => {
    getMeditations().then(m => {
      setMeditations(m);
      const detailId = new URLSearchParams(window.location.search).get('detail');
      if (detailId) {
        const found = m.find((x: any) => x.id === detailId);
        if (found) { setReadingMeditation(found); setIsThemeExpandedDetail(false); }
      }
    });
  }, []);

  const currentYearStr = new Date().getFullYear().toString();
  const [searchTerm, setSearchTerm] = useState('');
  const [statsPeriod, setStatsPeriod] = useState(currentYearStr);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatingMap, setGeneratingMap] = useState<Record<string, boolean>>({});
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportSuccessOpen, setIsImportSuccessOpen] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [readingMeditation, setReadingMeditation] = useState<any>(null);
  const [isThemeExpandedDetail, setIsThemeExpandedDetail] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [meditationToDeleteId, setMeditationToDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    scripture: '',
    questions: '',
    date: new Date().toISOString().split('T')[0],
    excerpt: ''
  });


  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(progress);
    }
  };

  const availableYears = useMemo(() => {
    const years = meditations.map(m => new Date(m.date).getFullYear().toString());
    if (!years.includes(currentYearStr)) years.push(currentYearStr);
    return Array.from<string>(new Set(years)).sort((a, b) => b.localeCompare(a));
  }, [meditations, currentYearStr]);

  const handleQuickRepair = async (id: string, field: 'title' | 'excerpt') => {
    const med = meditations.find(m => m.id === id);
    if (!med) return;
    const key = `${id}-${field}`;
    setGeneratingMap(prev => ({ ...prev, [key]: true }));
    try {
      let result = '';
      if (field === 'title') result = await suggestMeditationTitle(med.scripture, med.questions) || '';
      else result = await suggestMeditationSummary(med.scripture, med.questions) || '';
      if (result) {
        setMeditations(prev => prev.map(m => m.id === id ? { ...m, [field]: result } : m));
        await updateMeditation(id, { [field]: result });
      }
    } finally {
      setGeneratingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  const stats = useMemo(() => {
    const filteredForStats = meditations.filter(m => {
      if (statsPeriod === 'all') return true;
      return new Date(m.date).getFullYear().toString() === statsPeriod;
    });
    const totalArchives = filteredForStats.length;
    const totalLikes = filteredForStats.reduce((sum, m) => sum + m.likes, 0);
    const readCount = filteredForStats.filter(m => m.isRead).length;
    const readRate = totalArchives > 0 ? Math.round((readCount / totalArchives) * 100) : 0;
    return { totalArchives, totalLikes, readRate, periodLabel: statsPeriod === 'all' ? 'Toutes' : `Année ${statsPeriod}` };
  }, [meditations, statsPeriod]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzePageData("Méditations Quotidiennes", { 
      total: stats.totalArchives, engagement: stats.totalLikes, periode: stats.periodLabel
    });
    setAnalysis(result || null);
    setIsAnalyzing(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() && !formData.scripture.trim()) {
      setErrors({ title: "Requis", scripture: "Requis" });
      return;
    }
    setIsSubmitting(true);
    const newMed = { ...formData, id: generateId(), likes: 0, isRead: false };
    setMeditations([newMed, ...meditations]);
    await createMeditation(newMed);
    setIsFormOpen(false);
    setIsSubmitting(false);
    setFormData({ title: '', scripture: '', questions: '', date: new Date().toISOString().split('T')[0], excerpt: '' });
  };

  const filteredMeditations = useMemo(() => {
    return meditations.filter(m => {
      const mYear = new Date(m.date).getFullYear().toString();
      if (statsPeriod !== 'all' && mYear !== statsPeriod) return false;
      return m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
             (m.excerpt || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
             m.scripture.toLowerCase().includes(searchTerm.toLowerCase());
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [meditations, searchTerm, statsPeriod]);

  const handleDownloadTemplate = () => {
    const csvContent = "\ufeffDate;Versets;Questions;Thème;Résumé";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vinea_modele_meditations.csv`;
    link.click();
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Versets', 'Questions', 'Thème', 'Résumé'];
    const rows = filteredMeditations.map(m => [
      formatToUIDate(m.date),
      `"${(m.scripture || '').replace(/"/g, '""')}"`,
      `"${(m.questions || '').replace(/"/g, '""')}"`,
      `"${(m.title || '').replace(/"/g, '""')}"`,
      `"${(m.excerpt || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "\ufeff" + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vinea_meditations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const allData = parseCSV(content);
        const imported = [];
        
        for (let i = 1; i < allData.length; i++) {
          const v = allData[i];
          if (!v || v.length < 2) continue;
          
          imported.push({ 
            id: generateId(), 
            date: parseFromUIDate(v[0]), 
            scripture: v[1] || '', 
            questions: v[2] || '', 
            title: v[3] || '', 
            excerpt: v[4] || '', 
            likes: 0, 
            isRead: false 
          });
        }
        
        setMeditations(prev => [...imported, ...prev]);
        imported.forEach((m: any) => createMeditation(m));
        setImportCount(imported.length);
        setIsImportSuccessOpen(true);
        setIsImportModalOpen(false);
      } catch (err) { 
        alert("Erreur lors de l'lecture du fichier CSV. Vérifiez que le format est correct."); 
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmDeleteMeditation = async () => {
    if (meditationToDeleteId) {
      setMeditations(prev => prev.filter(m => m.id !== meditationToDeleteId));
      setIsDeleteConfirmOpen(false);
      setReadingMeditation(null);
      navigate('', { replace: true });
      await deleteMeditation(meditationToDeleteId);
      setMeditationToDeleteId(null);
    }
  };

  const THEME_MAX_LENGTH = 60;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-slate-900">Méditations Quotidiennes</h2><p className="text-sm text-slate-500 font-medium italic">Vinea : Édifiez votre assemblée.</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleAnalyze} disabled={isAnalyzing} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-medium shadow-sm transition-all hover:bg-indigo-100"><Sparkles size={16} /> {isAnalyzing ? '...' : 'Analyse Thématique'}</button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 transition-all hover:bg-slate-50 shadow-sm"><Download size={18} /> Exporter</button>
          <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 transition-all hover:bg-slate-50 shadow-sm"><ArrowUpFromLine size={18} /> Importer</button>
          <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700 shadow-lg"><Plus size={18} /> Créer</button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit overflow-x-auto max-w-full no-scrollbar">
          <button onClick={() => setStatsPeriod('all')} className={cn("px-5 py-2 rounded-xl text-xs font-medium transition-all", statsPeriod === 'all' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>Toutes</button>
          {availableYears.map(year => (
            <button key={year} onClick={() => setStatsPeriod(year)} className={cn("px-5 py-2 rounded-xl text-xs font-medium transition-all", statsPeriod === year ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>{year}</button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500"><HistoryIcon size={14} className="text-indigo-400" /> Période : <span className="text-indigo-600">{stats.periodLabel}</span></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="Archives" subtitle="Messages" icon={<BookOpen size={20} className="text-indigo-600" />}><div className="flex items-end justify-between"><span className="text-3xl font-bold text-slate-900">{stats.totalArchives}</span><span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">Total</span></div></Card>
        <Card title="Impact" subtitle="Likes" icon={<Heart size={20} className="text-rose-600" />}><div className="flex items-end justify-between"><span className="text-3xl font-bold text-rose-600">{stats.totalLikes}</span><TrendingUp size={20} className="text-rose-500 mb-1" /></div></Card>
        <Card title="Fidélité" subtitle="Lecture" icon={<Eye size={20} className="text-emerald-600" />}><div className="flex items-end justify-between"><span className="text-3xl font-bold text-emerald-600">{stats.readRate}%</span><CheckCircle2 size={20} className="text-emerald-600" /></div></Card>
      </div>

      <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />

      <div className="relative group"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Rechercher par thème, verset ou contenu..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold transition-all shadow-sm focus:border-indigo-300" /></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredMeditations.length > 0 ? filteredMeditations.map((med) => (
          <div key={med.id} onClick={() => { setReadingMeditation(med); setIsThemeExpandedDetail(false); navigate(`?detail=${med.id}`, { replace: true }); if(!med.isRead) { setMeditations(prev => prev.map(m => m.id === med.id ? {...m, isRead: true} : m)); updateMeditation(med.id, { isRead: true }); } }} className={cn("group relative flex flex-col bg-white border-2 rounded-2xl shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden min-h-[480px]", med.isRead ? "border-emerald-100" : "border-slate-100 hover:border-indigo-400")}>
            <div className={cn("h-1.5 w-full", med.isRead ? "bg-emerald-500" : "bg-slate-100 group-hover:bg-indigo-500")} />
            <div className="p-8 flex flex-col h-full space-y-6">
              <div className="flex justify-between items-start">
                <span className="px-4 py-1.5 bg-slate-50 text-slate-500 rounded-2xl text-xs font-medium border border-slate-100">
                  {formatToUIDate(med.date)}
                </span>
                <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { const newVal = !med.isRead; setMeditations(prev => prev.map(m => m.id === med.id ? {...m, isRead: newVal} : m)); updateMeditation(med.id, { isRead: newVal }); }} className={cn("p-2 rounded-xl shadow-sm", med.isRead ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-50 hover:text-indigo-600")}>
                    {med.isRead ? <CheckCircle size={16} strokeWidth={2.5} /> : <Eye size={16} />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setMeditationToDeleteId(med.id); setIsDeleteConfirmOpen(true); }} className="p-2 text-slate-300 bg-slate-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-5">
                {/* THÈME */}
                <div>
                  {!med.title || med.title === "Thème suggéré" ? (
                    <button onClick={(e) => { e.stopPropagation(); handleQuickRepair(med.id, 'title'); }} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-700 border border-dashed border-indigo-300 rounded-2xl text-xs font-medium hover:bg-indigo-100 transition-all">
                      {generatingMap[`${med.id}-title`] ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Générer Thème
                    </button>
                  ) : (
                    <h4 className="text-xl font-semibold text-slate-900 group-hover:text-indigo-600 transition-colorser leading-tight">
                      {med.title}
                    </h4>
                  )}
                </div>

                {/* VERSETS */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50/50 border border-indigo-100 rounded-xl w-full">
                  <BookMarked size={14} className="text-indigo-500 shrink-0" />
                  <p className="text-xs font-semibold text-indigo-600 italic truncate">
                    {med.scripture || "Versets non spécifiés"}
                  </p>
                </div>

                {/* RÉSUMÉ */}
                <div className="space-y-2">
                   <div className="flex items-center gap-2">
                      <FileText size={12} className="text-indigo-400" />
                      <h5 className="text-xs font-medium text-slate-500">La Pensée</h5>
                   </div>
                   {!med.excerpt ? (
                     <button onClick={(e) => { e.stopPropagation(); handleQuickRepair(med.id, 'excerpt'); }} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-700 border border-dashed border-indigo-300 rounded-2xl text-xs font-medium hover:bg-indigo-100 transition-all">
                       {generatingMap[`${med.id}-excerpt`] ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Générer résumé
                     </button>
                   ) : (
                     <div className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                        {med.excerpt}
                     </div>
                   )}
                </div>

                {/* QUESTIONS */}
                <div className="space-y-2">
                   <div className="flex items-center gap-2">
                      <HelpCircle size={12} className="text-amber-500" />
                      <h5 className="text-xs font-medium text-slate-500">Réflexion</h5>
                   </div>
                   <div className="text-xs text-slate-500 font-bold italic line-clamp-3 pl-3 border-l-2 border-amber-200 flex flex-col space-y-1">
                      {med.questions ? (
                        med.questions.split('\n').filter(q => q.trim()).slice(0, 3).map((q, idx) => (
                          <div key={idx} className="truncate">• {q.trim()}</div>
                        ))
                      ) : (
                        "Aucune question de réflexion."
                      )}
                   </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-auto">
                <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                  <Clock size={12} /><span>5 min lecture</span>
                </div>
                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { const newLikes = med.likes + 1; setMeditations(prev => prev.map(m => m.id === med.id ? {...m, likes: newLikes} : m)); updateMeditation(med.id, { likes: newLikes }); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl text-slate-400 hover:text-rose-500 transition-all group/like shadow-sm border border-slate-100">
                    <Heart size={14} className={cn(med.likes > 0 && "fill-rose-500 text-rose-500")} />
                    <span className="text-xs font-semibold">{med.likes}</span>
                  </button>
                  <div className="p-2 text-slate-300 hover:text-indigo-600 bg-slate-50 rounded-xl shadow-sm border border-slate-100 transition-all">
                    <Share2 size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-24 text-center bg-white border border-dashed border-slate-200 rounded-2xl opacity-30">
            <Quote size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-sm text-slate-400 italic tracking-wide">Aucune méditation au registre.</p>
          </div>
        )}
      </div>

      {readingMeditation && (
        <div className="fixed inset-0 z-[150] overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500" onClick={() => { setReadingMeditation(null); navigate('', { replace: true }); }} />
          <div className="relative w-full max-w-4xl bg-white shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col rounded-2xl overflow-hidden max-h-[90vh]">
            
            {/* Reading Progress Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 z-[160] rounded-t-[3rem]">
              <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${scrollProgress}%` }} />
            </div>

            {/* Majestic Header */}
            <div className="px-10 py-16 bg-slate-950 text-white shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Leaf size={240} className="rotate-45 text-indigo-400" />
              </div>
              <button 
                onClick={() => { setReadingMeditation(null); navigate('', { replace: true }); }}
                className="absolute top-8 left-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md z-10 transition-all hover:scale-110 active:scale-95"
              >
                <ArrowLeft size={20} />
              </button>
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-medium shadow-lg shadow-indigo-900/40">
                    Vinea Devotional
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-2 tracking-wide">
                    <Calendar size={12} className="text-indigo-400" />
                    Date : {new Date(readingMeditation.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-indigo-400 mb-2">Thème de l'étude</p>
                  <h3 className="text-xl font-semibold leading-snug max-w-2xl drop-shadow-md text-white transition-all duration-300">
                    {readingMeditation.title.length > THEME_MAX_LENGTH ? (
                      <>
                        <span 
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setIsThemeExpandedDetail(!isThemeExpandedDetail)}
                        >
                          {isThemeExpandedDetail ? readingMeditation.title : readingMeditation.title.substring(0, THEME_MAX_LENGTH)}
                        </span>
                        {!isThemeExpandedDetail && (
                          <button 
                            onClick={() => setIsThemeExpandedDetail(true)}
                            className="text-indigo-400 hover:text-indigo-300 ml-2 transition-colors inline-block focus:outline-none select-none"
                            title="Afficher tout le thème"
                          >
                            ...
                          </button>
                        )}
                        {isThemeExpandedDetail && (
                          <button 
                            onClick={() => setIsThemeExpandedDetail(false)}
                            className="text-indigo-400 hover:text-indigo-300 ml-2 text-xs font-medium transition-colors inline-block focus:outline-none select-none align-middle"
                            title="Réduire"
                          >
                            [Réduire]
                          </button>
                        )}
                      </>
                    ) : (
                      readingMeditation.title || "Étude biblique"
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
              className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white space-y-16"
            >
              <div className="max-w-2xl mx-auto space-y-16">
                
                {/* I. LA PAROLE (Versets) */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="h-0.5 w-8 bg-indigo-600"></div>
                     <h4 className="text-xs font-medium text-slate-500">Versets de référence</h4>
                  </div>
                  <div className="p-10 bg-slate-50 border border-slate-200 rounded-2xl text-3xl font-serif italic text-slate-900 leading-relaxed text-center group shadow-inner relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                        <Quote size={80} />
                     </div>
                     "{readingMeditation.scripture || "Verset non renseigné"}"
                  </div>
                </div>

                {/* II. RÉFLEXION (Résumé) */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="h-0.5 w-8 bg-indigo-600"></div>
                     <h4 className="text-xs font-medium text-slate-500">Résumé & Réflexion</h4>
                  </div>
                  <div className="text-xl text-slate-700 font-medium leading-[1.8] text-justify first-letter:text-6xl first-letter:font-semibold first-letter:text-indigo-600 first-letter:mr-3 first-letter:float-left whitespace-pre-wrap italic bg-gradient-to-b from-white to-slate-50/50 p-4 rounded-3xl">
                    {readingMeditation.excerpt || "Contenu en attente de rédaction..."}
                  </div>
                </div>

                {/* III. ACTION (Questions) */}
                {readingMeditation.questions && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-0.5 w-8 bg-indigo-600"></div>
                      <h4 className="text-xs font-medium text-slate-500">Questions de réflexion</h4>
                    </div>
                    <div className="bg-indigo-50/50 p-10 rounded-2xl border border-indigo-100/50 space-y-8 shadow-sm">
                      <div className="space-y-6">
                        {readingMeditation.questions.split('\n').filter(q => q.trim()).map((q, idx) => (
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
                    onClick={() => { const newLikes = readingMeditation.likes + 1; setMeditations(prev => prev.map(m => m.id === readingMeditation.id ? {...m, likes: newLikes} : m)); updateMeditation(readingMeditation.id, { likes: newLikes }); }}
                    className="flex items-center gap-3 px-8 py-4 bg-rose-50 text-rose-600 rounded-[1.5rem] border border-rose-100 hover:bg-rose-100 transition-all shadow-sm active:scale-95 group"
                  >
                    <Heart size={20} className={cn(readingMeditation.likes > 0 && "fill-rose-500", "group-hover:scale-110 transition-transform")} />
                    <span className="text-xs font-medium">{readingMeditation.likes} Likes</span>
                  </button>
                  
                  <div className="flex gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => {
                        const text = `📖 *VINEA DEVOTIONAL*\n*${readingMeditation.title.toUpperCase()}*\n\n🕊️ *LA PAROLE*\n"${readingMeditation.scripture}"\n\n💡 *RÉFLEXION*\n${readingMeditation.excerpt}\n\n🙏 *ACTION*\n${readingMeditation.questions}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
                      }}
                      className="flex-1 md:flex-none flex items-center justify-center gap-3 px-10 py-5 bg-emerald-600 text-white rounded-[1.8rem] text-xs font-medium hover:bg-emerald-700 shadow-2xl shadow-emerald-200 transition-all active:scale-95"
                    >
                      <MessageCircle size={20} /> Diffuser sur WhatsApp
                    </button>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(readingMeditation.excerpt);
                        alert("Texte copié avec succès !");
                      }}
                      className="p-5 bg-slate-100 text-slate-500 rounded-[1.5rem] hover:bg-slate-200 transition-all shadow-sm active:scale-95"
                      title="Copier le résumé"
                    >
                      <Copy size={20} />
                    </button>
                    <button 
                      onClick={() => { setMeditationToDeleteId(readingMeditation.id); setIsDeleteConfirmOpen(true); }}
                      className="p-5 bg-rose-50 text-rose-600 rounded-[1.5rem] border border-rose-100 hover:bg-rose-100 transition-all shadow-sm active:scale-95"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsFormOpen(false)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-2xl overflow-hidden max-h-[90vh]">
            <div className="px-10 py-8 bg-indigo-600 text-white shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Rédaction</h3>
                <p className="text-xs text-indigo-200 mt-0.5">Vinea Management</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar bg-slate-50/30">
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 ml-1">Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-semibold shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 ml-1">Thème</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={cn("w-full px-5 py-3.5 bg-white border rounded-2xl text-sm font-semibold shadow-sm", (errors as any).title ? "border-rose-300" : "border-slate-200")} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 ml-1">Versets</label>
                  <input type="text" value={formData.scripture} onChange={e => setFormData({...formData, scripture: e.target.value})} className={cn("w-full px-5 py-3.5 bg-white border rounded-2xl text-sm font-bold shadow-sm", (errors as any).scripture ? "border-rose-300" : "border-slate-200")} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 ml-1">Résumé</label>
                  <textarea rows={6} value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-sm font-medium resize-none shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 ml-1">Questions</label>
                  <textarea rows={4} value={formData.questions} onChange={e => setFormData({...formData, questions: e.target.value})} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-sm font-medium resize-none shadow-sm" />
                </div>
              </div>
              <div className="pt-8 flex gap-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-xs font-medium">Annuler</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-medium shadow-xl hover:bg-indigo-700">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Publier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsImportModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-10 text-white shrink-0 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><Upload size={180} /></div>
               <h3 className="text-3xl font-semibold relative z-10">Sync Méditations</h3>
               <p className="text-xs text-indigo-200 mt-1 relative z-10">Chargement de masse des études bibliques</p>
               <button onClick={() => setIsImportModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={20} /></button>
            </div>
            
            <div className="p-10 space-y-8 flex-1 bg-slate-50/30 overflow-y-auto custom-scrollbar">
               <div className="flex items-start gap-5 p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100">
                    <Info size={24}/>
                  </div>
                  <div className="space-y-2">
                     <h4 className="text-sm font-semibold text-slate-800">Instructions d'importation</h4>
                     <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                       Alimentez votre registre de dévotion en quelques secondes. Veillez à respecter scrupuleusement l'ordre des colonnes du modèle : <strong>Date</strong> (Format JJ-MM-AAAA), <strong>Versets</strong>, <strong>Questions</strong>, <strong>Thème</strong> et <strong>Résumé</strong>.
                     </p>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-5 transition-all hover:shadow-xl">
                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><FileSpreadsheet size={24}/></div>
                     <div>
                       <h5 className="text-xs font-semibold text-indigo-900">Étape 1 : Structure</h5>
                       <p className="text-xs text-indigo-700 leading-relaxed mt-1 opacity-70">Téléchargez le fichier modèle CSV.</p>
                     </div>
                     <button onClick={handleDownloadTemplate} className="w-full py-4 bg-white text-indigo-600 rounded-2xl text-xs font-medium hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-200">Télécharger Modèle</button>
                  </div>
                  
                  <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-5 transition-all hover:shadow-xl">
                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm"><Upload size={24}/></div>
                     <div>
                       <h5 className="text-xs font-semibold text-emerald-900">Étape 2 : Injection</h5>
                       <p className="text-xs text-emerald-700 leading-relaxed mt-1 opacity-70">Envoyez votre fichier complété.</p>
                     </div>
                     <button onClick={() => importInputRef.current?.click()} className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-xs font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-200/50">Choisir Fichier</button>
                  </div>
               </div>
            </div>

            <div className="p-8 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
               <p className="text-xs font-medium text-slate-500">Vinea v1.5.2 • Système Sync</p>
               <button onClick={() => setIsImportModalOpen(false)} className="px-8 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-medium hover:bg-slate-200 transition-all">Annuler</button>
            </div>
          </div>
        </div>
      )}
      
      {isImportSuccessOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-500" />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 text-center animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl border-4 border-white/50 animate-bounce">
              <CheckCircle2 size={48} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900">Sync Réussie</h3>
            <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed italic"><strong>{importCount}</strong> messages indexés.</p>
            <button onClick={() => setIsImportSuccessOpen(false)} className="mt-10 w-full py-5 bg-indigo-600 text-white rounded-2xl text-xs font-medium shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">Continuer</button>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => { setIsDeleteConfirmOpen(false); setMeditationToDeleteId(null); }} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 text-center border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900">Supprimer ?</h3>
            <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed italic">Cette action est définitive.</p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDeleteMeditation} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-xs font-medium shadow-xl hover:bg-rose-700 active:scale-95 transition-all">Confirmer</button>
              <button onClick={() => { setIsDeleteConfirmOpen(false); setMeditationToDeleteId(null); }} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-xs font-medium border border-slate-200 hover:bg-slate-100 transition-all">Annuler</button>
            </div>
          </div>
        </div>
      )}

      <input type="file" ref={importInputRef} onChange={handleImportFile} accept=".csv" className="hidden" />
    </div>
  );
};

export default Meditations;