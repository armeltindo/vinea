
export enum MemberType {
  PASTEUR = 'Pasteur',
  ASSISTANT = 'Assistant',
  CO_DIRIGEANT = 'Co-dirigeant',
  OUVRIER = 'Ouvrier',
  MEMBRE_SIMPLE = 'Membre simple'
}

export enum MemberStatus {
  ACTIF = 'Actif',
  INACTIF = 'Inactif',
  RETROGRADE = 'Rétrograde',
  EN_VOYAGE = 'En voyage'
}

export enum Department {
  ACCUEIL = 'Accueil & Protocole',
  ENFANTS = 'Enfants',
  ENTRETIEN = 'Entretien et décoration',
  EVANGELISATION = 'Évangélisation',
  FEMMES = 'Femmes',
  FINANCE = 'Finance',
  FORMATION_THEO = 'Formation théologique',
  FORMATIONS_ORIENT = 'Formations et orientations',
  HOMMES = 'Hommes',
  INTERCESSION = 'Intercession',
  JEUNES = 'Jeunes',
  LOUANGE = 'Louange et adoration',
  MODERATION = 'Modération',
  INTERPRETATION = 'Interprétation',
  OEUVRES_SOCIALES = 'Œuvres sociales et développement',
  SECRETARIAT_MEDIAS = 'Secrétariat, Médias & Communication'
}

export enum ActivityStatus {
  PLANIFIEE = 'Planifiée',
  EN_COURS = 'En cours',
  REALISEE = 'Réalisée',
  REPORTEE = 'Reportée',
  ANNULEE = 'Annulée'
}

export interface Notification {
  id: string;
  type: 'birthday' | 'event' | 'followup' | 'system';
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  link?: string;
  targetId?: string;
}

export interface NotificationSettings {
  enableBirthdays: boolean;
  enableEvents: boolean;
  enableFollowUps: boolean;
  daysBeforeEvent: number;
}

// --- Spiritual Exercises Types ---

export type ExerciseFrequency = 'Jour' | 'Semaine' | 'Mois' | 'Année';

export interface SpiritualExerciseDef {
  id: string;
  label: string;
  frequency: ExerciseFrequency;
  valueType: 'number' | 'boolean' | 'select' | 'decimal';
  unit?: string;
  options?: string[];
}

export interface SpiritualObjective {
  exerciseId: string;
  targetValue: any;
  isEnabled: boolean;
  notes?: string;
}

export interface YearlySpiritualGoals {
  id: string;
  memberId: string;
  year: number;
  objectives: SpiritualObjective[];
  createdAt: string;
}

export interface MonthlySpiritualPoint {
  id: string;
  memberId: string;
  month: number; // 0-11
  year: number;
  results: Record<string, boolean>; // exerciseId -> isUpToDate
  score: number; // 0-100
  createdAt: string;
}

// --- End Spiritual Exercises ---

export type ActivityRecurrence = 'Ponctuelle' | 'Quotidienne' | 'Hebdomadaire' | 'Mensuelle' | 'Trimestrielle' | 'Semestrielle' | 'Annuelle';

export interface DepartmentActivity {
  id: string;
  title: string;
  deptId: string;
  responsibleId: string;
  associateName?: string;
  cost?: number;
  deadline?: string;
  status: ActivityStatus;
  observations?: string;
  createdAt: string;
  recurrence?: ActivityRecurrence;
  lastRealizedAt?: string;
}

export interface DepartmentInfo {
  id: string;
  name: string;
  description: string;
  presidentId: string;
  assistantId: string;
  memberIds: string[];
  status: 'Actif' | 'Inactif';
  color: string;
}

export enum VisitorStatus {
  EN_ATTENTE = 'En attente',
  CONTACT_1 = '1er Contact',
  RENCONTRE = 'Visite/Rencontre',
  MEMBRE = 'Intégration/Membre'
}

export enum OperationType {
  REVENU = 'Revenu',
  DEPENSE = 'Dépense'
}

export enum PaymentMethod {
  ESPECES = 'Espèces',
  MOBILE_MONEY = 'Mobile Money',
  VIREMENT = 'Virement bancaire',
  AUTRE = 'Autre'
}

export interface FollowUpEntry {
  id: string;
  date: string;
  type: 'Appel' | 'Visite' | 'Message' | 'Rencontre';
  note: string;
  nextStep?: string;
  nextStepDate?: string;
}

export interface VisitorQualification {
  seekingChurch: boolean;
  needsPrayer: boolean;
  livesNearby: boolean;
  hasChildren: boolean;
  firstTimeChristian: boolean;
  wantsToServe: boolean;
}

export interface Member {
  id: string;
  lastName: string;
  firstName: string;
  nickname?: string;
  gender: 'Masculin' | 'Féminin';
  birthDate?: string;
  maritalStatus: string;
  weddingDate?: string;
  spouseName?: string;
  phone?: string;
  secondaryPhone?: string;
  email?: string;
  whatsappPhone?: string;
  address?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  whatsapp: boolean;
  type: MemberType;
  isDiscipleMaker: boolean;
  baptized: boolean;
  baptizedDate?: string;
  baptizedBy?: string;
  baptizedChurch?: string;
  status: MemberStatus;
  joinDate?: string;
  departments: Department[];
  profession?: string;
  skills?: string;
  notes?: string;
  source: string;
  invitedBy?: string;
  assignedDiscipleMakerId?: string;
  photoUrl?: string;
}

export interface Visitor {
  id: string;
  lastName: string;
  firstName: string;
  gender: 'Masculin' | 'Féminin';
  phone?: string;
  whatsappPhone?: string;
  address?: string;
  visitDate: string;
  service: string;
  source: string;
  invitedBy?: string;
  status: VisitorStatus;
  notes: string;
  followUpHistory?: FollowUpEntry[];
  qualification?: VisitorQualification;
  parrainId?: string;
}

export interface FinancialRecord {
  id: string;
  type: OperationType;
  category: string;
  amount: number;
  date: string;
  memberId?: string;
  externalName?: string; 
  campaignId?: string; 
  paymentMethod: PaymentMethod;
  description: string;
}

export interface DonationCampaign {
  id: string;
  name: string;
  description: string;
  goal?: number;
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Terminée';
}

export interface DonationPromise {
  id: string;
  campaignId: string;
  memberId?: string;
  externalName?: string; 
  amount: number;
  date: string;
  notes?: string;
}

export interface ChurchService {
  id: string;
  date: string;
  time: string;
  serviceType: string;
  series?: string;
  speaker: string;
  worshipLeader?: string;
  praiseLeader?: string;
  moderator?: string;
  theme: string;
  scripture: string;
  content: string;
  aiAnalysis?: string;
  socialSummary?: string;
  tags?: string[];
  youtubeLink?: string;
  facebookLink?: string;
  audioLink?: string;
  attendance?: number;
}

export interface AttendanceSession {
  id: string;
  date: string;
  service: string;
  total?: number;
  stats?: {
    men: number;
    women: number;
    children: number;
    totalPresent: number;
    totalAbsent: number;
  };
  absentMembers: string[];
}
