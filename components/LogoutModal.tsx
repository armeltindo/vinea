
import React, { useState } from 'react';
import { LogOut, X, Loader2 } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setIsProcessing(true);
    // Simule un délai de déconnexion pour l'aspect pro
    setTimeout(() => {
      onConfirm();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={isProcessing ? undefined : onClose}
      />
      <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
            <LogOut size={38} className={isProcessing ? "animate-pulse" : ""} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Quitter Vinea ?</h3>
          <p className="text-slate-500 text-sm leading-relaxed px-2">
            Votre session actuelle sera fermée. N'oubliez pas d'enregistrer vos modifications en cours.
          </p>
          
          <div className="flex flex-col gap-3 mt-8">
            <button 
              onClick={handleConfirm}
              disabled={isProcessing}
              className="w-full py-4 bg-rose-600 text-white rounded-2xl text-sm font-black hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2 disabled:opacity-80"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Déconnexion en cours...
                </>
              ) : (
                "Confirmer la déconnexion"
              )}
            </button>
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all border border-slate-200 disabled:opacity-50"
            >
              Rester connecté
            </button>
          </div>
        </div>
        {!isProcessing && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default LogoutModal;
