import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import { 
  Briefcase, 
  Plus, 
  Users, 
  Calendar, 
  ChevronRight, 
  Search, 
  Filter, 
  X, 
  Save, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Sparkles,
  TrendingUp,
  DollarSign,
  User,
  ArrowRight,
  Loader2,
  Settings2,
  PieChart,
  BarChart3,
  ListChecks,
  Target
} from 'lucide-react';
import { analyzePageData } from '../lib/gemini';
import { formatCurrency } from '../constants';
import { DepartmentInfo, DepartmentActivity, ActivityStatus, Member } from '../types';
import { cn, generateId } from '../utils';
import { getDepartmentsInfo, upsertDepartmentInfo, getDepartmentActivities, createDepartmentActivity, updateDepartmentActivity, deleteDepartmentActivity, getMembers, getAppConfig } from '../lib/db';

const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [activities, setActivities] = useState<DepartmentActivity[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'depts' | 'planning'>('depts');

  // Modals
  const [isDeptFormOpen, setIsDeptFormOpen] = useState(false);
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentInfo | null>(null);
  const [editingActivity, setEditingActivity] = useState<DepartmentActivity | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  // Forms
  const [deptFormData, setDeptFormData] = useState<Partial<DepartmentInfo>>({
    name: '', description: '', presidentId: '', memberIds: [], status: 'Actif', color: '#4f46e5'
  });
  const [activityFormData, setActivityFormData] = useState<Partial<DepartmentActivity>>({
    title: '', deptId: '', responsibleId: '', associateName: '', cost: 0, deadline: '', status: ActivityStatus.PLANIFIEE, observations: ''
  });

  useEffect(() => {
    const load = async () => {
      const [depts, acts, mems, configDepts] = await Promise.all([
        getDepartmentsInfo(),
        getDepartmentActivities(),
        getMembers(),
        getAppConfig('departments'),
      ]);
      const configNames: string[] = configDepts ?? [];
      setAvailableDepartments(configNames);
      setActivities(acts);
      setMembers(mems);

      // Auto-créer les fiches manquantes pour les départements configurés dans Settings
      const existingNames = new Set(depts.map(d => d.name));
      const missing = configNames.filter(name => !existingNames.has(name));
      const newDepts: DepartmentInfo[] = [];
      for (const name of missing) {
        const newDept: DepartmentInfo = {
          id: generateId(),
          name,
          description: '',
          presidentId: '',
          memberIds: [],
          status: 'Actif',
          color: '#4f46e5',
        };
        await upsertDepartmentInfo(newDept);
        newDepts.push(newDept);
      }
      setDepartments([...depts, ...newDepts]);
    };
    load();
  }, []);

  const stats = useMemo(() => {
    return {
      totalDepts: departments.length,
      totalActivities: activities.length,
      realizedCount: activities.filter(a => a.status === ActivityStatus.REALISEE).length,
      totalCost: activities.reduce((sum, a) => sum + (a.cost || 0), 0),
      realizationRate: activities.length > 0 ? Math.round((activities.filter(a => a.status === ActivityStatus.REALISEE).length / activities.length) * 100) : 0
    };
  }, [activities, departments]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const data = { departments, activities, stats };
    const result = await analyzePageData("Gestion des Départements & Activités", data);
    setAnalysis(result || null);
    setIsAnalyzing(false);
  };

  const saveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDept) {
      const updated = { ...editingDept, ...deptFormData } as DepartmentInfo;
      await upsertDepartmentInfo(updated);
      setDepartments(departments.map(d => d.id === editingDept.id ? updated : d));
    } else {
      const newDept: DepartmentInfo = { ...deptFormData as DepartmentInfo, id: generateId() };
      await upsertDepartmentInfo(newDept);
      setDepartments([...departments, newDept]);
    }
    setIsDeptFormOpen(false);
    setEditingDept(null);
  };

  const saveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingActivity) {
      const updated = { ...editingActivity, ...activityFormData } as DepartmentActivity;
      await updateDepartmentActivity(updated);
      setActivities(activities.map(a => a.id === editingActivity.id ? updated : a));
    } else {
      const newActivity: DepartmentActivity = { ...activityFormData as DepartmentActivity, id: generateId(), createdAt: new Date().toISOString() };
      await createDepartmentActivity(newActivity);
      setActivities([...activities, newActivity]);
    }
    setIsActivityFormOpen(false);
    setEditingActivity(null);
  };

  const deleteActivity = async (id: string) => {
    if (confirm('Voulez-vous supprimer cette activité ?')) {
      await deleteDepartmentActivity(id);
      setActivities(activities.filter(a => a.id !== id));
    }
  };

  const getMemberName = (id: string) => {
    const member = members.find(m => m.id === id);
    return member ? `${member.lastName} ${member.firstName}` : 'Inconnu';
  };

  const filteredDepts = departments.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredActivities = activities.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Gouvernance des Départements</h2>
          <p className="text-sm text-slate-500 font-medium italic">Vinea : Structurez vos ministères et suivez vos projets.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAnalyze} disabled={isAnalyzing} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50">
            <Sparkles size={16} /> {isAnalyzing ? 'Analyse...' : 'Analyse Stratégique'}
          </button>
          <button onClick={() => { setDeptFormData({ name: '', description: '', presidentId: members[0]?.id ?? '', memberIds: [], status: 'Actif', color: '#4f46e5' }); setEditingDept(null); setIsDeptFormOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all uppercase tracking-widest shadow-lg">
            <Plus size={18} /> Nouveau Département
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          title="Départements" 
          subtitle="Total enregistrés" 
          icon={<Briefcase size={20} className="text-indigo-600" />}
          className="cursor-pointer hover:border-indigo-300 transition-all active:scale-95 group"
          onClick={() => setActiveView('depts')}
        >
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{stats.totalDepts}</span>
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
          </div>
        </Card>
        <Card 
          title="Planification" 
          subtitle="Activités au registre" 
          icon={<Target size={20} className="text-amber-500" />}
          className="cursor-pointer hover:border-amber-300 transition-all active:scale-95 group"
          onClick={() => setActiveView('planning')}
        >
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">{stats.totalActivities}</span>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase">Total</span>
          </div>
        </Card>
        <Card 
          title="Réalisation" 
          subtitle="Taux de complétion" 
          icon={<CheckCircle2 size={20} className="text-emerald-500" />}
          className="cursor-pointer hover:border-emerald-300 transition-all active:scale-95 group"
          onClick={() => setActiveView('planning')}
        >
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-emerald-600">{stats.realizationRate}%</span>
            <TrendingUp size={20} className="text-emerald-500 mb-1" />
          </div>
        </Card>
        <Card 
          title="Coût Global" 
          subtitle="Engagements financiers" 
          icon={<DollarSign size={20} className="text-slate-600" />}
          className="cursor-pointer hover:border-slate-400 transition-all active:scale-95 group"
          onClick={() => setActiveView('planning')}
        >
          <div className="flex items-end justify-between">
            <span className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{formatCurrency(stats.totalCost)}</span>
          </div>
        </Card>
      </div>

      <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />

      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit">
        <button onClick={() => setActiveView('depts')} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeView === 'depts' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>
          <Briefcase size={14} className="inline mr-2" /> Liste des Départements
        </button>
        <button onClick={() => setActiveView('planning')} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeView === 'planning' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>
          <ListChecks size={14} className="inline mr-2" /> Planning des Activités
        </button>
      </div>

      {activeView === 'depts' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDepts.map(dept => (
            <Card key={dept.id} className="group hover:border-indigo-200 transition-all p-0 overflow-hidden shadow-sm">
              <div className="h-2 w-full" style={{ backgroundColor: dept.color }}></div>
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{dept.name}</h3>
                    <p className="text-xs text-slate-500 font-medium italic leading-relaxed">{dept.description}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingDept(dept); setDeptFormData(dept); setIsDeptFormOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit size={16} /></button>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Président</span>
                    <span className="text-xs font-black text-slate-800 uppercase">{getMemberName(dept.presidentId)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Membres</span>
                    <div className="flex items-center gap-2">
                       <Users size={14} className="text-indigo-400" />
                       <span className="text-xs font-black text-slate-800">{dept.memberIds.length} fidèles</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activités Réalisées</span>
                    <span className="text-xs font-black text-emerald-600">
                       {activities.filter(a => a.deptId === dept.id && a.status === ActivityStatus.REALISEE).length} / {activities.filter(a => a.deptId === dept.id).length}
                    </span>
                  </div>
                </div>

                <button onClick={() => { setActivityFormData({ deptId: dept.id, status: ActivityStatus.PLANIFIEE }); setIsActivityFormOpen(true); }} className="w-full py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-2">
                  <Plus size={14} /> Planifier une activité
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card title="Planning Global des Activités" className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Activité</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Département</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Coût</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Délai</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActivities.length > 0 ? filteredActivities.map(activity => {
                  const dept = departments.find(d => d.id === activity.deptId);
                  return (
                    <tr key={activity.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{activity.title}</p>
                        {activity.observations && <p className="text-[10px] text-slate-400 italic line-clamp-1">{activity.observations}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase" style={{ borderLeft: `3px solid ${dept?.color || '#ccc'}` }}>
                          {dept?.name || 'Inconnu'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-700">{activity.responsibleId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-slate-900">{formatCurrency(activity.cost || 0)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                           <Clock size={12} className="text-slate-300" />
                           {activity.deadline ? new Date(activity.deadline).toLocaleDateString('fr-FR') : '---'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                          activity.status === ActivityStatus.REALISEE ? "bg-emerald-50 text-emerald-600" :
                          activity.status === ActivityStatus.EN_COURS ? "bg-blue-50 text-blue-600" :
                          activity.status === ActivityStatus.PLANIFIEE ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {activity.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => { setEditingActivity(activity); setActivityFormData(activity); setIsActivityFormOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit size={16} /></button>
                          <button onClick={() => deleteActivity(activity.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-300 italic text-sm">Aucune activité enregistrée</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Département */}
      {isDeptFormOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDeptFormOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="bg-indigo-600 p-8 text-white">
               <h3 className="text-xl font-black uppercase tracking-tight">{editingDept ? 'Modifier Département' : 'Nouveau Département'}</h3>
               <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mt-1">Structure organisationnelle</p>
            </div>
            <form onSubmit={saveDept} className="p-8 space-y-6 bg-slate-50/30">
               <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom du département</label>
                    <select required value={deptFormData.name} onChange={(e) => setDeptFormData({...deptFormData, name: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-black uppercase tracking-widest transition-all">
                       <option value="">Sélectionner un département...</option>
                       {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Mission</label>
                    <textarea rows={3} value={deptFormData.description} onChange={(e) => setDeptFormData({...deptFormData, description: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-medium resize-none" placeholder="Décrivez le rôle..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Président (Responsable)</label>
                    <select value={deptFormData.presidentId} onChange={(e) => setDeptFormData({...deptFormData, presidentId: e.target.value})} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-bold">
                       {members.map(m => <option key={m.id} value={m.id}>{m.lastName} {m.firstName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Couleur d'identification</label>
                    <input type="color" value={deptFormData.color} onChange={(e) => setDeptFormData({...deptFormData, color: e.target.value})} className="w-full h-12 p-1 bg-white border border-slate-200 rounded-2xl cursor-pointer" />
                  </div>
               </div>
               <div className="flex gap-3">
                  <button type="button" onClick={() => setIsDeptFormOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest">Annuler</button>
                  <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-2">
                     <Save size={16} /> Enregistrer
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Activité */}
      {isActivityFormOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsActivityFormOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-amber-500 p-8 text-white shrink-0">
               <h3 className="text-xl font-black uppercase tracking-tight">{editingActivity ? 'Modifier l\'Activité' : 'Planifier une Activité'}</h3>
               <p className="text-[10px] font-bold text-amber-100 uppercase tracking-widest mt-1">Registre des actions</p>
            </div>
            <form onSubmit={saveActivity} className="p-8 space-y-6 bg-slate-50/30 overflow-y-auto custom-scrollbar">
               <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Intitulé de l'activité *</label>
                    <input type="text" required value={activityFormData.title} onChange={(e) => setActivityFormData({...activityFormData, title: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-black" placeholder="Ex: Répétition générale" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Département *</label>
                      <select required value={activityFormData.deptId} onChange={(e) => setActivityFormData({...activityFormData, deptId: e.target.value})} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-bold">
                         <option value="">Sélectionner...</option>
                         {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut *</label>
                      <select required value={activityFormData.status} onChange={(e) => setActivityFormData({...activityFormData, status: e.target.value as ActivityStatus})} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-bold">
                         {Object.values(ActivityStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Personne responsable *</label>
                      <input type="text" required value={activityFormData.responsibleId} onChange={(e) => setActivityFormData({...activityFormData, responsibleId: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold" placeholder="Nom du responsable" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Personne associée</label>
                      <input type="text" value={activityFormData.associateName} onChange={(e) => setActivityFormData({...activityFormData, associateName: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold" placeholder="Nom de l'adjoint" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Coût d'exécution (FCFA)</label>
                      <input type="number" value={activityFormData.cost} onChange={(e) => setActivityFormData({...activityFormData, cost: parseInt(e.target.value) || 0})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold" placeholder="0" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Délai d'exécution</label>
                      <input type="date" value={activityFormData.deadline} onChange={(e) => setActivityFormData({...activityFormData, deadline: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-bold" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observations / Commentaires</label>
                    <textarea rows={3} value={activityFormData.observations} onChange={(e) => setActivityFormData({...activityFormData, observations: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-medium resize-none" placeholder="Précisez les détails..." />
                  </div>
               </div>
               <div className="flex gap-3 pt-4 shrink-0">
                  <button type="button" onClick={() => setIsActivityFormOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest">Annuler</button>
                  <button type="submit" className="flex-1 py-4 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-100 flex items-center justify-center gap-2 hover:bg-amber-600 transition-all">
                     <Save size={16} /> Enregistrer l'activité
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;