
import React, { useState, useRef, useEffect } from 'react';
import Card from '../components/Card';
import { 
  Settings as SettingsIcon, 
  User, 
  UserCheck,
  Church, 
  Bell, 
  Shield, 
  Globe, 
  Save, 
  Database, 
  Cpu, 
  Mail, 
  Phone, 
  MapPin, 
  Lock,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  CalendarDays,
  ListTodo,
  UserPlus,
  Camera,
  Upload,
  Palette,
  CheckSquare,
  ShieldCheck,
  UserCircle,
  Info,
  KeyRound,
  ShieldAlert,
  LogOut,
  Monitor,
  Tablet,
  Download,
  RefreshCw,
  Zap,
  History as HistoryIcon,
  Languages,
  Clock3,
  UserRound,
  Users as UsersIcon,
  ShieldQuestion,
  UserCog,
  Loader2,
  Briefcase,
  LayoutDashboard,
  Target,
  ClipboardList,
  UsersRound,
  Calendar,
  Wallet,
  BookOpen,
  BarChart3,
  FileJson,
  RotateCcw,
  FileUp,
  Files,
  DatabaseBackup,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Cake,
  UserRoundCheck
} from 'lucide-react';
import { cn, generateId, formatFirstName } from '../utils';
import { SERVICES_LIST, DEPARTMENTS as CONST_DEPARTMENTS } from '../constants';
import { MemberStatus, VisitorStatus, MemberType, NotificationSettings } from '../types';
import { getChurchSettings, upsertChurchSettings, getAdminUsers, upsertAdminUser, deleteAdminUser, getAppConfig, setAppConfig } from '../lib/db';
import { supabase } from '../lib/supabase';

interface ListManagerProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: string[];
  onUpdate: (newItems: string[]) => void;
  onRename?: (oldValue: string, newValue: string) => void;
  placeholder: string;
  warningText: string;
}

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: 'Actif' | 'Inactif';
  avatar: string;
  lastActive: string;
  permissions: string[];
}

const AVAILABLE_MODULES = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'members', label: 'Membres', icon: UsersIcon },
  { id: 'visitors', label: 'Visiteurs', icon: UserPlus },
  { id: 'spiritual', label: 'Spirituel', icon: Zap },
  { id: 'discipleship', label: 'Discipolat', icon: Target },
  { id: 'attendance', label: 'Présence', icon: ClipboardList },
  { id: 'planning', label: 'Planning', icon: Briefcase },
  { id: 'services', label: 'Nos cultes', icon: Church },
  { id: 'meetings', label: 'Réunions', icon: UsersRound },
  { id: 'events', label: 'Evénements', icon: Calendar },
  { id: 'finances', label: 'Finances', icon: Wallet },
  { id: 'meditations', label: 'Méditations', icon: BookOpen },
  { id: 'reports', label: 'Rapports', icon: BarChart3 },
  { id: 'settings', label: 'Paramètres', icon: SettingsIcon },
];

const AVATAR_OPTIONS = [
  'Jean', 'Marie', 'Paul', 'Sarah', 'David', 'Esther', 'Samuel', 'Ruth', 'Isaac', 'Rebecca'
];

const TIMEZONES = [
  { value: 'Pacific/Midway', label: '(GMT-11:00) Midway' },
  { value: 'America/Anchorage', label: '(GMT-09:00) Alaska' },
  { value: 'America/Los_Angeles', label: '(GMT-08:00) Pacifique' },
  { value: 'America/Denver', label: '(GMT-07:00) Montagnes' },
  { value: 'America/Chicago', label: '(GMT-06:00) Centre' },
  { value: 'America/New_York', label: '(GMT-05:00) Est' },
  { value: 'America/Caracas', label: '(GMT-04:30) Caracas' },
  { value: 'America/Halifax', label: '(GMT-04:00) Atlantique' },
  { value: 'America/St_Johns', label: '(GMT-03:30) Terre-Neuve' },
  { value: 'America/Argentina/Buenos_Aires', label: '(GMT-03:00) Buenos Aires' },
  { value: 'Atlantic/South_Georgia', label: '(GMT-02:00) Mid-Atlantic' },
  { value: 'Atlantic/Azores', label: '(GMT-01:00) Açores' },
  { value: 'UTC', label: '(GMT+00:00) Temps universel' },
  { value: 'Africa/Casablanca', label: '(GMT+00:00) Casablanca' },
  { value: 'Europe/London', label: '(GMT+00:00) Londres' },
  { value: 'Africa/Abidjan', label: '(GMT+00:00) Abidjan / Monrovia' },
  { value: 'Europe/Paris', label: '(GMT+01:00) Paris / Bruxelles' },
  { value: 'Africa/Lagos', label: '(GMT+01:00) Lagos / Cotonou' },
  { value: 'Africa/Kinshasa', label: '(GMT+01:00) Kinshasa / Brazza' },
  { value: 'Europe/Berlin', label: '(GMT+01:00) Berlin / Rome' },
  { value: 'Europe/Athens', label: '(GMT+02:00) Athènes / Istanbul' },
  { value: 'Africa/Cairo', label: '(GMT+02:00) Le Caire' },
  { value: 'Africa/Johannesburg', label: '(GMT+02:00) Johannesburg' },
  { value: 'Asia/Jerusalem', label: '(GMT+02:00) Jérusalem' },
  { value: 'Europe/Moscow', label: '(GMT+03:00) Moscou' },
  { value: 'Africa/Nairobi', label: '(GMT+03:00) Nairobi / Addis Abeba' },
  { value: 'Asia/Dubai', label: '(GMT+04:00) Dubaï / Mascate' },
  { value: 'Asia/Kabul', label: '(GMT+04:30) Kaboul' },
  { value: 'Asia/Karachi', label: '(GMT+05:00) Karachi' },
  { value: 'Asia/Kolkata', label: '(GMT+05:30) Mumbai / New Delhi' },
  { value: 'Asia/Kathmandu', label: '(GMT+05:45) Katmandou' },
  { value: 'Asia/Dhaka', label: '(GMT+06:00) Dhaka / Almaty' },
  { value: 'Asia/Bangkok', label: '(GMT+07:00) Bangkok / Jakarta' },
  { value: 'Asia/Hong_Kong', label: '(GMT+08:00) Hong Kong / Pékin' },
  { value: 'Asia/Tokyo', label: '(GMT+09:00) Tokyo / Séoul' },
  { value: 'Australia/Adelaide', label: '(GMT+09:30) Adélaïde' },
  { value: 'Australia/Sydney', label: '(GMT+10:00) Sydney / Canberra' },
  { value: 'Asia/Magadan', label: '(GMT+11:00) Magadan' },
  { value: 'Pacific/Auckland', label: '(GMT+12:00) Auckland' },
];

