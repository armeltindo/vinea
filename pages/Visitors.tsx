import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import Avatar from '../components/Avatar';
import VisitorDetails from '../components/VisitorDetails';
import { 
  UserPlus, 
  Search, 
  X,
  Plus,
  Sparkles,
  Target,
  Clock,
  RotateCcw,
  Edit,
  AlertTriangle,
  Save,
  Phone,
  Loader2,
  ChevronRight,
  UserCheck,
  CheckSquare,
  Baby,
  MapPin,
  Heart,
  Briefcase,
  Zap,
  ShieldCheck,
  MoreVertical,
  Mail,
  Maximize2,
  Trash2,
  CheckCircle2,
  Users,
  Activity,
  TrendingUp,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Check
} from 'lucide-react';
import { SERVICES_LIST, formatPhone } from '../constants';
import { Visitor, VisitorStatus, VisitorQualification, Member, MemberType, MemberStatus, FollowUpEntry } from '../types';
import { analyzePageData } from '../lib/gemini';
import { cn, generateId, getInitials, formatFirstName } from '../utils';
import { getMembers, createMember, getVisitors, createVisitor, updateVisitor, deleteVisitor } from '../lib/db';

const QUALIFICATION_ITEMS = [
  { id: 'seekingChurch', label: 'Cherche une église', icon: <Target size={14} /> },
  { id: 'needsPrayer', label: 'Besoin de prière', icon: <Heart size={14} /> },
  { id: 'livesNearby', label: 'Habite le quartier', icon: <MapPin size={14} /> },
  { id: 'hasChildren', label: 'A des enfants', icon: <Baby size={14} /> },
  { id: 'firstTimeChristian', label: 'Nouvelle conversion', icon: <Zap size={14} /> },
  { id: 'wantsToServe', label: 'Souhaite servir', icon: <Briefcase size={14} /> },
];

// Helper pour convertir YYYY-MM-DD en DD-MM-YYYY
const formatToUIDate = (isoDate: string | undefined) => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
};

