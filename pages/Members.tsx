import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePermissions } from '../context/PermissionsContext';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import Avatar from '../components/Avatar';
import MemberDetails from '../components/MemberDetails';
import MemberEditModal, { getDepartmentColor, getDepartmentIcon } from '../components/MemberEditModal';
import {
  Search,
  Plus,
  Upload,
  Download,
  Phone,
  Sparkles,
  X,
  Briefcase,
  AlertTriangle,
  Trash2,
  Edit,
  ImageIcon,
  RotateCcw,
  Users,
  FileSpreadsheet,
  Info,
  CheckCircle2,
  PartyPopper,
  ShieldCheck,
  ArrowUpFromLine,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCheck
} from 'lucide-react';
import { formatPhone, DEPARTMENTS as CONST_DEPARTMENTS } from '../constants';
import { Member, MemberStatus, MemberType } from '../types';
import { analyzePageData } from '../lib/gemini';
import { cn, generateId, getInitials, getDisplayNickname, formatFirstName } from '../utils';
import { getMembers, createMember, deleteMember, getDiscipleshipPairs, getAppConfig } from '../lib/db';

// Helper pour convertir YYYY-MM-DD en DD-MM-YYYY
const formatToUIDate = (isoDate: string | undefined) => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
};

// Helper pour convertir DD-MM-YYYY en YYYY-MM-DD
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