const ListManager: React.FC<ListManagerProps> = ({ title, subtitle, icon, items, onUpdate, onRename, placeholder, warningText }) => {
  const [newItem, setNewItem] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAdd = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onUpdate([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleDelete = (itemToDelete: string) => {
    onUpdate(items.filter(item => item !== itemToDelete));
  };

  const startEditing = (index: number, value: string) => {
    setEditingIndex(index);
    setEditingValue(value);
  };

  const saveEditing = (index: number) => {
    const trimmed = editingValue.trim();
    if (trimmed) {
      const oldValue = items[index];
      const newList = [...items];
      newList[index] = trimmed;
      onUpdate(newList);
      if (oldValue !== trimmed && onRename) onRename(oldValue, trimmed);
      setEditingIndex(null);
      setEditingValue('');
    }
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newList = [...items];
    const item = newList[draggedIndex];
    newList.splice(draggedIndex, 1);
    newList.splice(index, 0, item);
    setDraggedIndex(index);
    onUpdate(newList);
  };

  const onDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <Card title={title} subtitle={subtitle} icon={icon}>
      <div className="space-y-6">
        <div className="flex gap-3">
          <input 
            type="text" 
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={placeholder}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 outline-none text-sm font-bold transition-all"
          />
          <button 
            onClick={handleAdd}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700 transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-indigo-100"
          >
            <Plus size={16} /> Ajouter
          </button>
        </div>

        <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {items.length > 0 ? items.map((item, index) => (
              <div 
                key={index}
                draggable={editingIndex === null}
                onDragStart={(e) => onDragStart(e, index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDragEnd={onDragEnd}
                className={cn(
                  "flex items-center justify-between p-4 transition-all group", 
                  index % 2 === 1 ? "bg-slate-50/50" : "bg-white",
                  draggedIndex === index ? "opacity-40 bg-indigo-50" : "hover:bg-indigo-50/30"
                )}
              >
                {editingIndex === index ? (
                  <div className="flex-1 flex gap-2 items-center">
                    <input 
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditing(index)}
                      autoFocus
                      className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg focus:ring-4 focus:ring-indigo-500/5 outline-none text-sm font-bold"
                    />
                    <button onClick={() => saveEditing(index)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                      <Check size={18} strokeWidth={3} />
                    </button>
                    <button onClick={() => setEditingIndex(null)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <X size={18} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab active:cursor-grabbing p-1.5 text-slate-300 hover:text-indigo-400 transition-colors">
                        <GripVertical size={16} />
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                        <CheckCircle2 size={16} />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{item}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditing(index, item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )) : (
              <div className="p-12 text-center text-slate-400 italic text-xs font-medium opacity-50">
                La liste est vide
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
          <Info size={18} className="text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-700 leading-relaxed font-semibold">{warningText}</p>
        </div>
      </div>
    </Card>
  );
};

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState('church');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const adminAvatarInputRef = useRef<HTMLInputElement>(null);
  const importBaseInputRef = useRef<HTMLInputElement>(null);
  
  const [churchInfo, setChurchInfo] = useState({
    name: 'Vinea Community',
    slogan: 'Enracinés en Christ',
    phone: '',
    email: '',
    address: '',
    logo: null as string | null,
    primaryColor: '#4f46e5',
    currency: 'F CFA',
    language: 'Français',
    timezone: 'UTC'
  });

  const [adminInfo, setAdminInfo] = useState({
    fullName: 'Administrateur Vinea',
    role: 'Super Admin',
    email: 'admin@vinea.org',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enableBirthdays: true,
    enableEvents: true,
    enableFollowUps: true,
    daysBeforeEvent: 3
  });

  const [memberStatuses, setMemberStatuses] = useState<string[]>(Object.values(MemberStatus));
  const [memberTypes, setMemberTypes] = useState<string[]>(Object.values(MemberType));
  const [visitorStatuses, setVisitorStatuses] = useState<string[]>(Object.values(VisitorStatus));
  const [serviceTypes, setServiceTypes] = useState<string[]>(SERVICES_LIST);
  const [departments, setDepartments] = useState<string[]>(CONST_DEPARTMENTS);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  const [aiConfig, setAiConfig] = useState({
    tone: 'Chaleureux & Pastoral',
    autoSuggest: true,
    language: 'Français'
  });

  // Renommages en attente par type de liste — propagés aux tables Supabase au save
  const pendingRenames = useRef<{
    departments: [string, string][];
    memberStatuses: [string, string][];
    memberRoles: [string, string][];
    visitorStatuses: [string, string][];
  }>({ departments: [], memberStatuses: [], memberRoles: [], visitorStatuses: [] });

  // Guard : adminInfo n'est sauvegardé/propagé que s'il a été chargé depuis Supabase
  const adminInfoLoaded = useRef(false);
  // ID stable de l'admin courant — utilisé pour l'upsert même si l'email a été modifié dans le formulaire
  const currentAdminId = useRef<string | null>(null);

  const addRename = (type: keyof typeof pendingRenames.current, oldVal: string, newVal: string) => {
    pendingRenames.current[type].push([oldVal, newVal]);
  };

  const [pendingImport, setPendingImport] = useState<any | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [isImportSuccessModalOpen, setIsImportSuccessModalOpen] = useState(false);
  const [importSummary, setImportSummary] = useState({ churchName: '', membersCount: 0, financesCount: 0, servicesCount: 0, visitorsCount: 0 });

  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isUserDeleteModalOpen, setIsUserDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<AdminUser>>({
    fullName: '', email: '', role: 'Administrateur', status: 'Actif', permissions: ['dashboard']
  });

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentEmail = user?.email ?? '';

      const [settings, users, notifData, memberStatusesData, memberTypesData, visitorStatusesData, serviceTypesData, departmentsData, aiConfigData] = await Promise.all([
        getChurchSettings(),
        getAdminUsers(),
        getAppConfig('notification_settings'),
        getAppConfig('member_statuses'),
        getAppConfig('member_roles'),
        getAppConfig('visitor_statuses'),
        getAppConfig('service_types'),
        getAppConfig('departments'),
        getAppConfig('ai_config'),
      ]);

      if (settings) {
        setChurchInfo({
          name: settings.name || 'Vinea Community',
          slogan: settings.slogan || 'Enracinés en Christ',
          phone: settings.phone || '',
          email: settings.email || '',
          address: settings.address || '',
          logo: settings.logoUrl || null,
          primaryColor: settings.primaryColor || '#4f46e5',
          currency: settings.currency || 'F CFA',
          language: settings.language || 'Français',
          timezone: settings.timezone || 'UTC',
        });
      }

      if (notifData) setNotificationSettings(notifData);
      if (memberStatusesData) setMemberStatuses(memberStatusesData);
      if (memberTypesData) setMemberTypes(memberTypesData);
      if (visitorStatusesData) setVisitorStatuses(visitorStatusesData);
      if (serviceTypesData) setServiceTypes(serviceTypesData);
      if (departmentsData) setDepartments(departmentsData);
      if (aiConfigData) setAiConfig(aiConfigData);

      const mappedUsers = users.map((u: any) => ({
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        status: u.status,
        avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.full_name}`,
        lastActive: u.last_active || 'Inconnu',
        permissions: u.permissions || ['dashboard'],
      }));

      if (mappedUsers.length > 0) {
        setAdminUsers(mappedUsers);
        const me = mappedUsers.find((u: any) => u.email.toLowerCase() === currentEmail.toLowerCase());
        if (me) {
          setAdminInfo({ fullName: me.fullName, role: me.role, email: me.email, avatar: me.avatar });
          adminInfoLoaded.current = true;
          currentAdminId.current = me.id;
          // Synchroniser le header et la sidebar dès le chargement de Settings
          window.dispatchEvent(new CustomEvent('vinea_profile_updated', {
            detail: { fullName: me.fullName, avatar: me.avatar }
          }));
        } else if (currentEmail) {
          // L'utilisateur auth n'a pas encore d'entrée dans admin_users :
          // on initialise avec son email afin que la sauvegarde puisse créer l'entrée
          currentAdminId.current = generateId();
          setAdminInfo(prev => ({ ...prev, email: currentEmail }));
          adminInfoLoaded.current = true;
        }
      } else {
        setAdminUsers([{
          id: 'u1',
          fullName: 'Administrateur',
          email: 'admin@vinea.org',
          role: 'Super Admin',
          status: 'Actif',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
          lastActive: 'Aujourd\'hui',
          permissions: AVAILABLE_MODULES.map(m => m.id),
        }]);
        if (currentEmail) {
          currentAdminId.current = generateId();
          setAdminInfo(prev => ({ ...prev, email: currentEmail }));
          adminInfoLoaded.current = true;
        }
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);

    await Promise.all([
      upsertChurchSettings({
        id: 'main',
        name: churchInfo.name,
        slogan: churchInfo.slogan,
        phone: churchInfo.phone,
        email: churchInfo.email,
        address: churchInfo.address,
        logoUrl: churchInfo.logo,
        primaryColor: churchInfo.primaryColor,
        currency: churchInfo.currency,
        language: churchInfo.language,
        timezone: churchInfo.timezone,
      }),
      setAppConfig('notification_settings', notificationSettings),
      setAppConfig('member_statuses', memberStatuses),
      setAppConfig('member_roles', memberTypes),
      setAppConfig('visitor_statuses', visitorStatuses),
      setAppConfig('service_types', serviceTypes),
      setAppConfig('departments', departments),
      setAppConfig('ai_config', aiConfig),
    ]);

    // Sauvegarder le profil admin courant si les données ont été chargées (ou initialisées)
    // matchingUser peut être absent si c'est un nouvel utilisateur → on utilise des valeurs par défaut
    if (adminInfoLoaded.current && currentAdminId.current) {
      const matchingUser = adminUsers.find(u => u.id === currentAdminId.current);
      await upsertAdminUser({
        id: currentAdminId.current,
        full_name: adminInfo.fullName,
        email: adminInfo.email,
        role: matchingUser?.role ?? 'Super Admin',
        status: matchingUser?.status ?? 'Actif',
        avatar: adminInfo.avatar,
        last_active: matchingUser?.lastActive ?? new Date().toISOString(),
        permissions: matchingUser?.permissions ?? AVAILABLE_MODULES.map(m => m.id),
      });
    }

    // ── Propager les renommages aux données existantes ──────────────────────
    const renames = pendingRenames.current;

    // Départements → members.departments (array) + departments_info.name
    for (const [oldName, newName] of renames.departments) {
      const { data: affected } = await supabase
        .from('members')
        .select('id, departments')
        .contains('departments', [oldName]);
      if (affected?.length) {
        await Promise.all(affected.map(m =>
          supabase.from('members').update({
            departments: (m.departments || []).map((d: string) => d === oldName ? newName : d)
          }).eq('id', m.id)
        ));
      }
      await supabase.from('departments_info').update({ name: newName }).eq('name', oldName);
    }

    // Statuts membres → members.status
    for (const [oldVal, newVal] of renames.memberStatuses) {
      await supabase.from('members').update({ status: newVal }).eq('status', oldVal);
    }

    // Rôles membres → members.type
    for (const [oldVal, newVal] of renames.memberRoles) {
      await supabase.from('members').update({ type: newVal }).eq('type', oldVal);
    }

    // Statuts visiteurs → visitors.status
    for (const [oldVal, newVal] of renames.visitorStatuses) {
      await supabase.from('visitors').update({ status: newVal }).eq('status', oldVal);
    }

    // Réinitialiser les renommages en attente
    pendingRenames.current = { departments: [], memberStatuses: [], memberRoles: [], visitorStatuses: [] };

    // Notifier App.tsx de recharger les settings (currency, nom, logo, couleur + notif settings)
    window.dispatchEvent(new Event('vinea_church_info_updated'));
    // Notifier App.tsx de mettre à jour le nom et l'avatar affichés dans le header/sidebar
    // Seulement si adminInfo a été correctement chargé depuis Supabase (évite de propager les valeurs par défaut)
    if (adminInfoLoaded.current) {
      window.dispatchEvent(new CustomEvent('vinea_profile_updated', {
        detail: { fullName: adminInfo.fullName, avatar: adminInfo.avatar }
      }));
    }

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleOpenEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setUserFormData({ ...user });
    setIsUserFormOpen(true);
  };

  const handleOpenDeleteUser = (user: AdminUser) => {
    if (user.role === 'Super Admin') {
      alert("Impossible de supprimer le Super Admin par défaut.");
      return;
    }
    setUserToDelete(user);
    setIsUserDeleteModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const updated = { ...editingUser, ...userFormData } as AdminUser;
      setAdminUsers(adminUsers.map(u => u.id === editingUser.id ? updated : u));
      upsertAdminUser({ id: updated.id, full_name: updated.fullName, email: updated.email, role: updated.role, status: updated.status, avatar: updated.avatar, last_active: updated.lastActive, permissions: updated.permissions });
    } else {
      const newUser: AdminUser = {
        ...userFormData as AdminUser,
        id: generateId(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userFormData.fullName}`,
        lastActive: 'Jamais'
      };
      setAdminUsers([...adminUsers, newUser]);
      upsertAdminUser({ id: newUser.id, full_name: newUser.fullName, email: newUser.email, role: newUser.role, status: newUser.status, avatar: newUser.avatar, last_active: newUser.lastActive, permissions: newUser.permissions });
    }
    setIsUserFormOpen(false);
    setEditingUser(null);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      setAdminUsers(adminUsers.filter(u => u.id !== userToDelete.id));
      deleteAdminUser(userToDelete.id);
      setIsUserDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const togglePermission = (moduleId: string) => {
    const current = userFormData.permissions || [];
    if (current.includes(moduleId)) {
      setUserFormData({ ...userFormData, permissions: current.filter(id => id !== moduleId) });
    } else {
      setUserFormData({ ...userFormData, permissions: [...current, moduleId] });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChurchInfo({ ...churchInfo, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdminAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdminInfo({ ...adminInfo, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportFullData = async () => {
    const APP_CONFIG_KEYS = ['notification_settings', 'member_statuses', 'member_roles', 'visitor_statuses', 'service_types', 'departments', 'ai_config', 'finance_categories', 'event_goals', 'event_assignments', 'attendance_assignments', 'attendance_followup_history'];
    const TABLES = ['members', 'visitors', 'financial_records', 'donation_campaigns', 'donation_promises', 'church_services', 'attendance_sessions', 'departments_info', 'department_activities', 'church_events', 'meetings', 'meditations', 'church_settings', 'spiritual_goals', 'spiritual_points', 'discipleship_pairs', 'discipleship_enrollments'];

    const backup: Record<string, any> = {
      _version: '1.7.0',
      _exportedAt: new Date().toISOString(),
    };

    // Configuration de l'application
    await Promise.all(APP_CONFIG_KEYS.map(async key => {
      const val = await getAppConfig(key);
      if (val !== null) backup[key] = val;
    }));

    // Données des tables Supabase (préfixe _table_)
    await Promise.all(TABLES.map(async table => {
      const { data } = await supabase.from(table).select('*');
      if (data && data.length > 0) backup[`_table_${table}`] = data;
    }));

    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vinea_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFullData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        const keys = Object.keys(backup);
        if (keys.length === 0) throw new Error("Fichier de sauvegarde invalide ou vide.");
        setImportSummary({
          churchName: backup['_table_church_settings']?.[0]?.name || 'Inconnu',
          membersCount: backup['_table_members']?.length ?? 0,
          financesCount: backup['_table_financial_records']?.length ?? 0,
          servicesCount: backup['_table_church_services']?.length ?? 0,
          visitorsCount: backup['_table_visitors']?.length ?? 0,
        });
        setPendingImport(backup);
        setIsImportModalOpen(true);
      } catch (err) {
        alert("Erreur lors du chargement : " + (err instanceof Error ? err.message : "Format invalide"));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const applyImport = async () => {
    if (!pendingImport) return;
    try {
      const tableEntries: [string, any[]][] = [];
      const configEntries: [string, any][] = [];

      for (const [key, value] of Object.entries(pendingImport)) {
        if (key.startsWith('_table_')) {
          tableEntries.push([key.slice('_table_'.length), value as any[]]);
        } else if (!key.startsWith('_')) {
          configEntries.push([key, value]);
        }
      }

      // Restaurer la configuration
      await Promise.all(configEntries.map(([key, value]) => setAppConfig(key, value)));

      // Restaurer les données des tables Supabase
      await Promise.all(
        tableEntries.map(async ([table, rows]) => {
          if (Array.isArray(rows) && rows.length > 0) {
            await supabase.from(table).upsert(rows, { onConflict: 'id' });
          }
        })
      );

      setIsImportModalOpen(false);
      setIsImportSuccessModalOpen(true);
    } catch (err) {
      alert("Erreur lors de l'application de l'importation.");
    }
  };

  const handleConfirmedPurge = async () => {
    const APP_CONFIG_KEYS = ['notification_settings', 'member_statuses', 'member_roles', 'visitor_statuses', 'service_types', 'departments', 'ai_config', 'finance_categories', 'event_goals', 'event_assignments', 'attendance_assignments', 'attendance_followup_history'];
    const TABLES_TO_PURGE = [
      'members', 'visitors', 'financial_records', 'donation_campaigns', 'donation_promises',
      'church_services', 'attendance_sessions', 'departments_info', 'department_activities',
      'church_events', 'meetings', 'meditations', 'church_settings', 'spiritual_goals',
      'spiritual_points', 'discipleship_pairs', 'discipleship_enrollments',
      'system_notifications', 'app_config',
    ];

    // Effacer les clés app_config
    await Promise.all(APP_CONFIG_KEYS.map(key => setAppConfig(key, null)));

    // Effacer toutes les lignes des tables Supabase (admin_users conservés)
    await Promise.all(
      TABLES_TO_PURGE.map(table => supabase.from(table).delete().not('id', 'is', null))
    );

    window.dispatchEvent(new Event('vinea_data_purged'));
    setIsPurgeModalOpen(false);
    window.location.reload();
  };

  const sections = [
    { id: 'church', label: 'Église', icon: Church },
    { id: 'users', label: 'Utilisateurs', icon: UsersIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'lists', label: 'Statuts & Listes', icon: ListTodo },
    { id: 'admin', label: 'Mon Profil', icon: UserCircle },
    { id: 'system', label: 'Système & IA', icon: Cpu },
    { id: 'security', label: 'Danger Zone', icon: ShieldAlert },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Paramètres Vinea</h2>
          <p className="text-sm text-slate-500 font-medium italic">Configurez votre environnement de gestion ecclésiale.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <Check size={18} /> : <Save size={18} />}
          {isSaving ? 'Sauvegarde...' : saveSuccess ? 'Enregistré' : 'Enregistrer tout'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-all border",
                  activeSection === section.id 
                    ? "bg-white text-indigo-600 shadow-md border-slate-200" 
                    : "text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-600"
                )}
              >
                <Icon size={18} />
                {section.label}
              </button>
            );
          })}
        </aside>

        <div className="flex-1 space-y-6">
          {activeSection === 'church' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <Card title="Identité de l'Église" subtitle="Informations publiques et branding" icon={<Church size={18} />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex flex-col items-center p-6 bg-slate-50 border border-slate-100 rounded-xl text-center">
                       <div className="w-24 h-24 rounded-3xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden mb-4 shadow-inner group relative cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                          {churchInfo.logo ? (
                            <img src={churchInfo.logo} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Camera size={32} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                          )}
                          <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors" />
                       </div>
                       <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                       <h4 className="text-xs font-semibold text-slate-800">Logo Officiel</h4>
                       <p className="text-xs text-slate-400 mt-1">PNG ou JPG (Format carré recommandé)</p>
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-500 ml-1">Couleur de la marque</label>
                          <div className="flex gap-4 items-center">
                             <input type="color" value={churchInfo.primaryColor} onChange={(e) => setChurchInfo({...churchInfo, primaryColor: e.target.value})} className="w-12 h-12 rounded-xl border-none p-1 bg-white shadow-sm cursor-pointer" />
                             <input type="text" value={churchInfo.primaryColor} onChange={(e) => setChurchInfo({...churchInfo, primaryColor: e.target.value})} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono" />
                          </div>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-500 ml-1 flex items-center gap-2"><Clock3 size={12}/> Fuseau horaire de l'application</label>
                          <select 
                            value={churchInfo.timezone} 
                            onChange={(e) => setChurchInfo({...churchInfo, timezone: e.target.value})} 
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium shadow-sm outline-none focus:border-indigo-300"
                          >
                             {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                          </select>
                          <p className="text-xs text-slate-400 font-medium italic mt-1 ml-1">* Influence le calcul des échéances et les notifications.</p>
                       </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Nom de l'Église / Communauté</label><input type="text" value={churchInfo.name} onChange={(e) => setChurchInfo({...churchInfo, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold" /></div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Slogan / Vision</label><input type="text" value={churchInfo.slogan} onChange={(e) => setChurchInfo({...churchInfo, slogan: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold" /></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Devise monétaire</label><input type="text" value={churchInfo.currency} onChange={(e) => setChurchInfo({...churchInfo, currency: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-indigo-600 uppercase" /></div>
                       <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Langue par défaut</label><select value={churchInfo.language} onChange={(e) => setChurchInfo({...churchInfo, language: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"><option>Français</option><option>Anglais</option></select></div>
                    </div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Email de contact</label><input type="email" value={churchInfo.email} onChange={(e) => setChurchInfo({...churchInfo, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Adresse physique</label><input type="text" value={churchInfo.address} onChange={(e) => setChurchInfo({...churchInfo, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" /></div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'users' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Utilisateurs & Accès</h3>
                  <p className="text-xs text-slate-500 font-medium">Définissez précisément les droits de chaque collaborateur.</p>
                </div>
                <button 
                  onClick={() => { setEditingUser(null); setUserFormData({ fullName: '', email: '', role: 'Administrateur', status: 'Actif', permissions: ['dashboard', 'spiritual'] }); setIsUserFormOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-medium shadow-lg shadow-indigo-200"
                >
                  <UserPlus size={16} /> Ajouter Collaborateur
                </button>
              </div>

              <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-medium text-slate-500">Utilisateur</th>
                        <th className="px-6 py-4 text-xs font-medium text-slate-500">Rôle</th>
                        <th className="px-6 py-4 text-xs font-medium text-slate-500">Modules Accessibles</th>
                        <th className="px-6 py-4 text-xs font-medium text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminUsers.map((user, uIdx) => (
                        <tr key={user.id} className={cn("hover:bg-indigo-50/30 transition-colors group", uIdx % 2 === 1 ? "bg-slate-50/30" : "bg-white")}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                                <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{user.fullName}</p>
                                <p className="text-xs text-slate-400 font-bold lowercase truncate">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg text-xs font-medium border",
                              user.role === 'Super Admin' ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                              "bg-slate-50 text-slate-600 border-slate-200"
                            )}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {user.permissions.length === AVAILABLE_MODULES.length ? (
                                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">Tout l'ERP</span>
                                ) : (
                                  user.permissions.slice(0, 3).map(pId => (
                                    <span key={pId} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-medium border border-slate-200">
                                      {AVAILABLE_MODULES.find(m => m.id === pId)?.label}
                                    </span>
                                  ))
                                )}
                                {user.permissions.length > 3 && user.permissions.length !== AVAILABLE_MODULES.length && (
                                  <span className="text-xs font-semibold text-slate-400 px-1.5 py-0.5">+{user.permissions.length - 3}</span>
                                )}
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleOpenEditUser(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={16} /></button>
                              <button onClick={() => handleOpenDeleteUser(user)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <Card title="Gestion des Alertes" subtitle="Configurez les rappels automatiques" icon={<Bell size={18} />}>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center shadow-inner border border-pink-100"><Cake size={24}/></div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">Anniversaires</h4>
                          <p className="text-xs text-slate-400 font-bold mt-0.5">Alerte le jour même du membre.</p>
                        </div>
                      </div>
                      <button onClick={() => setNotificationSettings({...notificationSettings, enableBirthdays: !notificationSettings.enableBirthdays})} className={cn("w-12 h-7 rounded-full transition-all relative", notificationSettings.enableBirthdays ? "bg-indigo-600" : "bg-slate-200")}>
                        <div className={cn("absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm", notificationSettings.enableBirthdays ? "left-6" : "left-1")}></div>
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shadow-inner border border-amber-100"><CalendarDays size={24}/></div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">Événements Proches</h4>
                          <p className="text-xs text-slate-400 font-bold mt-0.5">Rappel quelques jours avant.</p>
                        </div>
                      </div>
                      <button onClick={() => setNotificationSettings({...notificationSettings, enableEvents: !notificationSettings.enableEvents})} className={cn("w-12 h-7 rounded-full transition-all relative", notificationSettings.enableEvents ? "bg-indigo-600" : "bg-slate-200")}>
                        <div className={cn("absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm", notificationSettings.enableEvents ? "left-6" : "left-1")}></div>
                      </button>
                    </div>

                    {notificationSettings.enableEvents && (
                      <div className="px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl animate-in slide-in-from-top-2">
                        <label className="text-xs font-medium text-slate-500 ml-1 mb-2 block">Délai d'anticipation (jours)</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="range" min="1" max="14" step="1"
                            value={notificationSettings.daysBeforeEvent}
                            onChange={(e) => setNotificationSettings({...notificationSettings, daysBeforeEvent: parseInt(e.target.value)})}
                            className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                          <span className="w-10 text-center text-sm font-semibold text-indigo-600">{notificationSettings.daysBeforeEvent}j</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shadow-inner border border-blue-100"><UserCheck size={24}/></div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">Alertes de Suivi</h4>
                          <p className="text-xs text-slate-400 font-bold mt-0.5">Absences répétées et tâches visiteurs.</p>
                        </div>
                      </div>
                      <button onClick={() => setNotificationSettings({...notificationSettings, enableFollowUps: !notificationSettings.enableFollowUps})} className={cn("w-12 h-7 rounded-full transition-all relative", notificationSettings.enableFollowUps ? "bg-indigo-600" : "bg-slate-200")}>
                        <div className={cn("absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm", notificationSettings.enableFollowUps ? "left-6" : "left-1")}></div>
                      </button>
                    </div>
                  </div>
               </Card>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <Card title="Intelligence Artificielle" subtitle="Configuration des assistants Gemini" icon={<Cpu size={18} />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div className="space-y-1.5">
                           <label className="text-xs font-medium text-slate-500 ml-1">Tempérament de l'IA</label>
                           <select value={aiConfig.tone} onChange={(e) => setAiConfig({...aiConfig, tone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium">
                              <option>Chaleureux & Pastoral</option>
                              <option>Administratif & Formel</option>
                              <option>Direct & Strategique</option>
                              <option>Inspirant & Prophétique</option>
                           </select>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center"><Zap size={16}/></div>
                              <span className="text-xs font-semibold text-indigo-700">Auto-Suggestions</span>
                           </div>
                           <button onClick={() => setAiConfig({...aiConfig, autoSuggest: !aiConfig.autoSuggest})} className={cn("w-10 h-6 rounded-full transition-all relative", aiConfig.autoSuggest ? "bg-indigo-600" : "bg-slate-300")}>
                              <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", aiConfig.autoSuggest ? "left-5" : "left-1")}></div>
                           </button>
                        </div>
                     </div>
                     <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-start gap-4">
                        <Info size={24} className="text-indigo-400 shrink-0" />
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          Ces réglages influencent la rédaction automatique des PV de réunions, des messages de bienvenue et des analyses financières.
                        </p>
                     </div>
                  </div>
               </Card>

               <Card title="Portabilité & Sauvegarde" subtitle="Gestion de l'intégrité des données" icon={<Database size={18} />}>
                  <div className="space-y-6">
                     <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl gap-6">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner border border-emerald-100"><FileJson size={24}/></div>
                           <div>
                              <h4 className="text-sm font-semibold text-slate-800">Gestion de la Base (Vinea JSON)</h4>
                              <p className="text-xs text-slate-400 font-bold mt-0.5">Exporte ou importe l'intégralité des données.</p>
                           </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                           <button onClick={handleExportFullData} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                              <Download size={16}/> Exporter
                           </button>
                           <button onClick={() => importBaseInputRef.current?.click()} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-medium flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                              <Upload size={16}/> Importer la base
                           </button>
                           <input type="file" ref={importBaseInputRef} className="hidden" accept=".json" onChange={handleImportFullData} />
                        </div>
                     </div>
                  </div>
               </Card>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <Card title="Danger Zone" subtitle="Actions irréversibles de maintenance" icon={<ShieldAlert size={18} />}>
                  <div className="space-y-6">
                     <div className="p-6 border-2 border-dashed border-rose-100 rounded-3xl space-y-6">
                        <div className="flex items-start gap-4">
                           <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl shadow-inner border border-rose-100"><ShieldAlert size={24}/></div>
                           <div>
                              <h4 className="text-sm font-semibold text-slate-800">Réinitialisation Globale</h4>
                              <p className="text-xs text-slate-500 font-medium italic mt-1 leading-relaxed">
                                Efface tous les enregistrements (membres, finances, planning). 
                                Les comptes administrateurs seront les seuls rescapés pour permettre une nouvelle configuration propre.
                              </p>
                           </div>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-rose-50">
                           <button 
                             onClick={() => setIsPurgeModalOpen(true)}
                             className="px-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-medium hover:bg-rose-700 transition-all shadow-xl shadow-rose-200"
                           >
                              Purger toutes les données
                           </button>
                        </div>
                     </div>
                  </div>
               </Card>
            </div>
          )}

          {activeSection === 'lists' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <ListManager
                title="Départements"
                subtitle="Structure ministérielle de l'église"
                icon={<Briefcase size={18} />}
                items={departments}
                onUpdate={setDepartments}
                onRename={(o, n) => addRename('departments', o, n)}
                placeholder="Nouveau département (ex: Médias)"
                warningText="Réorganisez l'ordre par glisser-déposer pour influencer les menus de sélection."
              />
              <ListManager
                title="Rôles & Types de Membres"
                subtitle="Hiérarchie et responsabilités"
                icon={<Shield size={18} />}
                items={memberTypes}
                onUpdate={setMemberTypes}
                onRename={(o, n) => addRename('memberRoles', o, n)}
                placeholder="Nouveau rôle (ex: Ancien)"
                warningText="Le réordonnancement définit l'ordre d'importance dans les listes."
              />
              <ListManager
                title="Statuts des Membres"
                subtitle="Cycle de vie d'un fidèle"
                icon={<UserCheck size={18} />}
                items={memberStatuses}
                onUpdate={setMemberStatuses}
                onRename={(o, n) => addRename('memberStatuses', o, n)}
                placeholder="Nouveau statut (ex: Membre d'Honneur)"
                warningText="La modification des statuts affecte les filtres de la page Membres."
              />
              <ListManager
                title="Parcours Visiteurs"
                subtitle="Étapes d'intégration"
                icon={<RotateCcw size={18} />}
                items={visitorStatuses}
                onUpdate={setVisitorStatuses}
                onRename={(o, n) => addRename('visitorStatuses', o, n)}
                placeholder="Nouvelle étape (ex: Baptisé)"
                warningText="Les étapes sont affichées dans le pipeline du module Visiteurs."
              />
              <ListManager 
                title="Types de Services"
                subtitle="Catégories de cultes réguliers"
                icon={<CalendarDays size={18} />}
                items={serviceTypes}
                onUpdate={setServiceTypes}
                placeholder="Ex: École du Dimanche"
                warningText="Ces catégories alimentent le registre des cultes."
              />
            </div>
          )}

          {activeSection === 'admin' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <Card title="Mon Profil Administrateur" subtitle="Informations personnelles de session" icon={<UserCircle size={18} />}>
                <div className="flex flex-col md:flex-row gap-10 items-start">
                   <div className="relative group self-center md:self-start">
                      <div className="w-32 h-32 rounded-2xl bg-slate-100 overflow-hidden border-2 border-indigo-200 p-1 shadow-xl relative">
                         <img src={adminInfo.avatar} alt="Me" className="w-full h-full object-cover rounded-[2.2rem]" />
                         <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <Edit2 size={24} className="text-white" />
                         </div>
                      </div>
                      <button 
                        onClick={() => adminAvatarInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 p-3 bg-indigo-600 text-white rounded-2xl shadow-lg border-2 border-white hover:scale-110 transition-transform active:scale-95"
                        title="Changer ma photo"
                      >
                        <Camera size={16} />
                      </button>
                      <input type="file" ref={adminAvatarInputRef} className="hidden" accept="image/*" onChange={handleAdminAvatarUpload} />
                   </div>
                   <div className="flex-1 w-full space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Nom Complet</label><input type="text" value={adminInfo.fullName} onChange={(e) => setAdminInfo({...adminInfo, fullName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white transition-all shadow-sm" /></div>
                         <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Adresse Email</label><input type="email" value={adminInfo.email} onChange={(e) => setAdminInfo({...adminInfo, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white transition-all shadow-sm" /></div>
                      </div>
                      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between shadow-sm">
                         <div className="flex items-center gap-3">
                           <ShieldCheck size={20} className="text-indigo-600" />
                           <div>
                              <p className="text-xs font-semibold text-indigo-700">Rôle : {adminInfo.role}</p>
                              <p className="text-xs text-indigo-400 font-bolder">Privilèges maximum activés</p>
                           </div>
                         </div>
                         <div className="flex gap-2">
                           {AVAILABLE_MODULES.slice(0, 5).map(m => (
                             <div key={m.id} className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-indigo-600 shadow-sm"><m.icon size={12}/></div>
                           ))}
                           <span className="text-xs font-semibold text-indigo-400 flex items-center">+</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-100 space-y-6">
                   <div className="flex items-center gap-2">
                      <Palette size={18} className="text-indigo-600" />
                      <h4 className="text-xs font-medium text-slate-700">Galerie d'Avatars Vinea</h4>
                   </div>
                   <p className="text-xs text-slate-500 font-medium italic">Choisissez une illustration prédéfinie pour votre profil si vous ne souhaitez pas utiliser de photo.</p>
                   
                   <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-3">
                      {AVATAR_OPTIONS.map((seed) => {
                        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                        const isSelected = adminInfo.avatar === avatarUrl;
                        return (
                          <button 
                            key={seed}
                            onClick={() => setAdminInfo({...adminInfo, avatar: avatarUrl})}
                            className={cn(
                              "relative w-12 h-12 rounded-xl overflow-hidden transition-all hover:scale-110 active:scale-95 border-2",
                              isSelected ? "border-indigo-600 ring-4 ring-indigo-500/10 shadow-lg" : "border-slate-100 grayscale-[0.3] opacity-60 hover:grayscale-0 hover:opacity-100"
                            )}
                          >
                            <img src={avatarUrl} alt={seed} className="w-full h-full object-cover" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                                 <div className="bg-indigo-600 text-white rounded-full p-0.5">
                                    <Check size={10} strokeWidth={4} />
                                 </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                   </div>
                </div>
              </Card>

              <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden group shadow-xl">
                 <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform"><UserRoundCheck size={80} className="text-indigo-400"/></div>
                 <p className="text-xs font-medium text-indigo-400">Identité Visuelle</p>
                 <h3 className="text-xl font-semibold mt-2">Prêt pour le service, {adminInfo.fullName.split(' ')[0]}.</h3>
                 <p className="text-xs font-bold text-slate-500 mt-4 leading-relaxed max-w-xs">Votre avatar est visible dans le journal d'activité et sur tous les rapports officiels de l'application.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isImportModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsImportModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col border border-slate-200">
            <div className="bg-emerald-600 p-8 text-white shrink-0 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><DatabaseBackup size={180} /></div>
               <div className="relative z-10">
                 <h3 className="text-2xl font-semibold">Restauration de la Base</h3>
                 <p className="text-xs font-bold text-emerald-100 mt-1">Viez valider les données importées</p>
               </div>
            </div>
            <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
               <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-5">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100">
                     <Church size={32}/>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Église détectée</p>
                    <p className="text-xl font-bold text-slate-900">{importSummary.churchName}</p>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2">
                     <div className="flex items-center gap-2">
                        <UsersIcon size={14} className="text-indigo-600" />
                        <span className="text-xs font-medium text-slate-500">Membres</span>
                     </div>
                     <p className="text-2xl font-semibold text-slate-900">{importSummary.membersCount}</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2">
                     <div className="flex items-center gap-2">
                        <Wallet size={14} className="text-emerald-600" />
                        <span className="text-xs font-medium text-slate-500">Finances</span>
                     </div>
                     <p className="text-2xl font-semibold text-slate-900">{importSummary.financesCount}</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2">
                     <div className="flex items-center gap-2">
                        <BookOpen size={14} className="text-amber-600" />
                        <span className="text-xs font-medium text-slate-500">Cultes</span>
                     </div>
                     <p className="text-2xl font-semibold text-slate-900">{importSummary.servicesCount}</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2">
                     <div className="flex items-center gap-2">
                        <UserPlus size={14} className="text-rose-600" />
                        <span className="text-xs font-medium text-slate-500">Visiteurs</span>
                     </div>
                     <p className="text-2xl font-semibold text-slate-900">{importSummary.visitorsCount}</p>
                  </div>
               </div>
               <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4 shadow-sm">
                  <AlertCircle size={24} className="text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700 font-medium leading-relaxed">
                    ATTENTION : En acceptant cette validation, TOUTES vos données actuelles seront remplacées par celles du fichier. Cette action est irréversible.
                  </p>
               </div>
            </div>
            <div className="p-8 bg-white border-t border-slate-100 flex gap-4 shrink-0">
               <button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl text-xs font-medium hover:bg-slate-100 border border-slate-200">
                  Annuler
               </button>
               <button onClick={applyImport} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl text-xs font-medium hover:bg-emerald-700 shadow-xl shadow-emerald-200 flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> Confirmer l'Importation
               </button>
            </div>
          </div>
        </div>
      )}

      {isImportSuccessModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-500" />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] p-10 text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl border-4 border-white/50 animate-bounce">
              <CheckCircle2 size={48} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900">Restauration Terminée</h3>
            <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed italic">
              Les données ont été injectées avec succès. L'application doit maintenant redémarrer pour appliquer les changements.
            </p>
            <div className="mt-10">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-xs font-medium shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
              >
                Redémarrer l'application
              </button>
            </div>
          </div>
        </div>
      )}

      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300" onClick={() => setIsPurgeModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 text-center border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
               <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900">Tout effacer ?</h3>
            <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed italic">
              Cette action supprimera <strong>définitivement</strong> tous les membres, les finances et le planning.
              Seuls vos comptes administrateurs seront conservés.
            </p>
            <div className="flex flex-col gap-3 mt-8">
              <button 
                onClick={handleConfirmedPurge} 
                className="w-full py-4 bg-rose-600 text-white rounded-2xl text-xs font-medium shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
              >
                Confirmer la purge totale
              </button>
              <button 
                onClick={() => setIsPurgeModalOpen(false)} 
                className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-xs font-medium border border-slate-200 hover:bg-slate-100 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {isUserFormOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsUserFormOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-8 text-white shrink-0 relative">
               <button onClick={() => setIsUserFormOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
               <h3 className="text-xl font-semibold">{editingUser ? 'Modifier Collaborateur' : 'Nouveau Collaborateur'}</h3>
               <p className="text-xs text-indigo-200 mt-1">Gestion des droits d'accès</p>
            </div>
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/30">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Nom complet</label><input type="text" required value={userFormData.fullName} onChange={(e) => setUserFormData({...userFormData, fullName: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold shadow-sm" /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Email professionnel</label><input type="email" required value={userFormData.email} onChange={(e) => setUserFormData({...userFormData, email: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold shadow-sm" /></div>
               </div>

              {/* Section permissions */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Shield size={11} className="text-indigo-500" /> Modules accessibles
                    <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[9px] font-black">
                      {userFormData.permissions?.length ?? 0}/{AVAILABLE_MODULES.length}
                    </span>
                  </p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setUserFormData({...userFormData, permissions: AVAILABLE_MODULES.map(m => m.id)})} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Tout</button>
                    <span className="text-slate-200 text-xs">|</span>
                    <button type="button" onClick={() => setUserFormData({...userFormData, permissions: ['dashboard']})} className="text-[9px] font-black text-rose-400 uppercase tracking-widest hover:underline">Réinitialiser</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_MODULES.map((module) => {
                    const isSelected = userFormData.permissions?.includes(module.id);
                    return (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() => togglePermission(module.id)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border transition-all text-left",
                          isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                            : "bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-indigo-500"
                        )}
                      >
                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", isSelected ? "bg-white/20" : "bg-slate-50")}>
                          <module.icon size={13} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-tight leading-tight flex-1">{module.label}</span>
                        {isSelected && <Check size={11} strokeWidth={3} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer actions */}
              <div className="p-6 flex gap-3 shrink-0">
                <button type="button" onClick={() => setIsUserFormOpen(false)} className="flex-1 py-3.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                  Annuler
                </button>
                <button type="submit" className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all">
                  <Save size={14} /> {editingUser ? 'Mettre à jour' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUserDeleteModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsUserDeleteModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 text-center border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
               <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Révoquer l'accès ?</h3>
            <p className="text-slate-500 mt-3 text-sm font-medium leading-relaxed italic">
              L'utilisateur {userToDelete?.fullName} ne pourra plus se connecter à la plateforme.
            </p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDeleteUser} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-xs font-medium shadow-xl shadow-rose-200">Confirmer la révocation</button>
              <button onClick={() => setIsUserDeleteModalOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-xs font-medium border border-slate-200">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
