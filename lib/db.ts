/**
 * lib/db.ts
 * Couche de service Supabase — CRUD complet pour toutes les entités de Vinea.
 * Gère la conversion camelCase (TypeScript) ↔ snake_case (PostgreSQL).
 */
import { supabase } from './supabase';
import {
  Member, Visitor, FinancialRecord, DonationCampaign, DonationPromise,
  AttendanceSession, ChurchService, DepartmentInfo, DepartmentActivity,
  OperationType, PaymentMethod, MemberStatus, MemberType, VisitorStatus, ActivityStatus
} from '../types';

// ─────────────────────────────────────────────
// MAPPERS : DB (snake_case) → TypeScript (camelCase)
// ─────────────────────────────────────────────

function dbToMember(row: any): Member {
  return {
    id: row.id,
    lastName: row.last_name,
    firstName: row.first_name,
    nickname: row.nickname,
    gender: row.gender,
    birthDate: row.birth_date ?? undefined,
    maritalStatus: row.marital_status ?? '',
    weddingDate: row.wedding_date ?? undefined,
    spouseName: row.spouse_name ?? undefined,
    phone: row.phone ?? undefined,
    secondaryPhone: row.secondary_phone ?? undefined,
    email: row.email ?? undefined,
    whatsappPhone: row.whatsapp_phone ?? undefined,
    address: row.address ?? undefined,
    emergencyContact: row.emergency_contact ?? { name: '', phone: '', relation: '' },
    whatsapp: row.whatsapp ?? false,
    type: row.type as MemberType,
    isDiscipleMaker: row.is_disciple_maker ?? false,
    baptized: row.baptized ?? false,
    baptizedDate: row.baptized_date ?? undefined,
    baptizedBy: row.baptized_by ?? undefined,
    baptizedChurch: row.baptized_church ?? undefined,
    status: row.status as MemberStatus,
    joinDate: row.join_date ?? undefined,
    departments: row.departments ?? [],
    profession: row.profession ?? undefined,
    skills: row.skills ?? undefined,
    notes: row.notes ?? undefined,
    source: row.source ?? '',
    invitedBy: row.invited_by ?? undefined,
    assignedDiscipleMakerId: row.assigned_disciple_maker_id ?? undefined,
    photoUrl: row.photo_url ?? undefined,
  };
}

function memberToDb(m: Partial<Member>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (m.id !== undefined) db.id = m.id;
  if (m.lastName !== undefined) db.last_name = m.lastName;
  if (m.firstName !== undefined) db.first_name = m.firstName;
  if (m.nickname !== undefined) db.nickname = m.nickname ?? null;
  if (m.gender !== undefined) db.gender = m.gender;
  if (m.birthDate !== undefined) db.birth_date = m.birthDate || null;
  if (m.maritalStatus !== undefined) db.marital_status = m.maritalStatus;
  if (m.weddingDate !== undefined) db.wedding_date = m.weddingDate || null;
  if (m.spouseName !== undefined) db.spouse_name = m.spouseName ?? null;
  if (m.phone !== undefined) db.phone = m.phone ?? null;
  if (m.secondaryPhone !== undefined) db.secondary_phone = m.secondaryPhone ?? null;
  if (m.email !== undefined) db.email = m.email ?? null;
  if (m.whatsappPhone !== undefined) db.whatsapp_phone = m.whatsappPhone ?? null;
  if (m.address !== undefined) db.address = m.address ?? null;
  if (m.emergencyContact !== undefined) db.emergency_contact = m.emergencyContact;
  if (m.whatsapp !== undefined) db.whatsapp = m.whatsapp;
  if (m.type !== undefined) db.type = m.type;
  if (m.isDiscipleMaker !== undefined) db.is_disciple_maker = m.isDiscipleMaker;
  if (m.baptized !== undefined) db.baptized = m.baptized;
  if (m.baptizedDate !== undefined) db.baptized_date = m.baptizedDate || null;
  if (m.baptizedBy !== undefined) db.baptized_by = m.baptizedBy ?? null;
  if (m.baptizedChurch !== undefined) db.baptized_church = m.baptizedChurch ?? null;
  if (m.status !== undefined) db.status = m.status;
  if (m.joinDate !== undefined) db.join_date = m.joinDate || null;
  if (m.departments !== undefined) db.departments = m.departments;
  if (m.profession !== undefined) db.profession = m.profession ?? null;
  if (m.skills !== undefined) db.skills = m.skills ?? null;
  if (m.notes !== undefined) db.notes = m.notes ?? null;
  if (m.source !== undefined) db.source = m.source;
  if (m.invitedBy !== undefined) db.invited_by = m.invitedBy ?? null;
  if (m.assignedDiscipleMakerId !== undefined) db.assigned_disciple_maker_id = m.assignedDiscipleMakerId || null;
  if (m.photoUrl !== undefined) db.photo_url = m.photoUrl ?? null;
  return db;
}

