/**
 * Normalise une URL Supabase Storage pour s'assurer qu'elle utilise le chemin public.
 * Corrige les URLs stockées sans "/public/" (ex: /object/members/...) en /object/public/members/...
 */
export const normalizeStorageUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  // Already correct public URL
  if (url.includes('/object/public/')) return url;
  // Fix missing /public/ segment: /storage/v1/object/{bucket}/... → /storage/v1/object/public/{bucket}/...
  return url.replace(/\/storage\/v1\/object\/(?!public\/)/, '/storage/v1/object/public/');
};

export const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Formate un prénom : minuscule partout sauf la première lettre de chaque mot/partie séparée par un trait d'union.
 */
export const formatFirstName = (name: string): string => {
  if (!name) return "";
  return name.toLowerCase().replace(/(?:^|\s|-)\S/g, (a) => a.toUpperCase());
};

/**
 * Génère les initiales à partir du prénom et du nom.
 * Format : Première lettre du Prénom + Première lettre du Nom.
 */
export const getInitials = (firstName?: string, lastName?: string): string => {
  const f = firstName?.trim().charAt(0) || '';
  const l = lastName?.trim().charAt(0) || '';
  const initials = (f + l).toUpperCase();
  return initials || '?';
};

/**
 * Extrait les initiales d'une chaîne complète (ex: "Armel TINDO")
 * Prend la première lettre du premier mot et la première lettre du dernier mot.
 */
export const getInitialsFromString = (fullName?: string): string => {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return fullName.charAt(0).toUpperCase();
};

/**
 * Formate un nom complet pour l'affichage header/sidebar.
 * Ex: "Armel TINDO" → "Armel T."
 */
export const formatDisplayName = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fullName;
  const prenom = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  if (parts.length === 1) return prenom;
  const initial = parts[parts.length - 1].charAt(0).toUpperCase() + '.';
  return `${prenom} ${initial}`;
};

/**
 * Retourne le surnom s'il existe, sinon "Frère/Soeur + Prénom"
 */
export const getDisplayNickname = (firstName: string, nickname: string | undefined, gender: 'Masculin' | 'Féminin'): string => {
  if (nickname && nickname.trim() !== '') {
    return nickname;
  }
  const prefix = gender === 'Masculin' ? 'Frère' : 'Soeur';
  return `${prefix} ${firstName}`;
};