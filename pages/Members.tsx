import React, { useState, useRef, useEffect, useMemo } from 'react';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import MemberDetails from '../components/MemberDetails';
import { 
  Search, 
  Plus, 
  Upload, 
  Download,
  Filter, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  Sparkles, 
  X,
  User,
  Save,
  Briefcase,
  AlertTriangle,
  Trash2,
  Edit,
  AlertCircle,
  Camera,
  ImageIcon,
  RotateCcw,
  Layout,
  Check,
  Maximize2,
  Flame,
  Heart,
  Music,
  Home,
  GraduationCap,
  Mic2,
  Users,
  Baby,
  Shield,
  Zap,
  Coins,
  BookOpen,
  Languages,
  HandHeart,
  Monitor,
  Palette,
  Calendar,
  FileSpreadsheet,
  Info,
  CheckCircle2,
  FileJson,
  ArrowRight,
  PartyPopper,
  ShieldCheck,
  ArrowUpFromLine,
  UserCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { formatPhone, DEPARTMENTS as CONST_DEPARTMENTS } from '../constants';
import { Member, MemberStatus, MemberType, Department } from '../types';
import { analyzePageData } from '../lib/gemini';
import { cn, generateId, getInitials, getDisplayNickname, formatFirstName } from '../utils';
import { getMembers, createMember, updateMember, deleteMember, getDiscipleshipPairs, getAppConfig } from '../lib/db';

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

const getDepartmentColor = (dept: string) => {
  if (dept.includes('Accueil')) return "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (dept.includes('Enfants')) return "bg-orange-50 text-orange-600 border-orange-100";
  if (dept.includes('Entretien')) return "bg-slate-50 text-slate-600 border-slate-100";
  if (dept.includes('Évangélisation')) return "bg-rose-50 text-rose-600 border-rose-100";
  if (dept.includes('Femmes')) return "bg-pink-50 text-pink-600 border-pink-100";
  if (dept.includes('Finance')) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (dept.includes('Intercession')) return "bg-purple-50 text-purple-600 border-purple-100";
  if (dept.includes('Jeunes')) return "bg-amber-50 text-amber-600 border-amber-100";
  if (dept.includes('Louange')) return "bg-violet-50 text-violet-600 border-violet-100";
  return "bg-slate-50 text-slate-500 border-slate-100";
};

const getDepartmentIcon = (dept: string, size = 10) => {
  if (dept.includes('Accueil')) return <Users size={size} />;
  if (dept.includes('Enfants')) return <Baby size={size} />;
  if (dept.includes('Entretien')) return <Palette size={size} />;
  if (dept.includes('Évangélisation')) return <Flame size={size} />;
  if (dept.includes('Femmes')) return <Heart size={size} />;
  if (dept.includes('Finance')) return <Coins size={size} />;
  if (dept.includes('Intercession')) return <HandHeart size={size} />;
  if (dept.includes('Jeunes')) return <Zap size={size} />;
  if (dept.includes('Louange')) return <Music size={size} />;
  return <Briefcase size={size} />;
};

const Members: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [discipleshipPairs, setDiscipleshipPairs] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous les statuts');
  const [roleFilter, setRoleFilter] = useState<string>('Tous les rôles');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');

  const [availableStatuses] = useState<string[]>(Object.values(MemberStatus));
  const [availableRoles] = useState<string[]>(Object.values(MemberType));
  const [availableDepartments, setAvailableDepartments] = useState<string[]>(CONST_DEPARTMENTS);

  useEffect(() => {
    const load = async () => {
      setIsLoadingData(true);
      const [m, p, depts] = await Promise.all([getMembers(), getDiscipleshipPairs(), getAppConfig('departments')]);
      if (depts && Array.isArray(depts)) setAvailableDepartments(depts);
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportSuccessOpen, setIsImportSuccessOpen] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [memberToDeleteId, setMemberToDeleteId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nouveaux états pour la recherche du conjoint
  const [spouseSearch, setSpouseSearch] = useState('');
  const [isSpouseDropdownOpen, setIsSpouseDropdownOpen] = useState(false);

  const initialState: Partial<Member> = {
    lastName: '',
    firstName: '',
    nickname: '',
    gender: 'Masculin',
    maritalStatus: 'Célibataire',
    spouseName: '',
    type: availableRoles[availableRoles.length - 1] as MemberType,
    status: availableStatuses[0] as MemberStatus,
    departments: [],
    whatsapp: true,
    phone: '',
    secondaryPhone: '',
    whatsappPhone: '',
    email: '',
    photoUrl: '',
    profession: '',
    joinDate: '',
    baptizedDate: '',
    birthDate: '',
    address: '',
    baptized: false
  };

  const [formData, setFormData] = useState<Partial<Member>>(initialState);

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
      result.sort((a, b) => a.firstName.localeCompare(b.firstName));
    } else if (sortOrder === 'desc') {
      result.sort((a, b) => b.firstName.localeCompare(a.firstName));
    }

    return result;
  }, [members, searchTerm, statusFilter, roleFilter, sortOrder]);

  const stats = useMemo(() => {
    const total = members.length;
    const actifs = members.filter(m => (m.status as string).toLowerCase().includes('actif')).length;
    const baptises = members.filter(m => m.baptized).length;
    const hommes = members.filter(m => m.gender === 'Masculin').length;
    const femmes = members.filter(m => m.gender === 'Féminin').length;

    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const anniversaires = members.filter(m => {
      if (!m.birthDate) return false;
      const parts = m.birthDate.split('-');
      return parts.length >= 2 && parseInt(parts[1]) === thisMonth;
    }).length;

    const parStatut: Record<string, number> = {};
    members.forEach(m => { parStatut[m.status] = (parStatut[m.status] || 0) + 1; });

    const parDept: Record<string, number> = {};
    members.forEach(m => { (m.departments || []).forEach(d => { parDept[d] = (parDept[d] || 0) + 1; }); });
    const topDepts = Object.entries(parDept).sort(([, a], [, b]) => b - a).slice(0, 6);
    const maxDept = topDepts[0]?.[1] || 1;

    return { total, actifs, baptises, hommes, femmes, anniversaires, parStatut, topDepts, maxDept };
  }, [members]);


    setSelectedMember(member);
    setIsDetailsOpen(true);
  };

  const handleEditClick = (member: Member) => {
    setEditingMemberId(member.id);
    setFormData({ ...member });
    setSpouseSearch(member.spouseName || '');
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleDepartment = (dept: string) => {
    const currentDepts = formData.departments || [];
    if (currentDepts.includes(dept as Department)) {
      setFormData({ ...formData, departments: currentDepts.filter(d => d !== dept) });
    } else {
      setFormData({ ...formData, departments: [...currentDepts, dept as Department] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lastName || !formData.firstName) return;

    const formattedFirstName = formatFirstName(formData.firstName);
    const formattedLastName = formData.lastName.toUpperCase();
    const currentMemberFullName = `${formattedFirstName} ${formattedLastName}`;

    let memberToSave: Member;
    let newMembersList: Member[] = [...members];

    if (editingMemberId) {
      const existing = members.find(m => m.id === editingMemberId)!;
      memberToSave = { ...existing, ...formData, firstName: formattedFirstName, lastName: formattedLastName } as Member;
      newMembersList = newMembersList.map(m => m.id === editingMemberId ? memberToSave : m);
      await updateMember(editingMemberId, memberToSave);
    } else {
      memberToSave = {
        ...formData as Member,
        id: generateId(),
        firstName: formattedFirstName,
        lastName: formattedLastName,
        emergencyContact: formData.emergencyContact || { name: '', phone: '', relation: '' },
        source: formData.source || 'Direct',
        isDiscipleMaker: formData.isDiscipleMaker || false,
        baptized: formData.baptized || !!formData.baptizedDate,
        whatsapp: formData.whatsapp || false,
        whatsappPhone: formData.whatsappPhone || '',
        departments: formData.departments || [],
        profession: formData.profession || ''
      };
      newMembersList = [memberToSave, ...newMembersList];
      await createMember(memberToSave);
    }

    // Mise à jour bidirectionnelle du conjoint si identifié dans la base
    if (formData.maritalStatus === 'Marié(e)' && formData.spouseName) {
      const spouseSearchLower = formData.spouseName.toLowerCase();
      const spouseIndex = newMembersList.findIndex(m => {
        if (m.id === memberToSave.id) return false;
        const fullName = `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`.toLowerCase();
        const nickname = (m.nickname || '').toLowerCase();
        return fullName === spouseSearchLower || nickname === spouseSearchLower;
      });

      if (spouseIndex !== -1) {
        const updatedSpouse = {
          ...newMembersList[spouseIndex],
          maritalStatus: 'Marié(e)',
          spouseName: currentMemberFullName
        };
        newMembersList[spouseIndex] = updatedSpouse;
        await updateMember(updatedSpouse.id, { maritalStatus: 'Marié(e)', spouseName: currentMemberFullName });
      }
    }

    setMembers(newMembersList);
    setIsFormOpen(false);
    setEditingMemberId(null);
    setFormData(initialState);
    setSpouseSearch('');
    setIsSpouseDropdownOpen(false);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingMemberId(null);
    setFormData(initialState);
    setSpouseSearch('');
    setIsSpouseDropdownOpen(false);
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
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Gestion des Membres</h2>
          <p className="text-sm text-slate-500 font-medium italic opacity-70">Administrez la base de données vivante de votre communauté Vinea.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-[10px] font-black hover:bg-indigo-100 transition-all uppercase tracking-widest shadow-sm"
          >
            <Sparkles size={16} /> {isAnalyzing ? 'Analyse...' : 'Analyse IA'}
          </button>
          <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest shadow-sm group"
          >
            <ArrowUpFromLine size={16} className="group-hover:-translate-y-0.5 transition-transform" /> Importer
          </button>
          <button 
            onClick={handleExportMembers}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest shadow-sm group"
          >
            <Download size={16} className="group-hover:translate-y-0.5 transition-transform" /> Exporter
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 uppercase tracking-widest active:scale-95"
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total membres</p>
                <p className="text-3xl font-black text-slate-900">{stats.total}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
                <UserCheck size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actifs</p>
                <p className="text-3xl font-black text-slate-900">{stats.actifs}</p>
                <p className="text-[9px] text-emerald-600 font-black uppercase mt-0.5">
                  {stats.total > 0 ? Math.round((stats.actifs / stats.total) * 100) : 0}% du total
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center border border-violet-100 shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Baptisés</p>
                <p className="text-3xl font-black text-slate-900">{stats.baptises}</p>
                <p className="text-[9px] text-violet-600 font-black uppercase mt-0.5">
                  {stats.total > 0 ? Math.round((stats.baptises / stats.total) * 100) : 0}% du total
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 shrink-0">
                <PartyPopper size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anniversaires</p>
                <p className="text-3xl font-black text-slate-900">{stats.anniversaires}</p>
                <p className="text-[9px] text-amber-600 font-black uppercase mt-0.5">Ce mois-ci</p>
              </div>
            </div>
          </div>

          {/* Départements + Genre */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top départements */}
            <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                <Briefcase size={12} /> Répartition par département
              </p>
              {stats.topDepts.length > 0 ? (
                <div className="space-y-3">
                  {stats.topDepts.map(([dept, count]) => (
                    <div key={dept} className="flex items-center gap-3">
                      <div className="w-28 shrink-0 flex items-center gap-1.5">
                        {getDepartmentIcon(dept, 10)}
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight truncate">{dept}</span>
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-indigo-500 transition-all duration-700"
                          style={{ width: `${Math.round((count / stats.maxDept) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-slate-700 w-6 text-right shrink-0">{count}</span>
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Genre</p>
                <div className="flex gap-3">
                  <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-indigo-700">{stats.hommes}</p>
                    <p className="text-[9px] font-black text-indigo-400 uppercase mt-0.5">Hommes</p>
                  </div>
                  <div className="flex-1 bg-pink-50 border border-pink-100 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-pink-600">{stats.femmes}</p>
                    <p className="text-[9px] font-black text-pink-400 uppercase mt-0.5">Femmes</p>
                  </div>
                </div>
              </div>

              {/* Statuts */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Statuts</p>
                <div className="space-y-2">
                  {Object.entries(stats.parStatut).sort(([, a], [, b]) => b - a).map(([statut, count]) => (
                    <div key={statut} className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">{statut}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-indigo-400 transition-all duration-500"
                            style={{ width: `${stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-slate-700 w-4 text-right">{count}</span>
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
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm uppercase tracking-widest cursor-pointer hover:bg-slate-50 transition-all"
          >
            <option>Tous les statuts</option>
            {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm uppercase tracking-widest cursor-pointer hover:bg-slate-50 transition-all"
          >
            <option>Tous les rôles</option>
            {availableRoles.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <button 
            onClick={toggleSort}
            className={cn(
              "flex items-center gap-2 px-4 py-3 bg-white border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
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

      <Card className="p-0 overflow-hidden border-slate-200 shadow-sm rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th 
                  className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] cursor-pointer hover:text-indigo-600 transition-colors group"
                  onClick={toggleSort}
                >
                  <div className="flex items-center gap-2">
                    Membre
                    {sortOrder === 'asc' && <ArrowUp size={12} className="text-indigo-600" />}
                    {sortOrder === 'desc' && <ArrowDown size={12} className="text-indigo-600" />}
                    {sortOrder === 'none' && <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" />}
                  </div>
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Rôle</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Statut</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Départements</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Contact</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-right">Actions</th>
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
                        <div 
                          onClick={(e) => member.photoUrl && handlePhotoPreview(e, member.photoUrl)}
                          className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 font-black text-lg overflow-hidden border border-slate-200 group-hover:scale-105 transition-transform shrink-0 relative group/photo shadow-sm"
                        >
                          {member.photoUrl ? (
                            <>
                              <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 size={16} className="text-white" /></div>
                            </>
                          ) : getInitials(member.firstName, member.lastName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate tracking-tight">
                            {formatFirstName(member.firstName)} <span className="uppercase">{member.lastName}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] truncate">{getDisplayNickname(member.firstName, member.nickname, member.gender)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5"><span className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg uppercase tracking-widest border border-indigo-100/50 shadow-sm">{member.type}</span></td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full shadow-sm", member.status === 'Actif' ? "bg-emerald-500 animate-pulse" : "bg-slate-300")}></span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{member.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {member.departments.length > 0 ? member.departments.map(dept => (
                          <span key={dept} className={cn("px-2.5 py-1 rounded-lg text-[8px] font-black border uppercase inline-flex items-center gap-1.5 transition-all hover:scale-105 shadow-sm", getDepartmentColor(dept))}>{getDepartmentIcon(dept, 10)}{dept}</span>
                        )) : <span className="text-[9px] font-bold text-slate-300 italic uppercase">Aucun</span>}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-700"><Phone size={12} className="text-slate-300" /><span>{member.phone ? formatPhone(member.phone) : '---'}</span></div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                          <Phone size={12} className="text-slate-300 opacity-50" />
                          <span className="truncate max-w-[120px]">{member.secondaryPhone ? formatPhone(member.secondaryPhone) : '---'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleEditClick(member)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm" title="Modifier"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteClick(member.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm" title="Supprimer"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={10} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-300">
                      <Users size={64} strokeWidth={1} className="opacity-20 mb-2" />
                      <p className="text-sm font-black uppercase tracking-[0.3em]">Base de données vide</p>
                      <button onClick={() => setIsFormOpen(true)} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Inscrire le premier membre</button>
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
          <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-slate-100">
            <div className="bg-indigo-600 p-10 text-white shrink-0 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><Upload size={180} /></div>
               <div className="relative z-10 space-y-2">
                 <h3 className="text-3xl font-black uppercase tracking-tight">Vinea Sync : Importer</h3>
                 <p className="text-xs font-bold text-indigo-100 uppercase tracking-[0.2em]">Synchronisation de la base membres</p>
               </div>
               <button onClick={() => setIsImportModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={20} /></button>
            </div>
            
            <div className="p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
               <div className="space-y-8">
                  <div className="flex items-start gap-5 p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                     <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100"><Info size={24}/></div>
                     <div className="space-y-4">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">Processus d'importation assistée</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                          L'importation vous permet de charger des centaines de membres instantanément. Suivez scrupuleusement ces étapes pour garantir l'intégrité de vos données spirituelles et administratives.
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                           <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm">1</div>
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Utilisez obligatoirement notre fichier modèle.</span>
                           </div>
                           <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm">2</div>
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Format Date : <strong>JJ-MM-AAAA</strong> (ex: 31-12-1990).</span>
                           </div>
                           <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm">3</div>
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Baptisé : Répondre par <strong>OUI</strong> ou <strong>NON</strong>.</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[2.5rem] space-y-5 transition-all hover:shadow-xl hover:shadow-indigo-500/5">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><FileSpreadsheet size={24}/></div>
                        <div>
                          <h5 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">Phase 1 : Structure</h5>
                          <p className="text-[9px] text-indigo-700 font-bold uppercase leading-relaxed mt-1 opacity-70">Récupérez le modèle vierge formaté.</p>
                        </div>
                        <button 
                          onClick={handleDownloadTemplate}
                          className="w-full py-4 bg-white text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-200 flex items-center justify-center gap-2 active:scale-95"
                        >
                          <Download size={14}/> Télécharger le modèle
                        </button>
                     </div>

                     <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-[2.5rem] space-y-5 transition-all hover:shadow-xl hover:shadow-emerald-500/5">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm"><Upload size={24}/></div>
                        <div>
                          <h5 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">Phase 2 : Injection</h5>
                          <p className="text-[9px] text-emerald-700 font-bold uppercase leading-relaxed mt-1 opacity-70">Chargez votre fichier rempli (CSV ou JSON).</p>
                        </div>
                        <button 
                          onClick={triggerImportFile}
                          className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2 active:scale-95"
                        >
                          <FileSpreadsheet size={14}/> Parcourir fichiers
                        </button>
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-10 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vinea v1.5.2 • Système Sync</p>
               <button onClick={() => setIsImportModalOpen(false)} className="px-8 py-3 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
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
          <div className="relative w-full max-w-sm bg-white rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] p-10 text-center animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl border-4 border-white/50 animate-bounce">
              <CheckCircle2 size={48} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Importation Réussie</h3>
            <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed italic">
              Vinea Sync a traité vos données avec succès. <strong>{importCount}</strong> nouveau(x) membre(s) ont été intégrés à votre communauté.
            </p>
            <div className="mt-10">
              <button 
                onClick={() => setIsImportSuccessOpen(false)} 
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
              >
                Accéder à la liste
              </button>
            </div>
          </div>
        </div>
      )}

      <MemberDetails 
        member={selectedMember} 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onPreviewPhoto={(url) => setPreviewImageUrl(url)}
      />

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50"><AlertTriangle size={40} /></div>
            <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight uppercase">Supprimer ?</h3>
            <p className="text-slate-500 mt-3 text-sm font-medium leading-relaxed">Cette action est irréversible.</p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-sm font-black hover:bg-rose-700 transition-all shadow-xl shadow-rose-200">Supprimer</button>
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all border border-slate-200">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={closeForm}></div>
          <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[2.5rem] overflow-hidden max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white shrink-0">
              <div><h3 className="text-xl font-black tracking-tight">{editingMemberId ? 'Modifier le Membre' : 'Ajouter un Membre'}</h3><p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mt-0.5">Vinea Management</p></div>
              <button onClick={closeForm} className="p-2.5 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/30">
              <div className="flex flex-col items-center mb-6">
                <div onClick={() => fileInputRef.current?.click()} className="group relative w-32 h-32 rounded-[2.5rem] bg-white border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all overflow-hidden shadow-sm">
                  {formData.photoUrl ? <><img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Edit className="text-white" size={24} /></div></> : <div className="flex flex-col items-center text-slate-400 group-hover:text-indigo-500 transition-colors"><Camera size={32} strokeWidth={1.5} /><span className="text-[10px] font-black uppercase tracking-widest mt-2">Photo</span></div>}
                </div>
                <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" /><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-3">Cliquez pour ajouter une photo</p>
              </div>
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2"><User size={16} className="text-indigo-600" /><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Identité</h4></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénoms</label><input type="text" required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="Prénoms" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label><input type="text" required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value.toUpperCase()})} placeholder="NOM" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rôle / Fonction</label><select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value as MemberType})} className="w-full px-4 py-3 bg-indigo-50 border-none rounded-2xl outline-none text-[10px] font-black text-indigo-700 uppercase">{availableRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut Actuel</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as MemberStatus})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[10px] font-black text-slate-700 uppercase">{availableStatuses.map(stat => <option key={stat} value={stat}>{stat}</option>)}</select></div>
                  </div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Surnom / Petit nom</label><input type="text" value={formData.nickname || ''} onChange={(e) => setFormData({...formData, nickname: e.target.value})} placeholder="Ex: JP" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sexe</label><select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold"><option value="Masculin">Masculin</option><option value="Féminin">Féminin</option></select></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">État Civil</label><select value={formData.maritalStatus} onChange={(e) => setFormData({...formData, maritalStatus: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold"><option value="Célibataire">Célibataire</option><option value="Marié(e)">Marié(e)</option><option value="Veuf/Veuve">Veuf/Veuve</option><option value="Fiancé(e)">Fiancé(e)</option></select></div>
                  </div>

                  {/* Champ conditionnel Nom du Conjoint avec recherche */}
                  {formData.maritalStatus === 'Marié(e)' && (
                    <div className="space-y-1.5 relative animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Heart size={12} className="text-rose-500" /> Nom du Conjoint(e)
                      </label>
                      <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          value={spouseSearch}
                          onChange={(e) => {
                            setSpouseSearch(e.target.value);
                            setFormData({...formData, spouseName: e.target.value});
                            setIsSpouseDropdownOpen(true);
                          }}
                          onFocus={() => setIsSpouseDropdownOpen(true)}
                          placeholder="Chercher ou saisir le nom..."
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-rose-300 transition-all shadow-sm"
                        />
                      </div>
                      {isSpouseDropdownOpen && spouseSearch.length >= 2 && (
                        <div className="absolute z-30 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl custom-scrollbar">
                          {members.filter(m => {
                            if (editingMemberId && m.id === editingMemberId) return false;
                            const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
                            const nick = (m.nickname || '').toLowerCase();
                            const s = spouseSearch.toLowerCase();
                            return fullName.includes(s) || nick.includes(s);
                          }).map(m => (
                            <button 
                              key={m.id} 
                              type="button" 
                              onClick={() => { 
                                const name = `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`;
                                setFormData({...formData, spouseName: name});
                                setSpouseSearch(name);
                                setIsSpouseDropdownOpen(false);
                              }} 
                              className="w-full text-left px-4 py-3 text-[10px] font-black uppercase hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center gap-3"
                            >
                              <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 text-[8px] font-black text-slate-400 uppercase">
                                {m.photoUrl ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" /> : getInitials(m.firstName, m.lastName)}
                              </div>
                              <span className="text-slate-700">{formatFirstName(m.firstName)} {m.lastName.toUpperCase()}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de naissance</label><input type="date" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Profession (Facultatif)</label><input type="text" value={formData.profession} onChange={(e) => setFormData({...formData, profession: e.target.value})} placeholder="Ex: Comptable, Étudiant..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold" /></div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2"><Calendar size={16} className="text-indigo-600" /><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Jalons Spirituels & Adhésion</h4></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date d'adhésion</label><input type="date" value={formData.joinDate} onChange={(e) => setFormData({...formData, joinDate: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold shadow-sm" /></div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de baptême</label>
                      <div className="flex gap-2">
                         <input type="date" value={formData.baptizedDate} onChange={(e) => setFormData({...formData, baptizedDate: e.target.value, baptized: !!e.target.value})} className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold shadow-sm" />
                         <button type="button" onClick={() => setFormData({...formData, baptized: !formData.baptized})} className={cn("px-4 rounded-2xl text-[10px] font-black uppercase transition-all", formData.baptized ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400")}>
                           {formData.baptized ? 'OUI' : 'NON'}
                         </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2"><Plus size={16} className="text-indigo-600" /><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Engagement & Ministères</h4></div>
                  <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Départements affectés</label><div className="grid grid-cols-1 gap-2">{availableDepartments.map(dept => { const isSelected = formData.departments?.includes(dept as Department); return (<button key={dept} type="button" onClick={() => toggleDepartment(dept)} className={cn("flex items-center justify-between px-4 py-2.5 rounded-xl border text-[11px] font-black uppercase transition-all duration-200", isSelected ? cn(getDepartmentColor(dept), "ring-2 ring-indigo-500/20") : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50")}><div className="flex items-center gap-3">{getDepartmentIcon(dept as Department, 14)}{dept}</div>{isSelected && <Check size={14} strokeWidth={3} />}</button>); })}</div></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2"><Phone size={16} className="text-emerald-600" /><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Coordonnées</h4></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone Principal</label><input type="tel" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="07 08 09 10 11" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold transition-all" /></div>
                     <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone Secondaire</label><input type="tel" value={formData.secondaryPhone || ''} onChange={(e) => setFormData({...formData, secondaryPhone: e.target.value})} placeholder="07 08 09 10 11" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold transition-all" /></div>
                  </div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Numéro WhatsApp (Optionnel)</label><input type="tel" value={formData.whatsappPhone || ''} onChange={(e) => setFormData({...formData, whatsappPhone: e.target.value})} placeholder="07 08 09 10 11" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold transition-all" /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label><input type="email" value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@exemple.com" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold transition-all" /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse physique</label><textarea rows={3} value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Ex: Cocody, Rue de la Paix" className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[2rem] outline-none text-sm font-medium resize-none shadow-sm transition-all" /></div>
                </div>
              </div>
              <div className="pt-8 flex gap-4">
                <button type="button" onClick={closeForm} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Annuler</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"><Save size={14} /> Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <input type="file" ref={importInputRef} onChange={handleImportFile} accept=".json,.csv" className="hidden" />
    </div>
  );
};

export default Members;