function dbToVisitor(row: any): Visitor {
  return {
    id: row.id,
    lastName: row.last_name,
    firstName: row.first_name,
    gender: row.gender,
    phone: row.phone ?? undefined,
    whatsappPhone: row.whatsapp_phone ?? undefined,
    address: row.address ?? undefined,
    visitDate: row.visit_date,
    service: row.service ?? '',
    source: row.source ?? '',
    invitedBy: row.invited_by ?? undefined,
    status: row.status as VisitorStatus,
    notes: row.notes ?? '',
    followUpHistory: row.follow_up_history ?? [],
    qualification: row.qualification ?? {
      seekingChurch: false, needsPrayer: false, livesNearby: false,
      hasChildren: false, firstTimeChristian: false, wantsToServe: false
    },
    parrainId: row.parrain_id ?? undefined,
  };
}

function visitorToDb(v: Partial<Visitor>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (v.id !== undefined) db.id = v.id;
  if (v.lastName !== undefined) db.last_name = v.lastName;
  if (v.firstName !== undefined) db.first_name = v.firstName;
  if (v.gender !== undefined) db.gender = v.gender;
  if (v.phone !== undefined) db.phone = v.phone ?? null;
  if (v.whatsappPhone !== undefined) db.whatsapp_phone = v.whatsappPhone ?? null;
  if (v.address !== undefined) db.address = v.address ?? null;
  if (v.visitDate !== undefined) db.visit_date = v.visitDate;
  if (v.service !== undefined) db.service = v.service;
  if (v.source !== undefined) db.source = v.source;
  if (v.invitedBy !== undefined) db.invited_by = v.invitedBy ?? null;
  if (v.status !== undefined) db.status = v.status;
  if (v.notes !== undefined) db.notes = v.notes;
  if (v.followUpHistory !== undefined) db.follow_up_history = v.followUpHistory;
  if (v.qualification !== undefined) db.qualification = v.qualification;
  if (v.parrainId !== undefined) db.parrain_id = v.parrainId || null;
  return db;
}

function dbToFinancialRecord(row: any): FinancialRecord {
  return {
    id: row.id,
    type: row.type as OperationType,
    category: row.category,
    amount: row.amount,
    date: row.date,
    memberId: row.member_id ?? undefined,
    externalName: row.external_name ?? undefined,
    campaignId: row.campaign_id ?? undefined,
    paymentMethod: row.payment_method as PaymentMethod,
    description: row.description ?? '',
  };
}

function financialRecordToDb(f: Partial<FinancialRecord>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (f.id !== undefined) db.id = f.id;
  if (f.type !== undefined) db.type = f.type;
  if (f.category !== undefined) db.category = f.category;
  if (f.amount !== undefined) db.amount = f.amount;
  if (f.date !== undefined) db.date = f.date;
  if (f.memberId !== undefined) db.member_id = f.memberId || null;
  if (f.externalName !== undefined) db.external_name = f.externalName ?? null;
  if (f.campaignId !== undefined) db.campaign_id = f.campaignId || null;
  if (f.paymentMethod !== undefined) db.payment_method = f.paymentMethod;
  if (f.description !== undefined) db.description = f.description;
  return db;
}

function dbToCampaign(row: any): DonationCampaign {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    goal: row.goal ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    status: row.status,
  };
}

function campaignToDb(c: Partial<DonationCampaign>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (c.id !== undefined) db.id = c.id;
  if (c.name !== undefined) db.name = c.name;
  if (c.description !== undefined) db.description = c.description;
  if (c.goal !== undefined) db.goal = c.goal ?? null;
  if (c.startDate !== undefined) db.start_date = c.startDate;
  if (c.endDate !== undefined) db.end_date = c.endDate || null;
  if (c.status !== undefined) db.status = c.status;
  return db;
}

function dbToPromise(row: any): DonationPromise {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    memberId: row.member_id ?? undefined,
    externalName: row.external_name ?? undefined,
    amount: row.amount,
    date: row.date,
    notes: row.notes ?? undefined,
  };
}

function promiseToDb(p: Partial<DonationPromise>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (p.id !== undefined) db.id = p.id;
  if (p.campaignId !== undefined) db.campaign_id = p.campaignId;
  if (p.memberId !== undefined) db.member_id = p.memberId || null;
  if (p.externalName !== undefined) db.external_name = p.externalName ?? null;
  if (p.amount !== undefined) db.amount = p.amount;
  if (p.date !== undefined) db.date = p.date;
  if (p.notes !== undefined) db.notes = p.notes ?? null;
  return db;
}

