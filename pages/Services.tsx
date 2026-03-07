import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ServiceEditModal from '../components/ServiceEditModal';
import { usePermissions } from '../context/PermissionsContext';
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
import { ChurchService, Member } from '../types';
import { getChurchServices, createChurchService, deleteChurchService, getAppConfig, getMembers } from '../lib/db';

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
  const navigate = useNavigate();
  const { canDelete } = usePermissions();
  const [services, setServices] = useState<ChurchService[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const currentYearStr = new Date().getFullYear().toString();
  const [availableServiceTypes, setAvailableServiceTypes] = useState(SERVICES_LIST);

  useEffect(() => {
    Promise.all([getChurchServices(), getAppConfig('service_types'), getMembers()]).then(([s, serviceTypes, m]) => {
      setServices(s);
      if (serviceTypes && Array.isArray(serviceTypes) && serviceTypes.length > 0) setAvailableServiceTypes(serviceTypes);
      setMembers(m);
    });
  }, []);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [serviceToDeleteId, setServiceToDeleteId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  const [editingService, setEditingService] = useState<ChurchService | null>(null);

  const seriesList = useMemo(() => {
    const set = new Set(services.map(s => s.series).filter(Boolean));
    return Array.from(set).sort();
  }, [services]);

  const handleModalSave = (saved: ChurchService) => {
    setServices(prev =>
      prev.find(s => s.id === saved.id)
        ? prev.map(s => s.id === saved.id ? saved : s)
        : [saved, ...prev]
    );
    setIsFormOpen(false);
    setEditingService(null);
  };

  const confirmDelete = async () => {
    if (serviceToDeleteId) {
      setServices(services.filter(s => s.id !== serviceToDeleteId));
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
          <button onClick={() => { setEditingService(null); setIsFormOpen(true); }} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
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
          <div key={service.id} onClick={() => navigate(`/services/${service.id}`)} className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-400 hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.98]">
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

      {isFormOpen && (
        <ServiceEditModal
          service={editingService}
          allServices={services}
          availableServiceTypes={availableServiceTypes}
          members={members}
          onSave={handleModalSave}
          onClose={() => { setIsFormOpen(false); setEditingService(null); }}
        />
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