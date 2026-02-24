import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  Target, 
  ClipboardList, 
  Wallet, 
  Church, 
  BookOpen, 
  UsersRound, 
  Calendar, 
  BarChart3, 
  Settings,
  LogOut,
  Briefcase,
  Flame
} from 'lucide-react';
import { cn } from '../utils';
import Logo from './Logo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  userRole: string;
}

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'members', label: 'Membres', icon: Users },
  { id: 'visitors', label: 'Visiteurs', icon: UserPlus },
  { id: 'spiritual', label: 'Spirituel', icon: Flame },
  { id: 'discipleship', label: 'Discipolat', icon: Target },
  { id: 'attendance', label: 'Présence', icon: ClipboardList },
  { id: 'planning', label: 'Planning', icon: Briefcase },
  { id: 'services', label: 'Nos cultes', icon: Church },
  { id: 'meetings', label: 'Réunions', icon: UsersRound },
  { id: 'events', label: 'Evénements', icon: Calendar },
  { id: 'finances', label: 'Finances', icon: Wallet },
  { id: 'meditations', label: 'Méditations', icon: BookOpen },
  { id: 'reports', label: 'Rapports', icon: BarChart3 },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

// Fix: Correctly type the Sidebar component with its props interface to resolve "Property 'activeTab' does not exist on type 'IntrinsicAttributes'" error in App.tsx
const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, userRole }) => {
  const [churchName, setChurchName] = useState('Vinea');
  const [churchLogo, setChurchLogo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [adminName, setAdminName] = useState('Admin Vinea');
  const [adminAvatar, setAdminAvatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=Jean');
  
  const [userPermissions, setUserPermissions] = useState<string[]>(() => {
    const saved = localStorage.getItem('vinea_user_permissions');
    let perms = saved ? JSON.parse(saved) : ['dashboard', 'spiritual'];
    if (!perms.includes('spiritual')) {
      perms.push('spiritual');
    }
    return perms;
  });

  const loadSettings = () => {
    const savedChurch = localStorage.getItem('vinea_church_info');
    if (savedChurch) {
      try {
        const info = JSON.parse(savedChurch);
        setChurchName(info.name || 'Vinea');
        setChurchLogo(info.logo || null);
        setPrimaryColor(info.primaryColor || '#2563EB');
      } catch (e) { console.error(e); }
    }

    const savedAdmin = localStorage.getItem('vinea_admin_info');
    if (savedAdmin) {
      try {
        const info = JSON.parse(savedAdmin);
        setAdminName(info.fullName || 'Admin Vinea');
        setAdminAvatar(info.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jean');
      } catch (e) { console.error(e); }
    }

    const savedPerms = localStorage.getItem('vinea_user_permissions');
    if (savedPerms) {
      const parsed = JSON.parse(savedPerms);
      if (!parsed.includes('spiritual')) {
        parsed.push('spiritual');
      }
      setUserPermissions(parsed);
    }
  };

  useEffect(() => {
    loadSettings();
    window.addEventListener('vinea_church_info_updated', loadSettings);
    window.addEventListener('vinea_admin_info_updated', loadSettings);
    window.addEventListener('vinea_auth_updated', loadSettings);
    return () => {
      window.removeEventListener('vinea_church_info_updated', loadSettings);
      window.removeEventListener('vinea_admin_info_updated', loadSettings);
      window.removeEventListener('vinea_auth_updated', loadSettings);
    };
  }, []);

  const filteredMenuItems = MENU_ITEMS.filter(item => userPermissions.includes(item.id));

  return (
    <aside className="w-64 bg-slate-900 h-screen flex flex-col fixed left-0 top-0 z-50 text-slate-300 shadow-2xl">
      <div className="p-6 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-lg overflow-hidden shrink-0 border border-white/20"
          >
            {churchLogo ? (
              <img src={churchLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Logo className="w-full h-full" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-lg tracking-tight leading-none truncate uppercase">{churchName}</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Gestion d'Église</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 no-scrollbar">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 group relative",
                isActive 
                  ? "text-white shadow-lg shadow-blue-900/40" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
              )}
              style={isActive ? { backgroundColor: primaryColor } : {}}
            >
              <Icon size={16} className={cn(
                "transition-colors",
                isActive ? "text-white" : "text-slate-50 group-hover:text-blue-400"
              )} />
              {item.label}
              {isActive && (
                <span className="absolute right-2 w-1 h-3 bg-white/20 rounded-full"></span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 bg-slate-900/50 border-t border-slate-800/50 space-y-4">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-slate-300 font-bold border border-slate-600 overflow-hidden shadow-sm">
                <img 
                  src={adminAvatar} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-50 border-2 border-slate-900 rounded-full shadow-sm"></span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate tracking-tight">{adminName}</p>
              <p className="text-[9px] text-slate-500 truncate font-black uppercase tracking-widest">{userRole}</p>
            </div>
            <button 
              onClick={onLogout}
              title="Déconnexion"
              className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50/10 rounded-xl transition-all"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end px-2">
          <span className="text-[8px] font-black text-slate-700 bg-slate-800/50 px-1.5 py-0.5 rounded uppercase">v1.6.0</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;