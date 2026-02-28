
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import LogoutModal from './components/LogoutModal';
import QuickActionModal from './components/QuickActionModal';

// Dashboard chargé en priorité (page par défaut après connexion)
import Dashboard from './pages/Dashboard';

// Autres pages chargées à la demande (code splitting)
const Members = React.lazy(() => import('./pages/Members'));
const Planning = React.lazy(() => import('./pages/Planning'));
const Finances = React.lazy(() => import('./pages/Finances'));
const Services = React.lazy(() => import('./pages/Services'));
const Visitors = React.lazy(() => import('./pages/Visitors'));
const Discipleship = React.lazy(() => import('./pages/Discipleship'));
const Attendance = React.lazy(() => import('./pages/Attendance'));
const Meditations = React.lazy(() => import('./pages/Meditations'));
const Meetings = React.lazy(() => import('./pages/Meetings'));
const Events = React.lazy(() => import('./pages/Events'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Admin = React.lazy(() => import('./pages/Admin'));
const Login = React.lazy(() => import('./pages/Login'));
const SpiritualGrowth = React.lazy(() => import('./pages/SpiritualGrowth'));
import { supabase } from './lib/supabase';
import { getAdminUserByEmail, getMembers, getVisitors, getAttendanceSessions, getChurchEvents, upsertNotification, getChurchSettings, getAppConfig } from './lib/db';
import { setCurrencyCache } from './constants';
import { setChurchNameCache } from './lib/gemini';
import { 
  Search,
  User,
  LogOut,
  Settings as SettingsIcon,
  ChevronRight,
  Home,
  Calendar as CalendarIcon,
  Bell,
  X,
  Cake,
  CalendarDays,
  UserCheck,
  Zap,
  Info,
  ArrowRight,
  Menu
} from 'lucide-react';
import { cn, formatFirstName } from './utils';
import { Notification, NotificationSettings, Member, Visitor, AttendanceSession, VisitorStatus } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [accessToast, setAccessToast] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [currentUserRole, setCurrentUserRole] = useState('Super Admin');
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>(['dashboard', 'spiritual']);

  const [adminName, setAdminName] = useState('Admin Vinea');
  const [adminAvatar, setAdminAvatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=Jean');

  const [churchName, setChurchName] = useState('Vinea');
  const [churchLogo, setChurchLogo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#2563EB');

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    enableBirthdays: true, enableEvents: true, enableFollowUps: true, daysBeforeEvent: 3
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const today = new Date().toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  // --- Notification Logic ---
  const generateNotifications = useCallback(async () => {
    const settings: NotificationSettings = notifSettings;

    const [members, events, visitors, attendance] = await Promise.all([
      getMembers(),
      getChurchEvents(),
      getVisitors(),
      getAttendanceSessions(),
    ]);
    
    const newNotifications: Notification[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 1. Anniversaires
    if (settings.enableBirthdays) {
      members.forEach(m => {
        if (m.birthDate) {
          const bd = new Date(m.birthDate);
          if (bd.getDate() === now.getDate() && bd.getMonth() === now.getMonth()) {
            newNotifications.push({
              id: `birthday-${m.id}-${now.getFullYear()}`,
              type: 'birthday',
              title: 'Anniversaire aujourd\'hui',
              message: `C'est l'anniversaire de ${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}. N'oubliez pas de le/la bénir !`,
              date: todayStr,
              isRead: false,
              link: 'members',
              targetId: m.id
            });
          }
        }
      });
    }

    // 2. Événements proches
    if (settings.enableEvents) {
      events.forEach((e: any) => {
        const eventDate = new Date(e.startDate);
        const diffTime = eventDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays <= settings.daysBeforeEvent) {
          newNotifications.push({
            id: `event-${e.id}-${e.startDate}`,
            type: 'event',
            title: 'Événement imminent',
            message: `L'événement "${e.title}" commence dans ${diffDays === 0 ? "quelques heures" : diffDays + " jour(s)"}.`,
            date: todayStr,
            isRead: false,
            link: 'events',
            targetId: e.id
          });
        }
      });
    }

    // 3. Suivi Absences (Relances)
    if (settings.enableFollowUps) {
      // On cherche les personnes ayant manqué les 2 derniers dimanches
      const sundayHistory = attendance.filter(s => s.service === 'Culte de dimanche')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 2);
      
      if (sundayHistory.length === 2) {
        const absentsLast = sundayHistory[0].absentMembers || [];
        const absentsPrev = sundayHistory[1].absentMembers || [];
        const criticalAbsents = absentsLast.filter(id => absentsPrev.includes(id));
        
        criticalAbsents.forEach(id => {
          const m = members.find(mem => mem.id === id);
          if (m) {
            newNotifications.push({
              id: `absent-followup-${id}-${sundayHistory[0].date}`,
              type: 'followup',
              title: 'Alerte Absence Critique',
              message: `${formatFirstName(m.firstName)} a manqué les 2 derniers cultes. Un appel pastoral est recommandé.`,
              date: todayStr,
              isRead: false,
              link: 'attendance',
              targetId: m.id
            });
          }
        });
      }

      // Suivi visiteurs programmés
      visitors.forEach(v => {
        v.followUpHistory?.forEach(h => {
          if (h.nextStepDate === todayStr) {
            newNotifications.push({
              id: `visitor-task-${v.id}-${h.id}`,
              type: 'followup',
              title: 'Tâche de suivi visiteur',
              message: `Action "${h.nextStep}" prévue aujourd'hui pour ${formatFirstName(v.firstName)} ${v.lastName.toUpperCase()}.`,
              date: todayStr,
              isRead: false,
              link: 'visitors',
              targetId: v.id
            });
          }
        });
      });
    }

    // Persister et filtrer
    await Promise.all(newNotifications.map(n => upsertNotification(n)));

    const finalNotifs = newNotifications.map(n => ({
      ...n,
      isRead: readNotificationIds.includes(n.id)
    }));

    setNotifications(finalNotifs);
  }, [readNotificationIds, notifSettings]);

  useEffect(() => {
    if (isAuthenticated) {
      generateNotifications();
      // Rafraîchir toutes les 30 minutes
      const interval = setInterval(generateNotifications, 1000 * 60 * 30);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, generateNotifications]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const markAsRead = (id: string) => {
    const updatedIds = [...readNotificationIds, id];
    setReadNotificationIds(updatedIds);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotificationIds(allIds);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = (notif: Notification) => {
    markAsRead(notif.id);
    if (notif.link) {
      setActiveTab(notif.link);
      setIsNotificationsOpen(false);
    }
  };


  // --- Supabase Auth ---
  const ALL_PERMISSIONS = ['dashboard', 'members', 'visitors', 'spiritual', 'discipleship', 'attendance', 'planning', 'services', 'meetings', 'events', 'finances', 'meditations', 'reports', 'settings', 'admin'];

  const applyAdminUser = (adminUser: any, email: string) => {
    let perms: string[];
    if (!adminUser || adminUser.role === 'Super Admin') {
      setCurrentUserRole('Super Admin');
      perms = ALL_PERMISSIONS;
      setCurrentUserPermissions(perms);
      if (adminUser) {
        setAdminName(adminUser.full_name ?? 'Admin Vinea');
        setAdminAvatar(adminUser.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`);
      }
    } else {
      perms = adminUser.permissions?.length > 2 ? adminUser.permissions : ALL_PERMISSIONS;
      setCurrentUserRole(adminUser.role ?? 'Administrateur');
      setCurrentUserPermissions(perms);
      setAdminName(adminUser.full_name ?? 'Admin Vinea');
      setAdminAvatar(adminUser.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`);
    }
  };

  const loadChurchAndNotifSettings = useCallback(async () => {
    const [settings, notifSettingsData] = await Promise.all([
      getChurchSettings(),
      getAppConfig('notification_settings'),
    ]);
    if (settings) {
      setChurchName(settings.name || 'Vinea');
      setChurchLogo(settings.logoUrl || null);
      setPrimaryColor(settings.primaryColor || '#2563EB');
      setCurrencyCache(settings.currency || 'F CFA');
      setChurchNameCache(settings.name || 'Vinea');
    }
    if (notifSettingsData) {
      setNotifSettings(notifSettingsData);
    }
  }, []);

  useEffect(() => {
    // Vérifier la session existante au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        getAdminUserByEmail(session.user.email ?? '').then(async (adminUser) => {
          applyAdminUser(adminUser, session.user.email ?? '');
          await loadChurchAndNotifSettings();
          setIsAuthenticated(true);
          setAuthLoading(false);
        });
      } else {
        setAuthLoading(false);
      }
    });

    // Écouter les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
        setCurrentUserRole('Super Admin');
        setCurrentUserPermissions(['dashboard', 'spiritual']);
      }
    });

    // Recharger les settings depuis Supabase quand ils changent (ex: depuis Settings.tsx)
    const handleSettingsUpdated = () => { loadChurchAndNotifSettings(); };
    window.addEventListener('vinea_church_info_updated', handleSettingsUpdated);

    // Mettre à jour nom/avatar dans le header et la sidebar quand le profil est modifié dans Settings
    const handleProfileUpdated = (e: Event) => {
      const { fullName, avatar } = (e as CustomEvent).detail ?? {};
      if (fullName) setAdminName(fullName);
      if (avatar) setAdminAvatar(avatar);
    };
    window.addEventListener('vinea_profile_updated', handleProfileUpdated);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('vinea_church_info_updated', handleSettingsUpdated);
      window.removeEventListener('vinea_profile_updated', handleProfileUpdated);
    };
  }, [loadChurchAndNotifSettings]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogin = (email: string, role: string, permissions: string[], name?: string) => {
    setIsAuthenticated(true);
    setCurrentUserRole(role);
    const finalPermissions = permissions.includes('spiritual') ? permissions : [...permissions, 'spiritual'];
    setCurrentUserPermissions(finalPermissions);
    if (name) setAdminName(name);
  };

  const handleConfirmLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUserRole('Super Admin');
    setCurrentUserPermissions(['dashboard', 'spiritual']);
    setShowLogoutConfirm(false);
  };

  const showAccessToast = (message: string) => {
    setAccessToast(message);
    setTimeout(() => setAccessToast(null), 3500);
  };

  const handleQuickAction = (tabId: string) => {
    if (currentUserPermissions.includes(tabId)) {
      setActiveTab(tabId);
    } else {
      showAccessToast("Accès refusé : vous n'avez pas la permission d'accéder à ce module.");
    }
  };

  const navigateToSettingsAccount = () => {
    if (currentUserPermissions.includes('settings')) {
      setActiveTab('settings');
      setIsProfileOpen(false);
      window.dispatchEvent(new Event('vinea_settings_nav'));
    } else {
      setIsProfileOpen(false);
      showAccessToast("Accès refusé aux paramètres de profil complet.");
    }
  };

  const renderContent = () => {
    const canAccess = currentUserPermissions.includes(activeTab) || 
                     (activeTab === 'spiritual' && currentUserPermissions.includes('dashboard'));

    if (!canAccess && activeTab !== 'dashboard') {
      return <Dashboard onNavigate={setActiveTab} adminName={adminName} />;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} adminName={adminName} />;
      case 'members': return <Members />;
      case 'planning': return <Planning />;
      case 'visitors': return <Visitors />;
      case 'spiritual': return <SpiritualGrowth />;
      case 'discipleship': return <Discipleship />;
      case 'attendance': return <Attendance />;
      case 'finances': return <Finances />;
      case 'services': return <Services />;
      case 'meditations': return <Meditations />;
      case 'meetings': return <Meetings />;
      case 'events': return <Events />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
      case 'admin': return <Admin />;
      default: return <Dashboard onNavigate={setActiveTab} adminName={adminName} />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 opacity-50">
          <div className="w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const pageFallback = (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin opacity-40" />
    </div>
  );

  if (!isAuthenticated) {
    return (
      <React.Suspense fallback={pageFallback}>
        <Login onLogin={handleLogin} />
      </React.Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={() => setShowLogoutConfirm(true)}
        userRole={currentUserRole}
        userPermissions={currentUserPermissions}
        adminName={adminName}
        adminAvatar={adminAvatar}
        churchName={churchName}
        churchLogo={churchLogo}
        primaryColor={primaryColor}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 lg:ml-64 min-h-screen transition-all duration-300 relative">
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-4 lg:px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
              <Home size={13} className="text-slate-400" />
              <ChevronRight size={11} className="text-slate-300" />
              <span className="text-xs font-semibold text-slate-700 capitalize">{activeTab === 'spiritual' ? 'Spirituel' : activeTab.replace('-', ' ')}</span>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-slate-400">
              <CalendarIcon size={13} />
              <span className="text-xs font-medium text-slate-500">{today}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Bell */}
            <div className="relative" ref={notifRef}>
               <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "p-2.5 rounded-xl transition-all relative group",
                  isNotificationsOpen ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                )}
               >
                  <Bell size={20} className={cn(unreadCount > 0 && "animate-[bell-swing_2s_ease-in-out_infinite]")} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      {unreadCount}
                    </span>
                  )}
               </button>

               {isNotificationsOpen && (
                 <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col max-h-[80vh]">
                    <div className="px-5 py-4 border-b border-slate-100 shrink-0">
                       <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
                          </div>
                          <button onClick={markAllAsRead} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">Tout lire</button>
                       </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 bg-slate-50/30">
                       {notifications.length > 0 ? notifications.map(n => (
                         <div 
                          key={n.id} 
                          onClick={() => handleNotificationClick(n)}
                          className={cn(
                            "p-4 rounded-2xl transition-all cursor-pointer border group relative",
                            n.isRead ? "bg-white border-transparent grayscale-[0.3] opacity-70" : "bg-white border-indigo-100 shadow-sm ring-1 ring-indigo-500/5 hover:border-indigo-300"
                          )}
                         >
                            <div className="flex items-start gap-4">
                               <div className={cn(
                                 "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                 n.type === 'birthday' ? "bg-pink-50 text-pink-500" :
                                 n.type === 'event' ? "bg-amber-50 text-amber-500" :
                                 n.type === 'followup' ? "bg-blue-50 text-blue-500" :
                                 "bg-slate-50 text-slate-500"
                               )}>
                                  {n.type === 'birthday' ? <Cake size={18}/> : n.type === 'event' ? <CalendarDays size={18}/> : n.type === 'followup' ? <UserCheck size={18}/> : <Info size={18}/>}
                               </div>
                               <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start gap-2">
                                     <h4 className="text-xs font-semibold text-slate-900 truncate">{n.title}</h4>
                                     {!n.isRead && <span className="w-2 h-2 bg-indigo-600 rounded-full mt-1 shrink-0"></span>}
                                  </div>
                                  <p className="text-xs text-slate-500 leading-relaxed mt-1">{n.message}</p>
                                  <div className="mt-2 flex items-center justify-between">
                                     <span className="text-[10px] text-slate-400">{n.date}</span>
                                     <span className="text-[10px] font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Voir <ArrowRight size={10}/></span>
                                  </div>
                               </div>
                            </div>
                         </div>
                       )) : (
                         <div className="py-16 text-center space-y-3 opacity-30">
                            <Bell size={36} className="mx-auto" />
                            <p className="text-xs font-medium text-slate-500">Aucune alerte pour le moment</p>
                         </div>
                       )}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-white text-center">
                       <button onClick={() => { setActiveTab('reports'); setIsNotificationsOpen(false); }} className="text-xs font-medium text-slate-400 hover:text-indigo-600 transition-colors">Voir les rapports complets</button>
                    </div>
                 </div>
               )}
            </div>

            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={cn(
                  "flex items-center gap-3 p-1 rounded-2xl transition-all group",
                  isProfileOpen ? "bg-slate-100" : "hover:bg-slate-50"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold border-2 border-white shadow-md overflow-hidden group-hover:scale-105 transition-transform">
                  <img src={adminAvatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="text-left hidden xl:block pr-2">
                  <p className="text-sm font-semibold text-slate-900 leading-none">{adminName}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <p className="text-xs text-slate-400 font-medium">En ligne</p>
                  </div>
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl py-3 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="px-5 py-3 border-b border-slate-100 mb-1">
                    <p className="text-xs font-medium text-slate-400">{currentUserRole}</p>
                  </div>
                  {currentUserPermissions.includes('settings') && (
                    <button onClick={navigateToSettingsAccount} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><User size={16} /></div>
                      Mon Profil
                    </button>
                  )}
                  {currentUserPermissions.includes('settings') && (
                    <button onClick={() => { setActiveTab('settings'); setIsProfileOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600"><SettingsIcon size={16} /></div>
                      Paramètres
                    </button>
                  )}
                  <div className="mx-4 my-2 border-t border-slate-50"></div>
                  <button onClick={() => { setShowLogoutConfirm(true); setIsProfileOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-100 transition-colors"><LogOut size={16} /></div>
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-8 max-7xl mx-auto">
          <React.Suspense fallback={pageFallback}>
            {renderContent()}
          </React.Suspense>
        </div>

        <LogoutModal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} onConfirm={handleConfirmLogout} />
        <QuickActionModal isOpen={showQuickAction} onClose={() => setShowQuickAction(false)} onAction={handleQuickAction} />
      </main>

      <style>{`
        @keyframes bell-swing {
          0%, 100% { transform: rotate(0); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(10deg); }
          20%, 40%, 60%, 80% { transform: rotate(-10deg); }
        }
      `}</style>

      {/* Toast accès refusé */}
      {accessToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
          {accessToast}
        </div>
      )}
    </div>
  );
};

export default App;