function dbToAttendance(row: any): AttendanceSession {
  return {
    id: row.id,
    date: row.date,
    service: row.service,
    total: row.total ?? undefined,
    stats: (row.men !== undefined && row.men !== null) ? {
      men: row.men ?? 0,
      women: row.women ?? 0,
      children: row.children ?? 0,
      totalPresent: row.total ?? 0,
      totalAbsent: (row.absent_members ?? []).length,
    } : undefined,
    absentMembers: row.absent_members ?? [],
  };
}

function attendanceToDb(a: Partial<AttendanceSession>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (a.id !== undefined) db.id = a.id;
  if (a.date !== undefined) db.date = a.date;
  if (a.service !== undefined) db.service = a.service;
  if (a.total !== undefined) db.total = a.total ?? 0;
  if (a.stats !== undefined && a.stats) {
    db.men = a.stats.men;
    db.women = a.stats.women;
    db.children = a.stats.children;
  }
  if (a.absentMembers !== undefined) db.absent_members = a.absentMembers;
  return db;
}

function dbToChurchService(row: any): ChurchService {
  return {
    id: row.id,
    date: row.date,
    time: row.time ?? '',
    serviceType: row.service_type,
    series: row.series ?? undefined,
    speaker: row.speaker,
    worshipLeader: row.worship_leader ?? undefined,
    praiseLeader: row.praise_leader ?? undefined,
    moderator: row.moderator ?? undefined,
    theme: row.theme,
    scripture: row.scripture ?? '',
    content: row.content ?? '',
    aiAnalysis: row.ai_analysis ?? undefined,
    socialSummary: row.social_summary ?? undefined,
    tags: row.tags ?? [],
    youtubeLink: row.youtube_link ?? undefined,
    facebookLink: row.facebook_link ?? undefined,
    audioLink: row.audio_link ?? undefined,
    attendance: row.attendance ?? undefined,
  };
}

function churchServiceToDb(s: Partial<ChurchService>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (s.id !== undefined) db.id = s.id;
  if (s.date !== undefined) db.date = s.date;
  if (s.time !== undefined) db.time = s.time;
  if (s.serviceType !== undefined) db.service_type = s.serviceType;
  if (s.series !== undefined) db.series = s.series ?? null;
  if (s.speaker !== undefined) db.speaker = s.speaker;
  if (s.worshipLeader !== undefined) db.worship_leader = s.worshipLeader ?? null;
  if (s.praiseLeader !== undefined) db.praise_leader = s.praiseLeader ?? null;
  if (s.moderator !== undefined) db.moderator = s.moderator ?? null;
  if (s.theme !== undefined) db.theme = s.theme;
  if (s.scripture !== undefined) db.scripture = s.scripture;
  if (s.content !== undefined) db.content = s.content;
  if (s.aiAnalysis !== undefined) db.ai_analysis = s.aiAnalysis ?? null;
  if (s.socialSummary !== undefined) db.social_summary = s.socialSummary ?? null;
  if (s.tags !== undefined) db.tags = s.tags;
  if (s.youtubeLink !== undefined) db.youtube_link = s.youtubeLink ?? null;
  if (s.facebookLink !== undefined) db.facebook_link = s.facebookLink ?? null;
  if (s.audioLink !== undefined) db.audio_link = s.audioLink ?? null;
  if (s.attendance !== undefined) db.attendance = s.attendance ?? null;
  return db;
}

function dbToDepartmentInfo(row: any): DepartmentInfo {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    presidentId: row.president_id ?? '',
    memberIds: row.member_ids ?? [],
    status: row.status ?? 'Actif',
    color: row.color ?? '#4f46e5',
  };
}

function departmentInfoToDb(d: Partial<DepartmentInfo>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (d.id !== undefined) db.id = d.id;
  if (d.name !== undefined) db.name = d.name;
  if (d.description !== undefined) db.description = d.description;
  if (d.presidentId !== undefined) db.president_id = d.presidentId || null;
  if (d.memberIds !== undefined) db.member_ids = d.memberIds;
  if (d.status !== undefined) db.status = d.status;
  if (d.color !== undefined) db.color = d.color;
  return db;
}

function dbToDepartmentActivity(row: any): DepartmentActivity {
  return {
    id: row.id,
    title: row.title,
    deptId: row.dept_id ?? '',
    responsibleId: row.responsible_id ?? '',
    associateName: row.associate_name ?? undefined,
    cost: row.cost ?? 0,
    deadline: row.deadline ?? undefined,
    status: row.status as ActivityStatus,
    observations: row.observations ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    recurrence: row.recurrence ?? 'Ponctuelle',
    lastRealizedAt: row.last_realized_at ?? undefined,
  };
}

