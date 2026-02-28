
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
    setTimeout(() => {
      onConfirm();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={isProcessing ? undefined : onClose}
      />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-rose-100">
            <LogOut size={30} className={isProcessing ? 'animate-pulse' : ''} />
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">Quitter Vinea ?</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            Votre session sera fermée. Pensez à enregistrer vos modifications en cours.
          </p>

          <div className="flex flex-col gap-3 mt-7">
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="w-full py-3 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 active:scale-[0.98] transition-all shadow-md shadow-rose-200/60 flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Déconnexion…
                </>
              ) : (
                'Confirmer la déconnexion'
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-full py-3 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 active:scale-[0.98] transition-all border border-slate-200 disabled:opacity-50"
            >
              Rester connecté
            </button>
          </div>
        </div>

        {!isProcessing && (
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default LogoutModal;
