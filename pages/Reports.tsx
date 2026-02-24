import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Sparkles, 
  FileText, 
  Users, 
  ChevronRight,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowLeft,
  ListChecks,
  Clock,
  ShieldCheck,
  Zap,
  CalendarDays,
  Layout,
  Activity,
  Award,
  CheckSquare,
  TrendingDown,
  Coins,
  History as HistoryIcon,
  Lightbulb,
  Info,
  UserPlus,
  Heart,
  Globe,
  Briefcase,
  Loader2,
  MessageSquareText,
  Save,
  Check,
  BrainCircuit,
  Copy,
  UserCheck,
  GraduationCap,
  Trophy,
  CircleDashed,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { Member, FinancialRecord, OperationType, AttendanceSession, DepartmentActivity, ActivityStatus, DepartmentInfo, Visitor, VisitorStatus } from '../types';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { analyzePageData } from '../lib/gemini';
import { formatCurrency } from '../constants';
import { cn, generateId, getInitials, formatFirstName } from '../utils';
import { GoogleGenAI } from "@google/genai";
import { getMembers, getFinancialRecords, getAttendanceSessions, getDepartmentActivities, getDepartmentsInfo, getVisitors } from '../lib/db';

interface DeptMetric {
  id: string;
  name: string;
  score: number;
  color: string;
  trend: 'up' | 'down';
  details: {
    engagement: number;
    tasks: number;
    completedTasks: number;
    budget: number;
    achievements: { title: string; date: string }[];
    pending: { title: string; date: string }[];
    history: { period: string; score: number }[];
  };
}

interface ResourceMetric {
  name: string;
  value: number;
  color: string;
  trend: 'up' | 'down';
  details: {
    total: number;
    variation: string;
    description: string;
    subcategories: { label: string; amount: number }[];
    history: { name: string; amount: number }[];
    recommendation: string;
  };
}

interface StrategicInsight {
  type: 'danger' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  icon: React.ReactNode;
}

