
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  User, 
  Clock, 
  Zap, 
  Target,
  ArrowRight,
  MessageCircle,
  Phone,
  X,
  Info
} from 'lucide-react';
import { Visitor, VisitorStatus } from '../types';
import { cn } from '../utils';

interface FollowUpCalendarProps {
  visitors: Visitor[];
  onSelectVisitor: (visitor: Visitor) => void;
}

const FollowUpCalendar: React.FC<FollowUpCalendarProps> = ({ visitors, onSelectVisitor }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(new Date().toISOString().split('T')[0]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('fr-FR', { month: 'long' });
  
  const totalDays = daysInMonth(year, month);
  const startDay = (firstDayOfMonth(year, month) + 6) % 7; // Ajuster pour que Lundi soit 0

  const selectedDayData = useMemo(() => {
    if (!selectedDay) return { visits: [], followUps: [] };
    return {
      visits: visitors.filter(v => v.visitDate === selectedDay),
      followUps: visitors.filter(v => 
        v.followUpHistory?.some(h => h.nextStepDate === selectedDay)
      )
    };
  }, [selectedDay, visitors]);

  // Calcul dynamique de l'objectif hebdomadaire (basé sur la semaine de selectedDay ou actuelle)
  const weeklyStats = useMemo(() => {
    const today = new Date();
    const firstDayOfWeek = new Date(today);
    const day = today.getDay() || 7; // 1-7
    firstDayOfWeek.setDate(today.getDate() - day + 1);
    firstDayOfWeek.setHours(0,0,0,0);
    
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
    lastDayOfWeek.setHours(23,59,59,999);

    const weekVisits = visitors.filter(v => {
      const vd = new Date(v.visitDate);
      return vd >= firstDayOfWeek && vd <= lastDayOfWeek;
    });

    const weekGoal = 10; // Valeur par défaut ou paramétrable plus tard
    return {
      completed: weekVisits.length,
      goal: Math.max(weekGoal, weekVisits.length),
      percent: Math.min(100, Math.round((weekVisits.length / Math.max(weekGoal, weekVisits.length)) * 100))
    };
  }, [visitors]);

  const renderDays = () => {
    const days = [];
    // Cellules vides pour le mois précédent
    for (let i = 0; i < startDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 sm:h-32 bg-slate-50/30 border-r border-b border-slate-100"></div>
      );
    }

    // Jours du mois en cours
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayVisits = visitors.filter(v => v.visitDate === dateStr);
      const dayFollowUps = visitors.filter(v => 
        v.followUpHistory?.some(h => h.nextStepDate === dateStr)
      );

      const isToday = new Date().toISOString().split('T')[0] === dateStr;
      const isSelected = selectedDay === dateStr;
      const hasEvents = dayVisits.length > 0 || dayFollowUps.length > 0;

      days.push(
        <div 
          key={d} 
          onClick={() => setSelectedDay(dateStr)}
          className={cn(
            "h-24 sm:h-32 border-r border-b border-slate-100 p-2 sm:p-3 transition-all cursor-pointer group relative overflow-hidden",
            isSelected ? "bg-indigo-50/50 ring-2 ring-inset ring-indigo-500 z-10" : "hover:bg-slate-50",
            isToday && !isSelected && "bg-amber-50/30"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={cn(
              "text-xs font-black w-6 h-6 flex items-center justify-center rounded-lg transition-all",
              isSelected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : 
              isToday ? "bg-amber-500 text-white shadow-md shadow-amber-100" : "text-slate-400 group-hover:text-slate-900"
            )}>
              {d}
            </span>
            {hasEvents && !isSelected && (
              <div className="flex gap-0.5">
                {dayVisits.length > 0 && <div className="w-1 h-1 rounded-full bg-emerald-500"></div>}
                {dayFollowUps.length > 0 && <div className="w-1 h-1 rounded-full bg-indigo-500"></div>}
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            {dayVisits.slice(0, 2).map(v => (
              <div key={v.id} className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[8px] font-black uppercase truncate border border-emerald-100">
                <Zap size={6} /> {v.lastName}
              </div>
            ))}
            {dayFollowUps.slice(0, 2).map(v => (
              <div key={v.id} className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[8px] font-black uppercase truncate border border-indigo-100">
                <Clock size={6} /> {v.lastName}
              </div>
            ))}
            {(dayVisits.length + dayFollowUps.length) > 4 && (
              <div className="text-[7px] font-bold text-slate-400 text-center uppercase tracking-tighter">
                + {(dayVisits.length + dayFollowUps.length) - 4} autres
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-500">
      {/* Grille de Calendrier */}
      <div className="lg:col-span-3 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        {/* Header Calendrier */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 capitalize tracking-tight">{monthName} {year}</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Gestion Temporelle</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all active:scale-90">
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => {
                const now = new Date();
                setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedDay(now.toISOString().split('T')[0]);
              }} 
              className="px-3 py-1.5 text-[10px] font-black text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all uppercase tracking-widest"
            >
              Aujourd'hui
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all active:scale-90">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100 shrink-0">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="py-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Grille Jours */}
        <div className="grid grid-cols-7 bg-white flex-1 overflow-auto custom-scrollbar">
          {renderDays()}
        </div>
        
        {/* Légende */}
        <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex items-center justify-center gap-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Visite</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Suivi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aujourd'hui</span>
          </div>
        </div>
      </div>

      {/* Détail du Jour Sélectionné */}
      <div className="lg:col-span-1 space-y-6 flex flex-col h-full">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-lg p-6 flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-500">
          <div className="mb-6 flex items-center justify-between shrink-0">
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Agenda du jour</h4>
              <p className="text-sm font-black text-slate-900">
                {selectedDay ? new Date(selectedDay).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Sélectionnez un jour'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
              <Clock size={18} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
            {(selectedDayData.visits.length === 0 && selectedDayData.followUps.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-300">
                <CalendarIcon size={40} className="mb-3 opacity-20" />
                <p className="text-xs font-bold italic">Aucune activité prévue ce jour.</p>
              </div>
            ) : (
              <>
                {selectedDayData.visits.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                      <Zap size={12} /> Nouvelles Visites ({selectedDayData.visits.length})
                    </h5>
                    {selectedDayData.visits.map(v => (
                      <div 
                        key={v.id} 
                        onClick={() => onSelectVisitor(v)}
                        className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl hover:bg-emerald-50 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-black text-slate-800 group-hover:text-emerald-700">{v.lastName} {v.firstName}</p>
                          <ArrowRight size={14} className="text-emerald-300 group-hover:translate-x-1 transition-transform" />
                        </div>
                        <p className="text-[10px] text-emerald-600/70 font-bold uppercase truncate">{v.service}</p>
                      </div>
                    ))}
                  </div>
                )}

                {selectedDayData.followUps.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={12} /> Suivis Programmé ({selectedDayData.followUps.length})
                    </h5>
                    {selectedDayData.followUps.map(v => (
                      <div 
                        key={v.id} 
                        onClick={() => onSelectVisitor(v)}
                        className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl hover:bg-indigo-50 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-black text-slate-800 group-hover:text-indigo-700">{v.lastName} {v.firstName}</p>
                          <ArrowRight size={14} className="text-indigo-300 group-hover:translate-x-1 transition-transform" />
                        </div>
                        {v.followUpHistory?.filter(h => h.nextStepDate === selectedDay).map((h, idx) => (
                          <div key={idx} className="mt-2 pt-2 border-t border-indigo-100/50">
                            <p className="text-[10px] font-black text-indigo-900 leading-tight">Action : {h.nextStep}</p>
                            <p className="text-[9px] text-indigo-500 font-bold mt-0.5 line-clamp-1 italic">"{h.note}"</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 shrink-0">
            <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-100 flex items-center justify-between group cursor-pointer">
              <div>
                <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Action Rapide</p>
                <p className="text-xs font-bold mt-0.5">Lancer les appels du jour</p>
              </div>
              <Phone size={20} className="group-hover:rotate-12 transition-transform" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Target size={60} />
          </div>
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Objectif Semaine</h5>
          <p className="text-2xl font-black">{weeklyStats.goal} Visites</p>
          <div className="mt-4 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${weeklyStats.percent}%` }}></div>
          </div>
          <p className="text-[9px] font-bold text-slate-500 mt-2 uppercase tracking-widest">{weeklyStats.completed} / {weeklyStats.goal} Complétées</p>
        </div>
      </div>
    </div>
  );
};

export default FollowUpCalendar;
