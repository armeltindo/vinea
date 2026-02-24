
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
      icon: <Users size={24} />, 
      color: 'bg-indigo-500', 
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    },
    { 
      id: 'finances', 
      label: 'Nouvelle Transaction', 
      desc: 'Enregistrer une dîme ou dépense',
      icon: <Wallet size={24} />, 
      color: 'bg-emerald-500', 
      lightColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    { 
      id: 'services', 
      label: 'Programmer Culte', 
      desc: 'Planifier un nouveau service',
      icon: <Church size={24} />, 
      color: 'bg-amber-500', 
      lightColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    { 
      id: 'visitors', 
      label: 'Nouveau Visiteur', 
      desc: 'Fiche de suivi pour nouvel arrivant',
      icon: <UserPlus size={24} />, 
      color: 'bg-rose-500', 
      lightColor: 'bg-rose-50',
      textColor: 'text-rose-600'
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Plus size={24} />
              </div>
              Actions Rapides
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Sélectionnez une action pour commencer immédiatement.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                onAction(action.id);
                onClose();
              }}
              className="group flex items-start gap-5 p-6 bg-white border border-slate-100 rounded-3xl hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all text-left relative overflow-hidden"
            >
              <div className={cn(
                "absolute top-0 right-0 w-24 h-24 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity",
                action.color
              )}></div>
              
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border transition-transform group-hover:scale-110 duration-300",
                action.lightColor,
                action.textColor,
                "border-white/50"
              )}>
                {action.icon}
              </div>
              
              <div className="flex-1">
                <h4 className="text-lg font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                  {action.label}
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  {action.desc}
                </p>
                <div className="mt-4 flex items-center gap-1 text-[10px] font-black text-indigo-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Lancer <ChevronRight size={12} />
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Vinea v1.0.4 • Centre de Commande
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickActionModal;
