
import React, { useState } from 'react';
import Card from '../components/Card';
import LogoutModal from '../components/LogoutModal';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Shield, 
  History, 
  Users, 
  Mail, 
  ShieldCheck, 
  MoreHorizontal, 
  Plus, 
  Smartphone,
  Activity,
  LogOut
} from 'lucide-react';
import { cn } from '../utils';

const MOCK_USERS = [
  { id: 'u1', name: 'Jean Kouakou', email: 'jean.k@vinea.com', role: 'Super Admin', lastActive: 'En ligne', status: 'Actif' },
  { id: 'u2', name: 'Alice Yao', email: 'alice.y@vinea.com', role: 'Secrétaire', lastActive: 'Il y a 2h', status: 'Actif' },
  { id: 'u3', name: 'Paul Koffi', email: 'paul.k@vinea.com', role: 'Trésorier', lastActive: 'Hier', status: 'Inactif' },
];

const AUDIT_LOGS = [
  { id: 'l1', action: 'Modification Finance', user: 'Jean Kouakou', details: 'A modifié le montant de la dîme #452', time: '10:45' },
  { id: 'l2', action: 'Nouveau Membre', user: 'Alice Yao', details: 'A ajouté Bakary Traore à la base', time: '09:12' },
  { id: 'l3', action: 'Connexion', user: 'Jean Kouakou', details: 'Connexion depuis Chrome (Mac OS)', time: '08:00' },
  { id: 'l4', action: 'Suppression Visiteur', user: 'Jean Kouakou', details: 'A supprimé une fiche obsolète', time: 'Hier' },
];

const Admin: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await supabase.auth.signOut();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mon Profil & Équipe</h2>
          <p className="text-sm text-slate-500">Gérez vos informations personnelles et les accès de vos collaborateurs.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        {[
          { id: 'profile', label: 'Mon Profil', icon: User },
          { id: 'team', label: 'Gestion d\'Équipe', icon: Users },
          { id: 'logs', label: 'Journal d\'Activité', icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all border-b-2 -mb-[2px]",
              activeSubTab === tab.id 
                ? "border-indigo-600 text-indigo-600" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {activeSubTab === 'profile' && (
          <>
            <div className="lg:col-span-2 space-y-6">
              <Card title="Informations Personnelles" icon={<User size={18} />}>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 overflow-hidden border-2 border-slate-200">
                      <User size={64} />
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nom complet</label>
                      <input type="text" defaultValue="Admin Vinea" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
                      <input type="email" defaultValue="admin@vinea.com" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Sécurité du compte" icon={<Shield size={18} />}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <Smartphone size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Double Authentification (2FA)</p>
                        <p className="text-xs text-slate-500">Sécurisez votre compte avec votre mobile.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card title="Résumé d'Activité" icon={<Activity size={18} />}>
                <div className="text-center py-4">
                  <p className="text-4xl font-black text-indigo-600">342</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">Actions ce mois</p>
                </div>
              </Card>

              <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                    <LogOut size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-rose-900 leading-tight">Session active</p>
                    <p className="text-xs text-rose-600 font-medium">Jean Kouakou</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full py-3 bg-white text-rose-600 rounded-xl text-xs font-black hover:bg-rose-600 hover:text-white transition-all border border-rose-200 shadow-sm"
                >
                  DÉCONNEXION
                </button>
              </div>
            </div>
          </>
        )}

        {activeSubTab === 'team' && (
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Équipe Administrative</h3>
            <Card className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Utilisateur</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Rôle</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MOCK_USERS.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{u.name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-[10px] font-black uppercase tracking-widest">{u.role}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                            <MoreHorizontal size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeSubTab === 'logs' && (
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Audit Trail</h3>
            <Card className="p-0">
              <div className="divide-y divide-slate-100">
                {AUDIT_LOGS.map((log) => (
                  <div key={log.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <History size={18} className="text-slate-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{log.action}</p>
                        <p className="text-xs text-slate-500">{log.details}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-400">{log.time}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      <LogoutModal 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)} 
        onConfirm={handleLogout} 
      />
    </div>
  );
};

export default Admin;