function departmentActivityToDb(a: Partial<DepartmentActivity>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (a.id !== undefined) db.id = a.id;
  if (a.title !== undefined) db.title = a.title;
  if (a.deptId !== undefined) db.dept_id = a.deptId;
  if (a.responsibleId !== undefined) db.responsible_id = a.responsibleId || null;
  if (a.associateName !== undefined) db.associate_name = a.associateName ?? null;
  if (a.cost !== undefined) db.cost = a.cost;
  if (a.deadline !== undefined) db.deadline = a.deadline || null;
  if (a.status !== undefined) db.status = a.status;
  if (a.observations !== undefined) db.observations = a.observations ?? null;
  if (a.recurrence !== undefined) db.recurrence = a.recurrence;
  if (a.lastRealizedAt !== undefined) db.last_realized_at = a.lastRealizedAt || null;
  return db;
}

// ─────────────────────────────────────────────
// MEMBERS
// ─────────────────────────────────────────────

export const getMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getMembers:', error.message); return []; }
  return (data ?? []).map(dbToMember);
};

export const createMember = async (m: Member): Promise<Member | null> => {
  const { data, error } = await supabase
    .from('members')
    .insert(memberToDb(m))
    .select()
    .single();
  if (error) { console.error('createMember:', error.message); return null; }
  return dbToMember(data);
};

export const updateMember = async (id: string, m: Partial<Member>): Promise<void> => {
  const { error } = await supabase
    .from('members')
    .update(memberToDb(m))
    .eq('id', id);
  if (error) console.error('updateMember:', error.message);
};

export const deleteMember = async (id: string): Promise<void> => {
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) console.error('deleteMember:', error.message);
};

// ─────────────────────────────────────────────
// VISITORS
// ─────────────────────────────────────────────

export const getVisitors = async (): Promise<Visitor[]> => {
  const { data, error } = await supabase
    .from('visitors')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getVisitors:', error.message); return []; }
  return (data ?? []).map(dbToVisitor);
};

export const createVisitor = async (v: Visitor): Promise<Visitor | null> => {
  const { data, error } = await supabase
    .from('visitors')
    .insert(visitorToDb(v))
    .select()
    .single();
  if (error) { console.error('createVisitor:', error.message); return null; }
  return dbToVisitor(data);
};

export const updateVisitor = async (id: string, v: Partial<Visitor>): Promise<void> => {
  const { error } = await supabase
    .from('visitors')
    .update(visitorToDb(v))
    .eq('id', id);
  if (error) console.error('updateVisitor:', error.message);
};

export const deleteVisitor = async (id: string): Promise<void> => {
  const { error } = await supabase.from('visitors').delete().eq('id', id);
  if (error) console.error('deleteVisitor:', error.message);
};

// ─────────────────────────────────────────────
// FINANCIAL RECORDS
// ─────────────────────────────────────────────

export const getFinancialRecords = async (): Promise<FinancialRecord[]> => {
  const { data, error } = await supabase
    .from('financial_records')
    .select('*')
    .order('date', { ascending: false });
  if (error) { console.error('getFinancialRecords:', error.message); return []; }
  return (data ?? []).map(dbToFinancialRecord);
};

export const createFinancialRecord = async (f: FinancialRecord): Promise<FinancialRecord | null> => {
  const { data, error } = await supabase
    .from('financial_records')
    .insert(financialRecordToDb(f))
    .select()
    .single();
  if (error) { console.error('createFinancialRecord:', error.message); return null; }
  return dbToFinancialRecord(data);
};

export const updateFinancialRecord = async (id: string, f: Partial<FinancialRecord>): Promise<void> => {
  const { error } = await supabase
    .from('financial_records')
    .update(financialRecordToDb(f))
    .eq('id', id);
  if (error) console.error('updateFinancialRecord:', error.message);
};

export const deleteFinancialRecord = async (id: string): Promise<void> => {
  const { error } = await supabase.from('financial_records').delete().eq('id', id);
  if (error) console.error('deleteFinancialRecord:', error.message);
};

// ─────────────────────────────────────────────
// DONATION CAMPAIGNS
// ─────────────────────────────────────────────

export const getDonationCampaigns = async (): Promise<DonationCampaign[]> => {
  const { data, error } = await supabase
    .from('donation_campaigns')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getDonationCampaigns:', error.message); return []; }
  return (data ?? []).map(dbToCampaign);
};

export const createDonationCampaign = async (c: DonationCampaign): Promise<DonationCampaign | null> => {
  const { data, error } = await supabase
    .from('donation_campaigns')
    .insert(campaignToDb(c))
    .select()
    .single();
  if (error) { console.error('createDonationCampaign:', error.message); return null; }
  return dbToCampaign(data);
};

export const updateDonationCampaign = async (id: string, c: Partial<DonationCampaign>): Promise<void> => {
  const { error } = await supabase
    .from('donation_campaigns')
    .update(campaignToDb(c))
    .eq('id', id);
  if (error) console.error('updateDonationCampaign:', error.message);
};

