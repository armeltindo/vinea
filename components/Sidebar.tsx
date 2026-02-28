import React from 'react';
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
  Flame,
  X
} from 'lucide-react';
import { cn } from '../utils';
import Logo from './Logo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  userRole: string;
  userPermissions: string[];
  adminName: string;
  adminAvatar: string;
  churchName: string;
  churchLogo: string | null;
  primaryColor: string;
  isOpen?: boolean;
  onClose?: () => void;
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

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  userRole,
  userPermissions,
  adminName,
  adminAvatar,
  churchName,
  churchLogo,
  primaryColor,
  isOpen = true,
  onClose,
}) => {
  const filteredMenuItems = MENU_ITEMS.filter(item => userPermissions.includes(item.id));

  const handleItemClick = (id: string) => {
    setActiveTab(id);
    onClose?.();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "w-64 bg-slate-900 h-screen flex flex-col fixed left-0 top-0 z-50 text-slate-300 shadow-2xl transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white shadow-lg overflow-hidden shrink-0 border border-white/20">
              {churchLogo ? (
                <img src={churchLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Logo className="w-full h-full" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-white font-bold text-sm tracking-tight leading-none truncate uppercase">{churchName}</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mt-1">Gestion d'Église</p>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              aria-label="Fermer le menu"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 no-scrollbar">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "text-white shadow-lg shadow-blue-900/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                )}
                style={isActive ? { backgroundColor: primaryColor } : {}}
              >
                <Icon size={16} className={cn(
                  "transition-colors shrink-0",
                  isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400"
                )} />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <span className="absolute right-2.5 w-1 h-3 bg-white/25 rounded-full"></span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/50 space-y-3">
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-3">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center border border-slate-600 overflow-hidden shadow-sm">
                  <img
                    src={adminAvatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{adminName}</p>
                <p className="text-[10px] text-slate-500 truncate font-medium uppercase tracking-wide mt-0.5">{userRole}</p>
              </div>
              <button
                onClick={onLogout}
                title="Déconnexion"
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-50/10 rounded-lg transition-all"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end px-1">
            <span className="text-[10px] font-medium text-slate-600 bg-slate-800/50 px-1.5 py-0.5 rounded uppercase tracking-wide">v1.6.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