const Visitors: React.FC = () => {
  const navigate = useNavigate();
  const [availableStatuses] = useState<string[]>(Object.values(VisitorStatus));
  const [statusFilter, setStatusFilter] = useState<string>('Tous les statuts');
  const [availableServices] = useState<string[]>(SERVICES_LIST);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');

  const [members, setMembers] = useState<Member[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoadingData(true);
      const [m, v] = await Promise.all([getMembers(), getVisitors()]);
      setMembers(m);
      setVisitors(v);
      setIsLoadingData(false);
      const detailId = new URLSearchParams(window.location.search).get('detail');
      if (detailId) {
        const found = v.find((x: any) => x.id === detailId);
        if (found) { setSelectedVisitor(found); setIsDetailsOpen(true); }
      }
    };
    load();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [parrainSearch, setParrainSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [visitorToDeleteId, setVisitorToDeleteId] = useState<string | null>(null);

  // États pour la modale de conversion
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [visitorToConvert, setVisitorToConvert] = useState<Visitor | null>(null);
  
  const initialQualification: VisitorQualification = {
    seekingChurch: false,
    needsPrayer: false,
    livesNearby: false,
    hasChildren: false,
    firstTimeChristian: false,
    wantsToServe: false
  };

  const initialFormState = (): Partial<Visitor> => ({
    lastName: '',
    firstName: '',
    gender: 'Masculin',
    phone: '',
    whatsappPhone: '',
    status: VisitorStatus.EN_ATTENTE,
    source: 'Passage direct',
    invitedBy: '',
    visitDate: new Date().toISOString().split('T')[0],
    notes: '',
    service: availableServices[0] || SERVICES_LIST[0],
    address: '',
    qualification: initialQualification,
    parrainId: ''
  });

  const [formData, setFormData] = useState<Partial<Visitor>>(initialFormState());

  const stats = useMemo(() => {
    const total = visitors.length;
    const pending = visitors.filter(v => v.status === VisitorStatus.EN_ATTENTE).length;
    const activeFollowUp = visitors.filter(v => v.status === VisitorStatus.CONTACT_1 || v.status === VisitorStatus.RENCONTRE).length;
    const membersCount = visitors.filter(v => v.status === VisitorStatus.MEMBRE).length;
    const retentionRate = total > 0 ? Math.round((membersCount / total) * 100) : 0;

    return { total, pending, activeFollowUp, membersCount, retentionRate };
  }, [visitors]);

  const filteredVisitors = useMemo(() => {
    let result = visitors.filter(v => {
      const nameMatch = `${v.firstName} ${v.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
      let statusMatch = true;
      if (statusFilter === 'Tous les statuts') statusMatch = true;
      else if (statusFilter === 'Suivi Actif') statusMatch = (v.status === VisitorStatus.CONTACT_1 || v.status === VisitorStatus.RENCONTRE);
      else statusMatch = v.status === statusFilter;
      
      return nameMatch && statusMatch;
    });

    if (sortOrder === 'asc') {
      result.sort((a, b) => a.firstName.localeCompare(b.firstName));
    } else if (sortOrder === 'desc') {
      result.sort((a, b) => b.firstName.localeCompare(a.firstName));
    } else {
      result.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
    }

    return result;
  }, [visitors, searchTerm, statusFilter, sortOrder]);

  const filteredMembersForParrain = useMemo(() => {
    if (!parrainSearch) return [];
    return members.filter(m => 
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(parrainSearch.toLowerCase())
    ).slice(0, 10);
  }, [members, parrainSearch]);

  const handleOpenDetails = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setIsDetailsOpen(true);
    navigate(`?detail=${visitor.id}`, { replace: true });
  };

  const handleOpenForm = (visitor: Visitor | null = null) => {
    setIsDetailsOpen(false);
    navigate('', { replace: true });
    if (visitor) {
      setEditingVisitor(visitor);
      setFormData({ 
        ...visitor, 
        qualification: visitor.qualification || initialQualification 
      });
      const parrain = members.find(m => m.id === visitor.parrainId);
      setParrainSearch(parrain ? `${parrain.firstName} ${parrain.lastName}` : '');
    } else {
      setEditingVisitor(null);
      setFormData(initialFormState());
      setParrainSearch('');
    }
    setIsFormOpen(true);
  };

  const handleSaveVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lastName || !formData.firstName) return;

    setIsSubmitting(true);
    const dataToSave = {
      ...formData,
      firstName: formatFirstName(formData.firstName || ''),
      lastName: (formData.lastName || '').toUpperCase()
    };

    if (editingVisitor) {
      const updated = { ...editingVisitor, ...dataToSave } as Visitor;
      await updateVisitor(editingVisitor.id, updated);
      setVisitors(visitors.map(v => v.id === editingVisitor.id ? updated : v));
    } else {
      const newVisitor: Visitor = {
        ...dataToSave as Visitor,
        id: generateId(),
        followUpHistory: []
      };
      await createVisitor(newVisitor);
      setVisitors([newVisitor, ...visitors]);
    }
    setIsSubmitting(false);
    setIsFormOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!visitorToDeleteId) return;
    const id = visitorToDeleteId;
    setVisitorToDeleteId(null);
    setIsDeleteConfirmOpen(false);
    setIsDetailsOpen(false);
    navigate('', { replace: true });
    await deleteVisitor(id);
    setVisitors(prev => prev.filter(v => v.id !== id));
  };

  // Ouvre la modale de validation de conversion
  const handleOpenConvertModal = (visitor: Visitor) => {
    setVisitorToConvert(visitor);
    setIsConvertModalOpen(true);
  };

  // Exécute la conversion réelle
  const executeConversion = async () => {
    if (!visitorToConvert) return;

    setIsSubmitting(true);

    // 1. Création du nouveau membre
    const newMember: Member = {
      id: generateId(),
      lastName: visitorToConvert.lastName.toUpperCase(),
      firstName: formatFirstName(visitorToConvert.firstName),
      gender: visitorToConvert.gender,
      maritalStatus: 'Célibataire',
      emergencyContact: { name: '', phone: '', relation: '' },
      whatsapp: !!visitorToConvert.whatsappPhone || !!visitorToConvert.phone,
      phone: visitorToConvert.phone || '',
      whatsappPhone: visitorToConvert.whatsappPhone || '',
      address: visitorToConvert.address || '',
      type: MemberType.MEMBRE_SIMPLE,
      status: MemberStatus.ACTIF,
      joinDate: new Date().toISOString().split('T')[0],
      baptized: false,
      departments: [],
      source: visitorToConvert.source || 'Visite directe',
      invitedBy: visitorToConvert.invitedBy || '',
      isDiscipleMaker: false,
      notes: `Profil converti depuis le registre des visiteurs. Première visite le ${new Date(visitorToConvert.visitDate).toLocaleDateString()}. Notes d'accueil : ${visitorToConvert.notes}`
    };

    // 2. Persister le membre + mettre à jour le statut visiteur
    await Promise.all([
      createMember(newMember),
      updateVisitor(visitorToConvert.id, { status: VisitorStatus.MEMBRE }),
    ]);

    setMembers(prev => [newMember, ...prev]);
    setVisitors(visitors.map(v => v.id === visitorToConvert.id ? { ...v, status: VisitorStatus.MEMBRE } : v));

    // 3. Nettoyage
    setIsConvertModalOpen(false);
    setVisitorToConvert(null);
    setIsDetailsOpen(false);
    navigate('', { replace: true });
    setSelectedVisitor(null);
    setIsSubmitting(false);

    alert(`Le nouveau profil de ${newMember.firstName} a été créé avec succès dans la base des membres.`);
  };

  const toggleQualification = (key: keyof VisitorQualification) => {
    setFormData(prev => ({
      ...prev,
      qualification: {
        ...(prev.qualification || initialQualification),
        [key]: !prev.qualification?.[key]
      }
    }));
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzePageData("Analyse des Nouveaux Arrivants", { stats, visitors });
    setAnalysis(result || null);
    setIsAnalyzing(false);
  };

  const handleExportVisitors = () => {
    const headers = [
      'Nom', 'Prénoms', 'Sexe', 'Téléphone', 'WhatsApp', 'Adresse', 
      'Date de visite', 'Culte', 'Source', 'Invité par', 
      'Statut', 'Notes', 'Parrain', 'Qualifications'
    ];
    
    const rows = filteredVisitors.map(v => {
      const parrain = members.find(m => m.id === v.parrainId);
      const qualifications = QUALIFICATION_ITEMS
        .filter(item => !!(v.qualification as any)?.[item.id])
        .map(item => item.label)
        .join(', ');

      return [
        v.lastName,
        v.firstName,
        v.gender,
        v.phone || '',
        v.whatsappPhone || '',
        v.address || '',
        formatToUIDate(v.visitDate),
        v.service,
        v.source,
        v.invitedBy || '',
        v.status,
        (v.notes || '').replace(/;/g, ','), 
        parrain ? `${parrain.firstName} ${parrain.lastName}` : '',
        qualifications
      ];
    });

    const csvContent = "\ufeff" + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vinea_visiteurs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activateFilter = (filter: string) => {
    setStatusFilter(filter);
    setSearchTerm('');
    setSortOrder('none');
  };

  const toggleSort = () => {
    setSortOrder(prev => {
      if (prev === 'none') return 'asc';
      if (prev === 'asc') return 'desc';
      return 'none';
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Registre des Visiteurs</h2>
          <p className="text-sm text-slate-500 opacity-60">Suivi d'Intégration & Accueil Vinea</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-medium hover:bg-indigo-100 transition-all"
          >
            <Sparkles size={18} className={cn(isAnalyzing && "animate-pulse")} /> {isAnalyzing ? 'Analyse...' : 'Analyse IA'}
          </button>
          <button 
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
          >
            <Plus size={20} strokeWidth={3} /> Nouveau Visiteur
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          onClick={() => activateFilter('Tous les statuts')} 
          className={cn(
            "cursor-pointer transition-all active:scale-95 group", 
            statusFilter === 'Tous les statuts' ? "ring-2 ring-indigo-500 ring-offset-4" : ""
          )}
        >
          <Card title="Visiteurs" subtitle="Volume global" className="group-hover:border-indigo-300">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">{stats.total}</span>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner border border-indigo-100 group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
            </div>
          </Card>
        </div>
        
        <div 
          onClick={() => activateFilter(VisitorStatus.EN_ATTENTE)} 
          className={cn(
            "cursor-pointer transition-all active:scale-95 group", 
            statusFilter === VisitorStatus.EN_ATTENTE ? "ring-2 ring-amber-500 ring-offset-4" : ""
          )}
        >
          <Card title="En Attente" subtitle="Alerte accueil" className="group-hover:border-amber-300">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-amber-600">{stats.pending}</span>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner border border-amber-100 group-hover:scale-110 transition-transform">
                <Clock size={24} />
              </div>
            </div>
          </Card>
        </div>

        <div 
          onClick={() => activateFilter('Suivi Actif')} 
          className={cn(
            "cursor-pointer transition-all active:scale-95 group", 
            statusFilter === 'Suivi Actif' ? "ring-2 ring-blue-500 ring-offset-4" : ""
          )}
        >
          <Card title="Suivi Actif" subtitle="Immersion Vinea" className="group-hover:border-blue-300">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-blue-600">{stats.activeFollowUp}</span>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner border border-blue-100 group-hover:scale-110 transition-transform">
                <Activity size={24} />
              </div>
            </div>
          </Card>
        </div>

        <div 
          onClick={() => activateFilter(VisitorStatus.MEMBRE)} 
          className={cn(
            "cursor-pointer transition-all active:scale-95 group", 
            statusFilter === VisitorStatus.MEMBRE ? "ring-2 ring-emerald-500 ring-offset-4" : ""
          )}
        >
          <Card title="Rétention" subtitle="Conversion finale" className="group-hover:border-emerald-300">
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-emerald-600">{stats.membersCount}</span>
                <span className="text-xs font-semibold text-emerald-600 uppercase mt-1">Taux : {stats.retentionRate}%</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner border border-emerald-100 group-hover:scale-110 transition-transform">
                <UserCheck size={24} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6 lg:col-span-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="RECHERCHER UN VISITEUR..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-300 outline-none text-sm font-normal transition-all shadow-sm placeholder:text-slate-400/60"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="md:col-span-6 lg:col-span-8 flex flex-wrap gap-2 items-center justify-end">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm appearance-none min-w-[160px] cursor-pointer hover:bg-slate-50 transition-all"
          >
            <option value="Tous les statuts">Tous les statuts</option>
            <option value="Suivi Actif">Suivi Actif (Combo)</option>
            {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          
          <button onClick={() => { setSearchTerm(''); setStatusFilter('Tous les statuts'); setSortOrder('none'); }} className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-500 transition-all shadow-sm active:scale-90" title="Réinitialiser"><RotateCcw size={18} /></button>
          <div className="h-6 w-px bg-slate-200 mx-1 hidden lg:block"></div>
          <button onClick={handleExportVisitors} className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition-all group">
            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> Exporter
          </button>
        </div>
      </div>

      <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />

      <Card className="p-0 overflow-hidden border-slate-200 shadow-sm rounded-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th 
                  className="px-8 py-5 text-xs font-medium text-slate-500 cursor-pointer hover:text-indigo-600 transition-colors group"
                  onClick={toggleSort}
                >
                  <div className="flex items-center gap-2">
                    Visiteur
                    {sortOrder === 'asc' && <ArrowUp size={12} className="text-indigo-600" />}
                    {sortOrder === 'desc' && <ArrowDown size={12} className="text-indigo-600" />}
                    {sortOrder === 'none' && <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-8 py-5 text-xs font-medium text-slate-500">Passage</th>
                <th className="px-8 py-5 text-xs font-medium text-slate-500">Statut Suivi</th>
                <th className="px-8 py-5 text-xs font-medium text-slate-500">Contact</th>
                <th className="px-8 py-5 text-xs font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVisitors.length > 0 ? filteredVisitors.map((visitor, idx) => (
                <tr key={visitor.id} className={cn("transition-all cursor-pointer group active:scale-[0.995]", idx % 2 === 0 ? "bg-white" : "bg-slate-50/20", "hover:bg-indigo-50/50")} onClick={() => handleOpenDetails(visitor)}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <Avatar
                        firstName={visitor.firstName}
                        lastName={visitor.lastName}
                        size="lg"
                        shape="card"
                        className="group-hover:scale-105 transition-transform shadow-sm border border-white/60"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate tracking-tight">
                          {formatFirstName(visitor.firstName)} <span className="uppercase">{visitor.lastName}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-400 font-bold">{visitor.source}</span>
                          {visitor.parrainId && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1"><ShieldCheck size={10}/> Parrainé</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                     <div className="space-y-0.5">
                        <p className="text-xs font-medium text-slate-700">{new Date(visitor.visitDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[150px]">{visitor.service}</p>
                     </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg shadow-sm border",
                      visitor.status === VisitorStatus.EN_ATTENTE ? "bg-amber-50 text-amber-600 border-amber-100" : 
                      visitor.status === VisitorStatus.MEMBRE ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                      "bg-indigo-50 text-indigo-600 border-indigo-100"
                    )}>
                      {visitor.status}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-700"><Phone size={12} className="text-slate-300" /><span>{visitor.phone ? formatPhone(visitor.phone) : '---'}</span></div>
                      {visitor.whatsappPhone && <div className="flex items-center gap-2 text-xs font-medium text-emerald-600"><Zap size={12} className="text-emerald-300" /><span>{formatPhone(visitor.whatsappPhone)}</span></div>}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleOpenForm(visitor)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl shadow-sm"><Edit size={16} /></button>
                      <button onClick={() => { setVisitorToDeleteId(visitor.id); setIsDeleteConfirmOpen(true); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl shadow-sm"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400 opacity-30"><UserPlus size={48} /><p className="text-sm font-medium">Aucun Visiteur Enregistré</p></div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <VisitorDetails 
        visitor={selectedVisitor} 
        isOpen={isDetailsOpen} 
        onClose={() => { setIsDetailsOpen(false); navigate('', { replace: true }); }}
        onEdit={(v) => handleOpenForm(v)} 
        onDelete={(id) => { setVisitorToDeleteId(id); setIsDeleteConfirmOpen(true); }} 
        onConvertToMember={handleOpenConvertModal}
        onAddFollowUp={async (id, entry) => {
          let updatedHistory: FollowUpEntry[] = [];
          setVisitors(prev => prev.map(v => {
            if (v.id !== id) return v;
            updatedHistory = [entry, ...(v.followUpHistory || [])];
            return { ...v, followUpHistory: updatedHistory };
          }));
          await updateVisitor(id, { followUpHistory: updatedHistory });
        }}
      />

      {isFormOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsFormOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-2xl overflow-hidden max-h-[90vh]">
            <div className="px-8 py-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10"><UserPlus size={160} /></div>
              <div className="relative z-10">
                <h3 className="text-xl font-semibold tracking-tight">{editingVisitor ? 'Mise à jour' : 'Accueil Visiteur'}</h3>
                <p className="text-xs text-indigo-200 mt-1 opacity-80">Cycle d'Intégration Vinea</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="relative z-10 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveVisitor} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/30">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center gap-2 mb-1"><div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div><h4 className="text-xs font-medium text-slate-700">Identité Civile</h4></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Prénoms</label><input type="text" required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: formatFirstName(e.target.value)})} placeholder="Prénoms" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-400 outline-none text-sm font-normal transition-all" /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Nom</label><input type="text" required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value.toUpperCase()})} placeholder="NOM DE FAMILLE" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-400 outline-none text-sm font-normal transition-all" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Sexe</label><select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-normal cursor-pointer"><option value="Masculin">Masculin</option><option value="Féminin">Féminin</option></select></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Parcours</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as VisitorStatus})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-normal cursor-pointer">{availableStatuses.map(stat => <option key={stat} value={stat}>{stat}</option>)}</select></div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center gap-2 mb-1"><div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div><h4 className="text-xs font-medium text-slate-700">Parrainage</h4></div>
                <div className="relative">
                  <label className="text-xs font-medium text-slate-500 ml-1 mb-1 block">Désigner un Mentor</label>
                  <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" value={parrainSearch} onChange={(e) => { setParrainSearch(e.target.value); if (!e.target.value) setFormData({...formData, parrainId: ''}); }} placeholder="RECHERCHER UN MEMBRE..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-normal transition-all" />
                    {parrainSearch && !formData.parrainId && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-40 overflow-y-auto">
                        {filteredMembersForParrain.map(m => (
                          <button key={m.id} type="button" onClick={() => { setFormData({...formData, parrainId: m.id}); setParrainSearch(`${m.firstName} ${m.lastName}`); }} className="w-full text-left px-4 py-3 text-xs font-medium hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center gap-3 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 overflow-hidden">
                              {m.photoUrl ? (
                                <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                getInitials(m.firstName, m.lastName)
                              )}
                            </div>
                            <span className="text-xs font-medium text-slate-700">{m.firstName} {m.lastName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center gap-2 mb-1"><div className="w-1.5 h-4 bg-amber-500 rounded-full"></div><h4 className="text-xs font-medium text-slate-700">Profil de Qualification</h4></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {QUALIFICATION_ITEMS.map(item => {
                    const isSelected = !!(formData.qualification as any)?.[item.id];
                    return (<button key={item.id} type="button" onClick={() => toggleQualification(item.id as keyof VisitorQualification)} className={cn("flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left", isSelected ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-300")}><div className="flex items-center gap-2"><span className={cn(isSelected ? "text-white" : "text-slate-400")}>{item.icon}</span>{item.label}</div>{isSelected && <CheckCircle2 size={14} strokeWidth={3} />}</button>);
                  })}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center gap-2 mb-1"><div className="w-1.5 h-4 bg-rose-500 rounded-full"></div><h4 className="text-xs font-medium text-slate-700">Détails Visite & Contact</h4></div>
                <div className="space-y-4">
                  <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Service visité</label><select value={formData.service} onChange={(e) => setFormData({...formData, service: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-normal shadow-inner">{availableServices.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Date</label><input type="date" value={formData.visitDate} onChange={(e) => setFormData({...formData, visitDate: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-normal shadow-inner" /></div>
                     <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Mobile</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="00 00 00 00 00" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-normal shadow-inner" /></div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3 pb-8">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-500 rounded-2xl text-sm font-medium hover:bg-slate-50 transition-all">Annuler</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold shadow-xl shadow-indigo-100 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                  Valider la Fiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de Confirmation de Conversion */}
      {isConvertModalOpen && visitorToConvert && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !isSubmitting && setIsConvertModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner border border-emerald-100/50 animate-pulse">
              <UserCheck size={48} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 tracking-tight mb-4">Confirmer l'Intégration</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed italic px-4">
              Voulez-vous transformer <strong>{formatFirstName(visitorToConvert.firstName)} {visitorToConvert.lastName.toUpperCase()}</strong> en membre actif de l'église ? 
            </p>
            
            <div className="mt-8 bg-slate-50 rounded-xl p-6 text-left border border-slate-100 space-y-3">
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600">Transfert des coordonnées</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600">Statut : Membre Actif</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600">Archivage historique visite</span>
               </div>
            </div>

            <div className="flex flex-col gap-3 mt-10">
              <button 
                onClick={executeConversion} 
                disabled={isSubmitting}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-sm font-semibold shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />} 
                Confirmer l'intégration
              </button>
              <button 
                onClick={() => setIsConvertModalOpen(false)} 
                disabled={isSubmitting}
                className="w-full py-3.5 bg-slate-50 text-slate-500 rounded-2xl text-sm font-medium hover:bg-slate-100 transition-all border border-slate-200"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50"><AlertTriangle size={40} /></div>
            <h3 className="text-xl font-semibold text-slate-900 leading-tight tracking-tight">Révoquer Fiche ?</h3>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={handleConfirmDelete} className="w-full py-3.5 bg-rose-600 text-white rounded-2xl text-sm font-semibold">Confirmer</button>
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-500 rounded-2xl text-xs font-semibold hover:bg-slate-100 transition-all border border-slate-200">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visitors;