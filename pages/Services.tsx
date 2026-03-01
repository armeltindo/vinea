import React, { useState, useRef, useEffect, useMemo } from 'react';
import Card from '../components/Card';
import { 
  Plus, 
  Calendar, 
  User, 
  Mic2, 
  Music, 
  Clock, 
  ChevronRight, 
  Filter, 
  Search, 
  Sun, 
  BookOpen, 
  Moon, 
  Hourglass, 
  Timer, 
  History as HistoryIcon, 
  Users, 
  Church, 
  ChevronDown, 
  Check, 
  Trash2, 
  AlertTriangle, 
  X, 
  Send, 
  AlertCircle, 
  Edit, 
  Layout, 
  Info, 
  CheckCircle2, 
  Circle, 
  TrendingUp, 
  BarChart3, 
  CheckSquare, 
  ChevronLeft, 
  ArrowLeft, 
  CalendarDays, 
  Loader2, 
  Quote, 
  Copy, 
  Sparkles, 
  FileText, 
  Save, 
  Youtube, 
  Facebook, 
  Headphones, 
  Printer, 
  Share2, 
  Hash, 
  BookMarked, 
  Tags, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  ArrowUpFromLine, 
  Globe, 
  Award, 
  MessageSquareText,
  ExternalLink, 
  BrainCircuit
} from 'lucide-react';
import { SERVICES_LIST } from '../constants';
import { cn, generateId } from '../utils';
import { analyzeSermon, generateSocialSummary, suggestSermonTags } from '../lib/gemini';
import { ChurchService } from '../types';
import { getChurchServices, createChurchService, updateChurchService, deleteChurchService } from '../lib/db';

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

const getServiceIcon = (type: string, size = 14) => {
  switch (type) {
    case 'Culte de dimanche': return <Sun size={size} className="text-amber-500" />;
    case 'Enseignement de mercredi': return <BookOpen size={size} className="text-blue-500" />;
    case 'Veillée de prière': return <Moon size={size} className="text-indigo-500" />;
    case '21 jours de jeûne et prières': return <Hourglass size={size} className="text-emerald-500" />;
    case 'Trois jours de jeûne et prière': return <Timer size={size} className="text-rose-500" />;
    case '40 jours de jeûne et prière': return <HistoryIcon size={size} className="text-purple-500" />;
    case 'Convention': return <Users size={size} className="text-orange-500" />;
    default: return <Church size={size} className="text-slate-500" />;
  }
};

