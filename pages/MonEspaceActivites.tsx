import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowLeft, Church, UserCheck, Users } from 'lucide-react';
import { getServicesByMemberId } from '../lib/db';
import { MemberSession, ChurchService, ServicePersonnel } from '../types';

const ROLE_LABELS: Record<string, string> = {
  moderateur: 'Modérateur',
  priereOuverture: "Prière d'ouverture",
  adoration: 'Adoration',
  annonces: 'Annonces',
  accueil: 'Accueil',
  conducteurOuvriers: 'Conducteur groupe des ouvriers',
  conducteurFons: 'Conducteur groupe des fons',
  conducteurEnfants: 'Conducteur groupe des enfants',
  conducteurAdolescents: 'Conducteur groupe des adolescents',
  interpretationFon: 'Interprétation - Fon',
  interpretationPasteur: 'Interprétation - Pasteur',
};

const getMemberRoleInService = (memberId: string, personnel?: ServicePersonnel): string | null => {
  if (!personnel) return null;
  for (const [role, items] of Object.entries(personnel)) {
    const arr: any[] = Array.isArray(items) ? items : items ? [items] : [];
    if (arr.some((item: any) => item?.memberId === memberId)) return ROLE_LABELS[role] ?? role;
  }
  return null;
};

const getOtherMembersInService = (
  memberId: string,
  personnel?: ServicePersonnel
): { name: string; role: string }[] => {
  if (!personnel) return [];
  const result: { name: string; role: string }[] = [];
  for (const [role, items] of Object.entries(personnel)) {
    const arr: any[] = Array.isArray(items) ? items : items ? [items] : [];
    for (const item of arr) {
      if (item?.memberId && item.memberId !== memberId && item.memberName) {
        result.push({ name: item.memberName, role: ROLE_LABELS[role] ?? role });
      }
    }
  }
  return result;
};

const MonEspaceActivites: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<MemberSession | null>(null);
  const [assignedServices, setAssignedServices] = useState<ChurchService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('vinea_member_session');
    if (!raw) { navigate('/mon-espace', { replace: true }); return; }
    try {
      const s: MemberSession = JSON.parse(raw);
      setSession(s);
    } catch {
      navigate('/mon-espace', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    getServicesByMemberId(session.memberId).then(services => {
      setAssignedServices(services);
      setLoading(false);
    });
  }, [session]);

  const handleLogout = () => {
    localStorage.removeItem('vinea_member_session');
    localStorage.removeItem('vinea_member_role_choice');
    navigate('/mon-espace', { replace: true });
  };

  const upcoming = assignedServices
    .filter(s => new Date(s.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const past = assignedServices
    .filter(s => new Date(s.date) < new Date())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-indigo-700 text-white px-4 py-3 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/mon-espace/dashboard', { replace: true })}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs text-indigo-200 font-medium">Mon espace</p>
            <h1 className="text-sm font-bold leading-tight">Activités programmées</h1>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          title="Se déconnecter"
        >
          <LogOut size={16} />
        </button>
      </header>

      <div className="max-w-3xl mx-auto w-full px-4 py-6 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : assignedServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-amber-100 flex items-center justify-center mb-4">
              <Church size={36} className="text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">Aucune activité programmée</p>
            <p className="text-xs text-slate-400">Vous n'êtes pas encore affecté(e) à un culte ou une activité.</p>
          </div>
        ) : (
          <div className="md:grid md:grid-cols-2 md:gap-6 space-y-6 md:space-y-0 md:items-start">
            {/* ── À venir ── */}
            {upcoming.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg">À venir</span>
                  <span className="text-xs text-slate-400">{upcoming.length} activité{upcoming.length > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {upcoming.map(service => {
                    const role = session ? getMemberRoleInService(session.memberId, service.servicePersonnel) : null;
                    const others = session ? getOtherMembersInService(session.memberId, service.servicePersonnel) : [];
                    return (
                      <div key={service.id} className="px-4 py-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                            <UserCheck size={17} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800">{service.serviceType}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {new Date(service.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                              {service.time ? ` · ${service.time}` : ''}
                            </p>
                            {service.theme && <p className="text-xs text-slate-600 mt-1 italic truncate">{service.theme}</p>}
                            {role && (
                              <span className="inline-block mt-1.5 px-2.5 py-1 bg-amber-200 text-amber-800 text-xs font-semibold rounded-lg">
                                {role}
                              </span>
                            )}
                          </div>
                        </div>
                        {others.length > 0 && (
                          <div className="border-t border-amber-200 pt-2.5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Users size={12} className="text-amber-600" />
                              <p className="text-xs font-semibold text-amber-700">Programmés avec vous</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {others.map((m, i) => (
                                <div key={i} className="flex flex-col px-2.5 py-1.5 bg-white border border-amber-200 rounded-xl">
                                  <span className="text-xs font-semibold text-slate-700 leading-tight">{m.name}</span>
                                  <span className="text-[10px] text-amber-600 leading-tight">{m.role}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="hidden md:flex flex-col items-center justify-center py-10 text-center bg-white border border-slate-100 rounded-2xl">
                <UserCheck size={28} className="text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">Aucune activité à venir</p>
              </div>
            )}

            {/* ── Passées ── */}
            {past.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg">Passées</span>
                  <span className="text-xs text-slate-400">{past.length} activité{past.length > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {past.map(service => {
                    const role = session ? getMemberRoleInService(session.memberId, service.servicePersonnel) : null;
                    const others = session ? getOtherMembersInService(session.memberId, service.servicePersonnel) : [];
                    return (
                      <div key={service.id} className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                            <UserCheck size={15} className="text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700">{service.serviceType}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(service.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            {role && <p className="text-xs text-slate-400 mt-0.5">{role}</p>}
                          </div>
                        </div>
                        {others.length > 0 && (
                          <div className="border-t border-slate-200 pt-2">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Users size={11} className="text-slate-400" />
                              <p className="text-[10px] font-semibold text-slate-500">Équipe du culte</p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {others.map((m, i) => (
                                <div key={i} className="flex flex-col px-2 py-1 bg-white border border-slate-200 rounded-lg">
                                  <span className="text-[10px] font-semibold text-slate-600 leading-tight">{m.name}</span>
                                  <span className="text-[9px] text-slate-400 leading-tight">{m.role}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonEspaceActivites;
