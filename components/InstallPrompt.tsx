import React, { useEffect, useState } from 'react';
import { Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return (
    ('standalone' in window.navigator && (window.navigator as any).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    if (isIos()) {
      // iOS Safari: no native prompt, show manual instructions
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }

    // Android/Chrome: do NOT call e.preventDefault() so Chrome shows
    // its own mini-infobar automatically — nothing more to do here.
  }, []);

  // iOS instructions banner
  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-blue-800 text-white rounded-xl shadow-lg px-4 py-3">
      <div className="flex items-start gap-3">
        <Share className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-semibold">Installer Vinea</p>
          <p className="text-blue-200 text-xs mt-0.5">
            Appuyez sur{' '}
            <span className="inline-flex items-center gap-0.5 bg-blue-700 rounded px-1 py-0.5">
              <Share className="w-3 h-3" /> Partager
            </span>{' '}
            puis <strong className="text-white">« Sur l'écran d'accueil »</strong>
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-blue-300 hover:text-white transition-colors shrink-0"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-blue-800" />
    </div>
  );
}
