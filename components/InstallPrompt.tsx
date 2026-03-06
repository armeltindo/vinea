import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-blue-800 text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
      <Download className="w-5 h-5 shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">Installer Vinea</p>
        <p className="text-blue-200 text-xs">Accès rapide depuis votre écran d'accueil</p>
      </div>
      <button
        onClick={handleInstall}
        className="bg-white text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
      >
        Installer
      </button>
      <button
        onClick={() => setVisible(false)}
        className="text-blue-300 hover:text-white transition-colors"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
