/**
 * Avatar — composant universel
 * Affiche la photo si disponible, sinon les initiales avec une couleur
 * déterministe basée sur le nom (stable pour chaque personne).
 */
import React from 'react';
import { Maximize2 } from 'lucide-react';
import { cn } from '../utils';

// ── Palette de couleurs – inline styles pour éviter le purge Tailwind ──────
const PALETTES: { bg: string; text: string }[] = [
  { bg: '#e0e7ff', text: '#4338ca' }, // indigo
  { bg: '#ede9fe', text: '#6d28d9' }, // violet
  { bg: '#fce7f3', text: '#be185d' }, // pink
  { bg: '#fef3c7', text: '#b45309' }, // amber
  { bg: '#d1fae5', text: '#065f46' }, // emerald
  { bg: '#e0f2fe', text: '#0369a1' }, // sky
  { bg: '#fed7aa', text: '#c2410c' }, // orange
  { bg: '#ccfbf1', text: '#0f766e' }, // teal
  { bg: '#dbeafe', text: '#1d4ed8' }, // blue
  { bg: '#f3e8ff', text: '#7e22ce' }, // purple
];

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getPalette(seed: string) {
  return PALETTES[hashString(seed || '?') % PALETTES.length];
}

// ── Tailles ────────────────────────────────────────────────────────────────
const SIZES = {
  xs:  { wh: 'w-6 h-6',   fontSize: '0.55rem' },   // 24 px  — dropdowns compacts
  sm:  { wh: 'w-8 h-8',   fontSize: '0.65rem' },   // 32 px  — sidebar / compact
  md:  { wh: 'w-10 h-10', fontSize: '0.75rem' },   // 40 px  — standard
  lg:  { wh: 'w-12 h-12', fontSize: '0.875rem' },  // 48 px  — listes / cards
  xl:  { wh: 'w-20 h-20', fontSize: '1.5rem'  },   // 80 px  — héros
  '2xl': { wh: 'w-24 h-24 sm:w-28 sm:h-28', fontSize: '2rem' }, // 96–112 px — héros large
} as const;

// ── Formes ─────────────────────────────────────────────────────────────────
const SHAPES = {
  circle:  'rounded-full',
  rounded: 'rounded-xl',
  card:    'rounded-2xl',
} as const;

// ── Interface ──────────────────────────────────────────────────────────────
export interface AvatarProps {
  /** Prénom (utilisé pour les initiales et la couleur) */
  firstName?: string;
  /** Nom (utilisé pour les initiales et la couleur) */
  lastName?: string;
  /** Alternative : nom complet (si firstName/lastName non disponibles) */
  name?: string;
  /** URL de la photo — si présent, affichée en priorité */
  photoUrl?: string;
  /** Taille prédéfinie */
  size?: keyof typeof SIZES;
  /** Forme */
  shape?: keyof typeof SHAPES;
  /** Classes Tailwind supplémentaires (surtout pour w/h custom) */
  className?: string;
  /** Si fourni et photoUrl présent : affiche un overlay de prévisualisation au hover */
  onPhotoClick?: () => void;
  /** Aria-label pour l'accessibilité */
  alt?: string;
}

// ── Composant ──────────────────────────────────────────────────────────────
const Avatar: React.FC<AvatarProps> = ({
  firstName = '',
  lastName = '',
  name,
  photoUrl,
  size = 'md',
  shape = 'rounded',
  className,
  onPhotoClick,
  alt,
}) => {
  // Initiales
  const seed = name ?? `${firstName}${lastName}`.trim();
  const initials = (() => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return (name[0] ?? '?').toUpperCase();
    }
    const f = firstName?.trim().charAt(0) ?? '';
    const l = lastName?.trim().charAt(0) ?? '';
    return (f + l).toUpperCase() || '?';
  })();

  const palette = getPalette(seed || '?');
  const { wh, fontSize } = SIZES[size];
  const shapeClass = SHAPES[shape];
  const ariaLabel = alt ?? (name ?? `${firstName} ${lastName}`.trim()) ?? 'Avatar';

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden shrink-0 select-none',
        wh,
        shapeClass,
        className
      )}
      style={!photoUrl ? { backgroundColor: palette.bg } : { backgroundColor: '#f1f5f9' }}
      role="img"
      aria-label={ariaLabel}
    >
      {photoUrl ? (
        <>
          <img
            src={photoUrl}
            alt={ariaLabel}
            className="w-full h-full object-cover"
          />
          {/* Overlay prévisualisation photo */}
          {onPhotoClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onPhotoClick(); }}
              className="absolute inset-0 bg-black/25 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
              aria-label="Voir la photo en grand"
            >
              <Maximize2 size={size === 'xl' || size === '2xl' ? 22 : 16} className="text-white drop-shadow" />
            </button>
          )}
        </>
      ) : (
        <span
          className="font-semibold leading-none tracking-tight"
          style={{ color: palette.text, fontSize }}
        >
          {initials}
        </span>
      )}
    </div>
  );
};

export default Avatar;
