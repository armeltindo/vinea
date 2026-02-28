
import React from 'react';
import {
  Users,
  Wallet,
  Church,
  UserPlus,
  X,
  ChevronRight,
  Plus
} from 'lucide-react';
import { cn } from '../utils';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (tab: string) => void;
}

const QuickActionModal: React.FC<QuickActionModalProps> = ({ isOpen, onClose, onAction }) => {
  if (!isOpen) return null;

  const ACTIONS = [
    {
      id: 'members',
      label: 'Nouveau Membre',
      desc: 'Ajouter une personne à la base',
      icon: <Users size={22} />,
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      hoverBorder: 'hover:border-indigo-200',
    },
    {
      id: 'finances',
      label: 'Nouvelle Transaction',
      desc: 'Enregistrer une dîme ou dépense',
      icon: <Wallet size={22} />,
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      hoverBorder: 'hover:border-emerald-200',
    },
    {
      id: 'services',
      label: 'Programmer un Culte',
      desc: 'Planifier un nouveau service',
      icon: <Church size={22} />,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      hoverBorder: 'hover:border-amber-200',
    },
    {
      id: 'visitors',
      label: 'Nouveau Visiteur',
      desc: 'Fiche de suivi pour un nouvel arrivant',
      icon: <UserPlus size={22} />,
      color: 'bg-rose-500',
      lightColor: 'bg-rose-50',
      textColor: 'text-rose-600',
      hoverBorder: 'hover:border-rose-200',
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Actions Rapides</h3>
              <p className="text-xs text-slate-400 mt-0.5">Sélectionnez une action pour commencer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Actions grid */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                onAction(action.id);
                onClose();
              }}
              className={cn(
                "group flex items-start gap-4 p-5 bg-white border border-slate-100 rounded-xl text-left relative overflow-hidden",
                "hover:shadow-md hover:shadow-slate-100 active:scale-[0.98] transition-all",
                action.hoverBorder
              )}
            >
              {/* Glow bg */}
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity rounded-xl",
                action.color
              )} />

              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-white/50 group-hover:scale-105 transition-transform duration-200",
                action.lightColor,
                action.textColor
              )}>
                {action.icon}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors leading-snug">
                  {action.label}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {action.desc}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Ouvrir <ChevronRight size={12} />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">Vinea v1.6.0</span>
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickActionModal;
