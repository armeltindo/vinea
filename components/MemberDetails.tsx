import React, { useMemo, useState, useEffect } from 'react';
import { 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  Star, 
  Briefcase, 
  MessageSquare, 
  Heart, 
  CheckCircle2, 
  Clock, 
  User,
  MessageCircle,
  MoreVertical,
  Trash2,
  Edit,
  Maximize2,
  Flame,
  Music,
  Home,
  GraduationCap,
  Mic2,
  Users,
  Baby,
  Sparkles,
  Target,
  BookOpen,
  StickyNote,
  History as HistoryIcon,
  Zap,
  PhoneCall,
  UserRound,
  ShieldAlert,
  Hammer
} from 'lucide-react';
import { Member, MemberStatus, Department, DepartmentActivity, ActivityStatus } from '../types';
import { formatPhone } from '../constants';
import { cn, getInitials, getDisplayNickname, formatFirstName } from '../utils';
import { getMembers, getDepartmentActivities, getDiscipleshipEnrollments } from '../lib/db';

const getDepartmentIcon = (dept: Department, size = 14) => {
  switch (dept) {
    case Department.EVANGELISATION: return <Flame size={size} />;
    case Department.INTERCESSION: return <Heart size={size} />;
    case Department.LOUANGE: return <Music size={size} />;
    case Department.OEUVRES_SOCIALES: return <Home size={size} />;
    case Department.FORMATION_THEO: return <GraduationCap size={size} />;
    case Department.SECRETARIAT_MEDIAS: return <Mic2 size={size} />;
    case Department.ACCUEIL: return <Users size={size} />;
    case Department.ENFANTS: return <Baby size={size} />;
    case Department.ENTRETIEN: return <Sparkles size={size} />;
    default: return <Briefcase size={size} />;
  }
};

const getDepartmentColor = (dept: Department) => {
  switch (dept) {
    case Department.EVANGELISATION: return "bg-rose-50 text-rose-600 border-rose-100";
    case Department.INTERCESSION: return "bg-purple-50 text-purple-600 border-purple-100";
    case Department.LOUANGE: return "bg-blue-50 text-blue-600 border-blue-100";
    case Department.OEUVRES_SOCIALES: return "bg-amber-50 text-amber-600 border-amber-100";
    case Department.FORMATION_THEO: return "bg-indigo-50 text-indigo-600 border-indigo-100";
    case Department.SECRETARIAT_MEDIAS: return "bg-cyan-50 text-cyan-600 border-cyan-100";
    case Department.ACCUEIL: return "bg-emerald-50 text-emerald-600 border-emerald-100";
    case Department.ENFANTS: return "bg-orange-50 text-orange-600 border-orange-100";
    case Department.ENTRETIEN: return "bg-slate-50 text-slate-600 border-slate-100";
    default: return "bg-slate-50 text-slate-500 border-slate-100";
  }
};

interface MemberDetailsProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (member: Member) => void;
  onDelete: (memberId: string) => void;
  onPreviewPhoto?: (url: string) => void;
}

