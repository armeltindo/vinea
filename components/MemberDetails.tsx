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
  Hammer,
  Banknote,
  CalendarX,
  CalendarCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  CreditCard,
  UserCheck,
  Copy,
  KeyRound,
  Loader2
} from 'lucide-react';
import MemberCardModal from './MemberCardModal';
import { Member, MemberStatus, Department, DepartmentActivity, ActivityStatus, FinancialRecord, AttendanceSession, OperationType } from '../types';
import { formatPhone } from '../constants';
import { cn, getInitials, getDisplayNickname, formatFirstName } from '../utils';
import { getMembers, getDepartmentActivities, getDiscipleshipEnrollments, getFinancialRecords, getAttendanceSessions, generateMemberUsername, activateMemberAccount } from '../lib/db';
import Avatar from './Avatar';

const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

// Formate une date de naissance partielle (1900 = pas d'année, 00 = pas de jour/mois)
const formatBirthDate = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  const hasYear = y !== '1900';
  const hasMonth = m !== '00';
  const hasDay = d !== '00';
  const mLabel = hasMonth ? MOIS[parseInt(m, 10) - 1] : '';
  if (hasDay && hasMonth && hasYear) return `${parseInt(d)} ${mLabel} ${y}`;
  if (hasDay && hasMonth) return `${parseInt(d)} ${mLabel}`;
  if (hasMonth && hasYear) return `${mLabel} ${y}`;
  if (hasMonth) return mLabel;
  if (hasYear) return y;
  return '';
};

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

  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<DepartmentActivity[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [isActivatingAccount, setIsActivatingAccount] = useState(false);
  const [accountModal, setAccountModal] = useState<{ username: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getMembers().then(setAllMembers);
      getDepartmentActivities().then(setActivities);
      getDiscipleshipEnrollments().then(setEnrollments);
      getFinancialRecords().then(setFinancialRecords);
      getAttendanceSessions().then(setAttendanceSessions);
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

  const motherMember = useMemo(() => {
    if (member.motherId) return allMembers.find(m => m.id === member.motherId) ?? null;
    if (!member.motherName) return null;
    const n = member.motherName.toLowerCase();
    return allMembers.find(m =>
      `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`.toLowerCase() === n ||
      (m.nickname && m.nickname.toLowerCase() === n)
    ) ?? null;
  }, [member.motherId, member.motherName, allMembers]);

  const fatherMember = useMemo(() => {
    if (member.fatherId) return allMembers.find(m => m.id === member.fatherId) ?? null;
    if (!member.fatherName) return null;
    const n = member.fatherName.toLowerCase();
    return allMembers.find(m =>
      `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`.toLowerCase() === n ||
      (m.nickname && m.nickname.toLowerCase() === n)
    ) ?? null;
  }, [member.fatherId, member.fatherName, allMembers]);

  const children = useMemo(() => {
    const parentName = `${formatFirstName(member.firstName)} ${member.lastName.toUpperCase()}`.toLowerCase();
    return allMembers.filter(m =>
      (m.motherId && m.motherId === member.id) ||
      (m.fatherId && m.fatherId === member.id) ||
      (m.motherName && m.motherName.toLowerCase() === parentName) ||
      (m.fatherName && m.fatherName.toLowerCase() === parentName)
    );
  }, [member.id, member.firstName, member.lastName, allMembers]);

  const mentorMember = useMemo(() => {
    if (!member.assignedDiscipleMakerId) return null;
    return allMembers.find(m => m.id === member.assignedDiscipleMakerId) ?? null;
  }, [member.assignedDiscipleMakerId, allMembers]);

  const handleActivateAccount = async () => {
    setIsActivatingAccount(true);
    const username = await generateMemberUsername(member);
    // Mot de passe : téléphone si disponible, sinon nom normalisé sans accent
    const password = member.phone
      ? member.phone.replace(/\s/g, '')
      : member.lastName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    await activateMemberAccount(member.id, username);
    setIsActivatingAccount(false);
    setAccountModal({ username, password });
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const loginUrl = `${window.location.origin}/mon-espace`;
  const copyAll = () => {
    if (!accountModal) return;
    const text = `Lien : ${loginUrl}\nIdentifiant : ${accountModal.username}\nMot de passe : ${accountModal.password}`;
    handleCopy(text, 'all');
  };

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

  // ── Contributions financières ─────────────────────────────────────────────
  const memberFinances = useMemo(() =>
    financialRecords
      .filter(r => r.memberId === member.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [financialRecords, member.id]
  );

  const totalContributed = useMemo(() =>
    memberFinances
      .filter(r => r.type === OperationType.REVENU)
      .reduce((sum, r) => sum + r.amount, 0),
    [memberFinances]
  );

  // ── Présence aux cultes ────────────────────────────────────────────────────
  const memberAbsences = useMemo(() =>
    attendanceSessions
      .filter(s => (s.absentMembers ?? []).includes(member.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [attendanceSessions, member.id]
  );

  const attendanceRate = useMemo(() => {
    const total = attendanceSessions.length;
    if (total === 0) return null;
    const present = total - memberAbsences.length;
    return Math.round((present / total) * 100);
  }, [attendanceSessions, memberAbsences]);

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
    <>
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
        "relative w-full max-w-xl bg-white shadow-2xl transition-all duration-300 transform flex flex-col rounded-2xl overflow-hidden max-h-[90vh]",
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
            <div className="rounded-2xl bg-white p-1 shadow-2xl border border-white/20 shrink-0">
              <Avatar
                firstName={member.firstName}
                lastName={member.lastName}
                photoUrl={member.photoUrl}
                size="2xl"
                shape="card"
                onPhotoClick={member.photoUrl ? () => onPreviewPhoto?.(member.photoUrl!) : undefined}
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-semibold text-white leading-tight truncate">
                {formatFirstName(member.firstName)} {member.lastName.toUpperCase()}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-lg text-xs font-semibold text-white border border-white/10">
                  {member.type}
                </span>
                <span className="w-1 h-1 rounded-full bg-indigo-300 opacity-50"></span>
                <span className="text-xs text-indigo-200">
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
            <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
              <User size={14} className="text-indigo-600" /> Identité & État Civil
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                <p className="text-xs font-medium text-slate-500">Surnom / Petit nom</p>
                <p className="text-xs font-medium text-slate-800">{getDisplayNickname(member.firstName, member.nickname, member.gender)}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                <p className="text-xs font-medium text-slate-500">Sexe</p>
                <p className="text-xs font-medium text-slate-800">{member.gender}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                <p className="text-xs font-medium text-slate-500">Date de naissance</p>
                <p className="text-xs font-bold text-slate-800">{member.birthDate ? (formatBirthDate(member.birthDate) || '---') : '---'}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                <p className="text-xs font-medium text-slate-500">État Civil</p>
                <p className="text-xs font-medium text-slate-800">{member.maritalStatus}</p>
              </div>
              {member.source && (
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                  <p className="text-xs font-medium text-slate-500">Source / Comment atteint</p>
                  <p className="text-xs font-medium text-slate-800">{member.source}</p>
                </div>
              )}
              {member.invitedBy && (
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                  <p className="text-xs font-medium text-slate-500">Invité(e) par</p>
                  <p className="text-xs font-medium text-slate-800">{member.invitedBy}</p>
                </div>
              )}
              {(member.maritalStatus.includes('Marié') || member.spouseName || member.weddingDate) && (
                <div className="col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  {spouseMember ? (
                    <Avatar
                      firstName={spouseMember.firstName}
                      lastName={spouseMember.lastName}
                      photoUrl={spouseMember.photoUrl}
                      size="lg"
                      shape="card"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-400 border border-rose-100">
                      <Heart size={20} />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500">Conjoint(e)</p>
                    <p className="text-xs font-medium text-slate-800">{member.spouseName || 'Non spécifié'}</p>
                    {member.weddingDate && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Mariés le {new Date(member.weddingDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Parents */}
              {(member.motherName || member.fatherName) && (
                <>
                  {member.motherName && (
                    <div className="col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                      {motherMember ? (
                        <Avatar
                          firstName={motherMember.firstName}
                          lastName={motherMember.lastName}
                          photoUrl={motherMember.photoUrl}
                          size="lg"
                          shape="card"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-400 border border-pink-100">
                          <Baby size={20} />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-500">Mère</p>
                        <p className="text-xs font-medium text-slate-800">{member.motherName}</p>
                        {motherMember && <p className="text-xs text-slate-400 mt-0.5">{motherMember.status} · {motherMember.type}</p>}
                      </div>
                    </div>
                  )}
                  {member.fatherName && (
                    <div className="col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                      {fatherMember ? (
                        <Avatar
                          firstName={fatherMember.firstName}
                          lastName={fatherMember.lastName}
                          photoUrl={fatherMember.photoUrl}
                          size="lg"
                          shape="card"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-400 border border-blue-100">
                          <Baby size={20} />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-500">Père</p>
                        <p className="text-xs font-medium text-slate-800">{member.fatherName}</p>
                        {fatherMember && <p className="text-xs text-slate-400 mt-0.5">{fatherMember.status} · {fatherMember.type}</p>}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Section: Enfants */}
          {children.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
                <Baby size={14} className="text-purple-500" /> Enfants ({children.length})
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {children.map(child => (
                  <div key={child.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <Avatar
                      firstName={child.firstName}
                      lastName={child.lastName}
                      photoUrl={child.photoUrl}
                      size="lg"
                      shape="card"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-800">
                        {formatFirstName(child.firstName)} {child.lastName.toUpperCase()}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{child.status} · {child.type}</p>
                      {child.birthDate && formatBirthDate(child.birthDate) && <p className="text-xs text-slate-400">Né(e) le {formatBirthDate(child.birthDate)}</p>}
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      child.motherId === member.id && child.fatherId === member.id
                        ? 'bg-purple-50 text-purple-600'
                        : child.motherId === member.id
                        ? 'bg-pink-50 text-pink-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}>
                      {child.motherId === member.id && child.fatherId === member.id
                        ? 'Les deux'
                        : child.motherId === member.id
                        ? 'Via mère'
                        : 'Via père'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Profession & Talents */}
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
              <Briefcase size={14} className="text-amber-500" /> Profil Professionnel
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
                  <Hammer size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Métier / Profession</p>
                  <p className="text-sm font-semibold text-slate-800 leading-none mt-1">
                    {member.profession || 'Non renseigné'}
                  </p>
                </div>
              </div>
              {member.skills && (
                <div className="col-span-2 bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2">
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
                    <Zap size={10} className="text-amber-500" /> Talents & Compétences
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {member.skills.split(',').map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibolder">
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
            <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
              <PhoneCall size={14} className="text-emerald-500" /> Contact & Localisation
            </h4>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Téléphone Principal</p>
                    <button onClick={() => handleCall()} className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:scale-105 transition-transform text-left">
                      <Phone size={14} /> {member.phone ? formatPhone(member.phone) : '---'}
                    </button>
                  </div>
                  {member.secondaryPhone && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Téléphone Secondaire</p>
                      <button onClick={() => handleCall(member.secondaryPhone)} className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:scale-105 transition-transform text-left">
                        <Phone size={14} /> {formatPhone(member.secondaryPhone)}
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">WhatsApp</p>
                    <button onClick={handleWhatsApp} className="flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:scale-105 transition-transform text-left">
                      <MessageCircle size={14} /> {member.whatsappPhone ? formatPhone(member.whatsappPhone) : (member.phone ? formatPhone(member.phone) : '---')}
                    </button>
                  </div>
                  {member.email && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Email</p>
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
                  <p className="text-xs font-medium text-slate-500">Adresse Physique</p>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                    {member.address || 'Aucune adresse renseignée.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Disciple-maker assigné / Mentor */}
          {mentorMember && (
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
                <BookOpen size={14} className="text-indigo-600" /> Disciple-maker assigné
              </h4>
              <div className="bg-indigo-50/60 border border-indigo-100 p-5 rounded-xl flex items-center gap-5">
                <Avatar
                  firstName={mentorMember.firstName}
                  lastName={mentorMember.lastName}
                  photoUrl={mentorMember.photoUrl}
                  size="lg"
                  shape="card"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Disciple-maker</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{formatFirstName(mentorMember.firstName)} {mentorMember.lastName.toUpperCase()}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{mentorMember.status} · {mentorMember.type}</p>
                </div>
              </div>
            </div>
          )}

          {/* Section: Contact d'Urgence */}
          {member.emergencyContact && (member.emergencyContact.name || member.emergencyContact.phone) && (
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
                <ShieldAlert size={14} className="text-rose-500" /> Contact d'Urgence
              </h4>
              <div className="bg-rose-50/50 border border-rose-100 p-5 rounded-xl flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-200">
                  <UserRound size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-rose-500">{member.emergencyContact.relation || 'Contact'}</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{member.emergencyContact.name}</p>
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
              <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
                <ShieldCheck size={14} className="text-indigo-600" /> Ministères & Départements
              </h4>
              <div className="flex flex-wrap gap-2">
                {member.departments.map(dept => (
                  <span key={dept} className={cn("px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2", getDepartmentColor(dept))}>
                    {getDepartmentIcon(dept)} {dept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section: Contributions Financières */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Banknote size={14} className="text-emerald-600" /> Contributions Financières
            </h4>
            {memberFinances.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-[2rem] p-6 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 shrink-0">
                  <Banknote size={20} />
                </div>
                <p className="text-xs text-slate-400 italic font-medium">Aucune contribution enregistrée.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Stat totale */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-[1.5rem] p-4 space-y-1">
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Total donné</p>
                    <p className="text-lg font-black text-emerald-700 leading-none">
                      {totalContributed.toLocaleString('fr-FR')} <span className="text-xs font-bold">F CFA</span>
                    </p>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-[1.5rem] p-4 space-y-1 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opérations</p>
                    <p className="text-lg font-black text-slate-700 leading-none">{memberFinances.length}</p>
                  </div>
                </div>
                {/* Liste des transactions */}
                <div className="space-y-2">
                  {memberFinances.slice(0, 5).map(r => (
                    <div key={r.id} className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                        r.type === OperationType.REVENU ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                      )}>
                        {r.type === OperationType.REVENU ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-slate-800 uppercase truncate">{r.category}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(r.date).toLocaleDateString('fr-FR')} · {r.paymentMethod}</p>
                      </div>
                      <span className={cn(
                        "text-xs font-black shrink-0",
                        r.type === OperationType.REVENU ? "text-emerald-600" : "text-rose-500"
                      )}>
                        {r.type === OperationType.REVENU ? '+' : '-'}{r.amount.toLocaleString('fr-FR')}
                      </span>
                    </div>
                  ))}
                  {memberFinances.length > 5 && (
                    <p className="text-[9px] text-slate-400 font-black uppercase text-center pt-1">
                      + {memberFinances.length - 5} autre(s) transaction(s)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section: Présence aux Cultes */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <BarChart2 size={14} className="text-indigo-600" /> Présence aux Cultes
            </h4>
            {attendanceSessions.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-[2rem] p-6 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 shrink-0">
                  <CalendarCheck size={20} />
                </div>
                <p className="text-xs text-slate-400 italic font-medium">Aucun culte enregistré.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Stats présence */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-[1.5rem] p-4 space-y-1">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Assiduité</p>
                    <p className="text-lg font-black text-indigo-700 leading-none">
                      {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-[1.5rem] p-4 space-y-1 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Présent(s)</p>
                    <p className="text-lg font-black text-emerald-600 leading-none">
                      {attendanceSessions.length - memberAbsences.length}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-[1.5rem] p-4 space-y-1 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Absent(s)</p>
                    <p className="text-lg font-black text-rose-500 leading-none">{memberAbsences.length}</p>
                  </div>
                </div>
                {/* Barre de progression assiduité */}
                {attendanceRate !== null && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Taux de présence</span>
                      <span className={cn("text-[10px] font-black uppercase", attendanceRate >= 80 ? "text-emerald-600" : attendanceRate >= 50 ? "text-amber-500" : "text-rose-500")}>
                        {attendanceRate >= 80 ? 'Excellent' : attendanceRate >= 50 ? 'Moyen' : 'Faible'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", attendanceRate >= 80 ? "bg-emerald-500" : attendanceRate >= 50 ? "bg-amber-400" : "bg-rose-400")}
                        style={{ width: `${attendanceRate}%` }}
                      />
                    </div>
                  </div>
                )}
                {/* Liste des absences */}
                {memberAbsences.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <CalendarX size={10} className="text-rose-400" /> Absences récentes
                    </p>
                    {memberAbsences.slice(0, 5).map(s => (
                      <div key={s.id} className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
                        <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-400 flex items-center justify-center shrink-0">
                          <CalendarX size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-slate-700 uppercase truncate">{s.service}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                    ))}
                    {memberAbsences.length > 5 && (
                      <p className="text-[9px] text-slate-400 font-black uppercase text-center pt-1">
                        + {memberAbsences.length - 5} autre(s) absence(s)
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* History / Timeline */}
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
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
                    <p className="text-xs font-medium text-slate-500">{event.type} • {new Date(event.date).toLocaleDateString()}</p>
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
                <h4 className="text-xs font-medium text-slate-500 flex items-center gap-2">
                  <StickyNote size={14} className="text-indigo-600" /> Observations Pastorales
                </h4>
                <div className="p-5 bg-white border border-slate-100 rounded-xl text-sm text-slate-600 font-medium italic leading-relaxed shadow-sm">
                  "{member.notes}"
                </div>
             </div>
          )}
        </div>

        {/* Fixed Footer Actions */}
        <div className="p-8 border-t border-slate-100 bg-white/80 backdrop-blur-md flex flex-col gap-3 shrink-0 z-20">
          {/* Bouton activation compte membre */}
          <button
            onClick={handleActivateAccount}
            disabled={isActivatingAccount}
            className={cn(
              "w-full py-3 rounded-2xl text-xs font-medium transition-all flex items-center justify-center gap-2 border",
              member.memberAccountActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
            )}
          >
            {isActivatingAccount
              ? <><Loader2 size={15} className="animate-spin" /> Génération...</>
              : member.memberAccountActive
              ? <><UserCheck size={15} /> Compte actif — Réinitialiser infos</>
              : <><KeyRound size={15} /> Activer le compte Exercices Spirituels</>
            }
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setIsCardModalOpen(true)}
              className="px-5 py-4 bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl text-xs font-medium hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
            >
              <CreditCard size={16} /> Carte
            </button>
            <button
              onClick={() => onEdit(member)}
              className="flex-1 py-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl text-xs font-medium hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
            >
              <Edit size={16} /> Modifier Fiche
            </button>
            <button
              onClick={() => onDelete(member.id)}
              className="px-6 py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-xs font-medium hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>

    <MemberCardModal
      member={member}
      isOpen={isCardModalOpen}
      onClose={() => setIsCardModalOpen(false)}
    />

    {/* Modale informations de connexion */}
    {accountModal && (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setAccountModal(null)} />
        <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <UserCheck size={26} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 text-center">Compte activé !</h3>
          <p className="text-xs text-slate-500 text-center mt-1 mb-6">
            Copiez ces informations et envoyez-les au membre.
          </p>

          <div className="space-y-3">
            {/* URL */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Lien de connexion</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-indigo-600 break-all">{loginUrl}</p>
                <button onClick={() => handleCopy(loginUrl, 'url')} className="shrink-0 p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500">
                  {copiedField === 'url' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Identifiant */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Identifiant</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-800 font-mono">{accountModal.username}</p>
                <button onClick={() => handleCopy(accountModal.username, 'username')} className="shrink-0 p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500">
                  {copiedField === 'username' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Mot de passe */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Mot de passe</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-800 font-mono">{accountModal.password}</p>
                <button onClick={() => handleCopy(accountModal.password, 'password')} className="shrink-0 p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500">
                  {copiedField === 'password' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-6">
            <button
              onClick={copyAll}
              className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
            >
              {copiedField === 'all' ? <><CheckCircle2 size={15} /> Copié !</> : <><Copy size={15} /> Tout copier</>}
            </button>
            <button
              onClick={() => setAccountModal(null)}
              className="w-full py-3 bg-slate-50 text-slate-600 rounded-2xl text-xs font-medium border border-slate-200 hover:bg-slate-100 transition-all"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default MemberDetails;