const Services: React.FC = () => {
  const [services, setServices] = useState<ChurchService[]>([]);

  const currentYearStr = new Date().getFullYear().toString();
  const [availableServiceTypes] = useState(SERVICES_LIST);

  useEffect(() => {
    getChurchServices().then(setServices);
  }, []);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [serviceToDeleteId, setServiceToDeleteId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ChurchService | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isThemeExpanded, setIsThemeExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzingSermon, setIsAnalyzingSermon] = useState(false);
  const [isGeneratingSocial, setIsGeneratingSocial] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasCopiedSocial, setHasCopiedSocial] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState(currentYearStr);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportSuccessOpen, setIsImportSuccessOpen] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const importInputRef = useRef<HTMLInputElement>(null);


  const availableYears = useMemo(() => {
    const years = services.map(s => new Date(s.date).getFullYear().toString());
    if (!years.includes(currentYearStr)) {
      years.push(currentYearStr);
    }
    return Array.from<string>(new Set(years)).sort((a, b) => b.localeCompare(a));
  }, [services, currentYearStr]);

  const stats = useMemo(() => {
    const filteredForStats = services.filter(s => {
      const sYear = new Date(s.date).getFullYear().toString();
      if (statsPeriod === 'all') return true;
      return sYear === statsPeriod;
    });
    
    const totalCount = filteredForStats.length;
    const totalAttendance = filteredForStats.reduce((sum, s) => sum + (s.attendance || 0), 0);
    
    const speakerCounts: Record<string, number> = {};
    filteredForStats.forEach(s => {
      if (s.speaker) speakerCounts[s.speaker] = (speakerCounts[s.speaker] || 0) + 1;
    });
    const topSpeaker = Object.entries(speakerCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || '---';
    
    const multimediaCount = filteredForStats.filter(s => s.youtubeLink || s.facebookLink || s.audioLink).length;
    const digitalRate = totalCount > 0 ? Math.round((multimediaCount / totalCount) * 100) : 0;
    const periodLabel = statsPeriod === 'all' ? 'Toutes périodes' : `Année ${statsPeriod}`;

    return { totalCount, totalAttendance, topSpeaker, digitalRate, periodLabel };
  }, [services, statsPeriod]);

  const [formData, setFormData] = useState<Omit<ChurchService, 'id'>>({
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
    tags: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const seriesList = useMemo(() => {
    const set = new Set(services.map(s => s.series).filter(Boolean));
    return Array.from(set).sort();
  }, [services]);

  const validateForm = () => {
    const newErrors: any = {};
    if (!formData.theme.trim()) newErrors.theme = "Le titre est requis";
    if (!formData.speaker.trim()) newErrors.speaker = "L'orateur est requis";
    if (!formData.content.trim()) newErrors.content = "Le texte de la prédication est requis";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    if (editingId) {
      const updated = { ...services.find(s => s.id === editingId)!, ...formData };
      setServices(services.map(s => s.id === editingId ? updated : s));
      await updateChurchService(editingId, formData);
    } else {
      const newService: ChurchService = { ...formData as ChurchService, id: generateId() };
      setServices([newService, ...services]);
      await createChurchService(newService);
    }
    setIsFormOpen(false);
    setEditingId(null);
    setIsSubmitting(false);
    resetForm();
  };

  const handleRunAiAnalysis = async (service: ChurchService) => {
    if (!service.content) return;
    setIsAnalyzingSermon(true);
    const analysis = await analyzeSermon(service.theme, service.content);
    if (analysis) {
      const updated = { ...service, aiAnalysis: analysis };
      setServices(services.map(s => s.id === service.id ? updated : s));
      setSelectedService(updated);
      await updateChurchService(service.id, { aiAnalysis: analysis });
    }
    setIsAnalyzingSermon(false);
  };

  const handleGenerateSocial = async (service: ChurchService) => {
    if (!service.content) return;
    setIsGeneratingSocial(true);
    const summary = await generateSocialSummary(service.theme, service.content);
    if (summary) {
      const updated = { ...service, socialSummary: summary };
      setServices(services.map(s => s.id === service.id ? updated : s));
      setSelectedService(updated);
      await updateChurchService(service.id, { socialSummary: summary });
    }
    setIsGeneratingSocial(false);
  };

  const handleSuggestTags = async (service: ChurchService) => {
    if (!service.content) return;
    setIsSuggestingTags(true);
    const tags = await suggestSermonTags(service.content);
    if (tags) {
      const updated = { ...service, tags: tags };
      setServices(services.map(s => s.id === service.id ? updated : s));
      setSelectedService(updated);
      await updateChurchService(service.id, { tags });
    }
    setIsSuggestingTags(false);
  };

  const handleCopySermon = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleCopySocial = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopiedSocial(true);
    setTimeout(() => setHasCopiedSocial(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = (targetPhone?: string, text?: string) => {
    const url = `https://wa.me/${targetPhone ? targetPhone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(text || '')}`;
    window.open(url, '_blank');
  };

  const resetForm = () => {
    setFormData({
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
      tags: []
    });
    setErrors({});
  };

  const confirmDelete = async () => {
    if (serviceToDeleteId) {
      setServices(services.filter(s => s.id !== serviceToDeleteId));
      setIsDetailsOpen(false);
      setSelectedService(null);
      await deleteChurchService(serviceToDeleteId);
      setServiceToDeleteId(null);
    }
  };

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const sYear = new Date(s.date).getFullYear().toString();
      let matchesPeriod = true;
      if (statsPeriod !== 'all') matchesPeriod = sYear === statsPeriod;
      if (!matchesPeriod) return false;
      const matchesType = !selectedType || s.serviceType === selectedType;
      const matchesSeries = !selectedSeries || s.series === selectedSeries;
      const matchesSearch = s.theme.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.speaker.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (s.series || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSeries && matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [services, selectedType, selectedSeries, searchTerm, statsPeriod]);

  const SERVICE_HEADERS = [
    'Date', 'Heure', 'Type de Culte', 'Série', 'Thème', 
    'Verset de base', 'Orateur', 'Modérateur', 'Louange', 
    'Participation', 'Contenu Prédication', 'Tags'
  ];

  const handleDownloadTemplate = () => {
    const csvContent = "\ufeff" + SERVICE_HEADERS.join(';');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vinea_modele_services.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportServices = () => {
    const rows = filteredServices.map(s => [
      formatToUIDate(s.date),
      s.time,
      s.serviceType,
      s.series || '',
      s.theme,
      s.scripture || '',
      s.speaker,
      s.moderator || '',
      s.worshipLeader || '',
      s.attendance || '',
      `"${s.content.replace(/"/g, '""')}"`,
      (s.tags || []).join(', ')
    ]);
    const csvContent = "\ufeff" + [SERVICE_HEADERS.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vinea_predications_${new Date().toISOString().split('T')[0]}.csv`);
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
        // Utilisation du parseur CSV robuste pour conserver les retours à la ligne
        const allData = parseCSV(content);
        if (allData.length < 2) return;
        const headers = allData[0];
        const importedData: ChurchService[] = [];
        
        const mapping: Record<string, string> = {
          'Date': 'date', 'Heure': 'time', 'Type de Culte': 'serviceType', 'Série': 'series',
          'Thème': 'theme', 'Verset de base': 'scripture', 'Orateur': 'speaker',
          'Modérateur': 'moderator', 'Louange': 'worshipLeader', 'Participation': 'attendance',
          'Contenu Prédication': 'content', 'Tags': 'tags'
        };

        for (let i = 1; i < allData.length; i++) {
          const values = allData[i];
          if (!values || values.length < 2) continue;

          const entry: any = { id: generateId() };
          headers.forEach((header, index) => {
            const hTrim = header.trim().replace('\ufeff', '');
            const key = mapping[hTrim];
            if (!key) return;
            let val = values[index]?.trim() || '';
            
            if (key === 'date') entry[key] = parseFromUIDate(val);
            else if (key === 'attendance') entry[key] = val ? parseInt(val) : undefined;
            else if (key === 'tags') entry[key] = val ? val.split(',').map(t => t.trim()) : [];
            else entry[key] = val;
          });
          importedData.push(entry);
        }
        setServices(prev => [...importedData, ...prev]);
        importedData.forEach((s: ChurchService) => createChurchService(s));
        setIsImportModalOpen(false);
        setImportCount(importedData.length);
        setIsImportSuccessOpen(true);
      } catch (err) { alert("Erreur lors de l'importation du fichier CSV."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const THEME_MAX_LENGTH = 60;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 print:bg-white print:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Registre des Prédications</h2>
          <p className="text-sm text-slate-500 font-medium italic">Vinea : Archivez, analysez et diffusez la parole.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-medium hover:bg-slate-50 transition-all shadow-sm group">
            <ArrowUpFromLine size={16} className="group-hover:-translate-y-0.5 transition-transform" /> Importer
          </button>
          <button onClick={handleExportServices} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-medium hover:bg-slate-50 transition-all shadow-sm group">
            <Download size={16} className="group-hover:translate-y-0.5 transition-transform" /> Exporter
          </button>
          <button onClick={() => { setEditingId(null); resetForm(); setIsFormOpen(true); }} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            <Plus size={18} /> Enregistrer
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between print:hidden">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit overflow-x-auto max-w-full no-scrollbar">
          <button onClick={() => setStatsPeriod('all')} className={cn("px-5 py-2 rounded-xl text-xs font-medium transition-all", statsPeriod === 'all' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>
            Toutes
          </button>
          {availableYears.map(year => (
            <button key={year} onClick={() => setStatsPeriod(year)} className={cn("px-5 py-2 rounded-xl text-xs font-medium transition-all", statsPeriod === year ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>
              {year}
            </button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500"><HistoryIcon size={14} className="text-indigo-400" /> Période consultée : <span className="text-indigo-600">{stats.periodLabel}</span></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
        <Card title="Volume" subtitle="Messages enregistrés" icon={<Church size={20} className="text-indigo-600" />}>
           <div className="flex items-end justify-between"><span className="text-3xl font-bold text-slate-900">{stats.totalCount}</span><span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg DBorder border-indigo-100">Archive</span></div>
        </Card>
        <Card title="Impact Audience" subtitle="Fidèles touchés" icon={<Users size={20} className="text-emerald-600" />}>
           <div className="flex items-end justify-between"><span className="text-3xl font-bold text-emerald-600">{stats.totalAttendance}</span><TrendingUp size={20} className="text-emerald-500 mb-1" /></div>
        </Card>
        <Card title="Orateur Principal" subtitle="Fréquence maximale" icon={<Award size={20} className="text-amber-500" />}>
           <div className="flex items-end justify-between"><div className="min-w-0"><span className="text-sm font-bold text-slate-900 truncate block max-w-[150px]">{stats.topSpeaker}</span><p className="text-xs font-medium text-slate-500 mt-1">Impact Max</p></div><Mic2 size={24} className="text-amber-100" /></div>
        </Card>
        <Card title="Rayonnement" subtitle="Diffusions numériques" icon={<Globe size={20} className="text-blue-500" />}>
           <div className="flex items-end justify-between"><span className="text-3xl font-bold text-blue-600">{stats.digitalRate}%</span><div className="flex gap-1 mb-1"><Youtube size={14} className="text-rose-400" /><Facebook size={14} className="text-blue-400" /></div></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 print:hidden">
        <div className="md:col-span-6"><div className="relative group"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} /><input type="text" placeholder="Thème, orateur, série..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 outline-none text-xs font-bold transition-all shadow-sm" /></div></div>
        <div className="md:col-span-6 flex flex-wrap gap-2 items-center"><select value={selectedType || ""} onChange={(e) => setSelectedType(e.target.value || null)} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none shadow-sm"><option value="">Tous les types</option>{availableServiceTypes.map(t => <option key={t} value={t}>{t}</option>)}</select><select value={selectedSeries || ""} onChange={(e) => setSelectedSeries(e.target.value || null)} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none shadow-sm"><option value="">Toutes les séries</option>{seriesList.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
        {filteredServices.length > 0 ? filteredServices.map((service) => (
          <div key={service.id} onClick={() => { setSelectedService(service); setIsDetailsOpen(true); setIsThemeExpanded(false); }} className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-400 hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.98]">
            <div className="h-1.5 w-full bg-slate-100 group-hover:bg-indigo-500 transition-colors" />
            <div className="p-8 space-y-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start"><div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-2xl group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">{getServiceIcon(service.serviceType, 12)}<span className="text-xs font-medium text-slate-500 group-hover:text-indigo-600">{service.serviceType}</span></div><div className="px-3 py-1.5 bg-slate-50 rounded-2xl text-xs text-slate-400">{new Date(service.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
              <div className="flex-1">{service.series && <p className="text-xs font-semibold text-indigo-400 mb-2">Série : {service.series}</p>}<h4 className="text-xl font-semibold text-slate-900 group-hover:text-indigo-600 transition-colorser leading-tight mb-3">{service.theme}</h4><div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all"><Mic2 size={14} /></div><p className="text-11px font-semibold text-slate-700">{service.speaker}</p></div><p className="text-sm text-slate-400 line-clamp-3 leading-relaxed font-medium italic border-l-2 border-slate-100 pl-4 group-hover:border-indigo-200 transition-colors">"{service.content}"</p></div>
              <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-auto"><div className="flex gap-1.5">{service.youtubeLink && <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-sm border border-rose-100 group-hover:scale-110 transition-transform"><Youtube size={14} /></div>}{service.facebookLink && <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm border border-blue-100 group-hover:scale-110 transition-transform"><Facebook size={14} /></div>}{service.audioLink && <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform"><Headphones size={14} /></div>}</div><div className="flex items-center gap-2">{service.aiAnalysis && <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full flex items-center gap-1.5 shadow-sm animate-pulse"><Sparkles size={10} /><span className="text-xs font-medium">Analyse IA</span></div>}<div className="p-2 bg-slate-50 text-slate-300 rounded-full group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all"><ChevronRight size={18} strokeWidth={3} /></div></div></div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-24 text-center bg-white rounded-2xl border border-dashed border-slate-200"><Quote size={48} className="mx-auto text-slate-100 mb-4" /><p className="text-sm font-bold text-slate-400 italic">{searchTerm || selectedType || selectedSeries ? "Aucune prédication trouvée." : "Aucune prédication enregistrée."}</p></div>
        )}
      </div>

      {isDetailsOpen && selectedService && (
        <div className="fixed inset-0 z-[150] overflow-hidden flex items-center justify-center p-4 print:static print:z-0">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity print:hidden" onClick={() => setIsDetailsOpen(false)} />
          <div className="relative w-full max-w-5xl bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-2xl overflow-hidden max-h-[90vh] print:rounded-none print:shadow-none print:w-full print:max-w-none print:max-h-none">

            {/* ─── Header ─── */}
            <div className="px-10 py-10 bg-slate-900 text-white shrink-0 relative overflow-hidden print:bg-white print:text-slate-900 print:py-8 print:border-b-2 print:border-slate-100">
              <div className="absolute top-0 right-0 p-8 opacity-10 print:hidden pointer-events-none"><Church size={220} /></div>
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none"></div>
              <button onClick={() => setIsDetailsOpen(false)} className="absolute top-6 left-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors print:hidden z-20"><ArrowLeft size={24} /></button>

              <div className="relative z-10 space-y-5">
                {/* Type + Série */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-medium shadow-lg shadow-indigo-900/20 print:border print:border-slate-200">{selectedService.serviceType}</span>
                  {selectedService.series && <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium border border-white/10 print:text-indigo-600 print:bg-indigo-50">Série : {selectedService.series}</span>}
                </div>

                {/* Thème */}
                <h3 className="text-3xl font-bold leading-tight max-w-3xl print:text-3xl transition-all duration-300">
                  {selectedService.theme.length > THEME_MAX_LENGTH ? (
                    <>
                      <span className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsThemeExpanded(!isThemeExpanded)}>
                        {isThemeExpanded ? selectedService.theme : selectedService.theme.substring(0, THEME_MAX_LENGTH)}
                      </span>
                      {!isThemeExpanded && (
                        <button onClick={() => setIsThemeExpanded(true)} className="text-indigo-400 hover:text-indigo-300 ml-2 transition-colors inline-block focus:outline-none select-none" title="Afficher tout le thème">...</button>
                      )}
                      {isThemeExpanded && (
                        <button onClick={() => setIsThemeExpanded(false)} className="text-indigo-400 hover:text-indigo-300 ml-2 text-xs font-medium transition-colors inline-block focus:outline-none select-none align-middle" title="Réduire">[Réduire]</button>
                      )}
                    </>
                  ) : selectedService.theme}
                </h3>

                {/* Métadonnées en pills */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-2 bg-white/8 px-3 py-1.5 rounded-xl border border-white/10">
                    <Calendar size={13} className="text-indigo-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-200 print:text-slate-900">{new Date(selectedService.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  {selectedService.time && (
                    <div className="flex items-center gap-2 bg-white/8 px-3 py-1.5 rounded-xl border border-white/10">
                      <Clock size={13} className="text-indigo-400 shrink-0" />
                      <span className="text-xs font-medium text-slate-200 print:text-slate-900">{selectedService.time}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-white/8 px-3 py-1.5 rounded-xl border border-white/10">
                    <Mic2 size={13} className="text-indigo-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-200 print:text-slate-900">{selectedService.speaker}</span>
                  </div>
                  {selectedService.attendance && (
                    <div className="flex items-center gap-2 bg-white/8 px-3 py-1.5 rounded-xl border border-white/10">
                      <Users size={13} className="text-emerald-400 shrink-0" />
                      <span className="text-xs font-medium text-slate-200 print:text-slate-900">{selectedService.attendance} fidèles</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Body: 2-column layout ─── */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

              {/* Colonne principale */}
              <div className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-6 custom-scrollbar bg-slate-50/30 print:bg-white print:overflow-visible">

                {/* Fondement Biblique */}
                <div className="bg-indigo-600 p-7 rounded-2xl text-white shadow-lg shadow-indigo-100 relative overflow-hidden group print:border print:border-slate-200 print:bg-white print:text-slate-900">
                  <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:rotate-12 transition-transform pointer-events-none"><Quote size={80} /></div>
                  <div className="flex items-center gap-2 mb-3">
                    <BookMarked size={13} className="text-indigo-200 print:text-indigo-600" />
                    <h4 className="text-xs font-medium text-indigo-200 print:text-slate-500">Fondement Biblique</h4>
                  </div>
                  <p className="text-xl font-semibold italic leading-snug print:text-slate-900">"{selectedService.scripture || 'Verset non spécifié'}"</p>
                </div>

                {/* Texte intégral */}
                <div className="bg-white p-8 lg:p-10 rounded-2xl border border-slate-100 shadow-sm relative group print:p-0 print:border-none print:shadow-none">
                  <div className="absolute top-6 right-6 print:hidden">
                    <button onClick={() => handleCopySermon(selectedService.content)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Copier le texte">
                      {hasCopied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mb-8 print:hidden">
                    <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                    <h4 className="text-xs font-medium text-slate-500">Texte intégral</h4>
                  </div>
                  <div className="text-slate-700 font-medium leading-[1.85] whitespace-pre-wrap text-base first-letter:text-5xl first-letter:font-semibold first-letter:text-indigo-600 first-letter:mr-3 first-letter:float-left print:text-base">
                    {selectedService.content}
                  </div>
                  {selectedService.tags && selectedService.tags.length > 0 && (
                    <div className="mt-10 pt-6 border-t border-slate-50 flex flex-wrap gap-2 print:hidden">
                      {selectedService.tags.map(tag => (
                        <span key={tag} className="px-3 py-1.5 bg-slate-50 text-slate-500 rounded-xl text-xs font-medium border border-slate-100 hover:border-indigo-200 hover:text-indigo-600 transition-colors">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Barre latérale outils */}
              <div className="lg:w-80 xl:w-96 shrink-0 overflow-y-auto border-t lg:border-t-0 lg:border-l border-slate-100 bg-white p-6 space-y-4 custom-scrollbar print:hidden">

                {/* Fiche du culte */}
                <div className="bg-slate-50 rounded-2xl p-5 space-y-3 border border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-500 flex items-center gap-2"><Info size={13} className="text-indigo-500" /> Fiche du culte</h4>
                  <div className="space-y-2.5">
                    {selectedService.time && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0"><Clock size={14} className="text-indigo-500" /></div>
                        <div><p className="text-xs text-slate-400">Heure</p><p className="text-xs font-semibold text-slate-700">{selectedService.time}</p></div>
                      </div>
                    )}
                    {selectedService.moderator && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0"><User size={14} className="text-slate-500" /></div>
                        <div><p className="text-xs text-slate-400">Modérateur</p><p className="text-xs font-semibold text-slate-700">{selectedService.moderator}</p></div>
                      </div>
                    )}
                    {selectedService.worshipLeader && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0"><Music size={14} className="text-indigo-400" /></div>
                        <div><p className="text-xs text-slate-400">Louange</p><p className="text-xs font-semibold text-slate-700">{selectedService.worshipLeader}</p></div>
                      </div>
                    )}
                    {selectedService.attendance && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0"><Users size={14} className="text-emerald-500" /></div>
                        <div><p className="text-xs text-slate-400">Participation</p><p className="text-xs font-semibold text-emerald-600">{selectedService.attendance} fidèles</p></div>
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
                    <button onClick={() => handleGenerateSocial(selectedService)} disabled={isGeneratingSocial} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                      {isGeneratingSocial ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    </button>
                  </div>
                  {selectedService.socialSummary ? (
                    <div className="space-y-3 animate-in zoom-in-95">
                      <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl text-xs text-white font-medium leading-relaxed italic border border-white/20">"{selectedService.socialSummary}"</div>
                      <div className="flex gap-2">
                        <button onClick={() => handleCopySocial(selectedService.socialSummary)} className="flex-1 py-2.5 bg-white text-emerald-700 rounded-xl text-xs font-medium hover:bg-emerald-50 transition-all flex items-center justify-center gap-1.5 shadow-md">
                          {hasCopiedSocial ? <CheckCircle2 size={13} /> : <Copy size={13} />} Copier
                        </button>
                        <button onClick={() => handleWhatsApp(undefined, selectedService.socialSummary)} className="p-2.5 bg-emerald-500 text-white rounded-xl border border-white/20 hover:bg-emerald-400">
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
                    {!selectedService.aiAnalysis && (
                      <button onClick={() => handleRunAiAnalysis(selectedService)} disabled={isAnalyzingSermon} className="px-3 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 transition-all disabled:opacity-50">
                        {isAnalyzingSermon ? <Loader2 size={12} className="animate-spin" /> : 'Analyser'}
                      </button>
                    )}
                  </div>
                  {selectedService.aiAnalysis ? (
                    <div className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-2">{selectedService.aiAnalysis}</div>
                  ) : (
                    <div className="text-center py-4 space-y-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-200"><MessageSquareText size={20} /></div>
                      <p className="text-xs text-slate-400 font-medium">Gemini peut extraire les points clés.</p>
                    </div>
                  )}
                  {!selectedService.tags?.length && !isSuggestingTags && (
                    <button onClick={() => handleSuggestTags(selectedService)} className="w-full py-2 text-xs font-medium text-slate-300 hover:text-indigo-400 transition-colors">Extraire thématiques</button>
                  )}
                </div>

                {/* Replay & Multimédia */}
                {(selectedService.youtubeLink || selectedService.facebookLink || selectedService.audioLink) && (
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                    <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2"><Globe size={13} className="text-indigo-500" /> Replay & Multimédia</h4>
                    <div className="space-y-2">
                      {selectedService.youtubeLink && (
                        <a href={selectedService.youtubeLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all group/link">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover/link:scale-110 transition-transform"><Youtube size={16} /></div>
                            <span className="text-xs font-medium">YouTube Live</span>
                          </div>
                          <ExternalLink size={12} className="opacity-40" />
                        </a>
                      )}
                      {selectedService.facebookLink && (
                        <a href={selectedService.facebookLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all group/link">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover/link:scale-110 transition-transform"><Facebook size={16} /></div>
                            <span className="text-xs font-medium">Facebook Watch</span>
                          </div>
                          <ExternalLink size={12} className="opacity-40" />
                        </a>
                      )}
                      {selectedService.audioLink && (
                        <a href={selectedService.audioLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all group/link">
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

            {/* Footer */}
            <div className="p-8 border-t border-slate-100 bg-white flex flex-wrap items-center gap-3 shrink-0 print:hidden shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)]">
              <button onClick={handlePrint} className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-medium hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg"><Printer size={16} /> Imprimer</button>
              <div className="flex-1"></div>
              <button onClick={() => { setEditingId(selectedService.id); setFormData(selectedService); setIsDetailsOpen(false); setIsFormOpen(true); }} className="px-5 py-3.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl text-xs font-medium hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"><Edit size={15} /> Modifier</button>
              <button onClick={() => { setServiceToDeleteId(selectedService.id); }} className="px-5 py-3.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-xs font-medium hover:bg-rose-100 transition-all flex items-center justify-center gap-2"><Trash2 size={15} /></button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-[180] overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => !isSubmitting && setIsFormOpen(false)}></div>
          <div className="relative w-full max-w-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-2xl overflow-hidden max-h-[90vh]">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 rounded-t-[3rem] text-white shrink-0">
              <div><h3 className="text-xl font-semibold tracking-tight">{editingId ? 'Modifier' : 'Nouveau'}</h3><p className="text-xs text-indigo-200 mt-0.5">Vinea Homiletic Centre</p></div>
              <button onClick={() => { setIsFormOpen(false); setEditingId(null); }} disabled={isSubmitting} className="p-2.5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"><X size={20} /></button>
            </div>
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-slate-50/30">
              <div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Date</label><input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold shadow-sm" /></div><div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Heure</label><input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold shadow-sm" /></div><div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Type</label><select value={formData.serviceType} onChange={(e) => setFormData({...formData, serviceType: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-normal shadow-sm">{availableServiceTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></div></div><div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Série</label><input type="text" placeholder="Ex: Fondements" list="series-suggestions" value={formData.series} onChange={(e) => setFormData({...formData, series: e.target.value})} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold shadow-sm" /><datalist id="series-suggestions">{seriesList.map(s => <option key={s} value={s} />)}</datalist></div><div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Thème</label><input type="text" required placeholder="Ex: La grâce" value={formData.theme} onChange={(e) => setFormData({...formData, theme: e.target.value})} className={cn("w-full px-5 py-3.5 bg-white border rounded-2xl outline-none text-sm font-semibold shadow-sm transition-all", (errors as any).theme ? "border-rose-300" : "border-slate-200 focus:border-indigo-400")} /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Orateur</label><input type="text" placeholder="Pasteur..." value={formData.speaker} onChange={(e) => setFormData({...formData, speaker: e.target.value})} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold" /></div><div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Versets</label><input type="text" placeholder="Jean 3:16" value={formData.scripture} onChange={(e) => setFormData({...formData, scripture: e.target.value})} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold" /></div></div><div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Contenu</label><textarea rows={10} required placeholder="Notes..." value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} className={cn("w-full px-5 py-4 bg-white border rounded-xl outline-none text-sm font-medium resize-none shadow-sm transition-all", (errors as any).content ? "border-rose-300" : "border-slate-200 focus:border-indigo-400")} /></div><div className="space-y-4 pt-4 border-t border-slate-200"><h4 className="text-xs font-medium text-slate-700 flex items-center gap-2"><Layout size={14} className="text-indigo-600" /> Hub Multimédia</h4><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 flex items-center gap-1.5 ml-1"><Youtube size={12}/> YouTube</label><input type="url" value={formData.youtubeLink} onChange={(e) => setFormData({...formData, youtubeLink: e.target.value})} placeholder="https://..." className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs" /></div><div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 flex items-center gap-1.5 ml-1"><Facebook size={12}/> Facebook</label><input type="url" value={formData.facebookLink} onChange={(e) => setFormData({...formData, facebookLink: e.target.value})} placeholder="https://..." className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs" /></div><div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 flex items-center gap-1.5 ml-1"><Headphones size={12}/> Audio</label><input type="url" value={formData.audioLink} onChange={(e) => setFormData({...formData, audioLink: e.target.value})} placeholder="https://..." className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs" /></div></div></div></div>
                <div className="pt-4 flex gap-4"><button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-500 rounded-2xl text-sm font-medium shadow-sm">Annuler</button><button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-medium shadow-xl shadow-indigo-100 flex items-center justify-center gap-3">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{isSubmitting ? '...' : 'Publier'}</button></div>
            </form>
          </div>
        </div>
      )}

      {serviceToDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setServiceToDeleteId(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 text-center border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50"><Trash2 size={40} /></div>
            <h3 className="text-2xl font-bold text-slate-900">Supprimer ?</h3>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-xs font-medium shadow-xl">Supprimer</button>
              <button onClick={() => setServiceToDeleteId(null)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-xs font-medium border border-slate-200">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsImportModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-slate-100">
            <div className="bg-indigo-600 p-10 text-white shrink-0 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><Upload size={180} /></div>
               <div className="relative z-10 space-y-2">
                 <h3 className="text-3xl font-semibold">Vinea Sync : Prédications</h3>
                 <p className="text-xs text-indigo-200">Synchronisation de la base spirituelle</p>
               </div>
               <button onClick={() => setIsImportModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={20} /></button>
            </div>
            
            <div className="p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
               <div className="space-y-8">
                  <div className="flex items-start gap-5 p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                     <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100"><Info size={24}/></div>
                     <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-800 leading-none">Processus d'importation assistée</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                          Importez vos archives de prédications instantanément. Le parseur supporte les textes longs et les retours à la ligne au sein des messages.
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                           <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-xs font-semibold text-indigo-600 shadow-sm">1</div>
                              <span className="text-xs font-semibold text-slate-600">Utilisez obligatoirement notre fichier modèle.</span>
                           </div>
                           <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-xs font-semibold text-indigo-600 shadow-sm">2</div>
                              <span className="text-xs font-semibold text-slate-600">Format Date : <strong>JJ-MM-AAAA</strong> (ex: 31-12-2023).</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-5 transition-all hover:shadow-xl hover:shadow-indigo-500/5">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><FileSpreadsheet size={24}/></div>
                        <div>
                          <h5 className="text-xs font-semibold text-indigo-900">Étape 1 : Structure</h5>
                          <p className="text-xs text-indigo-700 leading-relaxed mt-1 opacity-70">Téléchargez le modèle CSV vierge.</p>
                        </div>
                        <button 
                          onClick={handleDownloadTemplate}
                          className="w-full py-4 bg-white text-indigo-600 rounded-2xl text-xs font-medium hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-200 flex items-center justify-center gap-2 active:scale-95"
                        >
                          <Download size={14}/> Télécharger
                        </button>
                     </div>

                     <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-5 transition-all hover:shadow-xl hover:shadow-emerald-500/5">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm"><Upload size={24}/></div>
                        <div>
                          <h5 className="text-xs font-semibold text-emerald-900">Étape 2 : Chargement</h5>
                          <p className="text-xs text-emerald-700 leading-relaxed mt-1 opacity-70">Envoyez votre fichier complété.</p>
                        </div>
                        <button 
                          onClick={() => importInputRef.current?.click()}
                          className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-xs font-medium hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2 active:scale-95"
                        >
                          <FileSpreadsheet size={14}/> Choisir fichier
                        </button>
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-10 border-t border-slate-100 bg-white flex justify-end shrink-0">
               <button onClick={() => setIsImportModalOpen(false)} className="px-8 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-medium hover:bg-slate-200 transition-all active:scale-95">
                 Annuler l'opération
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isImportSuccessOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-500" />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 text-center animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl border-4 border-white/50 animate-bounce">
              <CheckCircle2 size={48} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900">Sync Réussie</h3>
            <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed italic">
              Vinea Sync a traité vos archives. <strong>{importCount}</strong> prédications ont été indexées.
            </p>
            <div className="mt-10">
              <button 
                onClick={() => setIsImportSuccessOpen(false)} 
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-xs font-medium shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
              >
                Accéder au registre
              </button>
            </div>
          </div>
        </div>
      )}

      <input type="file" ref={importInputRef} onChange={handleImportFile} accept=".csv" className="hidden" />
    </div>
  );
};

export default Services;