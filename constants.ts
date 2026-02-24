
import { Department, SpiritualExerciseDef } from './types';

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
 * Cache mémoire de la devise — alimenté par App.tsx au chargement des settings.
 */
let _currencyCache = 'F CFA';
export const setCurrencyCache = (currency: string) => { _currencyCache = currency; };
export const getCurrency = () => _currencyCache;

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

// Les données sont maintenant chargées depuis Supabase via lib/db.ts
