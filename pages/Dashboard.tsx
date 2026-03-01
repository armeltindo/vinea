import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import {
  Users,
  Wallet,
  TrendingUp,
  ChevronRight,
  UserCheck,
  UserMinus,
  Sparkles,
  Clock,
  CalendarDays,
  Briefcase,
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
  Area,
} from 'recharts';
import { cn } from '../utils';
import { OperationType } from '../types';

interface DashboardProps {
  adminName: string;
}

// ── Couleurs des StatCards (classes Tailwind statiques = pas de purge) ──────
const STAT_THEMES = {
  indigo: {
    iconWrap: 'bg-indigo-100 text-indigo-600',
    border:   'hover:border-indigo-300',
    shadow:   'hover:shadow-indigo-100/50',
  },
  emerald: {
    iconWrap: 'bg-emerald-100 text-emerald-600',
    border:   'hover:border-emerald-300',
    shadow:   'hover:shadow-emerald-100/50',
  },
  sky: {
    iconWrap: 'bg-sky-100 text-sky-600',
    border:   'hover:border-sky-300',
    shadow:   'hover:shadow-sky-100/50',
  },
  rose: {
    iconWrap: 'bg-rose-100 text-rose-600',
    border:   'hover:border-rose-300',
    shadow:   'hover:shadow-rose-100/50',
  },
} as const;

type ThemeKey = keyof typeof STAT_THEMES;

// ── Couleurs des barres de progression ───────────────────────────────────────
const PROGRESS_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e'];

// ── Salutation contextuelle ──────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

// ── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub: string;
  icon: React.ReactNode;
  theme: ThemeKey;
  onClick: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, theme, onClick }) => {
  const t = STAT_THEMES[theme];
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`${label} — ${sub}`}
      className={cn(
        'bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer group',
        'transition-all duration-200 hover:shadow-md active:scale-[0.99]',
        t.border, t.shadow
      )}
    >
      {/* Icon badge */}
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4 shrink-0', t.iconWrap)}>
        {icon}
      </div>

      {/* Metric */}
      <p className="text-2xl sm:text-3xl font-bold text-slate-900 leading-none tabular-nums">
        {value}
      </p>
      <p className="text-sm font-medium text-slate-500 mt-1.5">{label}</p>

      {/* Footer */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">{sub}</span>
        <ChevronRight
          size={14}
          className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all"
        />
      </div>
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────────────────────
const Dashboard: React.FC<DashboardProps> = ({ adminName }) => {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0,
    monthlyRevenue: 0,
    lastAttendance: 0,
    lastAttendanceDate: 'Aucun relevé',
    lastServiceType: '---',
    absencesCount: 0,
    chartData: [] as { name: string; revenus: number }[],
    upcomingEvents: [] as { id: string; day: string; month: string; title: string; time: string; target: string }[],
    deptStats: [] as { name: string; count: number; percent: number }[],
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

    // Membres & Départements
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
        percent: totalMembersCount > 0 ? Math.round((count / totalMembersCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Finances (mois en cours)
    const monthlyRevenue = finances
      .filter(f => {
        const d = new Date(f.date);
        return (
          f.type === OperationType.REVENU &&
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear
        );
      })
      .reduce((sum, f) => sum + f.amount, 0);

    // Présences
    const sortedHistory = [...attendanceHistory].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastServiceGlobal = sortedHistory[0];
    const lastDateFormatted = lastServiceGlobal
      ? new Date(lastServiceGlobal.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      : 'Aucun relevé';

    const sundayServices = sortedHistory.filter(s => s.service === 'Culte de dimanche').slice(0, 2);
    const uniqueAbsentIds = new Set<string>();
    sundayServices.forEach(service => {
      (service.absentMembers || []).forEach(id => uniqueAbsentIds.add(id));
    });

    // Évolution financière 6 derniers mois
    const last6Months: { name: string; revenus: number }[] = [];
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

    // Activités à venir
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
        target: 'planning',
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
      deptStats,
    });
  };

  useEffect(() => { loadDashboardData(); }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzePageData('Tableau de Bord Global', {
      membres: stats.totalMembers,
      revenusMois: stats.monthlyRevenue,
      dernierePresence: stats.lastAttendance,
      repartitionDepartements: stats.deptStats,
    });
    setAnalysis(result || null);
    setIsAnalyzing(false);
  };

  const greeting = getGreeting();
  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── En-tête ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}, {adminName.split(' ')[0]} 👋
          </h2>
          <p className="text-sm text-slate-400 mt-1 capitalize">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || stats.totalMembers === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            <Sparkles size={14} />
            {isAnalyzing ? 'Analyse…' : 'Analyse IA'}
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-[0.98]"
          >
            Rapports
          </button>
        </div>
      </div>

      {/* ── Analyse IA ── */}
      <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Membres"
          value={stats.totalMembers}
          sub="Base de données"
          icon={<Users size={20} />}
          theme="indigo"
          onClick={() => navigate('/members')}
        />
        <StatCard
          label="Revenus du mois"
          value={formatCurrency(stats.monthlyRevenue)}
          sub="Entrées cumulées"
          icon={<Wallet size={20} />}
          theme="emerald"
          onClick={() => navigate('/finances')}
        />
        <StatCard
          label="Dernière Présence"
          value={stats.lastAttendance}
          sub={stats.lastAttendance === 0 ? 'Aucun relevé' : `${stats.lastAttendanceDate}`}
          icon={<UserCheck size={20} />}
          theme="sky"
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          label="Absents"
          value={stats.absencesCount}
          sub="2 derniers dimanches"
          icon={<UserMinus size={20} />}
          theme="rose"
          onClick={() => navigate('/attendance')}
        />
      </div>

      {/* ── Graphique + Panneau latéral ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Graphique revenus */}
        <Card
          title="Évolution des Revenus"
          subtitle="6 derniers mois"
          icon={<TrendingUp size={16} />}
          className="lg:col-span-2"
          noPadding
        >
          <div className="h-[280px] w-full p-5 pt-2">
            {stats.chartData.some(d => d.revenus > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.chartData}
                  margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradRevenus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.07)',
                      padding: '10px 14px',
                      fontSize: '13px',
                    }}
                    formatter={(val: number) => [formatCurrency(val), 'Revenus']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenus"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gradRevenus)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-200">
                <TrendingUp size={44} />
                <p className="text-xs text-slate-400 mt-3">Aucune donnée financière</p>
              </div>
            )}
          </div>
        </Card>

        {/* Panneau droit */}
        <div className="flex flex-col gap-5">

          {/* Prochaines Échéances */}
          <Card
            title="Prochaines Échéances"
            subtitle="Activités à venir"
            icon={<CalendarDays size={16} />}
          >
            <div className="space-y-3">
              {stats.upcomingEvents.length > 0 ? stats.upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => navigate('/' + ev.target)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/' + ev.target)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer group transition-all"
                >
                  {/* Date badge */}
                  <div className="w-11 h-11 rounded-xl bg-indigo-600 flex flex-col items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
                    <span className="text-xs text-indigo-200 leading-none">{ev.month}</span>
                    <span className="text-base font-bold text-white leading-none mt-0.5">{ev.day}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                      {ev.title}
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {ev.time}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              )) : (
                <div className="py-10 text-center flex flex-col items-center opacity-30">
                  <CalendarDays size={40} />
                  <p className="text-xs text-slate-400 mt-2">Aucune activité prévue</p>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/planning')}
              className="w-full mt-4 py-2.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-dashed border-indigo-200 active:scale-[0.98]"
            >
              Voir le planning complet
            </button>
          </Card>
        </div>
      </div>

      {/* ── Membres par Département (pleine largeur) ── */}
      <Card
        title="Membres par Département"
        subtitle="Répartition des effectifs"
        icon={<Briefcase size={16} />}
        headerAction={
          <button
            onClick={() => navigate('/planning')}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors px-3 py-1.5 hover:bg-indigo-50 rounded-lg"
          >
            Gérer
          </button>
        }
      >
        {stats.deptStats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
            {stats.deptStats.map((dept, i) => (
              <div key={dept.name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-600 truncate">{dept.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-semibold text-slate-800 tabular-nums">{dept.count}</span>
                    <span className="text-xs text-slate-400">({dept.percent}%)</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${dept.percent}%`, backgroundColor: PROGRESS_COLORS[i % PROGRESS_COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center flex flex-col items-center opacity-20">
            <Briefcase size={40} />
            <p className="text-xs text-slate-400 mt-2">Aucun département assigné</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
