import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationsContext';
import { Member, MemberType, MemberStatus, Department } from '../types';
import {
  X, User, Save, Camera, Edit, Search, Heart, Baby, Calendar,
  BookOpen, Plus, Phone, Shield, Check, UserCheck,
  Flame, Music, Zap, Coins, HandHeart, Users, Palette, Briefcase
} from 'lucide-react';
import { cn, generateId, getInitials, formatFirstName } from '../utils';
import {
  createMember, updateMember, getDiscipleshipPairs,
  createDiscipleshipPair, updateDiscipleshipPair, deleteDiscipleshipPair,
  syncMemberToDepartments
} from '../lib/db';
import { supabase } from '../lib/supabase';

// ── Helpers ────────────────────────────────────────────────────────────────

export const getDepartmentColor = (dept: string) => {
  if (dept.includes('Accueil')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (dept.includes('Enfants')) return 'bg-orange-50 text-orange-600 border-orange-100';
  if (dept.includes('Entretien')) return 'bg-slate-50 text-slate-600 border-slate-100';
  if (dept.includes('Évangélisation')) return 'bg-rose-50 text-rose-600 border-rose-100';
  if (dept.includes('Femmes')) return 'bg-pink-50 text-pink-600 border-pink-100';
  if (dept.includes('Finance')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (dept.includes('Intercession')) return 'bg-purple-50 text-purple-600 border-purple-100';
  if (dept.includes('Jeunes')) return 'bg-amber-50 text-amber-600 border-amber-100';
  if (dept.includes('Louange')) return 'bg-violet-50 text-violet-600 border-violet-100';
  return 'bg-slate-50 text-slate-500 border-slate-100';
};

export const getDepartmentIcon = (dept: string, size = 10) => {
  if (dept.includes('Accueil')) return <Users size={size} />;
  if (dept.includes('Enfants')) return <Baby size={size} />;
  if (dept.includes('Entretien')) return <Palette size={size} />;
  if (dept.includes('Évangélisation')) return <Flame size={size} />;
  if (dept.includes('Femmes')) return <Heart size={size} />;
  if (dept.includes('Finance')) return <Coins size={size} />;
  if (dept.includes('Intercession')) return <HandHeart size={size} />;
  if (dept.includes('Jeunes')) return <Zap size={size} />;
  if (dept.includes('Louange')) return <Music size={size} />;
  return <Briefcase size={size} />;
};

const parseBirthDate = (dateStr?: string) => {
  if (!dateStr) return { day: '', month: '', year: '' };
  const parts = dateStr.split('-');
  if (parts.length !== 3) return { day: '', month: '', year: '' };
  const [y, m, d] = parts;
  return {
    day: d === '00' ? '' : String(parseInt(d, 10)),
    month: m === '00' ? '' : String(parseInt(m, 10)),
    year: y === '1900' ? '' : y,
  };
};

const assembleBirthDate = (day: string, month: string, year: string): string => {
  if (!day && !month && !year) return '';
  const y = year && year.length === 4 ? year : '1900';
  const m = month ? month.padStart(2, '0') : '00';
  const d = day ? day.padStart(2, '0') : '00';
  return `${y}-${m}-${d}`;
};

const uploadMemberPhoto = async (file: File, memberId: string): Promise<string> => {
  const blob = await new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(256 / img.width, 256 / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/webp', 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });
  const fileName = `photo-${memberId}.webp`;
  await supabase.storage.from('members').upload(fileName, blob, { upsert: true, contentType: 'image/webp' });
  const { data } = supabase.storage.from('members').getPublicUrl(fileName);
  return data.publicUrl;
};

// ── Component ──────────────────────────────────────────────────────────────

interface MemberEditModalProps {
  member: Member | null;           // null = creating new
  allMembers: Member[];
  availableRoles: string[];
  availableStatuses: string[];
  availableDepartments: string[];
  onSave: (saved: Member) => void;
  onClose: () => void;
}

const MemberEditModal: React.FC<MemberEditModalProps> = ({
  member,
  allMembers,
  availableRoles,
  availableStatuses,
  availableDepartments,
  onSave,
  onClose,
}) => {
  const { addNotification } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);

  const buildInitial = (m: Member | null): Partial<Member> =>
    m ? { ...m } : {
      lastName: '', firstName: '', nickname: '', gender: 'Masculin',
      maritalStatus: 'Célibataire', spouseName: '', weddingDate: '',
      type: availableRoles[availableRoles.length - 1] as MemberType,
      status: availableStatuses[0] as MemberStatus,
      departments: [], whatsapp: true, phone: '', secondaryPhone: '',
      whatsappPhone: '', email: '', photoUrl: '', profession: '',
      joinDate: '', baptizedDate: '', birthDate: '', address: '',
      baptized: false, source: 'Direct', invitedBy: '',
      assignedDiscipleMakerId: '',
      emergencyContact: { name: '', phone: '', relation: '' },
      motherId: '', motherName: '', fatherId: '', fatherName: '',
      baptizedBy: '', baptizedChurch: '', skills: '', notes: '',
    };

  const [formData, setFormData] = useState<Partial<Member>>(buildInitial(member));

  const initBd = parseBirthDate(member?.birthDate);
  const [birthDay, setBirthDay] = useState(initBd.day);
  const [birthMonth, setBirthMonth] = useState(initBd.month);
  const [birthYear, setBirthYear] = useState(initBd.year);

  const initDm = allMembers.find(m => m.id === member?.assignedDiscipleMakerId);
  const [spouseSearch, setSpouseSearch] = useState(member?.spouseName || '');
  const [isSpouseDropdownOpen, setIsSpouseDropdownOpen] = useState(false);
  const [motherSearch, setMotherSearch] = useState(member?.motherName || '');
  const [isMotherDropdownOpen, setIsMotherDropdownOpen] = useState(false);
  const [fatherSearch, setFatherSearch] = useState(member?.fatherName || '');
  const [isFatherDropdownOpen, setIsFatherDropdownOpen] = useState(false);
  const [invitedBySearch, setInvitedBySearch] = useState(member?.invitedBy || '');
  const [isInvitedByDropdownOpen, setIsInvitedByDropdownOpen] = useState(false);
  const [discipleMakerSearch, setDiscipleMakerSearch] = useState(
    initDm ? `${formatFirstName(initDm.firstName)} ${initDm.lastName.toUpperCase()}` : ''
  );
  const [isDiscipleMakerDropdownOpen, setIsDiscipleMakerDropdownOpen] = useState(false);

  // Refs to avoid stale closure issues in onBlur handlers
  const selectedMotherIdRef = useRef<string>(member?.motherId || '');
  const selectedFatherIdRef = useRef<string>(member?.fatherId || '');

  // Reset form when member prop changes
  useEffect(() => {
    setFormData(buildInitial(member));
    setPendingPhotoFile(null);
    const bd = parseBirthDate(member?.birthDate);
    setBirthDay(bd.day); setBirthMonth(bd.month); setBirthYear(bd.year);
    setSpouseSearch(member?.spouseName || '');
    setMotherSearch(member?.motherName || '');
    selectedMotherIdRef.current = member?.motherId || '';
    setFatherSearch(member?.fatherName || '');
    selectedFatherIdRef.current = member?.fatherId || '';
    setInvitedBySearch(member?.invitedBy || '');
    const dm = allMembers.find(m => m.id === member?.assignedDiscipleMakerId);
    setDiscipleMakerSearch(dm ? `${formatFirstName(dm.firstName)} ${dm.lastName.toUpperCase()}` : '');
  }, [member?.id]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingPhotoFile(file);
      setFormData(prev => ({ ...prev, photoUrl: URL.createObjectURL(file) }));
    }
  };

  const toggleDepartment = (dept: string) => {
    setFormData(prev => {
      const currentDepts = prev.departments || [];
      return {
        ...prev,
        departments: currentDepts.includes(dept as Department)
          ? currentDepts.filter(d => d !== dept)
          : [...currentDepts, dept as Department],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lastName || !formData.firstName) return;

    const formattedFirstName = formatFirstName(formData.firstName);
    const formattedLastName = formData.lastName.toUpperCase();
    const currentMemberFullName = `${formattedFirstName} ${formattedLastName}`;

    let savedMember: Member;
    let previousDepts: string[] = [];

    if (member) {
      previousDepts = member.departments ?? [];
      const isDiscipleMaker = ![MemberType.MEMBRE_SIMPLE, MemberType.ENFANT].includes(
        (formData.type ?? member.type) as MemberType
      );
      let photoUrl = formData.photoUrl;
      if (pendingPhotoFile) {
        try { photoUrl = await uploadMemberPhoto(pendingPhotoFile, member.id); }
        catch { photoUrl = formData.photoUrl; }
      }
      savedMember = { ...member, ...formData, photoUrl, firstName: formattedFirstName, lastName: formattedLastName, isDiscipleMaker } as Member;
      await updateMember(member.id, savedMember);
    } else {
      const newId = generateId();
      const isDiscipleMaker = ![MemberType.MEMBRE_SIMPLE, MemberType.ENFANT].includes(formData.type as MemberType);
      let photoUrl = formData.photoUrl;
      if (pendingPhotoFile) {
        try { photoUrl = await uploadMemberPhoto(pendingPhotoFile, newId); }
        catch { photoUrl = formData.photoUrl; }
      }
      savedMember = {
        ...formData as Member,
        id: newId, photoUrl,
        firstName: formattedFirstName, lastName: formattedLastName,
        emergencyContact: formData.emergencyContact || { name: '', phone: '', relation: '' },
        source: formData.source || 'Direct',
        isDiscipleMaker,
        baptized: formData.baptized || !!formData.baptizedDate,
        whatsapp: formData.whatsapp || false,
        whatsappPhone: formData.whatsappPhone || '',
        departments: formData.departments || [],
        profession: formData.profession || '',
      };
      await createMember(savedMember);
    }

    // Sync discipleship pairs
    const newMentorId = savedMember.assignedDiscipleMakerId || '';
    const oldMentorId = member?.assignedDiscipleMakerId || '';
    if (newMentorId !== oldMentorId) {
      if (newMentorId) {
        const mentor = allMembers.find(m => m.id === newMentorId);
        if (mentor) {
          addNotification({
            id: `assign-member-dm-${savedMember.id}-${newMentorId}`,
            type: 'assignment',
            title: 'Disciple-maker assigné',
            message: `${formatFirstName(savedMember.firstName)} ${savedMember.lastName.toUpperCase()} a été confié(e) à ${formatFirstName(mentor.firstName)} ${mentor.lastName.toUpperCase()}.`,
            date: new Date().toISOString().split('T')[0],
            isRead: false,
            link: 'members',
            targetId: savedMember.id,
          });
        }
      }
      const allPairs = await getDiscipleshipPairs();
      const existingPair = allPairs.find(p => p.discipleId === savedMember.id);
      if (newMentorId) {
        if (existingPair) {
          await updateDiscipleshipPair(existingPair.id, { mentorId: newMentorId });
        } else {
          await createDiscipleshipPair({
            id: generateId(), mentorId: newMentorId, discipleId: savedMember.id,
            startDate: new Date().toISOString().split('T')[0],
            progress: 0, status: 'active', lastMeeting: '',
          });
        }
      } else if (existingPair) {
        await deleteDiscipleshipPair(existingPair.id);
      }
    }

    // Sync departments
    await syncMemberToDepartments(savedMember.id, savedMember.departments ?? [], previousDepts);

    // Spouse sync
    if (formData.maritalStatus === 'Marié(e)' && formData.spouseName) {
      const spouseSearchLower = formData.spouseName.toLowerCase();
      const spouse = allMembers.find(m => {
        if (m.id === savedMember.id) return false;
        const fullName = `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`.toLowerCase();
        const nickname = (m.nickname || '').toLowerCase();
        return fullName === spouseSearchLower || nickname === spouseSearchLower;
      });
      if (spouse) {
        await updateMember(spouse.id, { maritalStatus: 'Marié(e)', spouseName: currentMemberFullName });
      }
    }

    onSave(savedMember);
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-2xl overflow-hidden max-h-[90vh]">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white shrink-0">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">{member ? 'Modifier le Membre' : 'Ajouter un Membre'}</h3>
            <p className="text-xs text-indigo-200 mt-0.5">Vinea Management</p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/30">
          {/* Photo */}
          <div className="flex flex-col items-center mb-6">
            <div onClick={() => fileInputRef.current?.click()} className="group relative w-32 h-32 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all overflow-hidden shadow-sm">
              {formData.photoUrl
                ? <><img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Edit className="text-white" size={24} /></div></>
                : <div className="flex flex-col items-center text-slate-400 group-hover:text-indigo-500 transition-colors"><Camera size={32} strokeWidth={1.5} /><span className="text-xs font-medium mt-2">Photo</span></div>
              }
            </div>
            <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
            <p className="text-xs text-slate-400 font-bold mt-3">Cliquez pour ajouter une photo</p>
          </div>

          <div className="space-y-6">
            {/* Identité */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2"><User size={16} className="text-indigo-600" /><h4 className="text-xs font-medium text-slate-500">Identité</h4></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Prénoms</label><input type="text" required value={formData.firstName || ''} onChange={(e) => setFormData(prev => ({...prev, firstName: e.target.value}))} placeholder="Prénoms" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold" /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Nom</label><input type="text" required value={formData.lastName || ''} onChange={(e) => setFormData(prev => ({...prev, lastName: e.target.value.toUpperCase()}))} placeholder="NOM" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Rôle / Fonction</label><select value={formData.type} onChange={(e) => setFormData(prev => ({...prev, type: e.target.value as MemberType}))} className="w-full px-4 py-3 bg-indigo-50 border-none rounded-2xl outline-none text-xs font-semibold text-indigo-700">{availableRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Statut Actuel</label><select value={formData.status} onChange={(e) => setFormData(prev => ({...prev, status: e.target.value as MemberStatus}))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-medium text-slate-700">{availableStatuses.map(stat => <option key={stat} value={stat}>{stat}</option>)}</select></div>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Surnom / Petit nom</label><input type="text" value={formData.nickname || ''} onChange={(e) => setFormData(prev => ({...prev, nickname: e.target.value}))} placeholder="Ex: JP" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Sexe</label><select value={formData.gender} onChange={(e) => setFormData(prev => ({...prev, gender: e.target.value as any}))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold"><option value="Masculin">Masculin</option><option value="Féminin">Féminin</option></select></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">État Civil</label><select value={formData.maritalStatus} onChange={(e) => setFormData(prev => ({...prev, maritalStatus: e.target.value}))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold"><option value="Célibataire">Célibataire</option><option value="Marié(e)">Marié(e)</option><option value="Veuf/Veuve">Veuf/Veuve</option><option value="Fiancé(e)">Fiancé(e)</option></select></div>
              </div>

              {formData.maritalStatus === 'Marié(e)' && (
                <div className="space-y-1.5 relative animate-in slide-in-from-top-2 duration-300">
                  <label className="text-xs font-medium text-slate-500 ml-1 flex items-center gap-2"><Heart size={12} className="text-rose-500" /> Nom du Conjoint(e)</label>
                  <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" value={spouseSearch} onChange={(e) => { setSpouseSearch(e.target.value); setFormData(prev => ({...prev, spouseName: e.target.value})); setIsSpouseDropdownOpen(true); }} onFocus={() => setIsSpouseDropdownOpen(true)} placeholder="Chercher ou saisir le nom..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-rose-300 transition-all shadow-sm" />
                  </div>
                  {isSpouseDropdownOpen && spouseSearch.length >= 2 && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl custom-scrollbar">
                      {allMembers.filter(m => { if (member && m.id === member.id) return false; const fullName = `${m.firstName} ${m.lastName}`.toLowerCase(); const nick = (m.nickname || '').toLowerCase(); const s = spouseSearch.toLowerCase(); return fullName.includes(s) || nick.includes(s); }).map(m => (
                        <button key={m.id} type="button" onClick={() => { const name = `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`; setFormData(prev => ({...prev, spouseName: name})); setSpouseSearch(name); setIsSpouseDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-xs font-medium hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 text-xs font-medium text-slate-500">{m.photoUrl ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" /> : getInitials(m.firstName, m.lastName)}</div>
                          <span className="text-slate-700">{formatFirstName(m.firstName)} {m.lastName.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {formData.maritalStatus === 'Marié(e)' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-xs font-medium text-slate-500 ml-1 flex items-center gap-2"><Calendar size={12} className="text-rose-400" /> Date de mariage</label>
                  <input type="date" value={formData.weddingDate || ''} onChange={(e) => setFormData(prev => ({...prev, weddingDate: e.target.value}))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-rose-300 outline-none text-sm font-bold transition-all" />
                </div>
              )}

              {/* Mère */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-medium text-slate-500 ml-1 flex items-center gap-2"><Baby size={12} className="text-pink-400" /> Mère</label>
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" value={motherSearch} onChange={(e) => { setMotherSearch(e.target.value); setIsMotherDropdownOpen(true); }} onFocus={() => setIsMotherDropdownOpen(true)} onBlur={() => setTimeout(() => { setIsMotherDropdownOpen(false); if (!selectedMotherIdRef.current) { setMotherSearch(''); setFormData(prev => ({...prev, motherName: '', motherId: ''})); } else { const sel = allMembers.find(m => m.id === selectedMotherIdRef.current); if (sel) setMotherSearch(`${formatFirstName(sel.firstName)} ${sel.lastName.toUpperCase()}`); } }, 150)} placeholder="Rechercher un membre enregistré..." className="w-full pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-pink-300 transition-all shadow-sm" />
                  {formData.motherId && (
                    <button type="button" onClick={() => { selectedMotherIdRef.current = ''; setFormData(prev => ({...prev, motherName: '', motherId: ''})); setMotherSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"><X size={14} /></button>
                  )}
                </div>
                {isMotherDropdownOpen && motherSearch.length >= 2 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl custom-scrollbar">
                    {allMembers.filter(m => { if (member && m.id === member.id) return false; const fullName = `${m.firstName} ${m.lastName}`.toLowerCase(); const nick = (m.nickname || '').toLowerCase(); const s = motherSearch.toLowerCase(); return fullName.includes(s) || nick.includes(s); }).map(m => (
                      <button key={m.id} type="button" onClick={() => { const name = `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`; selectedMotherIdRef.current = m.id; setFormData(prev => ({...prev, motherName: name, motherId: m.id})); setMotherSearch(name); setIsMotherDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-xs font-medium hover:bg-pink-50 border-b border-slate-50 last:border-0 flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 text-xs font-medium text-slate-500">{m.photoUrl ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" /> : getInitials(m.firstName, m.lastName)}</div>
                        <span className="text-slate-700">{formatFirstName(m.firstName)} {m.lastName.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Père */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-medium text-slate-500 ml-1 flex items-center gap-2"><Baby size={12} className="text-blue-400" /> Père</label>
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" value={fatherSearch} onChange={(e) => { setFatherSearch(e.target.value); setIsFatherDropdownOpen(true); }} onFocus={() => setIsFatherDropdownOpen(true)} onBlur={() => setTimeout(() => { setIsFatherDropdownOpen(false); if (!selectedFatherIdRef.current) { setFatherSearch(''); setFormData(prev => ({...prev, fatherName: '', fatherId: ''})); } else { const sel = allMembers.find(m => m.id === selectedFatherIdRef.current); if (sel) setFatherSearch(`${formatFirstName(sel.firstName)} ${sel.lastName.toUpperCase()}`); } }, 150)} placeholder="Rechercher un membre enregistré..." className="w-full pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-blue-300 transition-all shadow-sm" />
                  {formData.fatherId && (
                    <button type="button" onClick={() => { selectedFatherIdRef.current = ''; setFormData(prev => ({...prev, fatherName: '', fatherId: ''})); setFatherSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"><X size={14} /></button>
                  )}
                </div>
                {isFatherDropdownOpen && fatherSearch.length >= 2 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl custom-scrollbar">
                    {allMembers.filter(m => { if (member && m.id === member.id) return false; const fullName = `${m.firstName} ${m.lastName}`.toLowerCase(); const nick = (m.nickname || '').toLowerCase(); const s = fatherSearch.toLowerCase(); return fullName.includes(s) || nick.includes(s); }).map(m => (
                      <button key={m.id} type="button" onClick={() => { const name = `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`; selectedFatherIdRef.current = m.id; setFormData(prev => ({...prev, fatherName: name, fatherId: m.id})); setFatherSearch(name); setIsFatherDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-xs font-medium hover:bg-blue-50 border-b border-slate-50 last:border-0 flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 text-xs font-medium text-slate-500">{m.photoUrl ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" /> : getInitials(m.firstName, m.lastName)}</div>
                        <span className="text-slate-700">{formatFirstName(m.firstName)} {m.lastName.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date de naissance */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 ml-1">Date de naissance (Facultatif)</label>
                <div className="grid grid-cols-3 gap-2">
                  <select value={birthDay} onChange={(e) => { const d = e.target.value; setBirthDay(d); setFormData(prev => ({...prev, birthDate: assembleBirthDate(d, birthMonth, birthYear)})); }} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-indigo-300 transition-all">
                    <option value="">Jour</option>{Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={String(d)}>{d}</option>)}
                  </select>
                  <select value={birthMonth} onChange={(e) => { const m = e.target.value; setBirthMonth(m); setFormData(prev => ({...prev, birthDate: assembleBirthDate(birthDay, m, birthYear)})); }} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-indigo-300 transition-all">
                    <option value="">Mois</option>{['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((name, idx) => <option key={idx + 1} value={String(idx + 1)}>{name}</option>)}
                  </select>
                  <input type="number" min={1900} max={new Date().getFullYear()} value={birthYear} onChange={(e) => { const y = e.target.value; setBirthYear(y); setFormData(prev => ({...prev, birthDate: assembleBirthDate(birthDay, birthMonth, y)})); }} placeholder="Année" className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-indigo-300 transition-all placeholder:font-normal placeholder:text-slate-400" />
                </div>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Profession (Facultatif)</label><input type="text" value={formData.profession || ''} onChange={(e) => setFormData(prev => ({...prev, profession: e.target.value}))} placeholder="Ex: Comptable, Étudiant..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold" /></div>
            </div>

            {/* Jalons spirituels */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2"><Calendar size={16} className="text-indigo-600" /><h4 className="text-xs font-medium text-slate-500">Jalons Spirituels & Adhésion</h4></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Date d'adhésion</label><input type="date" value={formData.joinDate || ''} onChange={(e) => setFormData(prev => ({...prev, joinDate: e.target.value}))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold shadow-sm" /></div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 ml-1">Date de baptême</label>
                  <div className="flex gap-2">
                    <input type="date" value={formData.baptizedDate || ''} onChange={(e) => setFormData(prev => ({...prev, baptizedDate: e.target.value, baptized: !!e.target.value}))} className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold shadow-sm" />
                    <button type="button" onClick={() => setFormData(prev => ({...prev, baptized: !formData.baptized}))} className={cn('px-4 rounded-2xl text-xs font-medium transition-all', formData.baptized ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400')}>{formData.baptized ? 'OUI' : 'NON'}</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Baptisé par (Facultatif)</label><input type="text" value={formData.baptizedBy || ''} onChange={(e) => setFormData(prev => ({...prev, baptizedBy: e.target.value}))} placeholder="Ex: Pasteur DUPONT" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold shadow-sm" /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Église du baptême (Facultatif)</label><input type="text" value={formData.baptizedChurch || ''} onChange={(e) => setFormData(prev => ({...prev, baptizedChurch: e.target.value}))} placeholder="Ex: Église Vinea Abidjan" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold shadow-sm" /></div>
              </div>
            </div>

            {/* Intégration & Suivi */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2"><BookOpen size={16} className="text-indigo-600" /><h4 className="text-xs font-medium text-slate-500">Intégration & Suivi</h4></div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 ml-1">Comment a-t-il/elle été atteint(e) ?</label>
                <select value={formData.source || 'Direct'} onChange={(e) => setFormData(prev => ({...prev, source: e.target.value}))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-indigo-300 transition-all">
                  <option value="Direct">Direct</option>
                  <option value="Invité">Invité par un membre</option>
                  <option value="Bouche à oreille">Bouche à oreille</option>
                  <option value="Réseaux sociaux">Réseaux sociaux</option>
                  <option value="Événement">Événement / Croisade</option>
                  <option value="Site web">Site web</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              {/* Invité par */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-medium text-slate-500 ml-1 flex items-center gap-2"><UserCheck size={12} className="text-indigo-400" /> Invité(e) par (Facultatif)</label>
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" value={invitedBySearch} onChange={(e) => { setInvitedBySearch(e.target.value); setFormData(prev => ({...prev, invitedBy: e.target.value})); setIsInvitedByDropdownOpen(true); }} onFocus={() => setIsInvitedByDropdownOpen(true)} onBlur={() => setTimeout(() => setIsInvitedByDropdownOpen(false), 150)} placeholder="Nom du membre qui a invité..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-indigo-300 transition-all shadow-sm" />
                </div>
                {isInvitedByDropdownOpen && invitedBySearch.length >= 2 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl custom-scrollbar">
                    {allMembers.filter(m => { if (member && m.id === member.id) return false; const fullName = `${m.firstName} ${m.lastName}`.toLowerCase(); const nick = (m.nickname || '').toLowerCase(); return fullName.includes(invitedBySearch.toLowerCase()) || nick.includes(invitedBySearch.toLowerCase()); }).map(m => (
                      <button key={m.id} type="button" onClick={() => { const name = `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`; setFormData(prev => ({...prev, invitedBy: name})); setInvitedBySearch(name); setIsInvitedByDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-xs font-medium hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 text-xs font-medium text-slate-500">{m.photoUrl ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" /> : getInitials(m.firstName, m.lastName)}</div>
                        <span className="text-slate-700">{formatFirstName(m.firstName)} {m.lastName.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Disciple-maker */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-medium text-slate-500 ml-1 flex items-center gap-2"><BookOpen size={12} className="text-indigo-400" /> Disciple-maker assigné (Facultatif)</label>
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" value={discipleMakerSearch} onChange={(e) => { setDiscipleMakerSearch(e.target.value); if (!e.target.value) setFormData(prev => ({...prev, assignedDiscipleMakerId: ''})); setIsDiscipleMakerDropdownOpen(true); }} onFocus={() => setIsDiscipleMakerDropdownOpen(true)} onBlur={() => setTimeout(() => setIsDiscipleMakerDropdownOpen(false), 150)} placeholder="Chercher un disciple-maker..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-indigo-300 transition-all shadow-sm" />
                </div>
                {isDiscipleMakerDropdownOpen && discipleMakerSearch.length >= 2 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl custom-scrollbar">
                    {allMembers.filter(m => { if (member && m.id === member.id) return false; if (m.type === MemberType.MEMBRE_SIMPLE || m.type === MemberType.ENFANT) return false; const fullName = `${m.firstName} ${m.lastName}`.toLowerCase(); const nick = (m.nickname || '').toLowerCase(); return fullName.includes(discipleMakerSearch.toLowerCase()) || nick.includes(discipleMakerSearch.toLowerCase()); }).map(m => (
                      <button key={m.id} type="button" onClick={() => { const name = `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`; setFormData(prev => ({...prev, assignedDiscipleMakerId: m.id})); setDiscipleMakerSearch(name); setIsDiscipleMakerDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-xs font-medium hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 text-xs font-medium text-slate-500">{m.photoUrl ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" /> : getInitials(m.firstName, m.lastName)}</div>
                        <div><span className="text-slate-700">{formatFirstName(m.firstName)} {m.lastName.toUpperCase()}</span><span className="ml-2 text-[10px] text-indigo-500 font-semibold uppercase">{m.type}</span></div>
                      </button>
                    ))}
                    {allMembers.filter(m => member ? m.id !== member.id : true).filter(m => m.type !== MemberType.MEMBRE_SIMPLE && m.type !== MemberType.ENFANT).filter(m => { const fullName = `${m.firstName} ${m.lastName}`.toLowerCase(); const nick = (m.nickname || '').toLowerCase(); return fullName.includes(discipleMakerSearch.toLowerCase()) || nick.includes(discipleMakerSearch.toLowerCase()); }).length === 0 && (
                      <p className="px-4 py-3 text-xs text-slate-400 italic">Aucun faiseur de disciple trouvé</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Départements */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2"><Plus size={16} className="text-indigo-600" /><h4 className="text-xs font-medium text-slate-500">Engagement & Ministères</h4></div>
              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-500 ml-1">Départements affectés</label>
                <div className="grid grid-cols-1 gap-2">
                  {availableDepartments.map(dept => {
                    const isSelected = formData.departments?.includes(dept as Department);
                    return (
                      <button key={dept} type="button" onClick={() => toggleDepartment(dept)} className={cn('flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200', isSelected ? cn(getDepartmentColor(dept), 'ring-2 ring-indigo-500/20') : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50')}>
                        <div className="flex items-center gap-3">{getDepartmentIcon(dept, 14)}{dept}</div>
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Coordonnées */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2"><Phone size={16} className="text-emerald-600" /><h4 className="text-xs font-medium text-slate-500">Coordonnées</h4></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Téléphone Principal</label><input type="tel" value={formData.phone || ''} onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))} placeholder="07 08 09 10 11" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold transition-all" /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Téléphone Secondaire</label><input type="tel" value={formData.secondaryPhone || ''} onChange={(e) => setFormData(prev => ({...prev, secondaryPhone: e.target.value}))} placeholder="07 08 09 10 11" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold transition-all" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Numéro WhatsApp (Optionnel)</label><input type="tel" value={formData.whatsappPhone || ''} onChange={(e) => setFormData(prev => ({...prev, whatsappPhone: e.target.value}))} placeholder="07 08 09 10 11" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold transition-all" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Email</label><input type="email" value={formData.email || ''} onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))} placeholder="email@exemple.com" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold transition-all" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Adresse physique</label><textarea rows={3} value={formData.address || ''} onChange={(e) => setFormData(prev => ({...prev, address: e.target.value}))} placeholder="Ex: Cocody, Rue de la Paix" className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium resize-none shadow-sm transition-all" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Compétences / Dons (Facultatif)</label><input type="text" value={formData.skills || ''} onChange={(e) => setFormData(prev => ({...prev, skills: e.target.value}))} placeholder="Ex: Chant, Informatique, Enseignement..." className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none text-sm font-bold transition-all" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Notes internes (Facultatif)</label><textarea rows={3} value={formData.notes || ''} onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))} placeholder="Informations complémentaires sur le membre..." className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium resize-none shadow-sm transition-all" /></div>
            </div>

            {/* Contact d'urgence */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2"><Shield size={16} className="text-rose-500" /><h4 className="text-xs font-medium text-slate-500">Contact d'Urgence</h4></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Nom complet</label><input type="text" value={formData.emergencyContact?.name || ''} onChange={(e) => setFormData(prev => ({...prev, emergencyContact: {...(prev.emergencyContact || {name:'',phone:'',relation:''}), name: e.target.value}}))} placeholder="Ex: KOUAME Marie" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-rose-300 outline-none text-sm font-bold transition-all" /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Relation</label><input type="text" value={formData.emergencyContact?.relation || ''} onChange={(e) => setFormData(prev => ({...prev, emergencyContact: {...(prev.emergencyContact || {name:'',phone:'',relation:''}), relation: e.target.value}}))} placeholder="Ex: Épouse, Mère, Frère..." className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-rose-300 outline-none text-sm font-bold transition-all" /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-500 ml-1">Téléphone</label><input type="tel" value={formData.emergencyContact?.phone || ''} onChange={(e) => setFormData(prev => ({...prev, emergencyContact: {...(prev.emergencyContact || {name:'',phone:'',relation:''}), phone: e.target.value}}))} placeholder="07 08 09 10 11" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:border-rose-300 outline-none text-sm font-bold transition-all" /></div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-500 rounded-2xl text-sm font-medium hover:bg-slate-50 transition-all">Annuler</button>
            <button type="submit" className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"><Save size={14} /> Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberEditModal;