const Members: React.FC = () => {
  const navigate = useNavigate();
  const { canDelete } = usePermissions();
  const [searchParams] = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [discipleshipPairs, setDiscipleshipPairs] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous les statuts');
  const [roleFilter, setRoleFilter] = useState<string>('Tous les rôles');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('asc');

  const [availableStatuses, setAvailableStatuses] = useState<string[]>(Object.values(MemberStatus));
  const [availableRoles, setAvailableRoles] = useState<string[]>(Object.values(MemberType));
  const [availableDepartments, setAvailableDepartments] = useState<string[]>(CONST_DEPARTMENTS);

  useEffect(() => {
    const load = async () => {
      setIsLoadingData(true);
      const [m, p, depts, memberStatuses, memberRoles] = await Promise.all([
        getMembers(),
        getDiscipleshipPairs(),
        getAppConfig('departments'),
        getAppConfig('member_statuses'),
        getAppConfig('member_roles'),
      ]);
      if (depts && Array.isArray(depts)) setAvailableDepartments(depts);
      if (memberStatuses && Array.isArray(memberStatuses) && memberStatuses.length > 0) setAvailableStatuses(memberStatuses);
      if (memberRoles && Array.isArray(memberRoles) && memberRoles.length > 0) setAvailableRoles(memberRoles);
      setMembers(m);
      setDiscipleshipPairs(p);
      setIsLoadingData(false);
    };
    load();
  }, []);

  const importInputRef = useRef<HTMLInputElement>(null);

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportSuccessOpen, setIsImportSuccessOpen] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [memberToDeleteId, setMemberToDeleteId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzePageData("Membres", members);
    setAnalysis(result || null);
    setIsAnalyzing(false);
  };

  const filteredMembers = useMemo(() => {
    let result = members.filter(m => {
      const name = `${m.firstName} ${m.lastName}`.toLowerCase();
      const nickname = m.nickname?.toLowerCase() || '';
      const search = searchTerm.toLowerCase();
      const matchesSearch = name.includes(search) || nickname.includes(search);
      const matchesStatus = statusFilter === 'Tous les statuts' || m.status === statusFilter;
      const matchesRole = roleFilter === 'Tous les rôles' || m.type === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });

    if (sortOrder === 'asc') {
      result.sort((a, b) => a.firstName.localeCompare(b.firstName, 'fr', { sensitivity: 'base' }));
    } else if (sortOrder === 'desc') {
      result.sort((a, b) => b.firstName.localeCompare(a.firstName, 'fr', { sensitivity: 'base' }));
    } else {
      result.sort((a, b) => a.firstName.localeCompare(b.firstName, 'fr', { sensitivity: 'base' }));
    }

    return result;
  }, [members, searchTerm, statusFilter, roleFilter, sortOrder]);

  const stats = useMemo(() => {
    const total = members.length;
    const actifs = members.filter(m => (m.status as string).toLowerCase().includes('actif')).length;
    const baptises = members.filter(m => m.baptized).length;
    const hommes = members.filter(m => m.gender === 'Masculin').length;
    const femmes = members.filter(m => m.gender === 'Féminin').length;
    const isEnfant = (m: Member) => (m.type as string) === 'Enfant' || m.status === MemberStatus.ENFANT;
    const enfantsTotal = members.filter(isEnfant).length;
    const enfantsHommes = members.filter(m => isEnfant(m) && m.gender === 'Masculin').length;
    const enfantsFemmes = members.filter(m => isEnfant(m) && m.gender === 'Féminin').length;

    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const anniversaires = members.filter(m => {
      if (!m.birthDate) return false;
      const parts = m.birthDate.split('-');
      return parts.length === 3 && parts[1] !== '00' && parts[2] !== '00' && parseInt(parts[1]) === thisMonth;
    }).length;

    const parStatut: Record<string, number> = {};
    members.forEach(m => { parStatut[m.status] = (parStatut[m.status] || 0) + 1; });

    const parDept: Record<string, number> = {};
    members.forEach(m => { (m.departments || []).forEach(d => { parDept[d] = (parDept[d] || 0) + 1; }); });
    const topDepts = Object.entries(parDept).sort(([, a], [, b]) => b - a).slice(0, 6);
    const maxDept = topDepts[0]?.[1] || 1;

    return { total, actifs, baptises, hommes, femmes, enfantsTotal, enfantsHommes, enfantsFemmes, anniversaires, parStatut, topDepts, maxDept };
  }, [members]);

  const handleOpenDetails = (member: Member) => {
    navigate(`/members/${member.id}`);
  };

  const handleEditClick = (member: Member) => {
    setEditingMember(member);
    setIsDetailsOpen(false);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (memberId: string) => {
    setMemberToDeleteId(memberId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (memberToDeleteId) {
      const idToDelete = memberToDeleteId;
      setMemberToDeleteId(null);
      setIsDeleteConfirmOpen(false);
      setIsDetailsOpen(false);
      navigate('', { replace: true });
      await deleteMember(idToDelete);
      setMembers(members.filter(m => m.id !== idToDelete));
    }
  };

  const triggerImportFile = () => {
    importInputRef.current?.click();
  };

  const EXCEL_HEADERS = [
    'Nom', 'Prénoms', 'Petit nom', 'Sexe', 'État Civil', 
    'Rôle', 'Statut', 'Date d\'adhésion', 'Date de baptême', 
    'Date de naissance', 'Baptisé', 'Départements', 
    'Téléphone', 'Tél. Secondaire', 'WhatsApp', 'Email', 'Profession', 'Adresse'
  ];

  const handleDownloadTemplate = () => {
    const csvContent = "\ufeff" + EXCEL_HEADERS.join(';');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vinea_modele_membres.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        let importedData: any[] = [];

        if (isCsv) {
          const allData = parseCSV(content);
          const headers = allData[0];
          
          for (let i = 1; i < allData.length; i++) {
            const values = allData[i];
            if (!values || values.length < 2) continue;
            
            const entry: any = {};
            const mapping: Record<string, string> = {
              'Nom': 'lastName',
              'Prénoms': 'firstName',
              'Petit nom': 'nickname',
              'Sexe': 'gender',
              'État Civil': 'maritalStatus',
              'Rôle': 'type',
              'Statut': 'status',
              'Date d\'adhésion': 'joinDate',
              'Date de baptême': 'baptizedDate',
              'Date de naissance': 'birthDate',
              'Baptisé': 'baptized',
              'Départements': 'departments',
              'Téléphone': 'phone',
              'Tél. Secondaire': 'secondaryPhone',
              'WhatsApp': 'whatsappPhone',
              'Email': 'email',
              'Profession': 'profession',
              'Adresse': 'address'
            };

            headers.forEach((header, index) => {
              const hTrim = header.trim().replace('\ufeff', '');
              const key = mapping[hTrim] || hTrim;
              let val = values[index]?.trim() || '';
              
              if (key === 'departments') {
                entry[key] = val ? val.split(',').map(d => d.trim()) : [];
              } else if (key === 'baptized') {
                entry[key] = val.toUpperCase() === 'OUI';
              } else if (['joinDate', 'baptizedDate', 'birthDate'].includes(key)) {
                entry[key] = parseFromUIDate(val);
              } else {
                entry[key] = val;
              }
            });
            importedData.push(entry);
          }
        } else {
          const json = JSON.parse(content);
          importedData = Array.isArray(json) ? json : [json];
        }

        const newMembers = importedData.map((m: any) => ({
          ...m,
          id: generateId(),
          lastName: (m.lastName || 'INCONNU').toUpperCase(),
          firstName: formatFirstName(m.firstName || 'Importé'),
          status: m.status || availableStatuses[0],
          type: m.type || availableRoles[availableRoles.length - 1],
          departments: m.departments || [],
          whatsapp: !!m.whatsappPhone || !!m.whatsapp,
          emergencyContact: m.emergencyContact || { name: '', phone: '', relation: '' }
        })) as Member[];

        setMembers(prev => [...newMembers, ...prev]);
        setIsImportModalOpen(false);
        setImportCount(newMembers.length);
        setIsImportSuccessOpen(true);
        // Persist to Supabase
        await Promise.all(newMembers.map(m => createMember(m)));
      } catch (err) {
        alert("Erreur lors de l'importation : Format de fichier invalide.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleExportMembers = () => {
    const rows = filteredMembers.map(m => [
      m.lastName,
      m.firstName,
      m.nickname || '',
      m.gender,
      m.maritalStatus,
      m.type,
      m.status,
      formatToUIDate(m.joinDate),
      formatToUIDate(m.baptizedDate),
      formatToUIDate(m.birthDate),
      m.baptized ? 'OUI' : 'NON',
      `"${m.departments.join(', ')}"`,
      m.phone || '',
      m.secondaryPhone || '',
      m.whatsappPhone || (m.whatsapp ? m.phone : '') || '',
      m.email || '',
      m.profession || '',
      `"${(m.address || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\ufeff" + [EXCEL_HEADERS.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vinea_membres_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingMember(null);
  };

  const handleModalSave = (saved: Member) => {
    setMembers(prev =>
      prev.find(m => m.id === saved.id)
        ? prev.map(m => m.id === saved.id ? saved : m)
        : [saved, ...prev]
    );
    setIsFormOpen(false);
    setEditingMember(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('Tous les statuts');
    roleFilter !== 'Tous les rôles' && setRoleFilter('Tous les rôles');
    setSortOrder('none');
  };

  const handlePhotoPreview = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    setPreviewImageUrl(url);
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestion des Membres</h2>
          <p className="text-sm text-slate-500 font-medium italic opacity-70">Administrez la base de données vivante de votre communauté Vinea.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-medium hover:bg-indigo-100 transition-all shadow-sm"
          >
            <Sparkles size={16} /> {isAnalyzing ? 'Analyse...' : 'Analyse IA'}
          </button>
          <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm group"
          >
            <ArrowUpFromLine size={16} className="group-hover:-translate-y-0.5 transition-transform" /> Importer
          </button>
          <button 
            onClick={handleExportMembers}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm group"
          >
            <Download size={16} className="group-hover:translate-y-0.5 transition-transform" /> Exporter
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
          >
            <Plus size={18} strokeWidth={3} /> Nouveau Membre
          </button>
        </div>
      </div>

      {/* ── Dashboard ── */}
      {!isLoadingData && stats.total > 0 && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
                <Users size={22} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total membres</p>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                {stats.enfantsTotal > 0 && (
                  <p className="text-xs text-indigo-500 font-medium mt-0.5">dont {stats.enfantsTotal} enfant{stats.enfantsTotal > 1 ? 's' : ''}</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
                <UserCheck size={22} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Actifs</p>
                <p className="text-3xl font-bold text-slate-900">{stats.actifs}</p>
                <p className="text-xs text-emerald-600 font-semibold uppercase mt-0.5">
                  {stats.total > 0 ? Math.round((stats.actifs / stats.total) * 100) : 0}% du total
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center border border-violet-100 shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Baptisés</p>
                <p className="text-3xl font-bold text-slate-900">{stats.baptises}</p>
                <p className="text-xs text-violet-600 font-semibold uppercase mt-0.5">
                  {stats.total > 0 ? Math.round((stats.baptises / stats.total) * 100) : 0}% du total
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 shrink-0">
                <PartyPopper size={22} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Anniversaires</p>
                <p className="text-3xl font-bold text-slate-900">{stats.anniversaires}</p>
                <p className="text-xs text-amber-600 font-semibold uppercase mt-0.5">Ce mois-ci</p>
              </div>
            </div>
          </div>

          {/* Départements + Genre */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top départements */}
            <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-5 flex items-center gap-2">
                <Briefcase size={12} /> Répartition par département
              </p>
              {stats.topDepts.length > 0 ? (
                <div className="space-y-3">
                  {stats.topDepts.map(([dept, count]) => (
                    <div key={dept} className="flex items-center gap-3">
                      <div className="w-28 shrink-0 flex items-center gap-1.5">
                        {getDepartmentIcon(dept, 10)}
                        <span className="text-xs font-semibold text-slate-500 truncate">{dept}</span>
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-indigo-500 transition-all duration-700"
                          style={{ width: `${Math.round((count / stats.maxDept) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-700 w-6 text-right shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Aucun département assigné</p>
              )}
            </div>

            {/* Genre + Statuts */}
            <div className="space-y-4">
              {/* Genre */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500 mb-4">Genre</p>
                <div className="flex gap-3">
                  <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                    <p className="text-xl font-semibold text-indigo-700">{stats.hommes}</p>
                    <p className="text-xs font-semibold text-indigo-400 uppercase mt-0.5">Hommes</p>
                    {stats.enfantsHommes > 0 && (
                      <p className="text-xs text-indigo-400 mt-1">dont {stats.enfantsHommes} enfant{stats.enfantsHommes > 1 ? 's' : ''}</p>
                    )}
                  </div>
                  <div className="flex-1 bg-pink-50 border border-pink-100 rounded-xl p-3 text-center">
                    <p className="text-xl font-semibold text-pink-600">{stats.femmes}</p>
                    <p className="text-xs font-semibold text-pink-400 uppercase mt-0.5">Femmes</p>
                    {stats.enfantsFemmes > 0 && (
                      <p className="text-xs text-pink-400 mt-1">dont {stats.enfantsFemmes} enfant{stats.enfantsFemmes > 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Statuts */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500 mb-4">Statuts</p>
                <div className="space-y-2">
                  {Object.entries(stats.parStatut).sort(([, a], [, b]) => b - a).map(([statut, count]) => (
                    <div key={statut} className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">{statut}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-indigo-400 transition-all duration-500"
                            style={{ width: `${stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-700 w-4 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filtres & Table ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher un membre..." 
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-300 outline-none text-xs font-bold transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="md:col-span-3 flex flex-wrap gap-2 items-center">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer hover:bg-slate-50 transition-all"
          >
            <option>Tous les statuts</option>
            {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer hover:bg-slate-50 transition-all"
          >
            <option>Tous les rôles</option>
            {availableRoles.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <button 
            onClick={toggleSort}
            className={cn(
              "flex items-center gap-2 px-4 py-3 bg-white border rounded-xl text-xs font-medium transition-all shadow-sm",
              sortOrder !== 'none' ? "text-indigo-600 border-indigo-200 bg-indigo-50/30" : "text-slate-500 border-slate-200 hover:bg-slate-50"
            )}
          >
            {sortOrder === 'asc' ? <ArrowUp size={16} /> : sortOrder === 'desc' ? <ArrowDown size={16} /> : <ArrowUpDown size={16} />}
            Prénom
          </button>

          <button onClick={resetFilters} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-all shadow-sm active:scale-90" title="Réinitialiser les filtres"><RotateCcw size={18} /></button>
        </div>
      </div>

      <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />

      <Card className="p-0 overflow-hidden border-slate-200 shadow-sm rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th 
                  className="px-8 py-5 text-xs font-medium text-slate-500 cursor-pointer hover:text-indigo-600 transition-colors group"
                  onClick={toggleSort}
                >
                  <div className="flex items-center gap-2">
                    Membre
                    {sortOrder === 'asc' && <ArrowUp size={12} className="text-indigo-600" />}
                    {sortOrder === 'desc' && <ArrowDown size={12} className="text-indigo-600" />}
                    {sortOrder === 'none' && <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-8 py-5 text-xs font-medium text-slate-500">Rôle</th>
                <th className="px-8 py-5 text-xs font-medium text-slate-500">Statut</th>
                <th className="px-8 py-5 text-xs font-medium text-slate-500">Départements</th>
                <th className="px-8 py-5 text-xs font-medium text-slate-500">Contact</th>
                <th className="px-8 py-5 text-xs font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length > 0 ? filteredMembers.map((member) => {
                return (
                  <tr 
                    key={member.id} 
                    className="hover:bg-indigo-50/30 transition-colors cursor-pointer group even:bg-slate-50/30 active:scale-[0.998]"
                    onClick={() => handleOpenDetails(member)}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <Avatar
                          firstName={member.firstName}
                          lastName={member.lastName}
                          photoUrl={member.photoUrl}
                          size="lg"
                          shape="card"
                          className="group-hover:scale-105 transition-transform shadow-sm border border-white/60"
                          onPhotoClick={member.photoUrl ? () => setPreviewImageUrl(member.photoUrl!) : undefined}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate tracking-tight">
                            {formatFirstName(member.firstName)} <span className="uppercase">{member.lastName}</span>
                          </p>
                          <p className="text-xs text-slate-400 font-bold truncate">{getDisplayNickname(member.firstName, member.nickname, member.gender)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5"><span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/50 shadow-sm">{member.type}</span></td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full shadow-sm", member.status === 'Actif' ? "bg-emerald-500 animate-pulse" : "bg-slate-300")}></span>
                        <span className="text-xs text-slate-500">{member.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {member.departments.length > 0 ? member.departments.map(dept => (
                          <span key={dept} className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold border uppercase inline-flex items-center gap-1.5 transition-all hover:scale-105 shadow-sm", getDepartmentColor(dept))}>{getDepartmentIcon(dept, 10)}{dept}</span>
                        )) : <span className="text-xs text-slate-400 italic">Aucun</span>}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-700"><Phone size={12} className="text-slate-300" /><span>{member.phone ? formatPhone(member.phone) : '---'}</span></div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                          <Phone size={12} className="text-slate-300 opacity-50" />
                          <span className="truncate max-w-[120px]">{member.secondaryPhone ? formatPhone(member.secondaryPhone) : '---'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleEditClick(member)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm" title="Modifier"><Edit size={16} /></button>
                        {canDelete('members') && <button onClick={() => handleDeleteClick(member.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm" title="Supprimer"><Trash2 size={16} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={10} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-300">
                      <Users size={64} strokeWidth={1.5} className="opacity-40 mb-2" />
                      <p className="text-sm font-medium">Base de données vide</p>
                      <button onClick={() => setIsFormOpen(true)} className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-medium shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">Inscrire le premier membre</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Image Preview Modal */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setPreviewImageUrl(null)} />
          <div className="relative max-w-4xl max-h-[90vh] animate-in zoom-in-95 duration-200">
            <button onClick={() => setPreviewImageUrl(null)} className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"><X size={32} /></button>
            <img src={previewImageUrl} alt="Aperçu" className="w-auto h-auto max-w-full max-h-[80vh] rounded-3xl shadow-2xl border-4 border-white/10" />
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsImportModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-slate-100">
            <div className="bg-indigo-600 p-10 text-white shrink-0 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><Upload size={180} /></div>
               <div className="relative z-10 space-y-2">
                 <h3 className="text-3xl font-semibold">Vinea Sync : Importer</h3>
                 <p className="text-xs text-indigo-200">Synchronisation de la base membres</p>
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
                          L'importation vous permet de charger des centaines de membres instantanément. Suivez scrupuleusement ces étapes pour garantir l'intégrité de vos données spirituelles et administratives.
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                           <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-xs font-semibold text-indigo-600 shadow-sm">1</div>
                              <span className="text-xs font-semibold text-slate-600">Utilisez obligatoirement notre fichier modèle.</span>
                           </div>
                           <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-xs font-semibold text-indigo-600 shadow-sm">2</div>
                              <span className="text-xs font-semibold text-slate-600">Format Date : <strong>JJ-MM-AAAA</strong> (ex: 31-12-1990).</span>
                           </div>
                           <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-xs font-semibold text-indigo-600 shadow-sm">3</div>
                              <span className="text-xs font-semibold text-slate-600">Baptisé : Répondre par <strong>OUI</strong> ou <strong>NON</strong>.</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-5 transition-all hover:shadow-xl hover:shadow-indigo-500/5">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><FileSpreadsheet size={24}/></div>
                        <div>
                          <h5 className="text-xs font-semibold text-indigo-900">Phase 1 : Structure</h5>
                          <p className="text-xs text-indigo-700 leading-relaxed mt-1 opacity-70">Récupérez le modèle vierge formaté.</p>
                        </div>
                        <button 
                          onClick={handleDownloadTemplate}
                          className="w-full py-4 bg-white text-indigo-600 rounded-2xl text-xs font-medium hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-200 flex items-center justify-center gap-2 active:scale-95"
                        >
                          <Download size={14}/> Télécharger le modèle
                        </button>
                     </div>

                     <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-5 transition-all hover:shadow-xl hover:shadow-emerald-500/5">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm"><Upload size={24}/></div>
                        <div>
                          <h5 className="text-xs font-semibold text-emerald-900">Phase 2 : Injection</h5>
                          <p className="text-xs text-emerald-700 leading-relaxed mt-1 opacity-70">Chargez votre fichier rempli (CSV ou JSON).</p>
                        </div>
                        <button 
                          onClick={triggerImportFile}
                          className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-xs font-medium hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2 active:scale-95"
                        >
                          <FileSpreadsheet size={14}/> Parcourir fichiers
                        </button>
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-10 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
               <p className="text-xs font-medium text-slate-500">Vinea v1.5.2 • Système Sync</p>
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
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] p-10 text-center animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl border-4 border-white/50 animate-bounce">
              <CheckCircle2 size={48} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900">Importation Réussie</h3>
            <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed italic">
              Vinea Sync a traité vos données avec succès. <strong>{importCount}</strong> nouveau(x) membre(s) ont été intégrés à votre communauté.
            </p>
            <div className="mt-10">
              <button 
                onClick={() => setIsImportSuccessOpen(false)} 
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-xs font-medium shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
              >
                Accéder à la liste
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50"><AlertTriangle size={40} /></div>
            <h3 className="text-2xl font-semibold text-slate-900 leading-tight tracking-tight">Supprimer ?</h3>
            <p className="text-slate-500 mt-3 text-sm font-medium leading-relaxed">Cette action est irréversible.</p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-sm font-semibold hover:bg-rose-700 transition-all shadow-xl shadow-rose-200">Supprimer</button>
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all border border-slate-200">Annuler</button>
            </div>
          </div>
        </div>
      )}


      {isFormOpen && (
        <MemberEditModal
          member={editingMember}
          allMembers={members}
          availableRoles={availableRoles}
          availableStatuses={availableStatuses}
          availableDepartments={availableDepartments}
          onSave={handleModalSave}
          onClose={closeForm}
        />
      )}
      <input type="file" ref={importInputRef} onChange={handleImportFile} accept=".json,.csv" className="hidden" />
    </div>
  );
};

export default Members;