export const deleteDonationCampaign = async (id: string): Promise<void> => {
  const { error } = await supabase.from('donation_campaigns').delete().eq('id', id);
  if (error) console.error('deleteDonationCampaign:', error.message);
};

// ─────────────────────────────────────────────
// DONATION PROMISES
// ─────────────────────────────────────────────

export const getDonationPromises = async (campaignId?: string): Promise<DonationPromise[]> => {
  let query = supabase.from('donation_promises').select('*').order('created_at', { ascending: false });
  if (campaignId) query = query.eq('campaign_id', campaignId);
  const { data, error } = await query;
  if (error) { console.error('getDonationPromises:', error.message); return []; }
  return (data ?? []).map(dbToPromise);
};

export const createDonationPromise = async (p: DonationPromise): Promise<DonationPromise | null> => {
  const { data, error } = await supabase
    .from('donation_promises')
    .insert(promiseToDb(p))
    .select()
    .single();
  if (error) { console.error('createDonationPromise:', error.message); return null; }
  return dbToPromise(data);
};

export const deleteDonationPromise = async (id: string): Promise<void> => {
  const { error } = await supabase.from('donation_promises').delete().eq('id', id);
  if (error) console.error('deleteDonationPromise:', error.message);
};

// ─────────────────────────────────────────────
// ATTENDANCE SESSIONS
// ─────────────────────────────────────────────

export const getAttendanceSessions = async (): Promise<AttendanceSession[]> => {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .select('*')
    .order('date', { ascending: false });
  if (error) { console.error('getAttendanceSessions:', error.message); return []; }
  return (data ?? []).map(dbToAttendance);
};

export const createAttendanceSession = async (a: AttendanceSession): Promise<AttendanceSession | null> => {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .insert(attendanceToDb(a))
    .select()
    .single();
  if (error) { console.error('createAttendanceSession:', error.message); return null; }
  return dbToAttendance(data);
};

export const updateAttendanceSession = async (id: string, a: Partial<AttendanceSession>): Promise<void> => {
  const { error } = await supabase
    .from('attendance_sessions')
    .update(attendanceToDb(a))
    .eq('id', id);
  if (error) console.error('updateAttendanceSession:', error.message);
};

export const deleteAttendanceSession = async (id: string): Promise<void> => {
  const { error } = await supabase.from('attendance_sessions').delete().eq('id', id);
  if (error) console.error('deleteAttendanceSession:', error.message);
};

// ─────────────────────────────────────────────
// CHURCH SERVICES (CULTES)
// ─────────────────────────────────────────────

export const getChurchServices = async (): Promise<ChurchService[]> => {
  const { data, error } = await supabase
    .from('church_services')
    .select('*')
    .order('date', { ascending: false });
  if (error) { console.error('getChurchServices:', error.message); return []; }
  return (data ?? []).map(dbToChurchService);
};

export const createChurchService = async (s: ChurchService): Promise<ChurchService | null> => {
  const { data, error } = await supabase
    .from('church_services')
    .insert(churchServiceToDb(s))
    .select()
    .single();
  if (error) { console.error('createChurchService:', error.message); return null; }
  return dbToChurchService(data);
};

export const updateChurchService = async (id: string, s: Partial<ChurchService>): Promise<void> => {
  const { error } = await supabase
    .from('church_services')
    .update(churchServiceToDb(s))
    .eq('id', id);
  if (error) console.error('updateChurchService:', error.message);
};

export const deleteChurchService = async (id: string): Promise<void> => {
  const { error } = await supabase.from('church_services').delete().eq('id', id);
  if (error) console.error('deleteChurchService:', error.message);
};

// ─────────────────────────────────────────────
// CHURCH EVENTS
// ─────────────────────────────────────────────

export const getChurchEvents = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('church_events')
    .select('*')
    .order('start_date', { ascending: true });
  if (error) { console.error('getChurchEvents:', error.message); return []; }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    category: row.category,
    status: row.status,
    registeredCount: row.registered_count ?? 0,
    targetCount: row.target_count ?? 100,
    budget: row.budget ?? 0,
    expenses: row.expenses ?? 0,
    description: row.description,
    image: row.image,
  }));
};

export const createChurchEvent = async (e: any): Promise<any | null> => {
  const db: any = {
    id: e.id, title: e.title, start_date: e.startDate, end_date: e.endDate || null,
    location: e.location, category: e.category, status: e.status,
    registered_count: e.registeredCount ?? 0, target_count: e.targetCount ?? 100,
    budget: e.budget ?? 0, expenses: e.expenses ?? 0,
    description: e.description, image: e.image ?? null,
  };
  const { data, error } = await supabase.from('church_events').insert(db).select().single();
  if (error) { console.error('createChurchEvent:', error.message); return null; }
  return data;
};

