
import React from 'react';
import { cn } from '../utils';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  // Fix: Add optional onClick handler to CardProps interface
  onClick?: (e: React.MouseEvent) => void;
}

const Card: React.FC<CardProps> = ({ children, title, className, icon, subtitle, onClick }) => {
  return (
    <div 
      // Fix: Bind the onClick prop to the root container div
      onClick={onClick}
      className={cn("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", className)}
    >
      {(title || icon) && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          {icon && <div className="text-indigo-600">{icon}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;