const Reports: React.FC = () => {
  const [period, setPeriod] = useState<'mois' | 'trimestre' | 'année'>('année');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  
  // AI Action Plan states
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [aiPlanContent, setAiPlanContent] = useState<string | null>(null);
  
  // UI States for Drill-downs
  const [selectedDept, setSelectedDept] = useState<DeptMetric | null>(null);
  const [isMemberDetailsOpen, setIsMemberDetailsOpen] = useState(false);
  const [isGrowthDetailsOpen, setIsGrowthDetailsOpen] = useState(false);
  const [isRetentionDetailsOpen, setIsRetentionDetailsOpen] = useState(false);
  const [isImpactDetailsOpen, setIsImpactDetailsOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);

  // --- Data Loading ---
  const [members, setMembers] = useState<Member[]>([]);
  const [finances, setFinances] = useState<FinancialRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSession[]>([]);
  const [activities, setActivities] = useState<DepartmentActivity[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const enrollments: any[] = [];

  useEffect(() => {
    const load = async () => {
      const [m, f, a, acts, depts, v] = await Promise.all([
        getMembers(),
        getFinancialRecords(),
        getAttendanceSessions(),
        getDepartmentActivities(),
        getDepartmentsInfo(),
        getVisitors(),
      ]);
      setMembers(m);
      setFinances(f);
      setAttendance(a as AttendanceSession[]);
      setActivities(acts);
      setDepartments(depts);
      setVisitors(v);
    };
    load();
  }, []);

  // --- Date Range Helper ---
  const dateRange = useMemo(() => {
    const now = new Date();
    let start, end;
    if (period === 'mois') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'trimestre') {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }
    return { start, end };
  }, [period]);

  // --- Growth Data Logic ---
  const growthData = useMemo(() => {
    const monthsNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const now = new Date();
    const result = [];
    const rangeCount = period === 'mois' ? 1 : period === 'trimestre' ? 3 : 12;
    
    for (let i = rangeCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const mYear = d.getFullYear();
      
      const membersAtPoint = members.filter(m => !m.joinDate || new Date(m.joinDate) <= new Date(mYear, mIdx + 1, 0)).length;
      const monthAttendance = attendance.filter(a => {
        const ad = new Date(a.date);
        return ad.getMonth() === mIdx && ad.getFullYear() === mYear;
      });
      const avgPresence = monthAttendance.length > 0 
        ? Math.round(monthAttendance.reduce((sum, a) => sum + (a.stats?.totalPresent || (a as any).total || 0), 0) / monthAttendance.length)
        : 0;

      const monthBudget = finances
        .filter(f => f.type === OperationType.REVENU && new Date(f.date).getMonth() === mIdx && new Date(f.date).getFullYear() === mYear)
        .reduce((sum, f) => sum + f.amount, 0);

      result.push({
        name: monthsNames[mIdx],
        membres: membersAtPoint,
        presence: avgPresence,
        budget: monthBudget,
        fullDate: d
      });
    }
    return result;
  }, [members, attendance, finances, period]);

  // --- KPIs and Dynamic Lists ---
  const periodActivities = useMemo(() => {
    return activities.filter(a => {
      const dStr = a.deadline || a.createdAt;
      if (!dStr) return false;
      const d = new Date(dStr);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [activities, dateRange]);

  const periodVisitors = useMemo(() => {
    return visitors.filter(v => {
      const d = new Date(v.visitDate);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [visitors, dateRange]);

  const kpis = useMemo(() => {
    const lastPoint = growthData[growthData.length - 1] || { membres: 0, presence: 0 };
    const prevPoint = growthData.length > 1 ? growthData[growthData.length - 2] : { membres: 0, presence: 0 };
    const diff = lastPoint.membres - prevPoint.membres;

    const integratedInPeriod = periodVisitors.filter(v => v.status === VisitorStatus.MEMBRE).length;
    const retentionRate = periodVisitors.length > 0 ? Math.round((integratedInPeriod / periodVisitors.length) * 100) : 0;

    const activeEnrollments = enrollments.filter((e: any) => {
      const d = new Date(e.lastUpdate || e.startDate);
      return d >= dateRange.start && d <= dateRange.end;
    });
    const avgGrowth = activeEnrollments.length > 0 
      ? Math.round(activeEnrollments.reduce((sum: number, e: any) => sum + e.progress, 0) / activeEnrollments.length)
      : 0;

    const impactSocial = periodActivities.filter(a => a.status === ActivityStatus.REALISEE).length;

    return {
      totalMembres: lastPoint.membres,
      croissanceLabel: diff >= 0 ? `+${diff}` : `${diff}`,
      croissanceSpirituelle: `${avgGrowth}%`,
      growthNum: avgGrowth,
      enrollmentsCount: activeEnrollments.length,
      retentionNum: retentionRate,
      retention: `${retentionRate}%`,
      impactSocial: impactSocial.toString(),
      periodVisitorsCount: periodVisitors.length,
      integratedCount: integratedInPeriod
    };
  }, [growthData, periodVisitors, periodActivities, enrollments, dateRange]);

  const strategicInsights = useMemo((): StrategicInsight[] => {
    const insights: StrategicInsight[] = [];
    
    if (kpis.retentionNum < 30 && kpis.periodVisitorsCount > 5) {
      insights.push({
        type: 'danger',
        title: 'Faiblesse de Rétention',
        description: `Seulement ${kpis.retention} des visiteurs sont intégrés. Nécessité urgente de réviser le processus d'accueil et de parrainage.`,
        icon: <Target className="text-rose-500" size={18} />
      });
    }

    if (kpis.growthNum < 40 && kpis.enrollmentsCount > 0) {
      insights.push({
        type: 'warning',
        title: 'Stagnation Spirituelle',
        description: "La progression dans les parcours de formation est lente. Envisager de dynamiser les cellules d'affermissement.",
        icon: <TrendingDown className="text-amber-500" size={18} />
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: 'info',
        title: 'Activité Stable',
        description: "Tous les indicateurs sont dans les normes. Maintenez le cap sur l'édification et les projets en cours.",
        icon: <Info className="text-indigo-500" size={18} />
      });
    }

    return insights;
  }, [kpis]);

  const financeMix = useMemo((): ResourceMetric[] => {
    const periodFinances = finances.filter(f => {
      const d = new Date(f.date);
      return d >= dateRange.start && d <= dateRange.end;
    });
    const totalRev = periodFinances.filter(f => f.type === OperationType.REVENU).reduce((s, f) => s + f.amount, 0) || 1;
    const categoriesSet = Array.from(new Set(periodFinances.filter(f => f.type === OperationType.REVENU).map(f => f.category)));
    const colorsArr = ['#4f46e5', '#818cf8', '#c7d2fe', '#6366f1', '#a5b4fc'];
    
    return categoriesSet.map((cat, idx) => {
      const amount = periodFinances.filter(f => f.type === OperationType.REVENU && f.category === cat).reduce((s, f) => s + f.amount, 0);
      return {
        name: cat,
        value: Math.round((amount / totalRev) * 100),
        color: colorsArr[idx % colorsArr.length],
        trend: 'up' as const,
        details: { total: amount, variation: "+0%", description: '', subcategories: [], history: [], recommendation: '' }
      };
    }).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [finances, dateRange]);

  const departmentPerformance = useMemo((): DeptMetric[] => {
    return departments.map(dept => {
      const deptActs = periodActivities.filter(a => a.deptId === dept.id);
      const completedCount = deptActs.filter(a => a.status === ActivityStatus.REALISEE).length;
      const scoreNum = deptActs.length > 0 ? Math.round((completedCount / deptActs.length) * 100) : 0;
      
      return {
        id: dept.id,
        name: dept.name,
        score: scoreNum,
        color: dept.color || '#4f46e5',
        trend: (scoreNum >= 50 ? 'up' : 'down') as 'up' | 'down',
        details: { 
          engagement: scoreNum, 
          tasks: deptActs.length, 
          completedTasks: completedCount,
          budget: deptActs.reduce((s, a) => s + (a.cost || 0), 0), 
          achievements: deptActs
            .filter(a => a.status === ActivityStatus.REALISEE)
            .map(a => ({ title: a.title, date: a.deadline || a.createdAt })),
          pending: deptActs
            .filter(a => a.status !== ActivityStatus.REALISEE)
            .map(a => ({ title: a.title, date: a.deadline || a.createdAt })),
          history: [] 
        }
      };
    }).sort((a, b) => b.score - a.score);
  }, [departments, periodActivities]);

  const handleGenerateReport = async () => {
    setIsAnalyzing(true);
    const result = await analyzePageData("Rapports Stratégiques", { period, kpis, depts: departmentPerformance });
    setAnalysis(result || null);
    setIsAnalyzing(false);
  };

  const handleGenerateAIPlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const prompt = `En tant qu'expert en management d'église, génère un plan d'action stratégique basé sur ces KPIs du ${period} dernier :
      Membres: ${kpis.totalMembres} (${kpis.croissanceLabel})
      Croissance Spirituelle (Progression): ${kpis.croissanceSpirituelle}
      Rétention Visiteurs: ${kpis.retention} (sur ${kpis.periodVisitorsCount} visites)
      Activités réalisées: ${kpis.impactSocial}
      Performance Départements: ${JSON.stringify(departmentPerformance.map(d => ({name: d.name, score: d.score, completed: d.details.completedTasks, total: d.details.tasks})))}
      
      Formatte la réponse en 3 sections claires : 1. Diagnostic des faiblesses, 2. Mesures immédiates (bullet points), 3. Versets bibliques d'encouragement pour les responsables. Utilise EXCLUSIVEMENT le texte de la version biblique Louis Segond 1910 for all biblical citations.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setAiPlanContent(response.text || "Impossible de générer le plan actuellement.");
    } catch (e) {
      console.error(e);
      setAiPlanContent("Erreur de connexion avec l'IA.");
    }
    setIsGeneratingPlan(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Rapports & Analyses</h2>
          <p className="text-sm text-slate-500 font-medium italic">Vinea Intelligence : Pilotez votre église avec des données réelles.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleGenerateReport} disabled={isAnalyzing} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg uppercase tracking-widest disabled:opacity-50">
            <Sparkles size={18} className={cn(isAnalyzing && "animate-pulse")} /> 
            {isAnalyzing ? 'Analyse...' : 'Synthèse Stratégique IA'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-2xl w-fit shadow-sm">
        {(['mois', 'trimestre', 'année'] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={cn("px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", period === p ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50")}>
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Membres" subtitle="Évolution base" icon={<Users size={20} className="text-indigo-600" />} className="cursor-pointer hover:border-indigo-300 transition-all group shadow-sm" onClick={() => setIsMemberDetailsOpen(true)}>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-black text-slate-900">{kpis.totalMembres}</span>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 group-hover:text-indigo-600 transition-colors">Démographie <ChevronRight size={10} className="inline" /></p>
            </div>
            <span className={cn("text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest", kpis.croissanceLabel.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>{kpis.croissanceLabel}</span>
          </div>
        </Card>
        
        <Card title="Croissance" subtitle="Progression spirituelle" icon={<Sparkles size={20} className="text-emerald-600" />} className="cursor-pointer hover:border-emerald-300 transition-all group shadow-sm" onClick={() => setIsGrowthDetailsOpen(true)}>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-black text-slate-900">{kpis.croissanceSpirituelle}</span>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 group-hover:text-emerald-600 transition-colors">Maturité <ChevronRight size={10} className="inline" /></p>
            </div>
            <Award size={24} className="text-emerald-500 mb-1" />
          </div>
        </Card>

        <Card title="Rétention" subtitle="Conversion période" icon={<Target size={20} className="text-rose-500" />} className="cursor-pointer hover:border-rose-300 transition-all group shadow-sm" onClick={() => setIsRetentionDetailsOpen(true)}>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-black text-slate-900">{kpis.retention}</span>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 group-hover:text-rose-600 transition-colors">Conversion <ChevronRight size={10} className="inline" /></p>
            </div>
            <ArrowUpRight size={20} className="text-emerald-500" />
          </div>
        </Card>

        <Card title="Actions" subtitle="Succès opérationnels" icon={<FileText size={20} className="text-amber-500" />} className="cursor-pointer hover:border-amber-300 transition-all group shadow-sm" onClick={() => setIsImpactDetailsOpen(true)}>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-black text-slate-900">{kpis.impactSocial}</span>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 group-hover:text-amber-600 transition-colors">Projets <ChevronRight size={10} className="inline" /></p>
            </div>
            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg uppercase tracking-widest">Fini</span>
          </div>
        </Card>
      </div>

      <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Croissance & Participation" icon={<TrendingUp size={18} />}>
          <div className="h-[350px] w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorPresence" x1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" name="Présence" dataKey="presence" stroke="#4f46e5" fillOpacity={1} fill="url(#colorPresence)" strokeWidth={4} />
                <Area type="monotone" name="Membres" dataKey="membres" stroke="#10b981" fillOpacity={0} strokeWidth={3} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Répartition des Revenus" icon={<PieIcon size={18} />}>
          <div className="h-[350px] w-full mt-6 flex flex-col md:flex-row items-center gap-8">
            <div className="w-full h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={financeMix} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                    {financeMix.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4 w-full md:w-72 shrink-0">
              {financeMix.map(item => (
                <div key={item.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-transparent shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: item.color}}></div>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card title="Performance Départements" className="lg:col-span-2 shadow-sm" icon={<BarChart3 size={18} />}>
           <div className="space-y-6 mt-4">
             {departmentPerformance.length > 0 ? departmentPerformance.map((dept) => (
               <div key={dept.id} onClick={() => setSelectedDept(dept)} className="space-y-3 group cursor-pointer p-4 hover:bg-slate-50 rounded-3xl transition-all border border-transparent hover:border-slate-200">
                 <div className="flex justify-between items-center">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110" style={{ backgroundColor: dept.color }}>
                       {dept.trend === 'up' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                     </div>
                     <div>
                        <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{dept.name}</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dept.details.tasks} activités ({dept.details.completedTasks} terminées)</p>
                     </div>
                   </div>
                   <div className="text-right">
                      <span className="text-xl font-black text-slate-900">{dept.score}%</span>
                      <ChevronRight size={14} className="inline ml-1 text-slate-300 group-hover:text-indigo-600" />
                   </div>
                 </div>
                 <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                   <div className="h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${dept.score}%`, backgroundColor: dept.color }}></div>
                 </div>
               </div>
             )) : (
               <div className="py-20 text-center opacity-30">
                 <Briefcase size={48} className="mx-auto" />
                 <p className="text-[10px] font-black uppercase mt-4">Aucun département au registre</p>
               </div>
             )}
           </div>
        </Card>

        <Card title="Points Stratégiques" icon={<AlertCircle size={18} className="text-rose-500" />}>
          <div className="space-y-4">
            {strategicInsights.slice(0, 2).map((insight, idx) => (
              <div key={idx} className={cn(
                "p-5 rounded-[2.5rem] border animate-in slide-in-from-right-4 duration-500",
                insight.type === 'danger' ? "bg-rose-50 border-rose-100" : 
                insight.type === 'warning' ? "bg-amber-50 border-amber-100" : 
                "bg-indigo-50 border-indigo-100"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {insight.icon}
                  <h5 className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    insight.type === 'danger' ? "text-rose-700" : 
                    insight.type === 'warning' ? "text-amber-700" : 
                    "text-indigo-700"
                  )}>{insight.title}</h5>
                </div>
                <p className={cn(
                  "text-xs font-medium leading-relaxed italic",
                  insight.type === 'danger' ? "text-rose-600" : 
                  insight.type === 'warning' ? "text-amber-600" : 
                  "text-indigo-600"
                )}>
                  "{insight.description}"
                </p>
              </div>
            ))}
            
            <div className="mt-6 pt-6 border-t border-slate-100">
               <button onClick={() => setIsPlanOpen(true)} className="w-full py-4 bg-slate-900 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95">
                 Revue du Plan d'Action <ChevronRight size={14} />
               </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Drill-down Modal for Department Performance - Centered */}
      {selectedDept && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setSelectedDept(null)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[3rem] overflow-hidden max-h-[90vh]">
            <div className="px-10 py-12 text-white shrink-0 relative overflow-hidden shadow-lg" style={{ backgroundColor: selectedDept.color }}>
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Briefcase size={180} /></div>
              <button onClick={() => setSelectedDept(null)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white transition-colors"><X size={24} /></button>
              <div className="relative z-10 space-y-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Fiche Performance</span>
                <h3 className="text-3xl font-black uppercase leading-tight tracking-tighter">{selectedDept.name}</h3>
                <div className="flex items-center gap-4">
                  <p className="text-xs text-white/80 font-bold uppercase tracking-widest">Période : {period}</p>
                  <span className="text-lg font-black">{selectedDept.score}%</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Réalisées</p>
                    <p className="text-2xl font-black text-slate-900">{selectedDept.details.completedTasks} / {selectedDept.details.tasks}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget Engagé</p>
                    <p className="text-2xl font-black text-slate-900">{formatCurrency(selectedDept.details.budget).split(' ')[0]} F</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Award size={16} className="text-emerald-500" /> Succès de la période
                </h4>
                <div className="space-y-3">
                  {selectedDept.details.achievements.length > 0 ? selectedDept.details.achievements.map((ach, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group hover:border-emerald-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                           <CheckCircle2 size={16} />
                        </div>
                        <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{ach.title}</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(ach.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  )) : (
                    <div className="py-10 text-center bg-white/50 border border-dashed border-slate-200 rounded-[2rem] opacity-50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aucun succès validé</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <CircleDashed size={16} className="text-amber-500" /> Objectifs restants
                </h4>
                <div className="space-y-3">
                  {selectedDept.details.pending.length > 0 ? selectedDept.details.pending.map((task, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group hover:border-amber-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                           <Clock size={16} />
                        </div>
                        <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{task.title}</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(task.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  )) : (
                    <div className="py-10 text-center bg-white/50 border border-dashed border-slate-200 rounded-[2rem] opacity-50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aucune tâche en attente</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-10 border-t border-slate-100 bg-white shrink-0">
              <button 
                onClick={() => setSelectedDept(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl active:scale-95"
              >
                Fermer l'Analyse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan d'Action Stratégique Modal - Centered */}
      {isPlanOpen && (
        <div className="fixed inset-0 z-[150] overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsPlanOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[3rem] overflow-hidden max-h-[90vh]">
            <div className="px-10 py-12 bg-slate-900 text-white shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Target size={180} />
              </div>
              <button onClick={() => setIsPlanOpen(false)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                <X size={24} />
              </button>
              <div className="relative z-10 space-y-4 mt-4">
                <span className="px-3 py-1 bg-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Soin Pastoral</span>
                <h3 className="text-3xl font-black uppercase leading-tight tracking-tighter">Plan d'Action Stratégique</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Décisions et mesures correctives basées sur l'IA</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 space-y-8">
              {!aiPlanContent && !isGeneratingPlan ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                  <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-300">
                    <BrainCircuit size={40} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-black text-slate-900 uppercase">Générer un plan d'action</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">Gemini peut analyser vos KPIs pour proposer des mesures concrètes d'amélioration.</p>
                  </div>
                  <button 
                    onClick={handleGenerateAIPlan}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 flex items-center gap-2 hover:bg-indigo-700 transition-all"
                  >
                    <Sparkles size={16} /> Lancer la génération
                  </button>
                </div>
              ) : isGeneratingPlan ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <Loader2 size={40} className="text-indigo-600 animate-spin" />
                  <p className="text-sm font-bold text-slate-500 italic">Gemini élabore votre stratégie...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-white p-10 rounded-[3rem] border border-indigo-100 shadow-xl shadow-indigo-500/5 relative group">
                    <div className="absolute top-8 right-8 flex gap-2">
                      <button 
                        onClick={() => { navigator.clipboard.writeText(aiPlanContent!); alert("Plan copié !"); }}
                        className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all"
                      >
                        <Copy size={20} />
                      </button>
                    </div>
                    <div className="prose prose-indigo max-w-none text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                      {aiPlanContent}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-10 border-t border-slate-100 bg-white shrink-0">
              <button 
                onClick={() => setIsPlanOpen(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl"
              >
                Fermer le Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drill-downs for KPIs */}
      {isGrowthDetailsOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsGrowthDetailsOpen(false)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[3rem] overflow-hidden max-h-[90vh]">
            <div className="px-10 py-12 bg-indigo-600 text-white shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Trophy size={180} /></div>
              <button onClick={() => setIsGrowthDetailsOpen(false)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white transition-colors"><X size={24} /></button>
              <div className="relative z-10 space-y-4 mt-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Indicateur de Maturité</span>
                <h3 className="text-3xl font-black uppercase leading-tight tracking-tighter">Croissance Spirituelle</h3>
                <p className="text-xs text-indigo-100 font-bold uppercase mt-1 tracking-widest">Période : {period}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/30">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Élèves actifs</p>
                    <p className="text-3xl font-black text-slate-900">{kpis.enrollmentsCount}</p>
                  </div>
                  <GraduationCap size={32} className="text-indigo-100" />
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Progression Moyenne</p>
                    <p className="text-3xl font-black text-indigo-600">{kpis.croissanceSpirituelle}</p>
                  </div>
                  <TrendingUp size={32} className="text-indigo-100" />
                </div>
              </div>
              <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem] flex items-start gap-4">
                <Info size={24} className="text-emerald-400 shrink-0" />
                <p className="text-[10px] text-emerald-700 font-black uppercase leading-relaxed tracking-widest">
                  Une progression spirituelle de {kpis.croissanceSpirituelle} témoigne d'un engagement profond des membres. Maintenez les séances de mentorat pour conserver cet élan.
                </p>
              </div>
            </div>
            <div className="p-10 border-t border-slate-100 bg-white flex shrink-0">
              <button onClick={() => setIsGrowthDetailsOpen(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl">Fermer les détails</button>
            </div>
          </div>
        </div>
      )}

      {isMemberDetailsOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsMemberDetailsOpen(false)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[3rem] overflow-hidden max-h-[90vh]">
            <div className="px-10 py-12 bg-indigo-600 text-white shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Users size={180} /></div>
              <button onClick={() => setIsMemberDetailsOpen(false)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white transition-colors"><X size={24} /></button>
              <div className="relative z-10 space-y-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Démographie</span>
                <h3 className="text-3xl font-black uppercase leading-tight tracking-tighter">Analyse de la Base</h3>
                <p className="text-xs text-indigo-100 font-bold uppercase mt-1">Total membres : {kpis.totalMembres}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/30">
               <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nouveaux membres sur la période</h4>
                 {members.filter(m => {
                   if (!m.joinDate) return false;
                   const d = new Date(m.joinDate);
                   return d >= dateRange.start && d <= dateRange.end;
                 }).length > 0 ? (
                   members.filter(m => {
                     if (!m.joinDate) return false;
                     const d = new Date(m.joinDate);
                     return d >= dateRange.start && d <= dateRange.end;
                   }).map(m => (
                     <div key={m.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">{getInitials(m.firstName, m.lastName)}</div>
                          <span className="text-xs font-black text-slate-800 uppercase">{formatFirstName(m.firstName)} {m.lastName}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(m.joinDate!).toLocaleDateString()}</span>
                     </div>
                   ))
                 ) : (
                   <div className="py-20 text-center text-slate-300 italic text-xs uppercase tracking-widest">Aucune nouvelle adhésion détectée</div>
                 )}
               </div>
            </div>
            <div className="p-8 border-t border-slate-100 bg-white flex shrink-0">
              <button onClick={() => setIsMemberDetailsOpen(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl">Fermer les détails</button>
            </div>
          </div>
        </div>
      )}

      {isRetentionDetailsOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsRetentionDetailsOpen(false)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[3rem] overflow-hidden max-h-[90vh]">
            <div className="px-10 py-12 bg-rose-600 text-white shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Target size={180} /></div>
              <button onClick={() => setIsRetentionDetailsOpen(false)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white transition-colors"><X size={24} /></button>
              <div className="relative z-10 space-y-4 mt-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Rétention & Conversion</span>
                <h3 className="text-3xl font-black uppercase leading-tight tracking-tighter">Indice de Conversion</h3>
                <p className="text-xs text-rose-100 font-bold uppercase mt-1 tracking-widest">Période : {period}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visiteurs arrivés</p>
                  <p className="text-3xl font-black text-slate-900">{kpis.periodVisitorsCount}</p>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Convertis réels</p>
                  <p className="text-3xl font-black text-emerald-600">{kpis.integratedCount}</p>
                </div>
              </div>
            </div>
            <div className="p-10 border-t border-slate-100 bg-white flex shrink-0">
              <button onClick={() => setIsRetentionDetailsOpen(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl">Fermer les détails</button>
            </div>
          </div>
        </div>
      )}

      {isImpactDetailsOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsImpactDetailsOpen(false)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[3rem] overflow-hidden max-h-[90vh]">
            <div className="px-10 py-12 bg-amber-500 text-white shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Activity size={180} /></div>
              <button onClick={() => setIsImpactDetailsOpen(false)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white transition-colors"><X size={24} /></button>
              <div className="relative z-10 space-y-4 mt-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Actions & Réalisations</span>
                <h3 className="text-3xl font-black uppercase leading-tight tracking-tighter">Impact Opérationnel</h3>
                <p className="text-xs text-amber-100 font-bold uppercase mt-1 tracking-widest">Période : {period}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-slate-50/30">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activités clôturées sur la période</h4>
                {periodActivities.filter(a => a.status === ActivityStatus.REALISEE).length > 0 ? (
                  periodActivities.filter(a => a.status === ActivityStatus.REALISEE).map(a => (
                    <div key={a.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{a.title}</p>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">DEPT: {departments.find(d => d.id === a.deptId)?.name || '---'}</span>
                         <span className="text-[9px] font-bold text-slate-400 tracking-widest">LE {new Date(a.deadline || a.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-slate-300 italic text-xs uppercase tracking-widest">Aucune activité terminée sur cette période</div>
                )}
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 bg-white flex shrink-0">
              <button onClick={() => setIsImpactDetailsOpen(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl">Fermer les détails</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;