export const updateChurchEvent = async (id: string, e: any): Promise<void> => {
  const db: any = {};
  if (e.title !== undefined) db.title = e.title;
  if (e.startDate !== undefined) db.start_date = e.startDate;
  if (e.endDate !== undefined) db.end_date = e.endDate || null;
  if (e.location !== undefined) db.location = e.location;
  if (e.category !== undefined) db.category = e.category;
  if (e.status !== undefined) db.status = e.status;
  if (e.registeredCount !== undefined) db.registered_count = e.registeredCount;
  if (e.targetCount !== undefined) db.target_count = e.targetCount;
  if (e.budget !== undefined) db.budget = e.budget;
  if (e.expenses !== undefined) db.expenses = e.expenses;
  if (e.description !== undefined) db.description = e.description;
  if (e.image !== undefined) db.image = e.image;
  const { error } = await supabase.from('church_events').update(db).eq('id', id);
  if (error) console.error('updateChurchEvent:', error.message);
};

export const deleteChurchEvent = async (id: string): Promise<void> => {
  const { error } = await supabase.from('church_events').delete().eq('id', id);
  if (error) console.error('deleteChurchEvent:', error.message);
};

// ─────────────────────────────────────────────
// DEPARTMENTS INFO
// ─────────────────────────────────────────────

export const getDepartmentsInfo = async (): Promise<DepartmentInfo[]> => {
  const { data, error } = await supabase
    .from('departments_info')
    .select('*')
    .order('name', { ascending: true });
  if (error) { console.error('getDepartmentsInfo:', error.message); return []; }
  return (data ?? []).map(dbToDepartmentInfo);
};

export const upsertDepartmentInfo = async (d: DepartmentInfo): Promise<void> => {
  const { error } = await supabase
    .from('departments_info')
    .upsert(departmentInfoToDb(d), { onConflict: 'id' });
  if (error) console.error('upsertDepartmentInfo:', error.message);
};

export const deleteDepartmentInfo = async (id: string): Promise<void> => {
  const { error } = await supabase.from('departments_info').delete().eq('id', id);
  if (error) console.error('deleteDepartmentInfo:', error.message);
};

// ─────────────────────────────────────────────
// DEPARTMENT ACTIVITIES
// ─────────────────────────────────────────────

export const getDepartmentActivities = async (): Promise<DepartmentActivity[]> => {
  const { data, error } = await supabase
    .from('department_activities')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getDepartmentActivities:', error.message); return []; }
  return (data ?? []).map(dbToDepartmentActivity);
};

export const createDepartmentActivity = async (a: DepartmentActivity): Promise<DepartmentActivity | null> => {
  const { data, error } = await supabase
    .from('department_activities')
    .insert(departmentActivityToDb(a))
    .select()
    .single();
  if (error) { console.error('createDepartmentActivity:', error.message); return null; }
  return dbToDepartmentActivity(data);
};

export const updateDepartmentActivity = async (id: string, a: Partial<DepartmentActivity>): Promise<void> => {
  const { error } = await supabase
    .from('department_activities')
    .update(departmentActivityToDb(a))
    .eq('id', id);
  if (error) console.error('updateDepartmentActivity:', error.message);
};

export const deleteDepartmentActivity = async (id: string): Promise<void> => {
  const { error } = await supabase.from('department_activities').delete().eq('id', id);
  if (error) console.error('deleteDepartmentActivity:', error.message);
};

// ─────────────────────────────────────────────
// MEETINGS
// ─────────────────────────────────────────────

export const getMeetings = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('date', { ascending: false });
  if (error) { console.error('getMeetings:', error.message); return []; }
  return (data ?? []).map((row: any) => ({
    id: row.id, title: row.title, date: row.date, time: row.time,
    location: row.location, category: row.category, status: row.status,
    attendeeIds: row.attendee_ids ?? [], absenteeIds: row.absentee_ids ?? [],
    priority: row.priority, summary: row.summary, decisions: row.decisions ?? [],
    aiPv: row.ai_pv,
  }));
};

export const createMeeting = async (m: any): Promise<any | null> => {
  const db = {
    id: m.id, title: m.title, date: m.date, time: m.time || null,
    location: m.location || null, category: m.category || null, status: m.status,
    attendee_ids: m.attendeeIds ?? [], absentee_ids: m.absenteeIds ?? [],
    priority: m.priority, summary: m.summary || null,
    decisions: m.decisions ?? [], ai_pv: m.aiPv || null,
  };
  const { data, error } = await supabase.from('meetings').insert(db).select().single();
  if (error) { console.error('createMeeting:', error.message); return null; }
  return data;
};

export const updateMeeting = async (id: string, m: any): Promise<void> => {
  const db: any = {};
  if (m.title !== undefined) db.title = m.title;
  if (m.date !== undefined) db.date = m.date;
  if (m.time !== undefined) db.time = m.time;
  if (m.location !== undefined) db.location = m.location;
  if (m.category !== undefined) db.category = m.category;
  if (m.status !== undefined) db.status = m.status;
  if (m.attendeeIds !== undefined) db.attendee_ids = m.attendeeIds;
  if (m.absenteeIds !== undefined) db.absentee_ids = m.absenteeIds;
  if (m.priority !== undefined) db.priority = m.priority;
  if (m.summary !== undefined) db.summary = m.summary;
  if (m.decisions !== undefined) db.decisions = m.decisions;
  if (m.aiPv !== undefined) db.ai_pv = m.aiPv;
  const { error } = await supabase.from('meetings').update(db).eq('id', id);
  if (error) console.error('updateMeeting:', error.message);
};

export const deleteMeeting = async (id: string): Promise<void> => {
  const { error } = await supabase.from('meetings').delete().eq('id', id);
  if (error) console.error('deleteMeeting:', error.message);
};

// ─────────────────────────────────────────────
// MEDITATIONS
// ─────────────────────────────────────────────

export const getMeditations = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('meditations')
    .select('*')
    .order('date', { ascending: false });
  if (error) { console.error('getMeditations:', error.message); return []; }
  return (data ?? []).map((row: any) => ({
    id: row.id, date: row.date, scripture: row.scripture, questions: row.questions,
    title: row.title, excerpt: row.excerpt, likes: row.likes ?? 0, isRead: row.is_read ?? false,
  }));
};

export const createMeditation = async (m: any): Promise<any | null> => {
  const db = {
    id: m.id, date: m.date, scripture: m.scripture || null,
    questions: m.questions || null, title: m.title,
    excerpt: m.excerpt || null, likes: m.likes ?? 0, is_read: m.isRead ?? false,
  };
  const { data, error } = await supabase.from('meditations').insert(db).select().single();
  if (error) { console.error('createMeditation:', error.message); return null; }
  return data;
};

export const updateMeditation = async (id: string, m: any): Promise<void> => {
  const db: any = {};
  if (m.title !== undefined) db.title = m.title;
  if (m.date !== undefined) db.date = m.date;
  if (m.scripture !== undefined) db.scripture = m.scripture;
  if (m.questions !== undefined) db.questions = m.questions;
  if (m.excerpt !== undefined) db.excerpt = m.excerpt;
  if (m.likes !== undefined) db.likes = m.likes;
  if (m.isRead !== undefined) db.is_read = m.isRead;
  const { error } = await supabase.from('meditations').update(db).eq('id', id);
  if (error) console.error('updateMeditation:', error.message);
};

export const deleteMeditation = async (id: string): Promise<void> => {
  const { error } = await supabase.from('meditations').delete().eq('id', id);
  if (error) console.error('deleteMeditation:', error.message);
};

// ─────────────────────────────────────────────
// SPIRITUAL GOALS & POINTS
// ─────────────────────────────────────────────

export const getSpiritualGoals = async (memberId?: string): Promise<any[]> => {
  let query = supabase.from('spiritual_goals').select('*');
  if (memberId) query = query.eq('member_id', memberId);
  const { data, error } = await query;
  if (error) { console.error('getSpiritualGoals:', error.message); return []; }
  return (data ?? []).map((row: any) => ({
    id: row.id, memberId: row.member_id, year: row.year, objectives: row.objectives ?? [],
  }));
};

export const upsertSpiritualGoals = async (g: any): Promise<void> => {
  const { error } = await supabase.from('spiritual_goals').upsert(
    { id: g.id, member_id: g.memberId, year: g.year, objectives: g.objectives },
    { onConflict: 'member_id,year' }
  );
  if (error) console.error('upsertSpiritualGoals:', error.message);
};

export const getSpiritualPoints = async (memberId?: string): Promise<any[]> => {
  let query = supabase.from('spiritual_points').select('*');
  if (memberId) query = query.eq('member_id', memberId);
  const { data, error } = await query;
  if (error) { console.error('getSpiritualPoints:', error.message); return []; }
  return (data ?? []).map((row: any) => ({
    id: row.id, memberId: row.member_id, month: row.month, year: row.year,
    results: row.results ?? {}, score: row.score ?? 0,
  }));
};

export const upsertSpiritualPoints = async (p: any): Promise<void> => {
  const { error } = await supabase.from('spiritual_points').upsert(
    { id: p.id, member_id: p.memberId, month: p.month, year: p.year, results: p.results, score: p.score },
    { onConflict: 'member_id,month,year' }
  );
  if (error) console.error('upsertSpiritualPoints:', error.message);
};

// ─────────────────────────────────────────────
// DISCIPLESHIP PAIRS
// ─────────────────────────────────────────────