const MemberDetails: React.FC<MemberDetailsProps> = ({ member, isOpen, onClose, onEdit, onDelete, onPreviewPhoto }) => {
  if (!member) return null;

  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<DepartmentActivity[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      getMembers().then(setAllMembers);
      getDepartmentActivities().then(setActivities);
      getDiscipleshipEnrollments().then(setEnrollments);
    }
  }, [isOpen]);

  const spouseMember = useMemo(() => {
    if (!member.spouseName) return null;
    const sName = member.spouseName.toLowerCase();
    return allMembers.find(m => 
      `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`.toLowerCase() === sName ||
      `${m.lastName.toUpperCase()} ${formatFirstName(m.firstName)}`.toLowerCase() === sName ||
      (m.nickname && m.nickname.toLowerCase() === sName)
    );
  }, [member.spouseName, allMembers]);

  const dynamicHistory = useMemo(() => {
    const events: { id: string, date: string, type: string, label: string, icon: React.ReactNode }[] = [];
    const memberFullName = `${member.firstName} ${member.lastName}`.toLowerCase();

    if (member.joinDate) {
      events.push({
        id: 'join',
        date: member.joinDate,
        type: 'Adhésion',
        label: 'A rejoint la communauté Vinea',
        icon: <User size={12} />
      });
    }

    if (member.baptizedDate) {
      events.push({
        id: 'baptism',
        date: member.baptizedDate,
        type: 'Sacrement',
        label: 'Baptême par immersion',
        icon: <Heart size={12} className="text-rose-500" />
      });
    }

    activities.forEach(act => {
      if (act.responsibleId.toLowerCase().includes(memberFullName) || act.responsibleId.toLowerCase().includes(member.lastName.toLowerCase())) {
        events.push({
          id: act.id,
          date: act.deadline || act.createdAt,
          type: 'Service',
          label: `${act.status === ActivityStatus.REALISEE ? 'A réalisé' : 'Responsable de'} : ${act.title}`,
          icon: <Target size={12} className="text-indigo-500" />
        });
      }
    });

    const pathways = [
      { id: 'p1', title: 'Nouveaux Convertis' },
      { id: 'p2', title: 'Affermissement' },
      { id: 'p3', title: 'Leadership' },
      { id: 'p4', title: 'Service & Ministère' }
    ];
    enrollments.filter((e: any) => e.memberId === member.id).forEach((e: any) => {
      const path = pathways.find(p => p.id === e.pathwayId);
      events.push({
        id: e.id,
        date: e.startDate,
        type: 'Formation',
        label: `Inscription au parcours ${path?.title || 'spirituel'}`,
        icon: <BookOpen size={12} className="text-emerald-500" />
      });
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [member, activities, enrollments]);

  const handleCall = (num?: string) => {
    const phone = num || member.phone;
    if (phone) window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = () => {
    const phoneToUse = member.whatsappPhone || member.phone;
    if (phoneToUse) {
      const cleanPhone = phoneToUse.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const handleEmail = () => {
    if (member.email) window.location.href = `mailto:${member.email}`;
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[70] overflow-hidden transition-all duration-300 flex items-center justify-center p-4",
      isOpen ? "pointer-events-auto" : "pointer-events-none"
    )}>
      <div 
        className={cn(
          "absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )} 
        onClick={onClose}
      />
      
      <div className={cn(
        "relative w-full max-w-xl bg-white shadow-2xl transition-all duration-300 transform flex flex-col rounded-[3rem] overflow-hidden max-h-[90vh]",
        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
      )}>
        {/* Fixed Header Section */}
        <div className="relative px-10 py-12 bg-gradient-to-br from-indigo-600 to-indigo-800 shrink-0 overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <User size={160} className="text-white" />
          </div>
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"
          >
            <X size={20} />
          </button>
          
          <div className="relative z-10 flex items-center gap-6">
            <div 
              onClick={() => member.photoUrl && onPreviewPhoto?.(member.photoUrl)}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white p-1 shadow-2xl border border-white/20 cursor-pointer group/photo shrink-0"
            >
              <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 overflow-hidden font-black text-3xl relative">
                {member.photoUrl ? (
                  <>
                    <img src={member.photoUrl} alt="" className="w-full h-full object-cover transition-transform group-hover/photo:scale-110" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity">
                      <Maximize2 size={24} className="text-white" />
                    </div>
                  </>
                ) : (
                  getInitials(member.firstName, member.lastName)
                )}
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight uppercase tracking-tight truncate">
                {formatFirstName(member.firstName)} {member.lastName.toUpperCase()}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-lg text-[9px] font-black text-white uppercase tracking-widest border border-white/10">
                  {member.type}
                </span>
                <span className="w-1 h-1 rounded-full bg-indigo-300 opacity-50"></span>
                <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">
                  {member.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Section */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 space-y-8 pb-24">
          
          {/* Section: Identité Civile */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <User size={14} className="text-indigo-600" /> Identité & État Civil
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Surnom / Petit nom</p>
                <p className="text-xs font-bold text-slate-800 uppercase">{getDisplayNickname(member.firstName, member.nickname, member.gender)}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sexe</p>
                <p className="text-xs font-bold text-slate-800 uppercase">{member.gender}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date de naissance</p>
                <p className="text-xs font-bold text-slate-800">{member.birthDate ? new Date(member.birthDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '---'}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">État Civil</p>
                <p className="text-xs font-bold text-slate-800 uppercase">{member.maritalStatus}</p>
              </div>
              {(member.maritalStatus.includes('Marié') || member.spouseName) && (
                <div className="col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 overflow-hidden border border-rose-100 shadow-inner">
                    {spouseMember && spouseMember.photoUrl ? (
                      <img src={spouseMember.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : spouseMember ? (
                      <span className="text-sm font-black uppercase text-rose-600">{getInitials(spouseMember.firstName, spouseMember.lastName)}</span>
                    ) : (
                      <Heart size={20} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conjoint(e)</p>
                    <p className="text-xs font-bold text-slate-800 uppercase">{member.spouseName || 'Non spécifié'}</p>
                    {member.weddingDate && (
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Mariés le {new Date(member.weddingDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Profession & Talents */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Briefcase size={14} className="text-amber-500" /> Profil Professionnel
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
                  <Hammer size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Métier / Profession</p>
                  <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mt-1">
                    {member.profession || 'Non renseigné'}
                  </p>
                </div>
              </div>
              {member.skills && (
                <div className="col-span-2 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Zap size={10} className="text-amber-500" /> Talents & Compétences
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {member.skills.split(',').map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Coordonnées & Localisation */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <PhoneCall size={14} className="text-emerald-500" /> Contact & Localisation
            </h4>
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Téléphone Principal</p>
                    <button onClick={() => handleCall()} className="flex items-center gap-2 text-sm font-black text-indigo-600 hover:scale-105 transition-transform text-left">
                      <Phone size={14} /> {member.phone ? formatPhone(member.phone) : '---'}
                    </button>
                  </div>
                  {member.secondaryPhone && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Téléphone Secondaire</p>
                      <button onClick={() => handleCall(member.secondaryPhone)} className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:scale-105 transition-transform text-left">
                        <Phone size={14} /> {formatPhone(member.secondaryPhone)}
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">WhatsApp</p>
                    <button onClick={handleWhatsApp} className="flex items-center gap-2 text-sm font-black text-emerald-600 hover:scale-105 transition-transform text-left">
                      <MessageCircle size={14} /> {member.whatsappPhone ? formatPhone(member.whatsappPhone) : (member.phone ? formatPhone(member.phone) : '---')}
                    </button>
                  </div>
                  {member.email && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                      <button onClick={handleEmail} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:scale-105 transition-transform truncate max-w-full text-left">
                        <Mail size={14} /> {member.email}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-50 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <MapPin size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Adresse Physique</p>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                    {member.address || 'Aucune adresse renseignée.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Contact d'Urgence */}
          {member.emergencyContact && (member.emergencyContact.name || member.emergencyContact.phone) && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert size={14} className="text-rose-500" /> Contact d'Urgence
              </h4>
              <div className="bg-rose-50/50 border border-rose-100 p-5 rounded-[2rem] flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-200">
                  <UserRound size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{member.emergencyContact.relation || 'Contact'}</p>
                  <p className="text-sm font-black text-slate-800 uppercase truncate">{member.emergencyContact.name}</p>
                  <button onClick={() => handleCall(member.emergencyContact.phone)} className="text-xs font-bold text-rose-600 mt-0.5 flex items-center gap-1">
                    <Phone size={10} /> {formatPhone(member.emergencyContact.phone)}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section: Ministères */}
          {member.departments.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} className="text-indigo-600" /> Ministères & Départements
              </h4>
              <div className="flex flex-wrap gap-2">
                {member.departments.map(dept => (
                  <span key={dept} className={cn("px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase flex items-center gap-2", getDepartmentColor(dept))}>
                    {getDepartmentIcon(dept)} {dept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* History / Timeline */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <HistoryIcon size={14} /> Parcours Spirituel
            </h4>
            <div className="space-y-3">
              {dynamicHistory.length > 0 ? dynamicHistory.map(event => (
                <div key={event.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all shrink-0">
                      {event.icon}
                    </div>
                    <div className="flex-1 w-px bg-slate-100 my-1 group-last:hidden"></div>
                  </div>
                  <div className="pb-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{event.type} • {new Date(event.date).toLocaleDateString()}</p>
                    <p className="text-sm font-bold text-slate-700 mt-0.5">{event.label}</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-slate-400 italic">Aucun événement enregistré.</p>
              )}
            </div>
          </div>
          
          {/* Notes */}
          {member.notes && (
             <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <StickyNote size={14} className="text-indigo-600" /> Observations Pastorales
                </h4>
                <div className="p-5 bg-white border border-slate-100 rounded-[2rem] text-sm text-slate-600 font-medium italic leading-relaxed shadow-sm">
                  "{member.notes}"
                </div>
             </div>
          )}
        </div>

        {/* Fixed Footer Actions */}
        <div className="p-8 border-t border-slate-100 bg-white/80 backdrop-blur-md flex gap-3 shrink-0 z-20">
          <button 
            onClick={() => onEdit(member)}
            className="flex-1 py-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
          >
            <Edit size={16} /> Modifier Fiche
          </button>
          <button 
            onClick={() => onDelete(member.id)}
            className="px-6 py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberDetails;