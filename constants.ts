
import { MemberType, MemberStatus, Department, Member, Visitor, VisitorStatus, SpiritualExerciseDef } from './types';

export const DEPARTMENTS = Object.values(Department).sort();

export const SERVICES_LIST = [
  'Culte de dimanche',
  'Enseignement de mercredi',
  'Veillée de prière',
  '21 jours de jeûne et prières',
  'Trois jours de jeûne et prière',
  '40 jours de jeûne et prière',
  'Convention'
];

export const SPIRITUAL_EXERCISES_LIST: SpiritualExerciseDef[] = [
  { id: 'prière', label: 'Prière', frequency: 'Jour', valueType: 'number', unit: 'Heures/Jour' },
  { id: 'jeûne', label: 'Jeûne', frequency: 'Semaine', valueType: 'number', unit: 'Fois/Semaine' },
  { id: 'lecture_biblique', label: 'Lecture biblique', frequency: 'Année', valueType: 'select', unit: 'Fois/An', options: ['Nouveau Testament', 'Toute la Bible', 'Toute la Bible + Nouveau Testament'] },
  { id: 'verset', label: 'Verset mémorisé', frequency: 'Mois', valueType: 'number', unit: 'Versets/Mois' },
  { id: 'livres', label: 'Lecture des livres chrétiens', frequency: 'Année', valueType: 'decimal', unit: 'Livres/An' },
  { id: 'méditation', label: 'Méditation', frequency: 'Semaine', valueType: 'number', unit: 'Fois/Semaine' },
  { id: 'évangélisation', label: 'Evangélisation / Traités', frequency: 'Mois', valueType: 'number', unit: 'Fois/Mois' },
  { id: 'veillées', label: 'Nombre de veillées', frequency: 'Semaine', valueType: 'number', unit: 'Fois/Semaine' },
  { id: 'dîmes', label: 'Contribution financière (Dîmes)', frequency: 'Mois', valueType: 'boolean' },
  { id: 'retraites_nb', label: 'Retraites spirituelles (Nombre)', frequency: 'Mois', valueType: 'number', unit: 'Retraites/Mois' },
  { id: 'retraites_hr', label: 'Retraites spirituelles (Durée)', frequency: 'Mois', valueType: 'number', unit: 'Heures/Retraite' },
  { id: 'midc', label: 'Affichage forum (MIDC)', frequency: 'Mois', valueType: 'boolean' },
  { id: 'cellules', label: 'Cellules dirigées', frequency: 'Mois', valueType: 'boolean' },
];

/**
 * Récupère la devise configurée dans les paramètres de l'église
 */
export const getCurrency = () => {
  try {
    const saved = localStorage.getItem('vinea_church_info');
    if (saved) {
      return JSON.parse(saved).currency || 'F CFA';
    }
  } catch (e) {
    console.error("Erreur lecture devise settings:", e);
  }
  return 'F CFA';
};

export const formatPhone = (val: string) => {
  const digits = val.replace(/\D/g, '');
  return digits.match(/.{1,2}/g)?.join(' ') || val;
};

export const formatCurrency = (val: number) => {
  const currency = getCurrency();
  return new Intl.NumberFormat('fr-FR', {
    useGrouping: true,
    minimumFractionDigits: 0
  }).format(val).replace(/\u00a0/g, ' ') + ' ' + currency;
};

// Mock data generator for demo
export const MOCK_MEMBERS: Member[] = [
  {
    id: 'm1',
    lastName: 'KOUAKOU',
    firstName: 'Jean',
    gender: 'Masculin',
    maritalStatus: 'Marié',
    type: MemberType.PASTEUR,
    isDiscipleMaker: true,
    baptized: true,
    status: MemberStatus.ACTIF,
    departments: [Department.INTERCESSION],
    source: 'Invitation personnelle',
    whatsapp: true,
    emergencyContact: { name: 'Marie Kouakou', phone: '0708091011', relation: 'Épouse' }
  },
  {
    id: 'm2',
    lastName: 'TRAORE',
    firstName: 'Awa',
    gender: 'Féminin',
    maritalStatus: 'Célibataire',
    type: MemberType.MEMBRE_SIMPLE,
    isDiscipleMaker: false,
    baptized: true,
    status: MemberStatus.ACTIF,
    departments: [],
    source: 'Réseaux sociaux',
    whatsapp: true,
    emergencyContact: { name: 'Bakary Traore', phone: '0102030405', relation: 'Frère' }
  }
];

export const MOCK_VISITORS: Visitor[] = [
  {
    id: 'v1',
    lastName: 'DIOMANDE',
    firstName: 'Yaya',
    gender: 'Masculin',
    phone: '0506070809',
    address: 'Abidjan, Cocody',
    visitDate: '2024-03-17',
    service: 'Culte de dimanche',
    source: 'Invitation par un ami',
    invitedBy: 'Jean Kouakou',
    status: VisitorStatus.EN_ATTENTE,
    notes: 'A exprimé le souhait d\'en savoir plus sur le baptême.'
  },
  {
    id: 'v2',
    lastName: 'BAMBA',
    firstName: 'Mariam',
    gender: 'Féminin',
    phone: '0708091011',
    address: 'Yopougon, Maroc',
    visitDate: '2024-03-10',
    service: 'Veillée de prière',
    source: 'Réseaux sociaux',
    status: VisitorStatus.CONTACT_1,
    notes: 'Rappelée le 12/03. Très ouverte.'
  },
  {
    id: 'v3',
    lastName: 'OUATTARA',
    firstName: 'Ibrahim',
    gender: 'Masculin',
    phone: '0102030405',
    address: 'Bingerville',
    visitDate: '2024-02-25',
    service: 'Culte de dimanche',
    source: 'Passage',
    status: VisitorStatus.MEMBRE,
    notes: 'S\'est converti lors de l\'appel à la fin du culte.'
  }
];