export const getDiscipleshipPairs = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('discipleship_pairs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getDiscipleshipPairs:', error.message); return []; }
  return (data ?? []).map((row: any) => ({
    id: row.id, mentorId: row.mentor_id, discipleId: row.disciple_id,
    startDate: row.start_date, progress: row.progress ?? 0,
    status: row.status, lastMeeting: row.last_meeting,
  }));
};

export const createDiscipleshipPair = async (p: any): Promise<any | null> => {
  const db = {
    id: p.id, mentor_id: p.mentorId, disciple_id: p.discipleId,
    start_date: p.startDate, progress: p.progress ?? 0,
    status: p.status, last_meeting: p.lastMeeting || null,
  };
  const { data, error } = await supabase.from('discipleship_pairs').insert(db).select().single();
  if (error) { console.error('createDiscipleshipPair:', error.message); return null; }
  return data;
};

export const updateDiscipleshipPair = async (id: string, p: any): Promise<void> => {
  const db: any = {};
  if (p.mentorId !== undefined) db.mentor_id = p.mentorId;
  if (p.discipleId !== undefined) db.disciple_id = p.discipleId;
  if (p.startDate !== undefined) db.start_date = p.startDate;
  if (p.progress !== undefined) db.progress = p.progress;
  if (p.status !== undefined) db.status = p.status;
  if (p.lastMeeting !== undefined) db.last_meeting = p.lastMeeting;
  const { error } = await supabase.from('discipleship_pairs').update(db).eq('id', id);
  if (error) console.error('updateDiscipleshipPair:', error.message);
};

export const deleteDiscipleshipPair = async (id: string): Promise<void> => {
  const { error } = await supabase.from('discipleship_pairs').delete().eq('id', id);
  if (error) console.error('deleteDiscipleshipPair:', error.message);
};

// ─────────────────────────────────────────────
// CHURCH SETTINGS
// ─────────────────────────────────────────────

export const getChurchSettings = async (): Promise<any | null> => {
  const { data, error } = await supabase
    .from('church_settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) { console.error('getChurchSettings:', error.message); return null; }
  if (!data) return null;
  return {
    id: data.id, name: data.name, slogan: data.slogan, phone: data.phone,
    email: data.email, address: data.address, logoUrl: data.logo_url,
    primaryColor: data.primary_color, currency: data.currency,
    timezone: data.timezone, language: data.language,
  };
};

export const upsertChurchSettings = async (s: any): Promise<void> => {
  const db: any = {
    id: s.id || 'main', name: s.name, slogan: s.slogan || null,
    phone: s.phone || null, email: s.email || null, address: s.address || null,
    logo_url: s.logoUrl || null, primary_color: s.primaryColor || '#4f46e5',
    currency: s.currency || 'F CFA', timezone: s.timezone || 'UTC',
    language: s.language || 'Français',
  };
  const { error } = await supabase.from('church_settings').upsert(db, { onConflict: 'id' });
  if (error) console.error('upsertChurchSettings:', error.message);
};

// ─────────────────────────────────────────────
// ADMIN USERS
// ─────────────────────────────────────────────

export const getAdminUsers = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getAdminUsers:', error.message); return []; }
  return data ?? [];
};

export const getAdminUserByEmail = async (email: string): Promise<any | null> => {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .ilike('email', email)
    .maybeSingle();
  if (error) { console.error('getAdminUserByEmail:', error.message); return null; }
  return data;
};

export const upsertAdminUser = async (u: any): Promise<void> => {
  const { error } = await supabase.from('admin_users').upsert(u, { onConflict: 'id' });
  if (error) console.error('upsertAdminUser:', error.message);
};

export const deleteAdminUser = async (id: string): Promise<void> => {
  const { error } = await supabase.from('admin_users').delete().eq('id', id);
  if (error) console.error('deleteAdminUser:', error.message);
};

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

export const getSystemNotifications = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('system_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error('getSystemNotifications:', error.message); return []; }
  return (data ?? []).map((row: any) => ({
    id: row.id, type: row.type, title: row.title, message: row.message,
    date: row.date, isRead: row.is_read ?? false, link: row.link, targetId: row.target_id,
  }));
};

export const markNotificationRead = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('system_notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) console.error('markNotificationRead:', error.message);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  const { error } = await supabase
    .from('system_notifications')
    .update({ is_read: true })
    .eq('is_read', false);
  if (error) console.error('markAllNotificationsRead:', error.message);
};

export const upsertNotification = async (n: any): Promise<void> => {
  const db = {
    id: n.id, type: n.type, title: n.title, message: n.message,
    date: n.date, is_read: n.isRead ?? false, link: n.link || null,
    target_id: n.targetId || null,
  };
  const { error } = await supabase
    .from('system_notifications')
    .upsert(db, { onConflict: 'id', ignoreDuplicates: true });
  if (error) console.error('upsertNotification:', error.message);
};
