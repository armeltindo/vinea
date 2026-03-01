
import React from 'react';
import { cn } from '../utils';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  /** Classe appliquée au div body uniquement */
  bodyClassName?: string;
  /** Icône affichée à droite du header dans un container neutre */
  icon?: React.ReactNode;
  subtitle?: string;
  /** Élément(s) placés entre le titre et l'icône (ex: un bouton) */
  headerAction?: React.ReactNode;
  /** Supprime le padding du body (pour les listes, charts plein-cadre) */
  noPadding?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  className,
  bodyClassName,
  icon,
  subtitle,
  headerAction,
  noPadding,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden',
        className
      )}
    >
      {(title || icon || headerAction) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-sm font-semibold text-slate-700 leading-snug truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            {icon && (
              <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 shrink-0">
                {icon}
              </div>
            )}
          </div>
        </div>
      )}
      <div className={cn(!noPadding && 'p-5', bodyClassName)}>{children}</div>
    </div>
  );
};

export default Card;
