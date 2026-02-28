import React, { useState, useEffect, useMemo } from 'react';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import { 
  Users, 
  Wallet, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  UserCheck,
  UserCheck as UserCheckIcon,
  UserMinus,
  Sparkles,
  ArrowRight,
  Clock,
  CalendarDays,
  Briefcase
} from 'lucide-react';
import { formatCurrency } from '../constants';
import { analyzePageData } from '../lib/gemini';
import { getMembers, getFinancialRecords, getAttendanceSessions, getDepartmentActivities } from '../lib/db';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { cn } from '../utils';
import { Member, FinancialRecord, OperationType } from '../types';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  adminName: string;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, adminName }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0,
    monthlyRevenue: 0,
    lastAttendance: 0,
    lastAttendanceDate: 'Aucun relevé',
    lastServiceType: '---',
    absencesCount: 0,
    chartData: [] as any[],
    upcomingEvents: [] as any[],
    deptStats: [] as { name: string, count: number, percent: number }[]
  });

  const loadDashboardData = async () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const [members, finances, attendanceHistory, activities] = await Promise.all([
      getMembers(),
      getFinancialRecords(),
      getAttendanceSessions(),
      getDepartmentActivities(),
    ]);

    // 1. Membres et Départements
    const totalMembersCount = members.length;
    const deptCounts: Record<string, number> = {};
    members.forEach(m => {
      (m.departments || []).forEach(dept => {
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });
    });
    const deptStats = Object.entries(deptCounts)
      .map(([name, count]) => ({
        name,
        count,
        percent: totalMembersCount > 0 ? Math.round((count / totalMembersCount) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 2. Finances (Mois en cours)
    const monthlyRevenue = finances
      .filter(f => {
        const d = new Date(f.date);
        return f.type === OperationType.REVENU && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, f) => sum + f.amount, 0);

    // 3. Présences
    const sortedHistory = [...attendanceHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastServiceGlobal = sortedHistory[0];
    const lastDateFormatted = lastServiceGlobal
      ? new Date(lastServiceGlobal.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      : 'Aucun relevé';

    const sundayServices = sortedHistory.filter(s => s.service === 'Culte de dimanche').slice(0, 2);
    const uniqueAbsentIds = new Set<string>();
    sundayServices.forEach(service => {
      (service.absentMembers || []).forEach(id => uniqueAbsentIds.add(id));
    });

    // 4. Évolution financière (6 derniers mois)
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const mIdx = d.getMonth();
      const mYear = d.getFullYear();
      const rev = finances
        .filter(f => {
          const fd = new Date(f.date);
          return f.type === OperationType.REVENU && fd.getMonth() === mIdx && fd.getFullYear() === mYear;
        })
        .reduce((sum, f) => sum + f.amount, 0);
      last6Months.push({ name: months[mIdx], revenus: rev });
    }

    // 5. Activités à venir
    const upcoming = activities
      .filter(a => a.deadline && new Date(a.deadline) >= now)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 3)
      .map(a => ({
        id: a.id,
        day: new Date(a.deadline!).getDate().toString(),
        month: months[new Date(a.deadline!).getMonth()].toUpperCase(),
        title: a.title,
        time: 'Toute la journée',
        target: 'planning'
      }));

    setStats({
      totalMembers: totalMembersCount,
      monthlyRevenue,
      lastAttendance: lastServiceGlobal?.total || 0,
      lastAttendanceDate: lastDateFormatted,
      lastServiceType: lastServiceGlobal?.service || 'N/A',
      absencesCount: uniqueAbsentIds.size,
      chartData: last6Months,
      upcomingEvents: upcoming,
      deptStats
    });
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzePageData("Tableau de Bord Global", { 
      membres: stats.totalMembers, 
      revenusMois: stats.monthlyRevenue, 
      dernierePresence: stats.lastAttendance, 
      repartitionDepartements: stats.deptStats 
    });
    setAnalysis(result || null);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Bienvenue, {adminName}</h2>
          <p className="text-slate-500 mt-1 font-medium italic">Aperçu stratégique de l'activité réelle de Vinea.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || stats.totalMembers === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-all disabled:opacity-50"
          >
            <Sparkles size={15} /> {isAnalyzing ? 'Analyse...' : 'Analyse IA'}
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors text-slate-600 shadow-sm"
          >
            Rapports
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div onClick={() => onNavigate('members')} className="cursor-pointer group">
          <Card title="Total Membres" subtitle="Base de données" icon={<Users size={20} />} className="group-hover:border-indigo-300 transition-all shadow-sm">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-slate-900">{stats.totalMembers}</span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users size={20} />
              </div>
            </div>
          </Card>
        </div>
        
        <div onClick={() => onNavigate('finances')} className="cursor-pointer group">
          <Card title="Revenus (Mois)" subtitle="Entrées cumulées" icon={<Wallet size={20} />} className="group-hover:border-emerald-300 transition-all shadow-sm">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-slate-900">{formatCurrency(stats.monthlyRevenue)}</span>
              <TrendingUp size={24} className="text-emerald-500" />
            </div>
          </Card>
        </div>

        <div onClick={() => onNavigate('attendance')} className="cursor-pointer group">
          <Card 
            title="Dernière Présence" 
            subtitle={stats.lastAttendance === 0 ? 'Aucun relevé' : `${stats.lastAttendanceDate} • ${stats.lastServiceType}`} 
            icon={<UserCheckIcon size={20} />} 
            className="group-hover:border-blue-300 transition-all shadow-sm"
          >
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-slate-900">{stats.lastAttendance}</span>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">Réel</span>
            </div>
          </Card>
        </div>

        <div onClick={() => onNavigate('attendance')} className="cursor-pointer group">
          <Card title="Absents" subtitle="2 derniers dimanches" icon={<UserMinus size={20} />} className="group-hover:border-rose-300 transition-all shadow-sm">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-rose-600">{stats.absencesCount}</span>
              <div className="w-10 h-10 bg-rose-50 flex items-center justify-center text-rose-600">
                <Clock size={20} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Évolution des Revenus" className="lg:col-span-2 shadow-sm" icon={<TrendingUp size={18} />}>
          <div className="h-[300px] w-full mt-4 relative">
            {stats.chartData.some(d => d.revenus > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px'}} 
                  />
                  <Area type="monotone" dataKey="revenus" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRevenus)" strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                <TrendingUp size={48} className="mb-2" />
                <p className="text-xs font-black uppercase tracking-widest">Aucune donnée financière</p>
              </div>
            )}
          </div>
        </Card>

        <div className="lg:col-span-1 space-y-6">
          <Card title="Prochaines Échéances" icon={<ArrowRight size={18} className="text-slate-300" />} subtitle="Activités et cultes">
            <div className="space-y-4">
              {stats.upcomingEvents.length > 0 ? stats.upcomingEvents.map((ev) => (
                <div 
                  key={ev.id} 
                  onClick={() => onNavigate(ev.target)}
                  className="flex items-start gap-4 p-4 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-2xl transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex flex-col items-center justify-center text-indigo-600 font-black shrink-0 shadow-sm border border-indigo-100 group-hover:scale-105 transition-transform">
                    <span className="text-[10px] font-black leading-none mb-0.5">{ev.month}</span>
                    <span className="text-lg leading-none">{ev.day}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors truncate">{ev.title}</h4>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                      <Clock size={11} className="text-indigo-400" />
                      {ev.time}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 group-hover:text-indigo-400 transition-all self-center" />
                </div>
              )) : (
                <div className="py-12 text-center flex flex-col items-center opacity-30">
                  <CalendarDays size={48} />
                  <p className="text-[10px] font-black uppercase mt-3 tracking-widest">Aucune activité prévue</p>
                </div>
              )}
            </div>
            <button
              onClick={() => onNavigate('planning')}
              className="w-full mt-4 py-2.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-dashed border-indigo-200"
            >
              Accéder au planning complet
            </button>
          </Card>

          {/* Membres par Département Section (Placée ici pour être sous les échéances sur LG) */}
          <Card 
            title="Membres par Département" 
            icon={<Briefcase size={18} className="text-indigo-600" />} 
            subtitle="Répartition des effectifs"
            className="shadow-sm"
          >
            <div className="space-y-5 mt-4">
              {stats.deptStats.length > 0 ? stats.deptStats.map((dept) => (
                <div key={dept.name} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-medium text-slate-500 truncate max-w-[180px]">{dept.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{dept.count}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">({dept.percent}%)</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${dept.percent}%` }}
                    />
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center opacity-20 flex flex-col items-center">
                  <Briefcase size={48} />
                  <p className="text-[10px] font-black uppercase mt-3 tracking-widest">Aucun département assigné</p>
                </div>
              )}
              
              <div className="pt-4 border-t border-slate-50">
                <button
                  onClick={() => onNavigate('planning')}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-all active:scale-[0.98]"
                >
                  Gérer les Départements
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;