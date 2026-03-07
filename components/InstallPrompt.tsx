import React, { useEffect, useState } from 'react';
import { Share, X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isMobile(): boolean {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return (
    ('standalone' in window.navigator && (window.navigator as any).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

const DISMISSED_KEY = 'vinea_install_prompt_dismissed';

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (!isMobile()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    if (isIos()) {
      setPlatform('ios');
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }

    // Android/Chrome : capturer l'événement natif
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform('android');
      setTimeout(() => setVisible(true), 1500);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9990] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-white" />
            <span className="text-white text-xs font-semibold">Installer l'application</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-indigo-200 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {platform === 'android' ? (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">Accès rapide depuis l'écran d'accueil</p>
                <p className="text-xs text-slate-500 mt-0.5">Installez Vinea pour une meilleure expérience.</p>
              </div>
              <button
                onClick={handleInstallAndroid}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Installer
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <Share className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-800">Accès rapide depuis l'écran d'accueil</p>
                <p className="text-xs text-slate-500 mt-1">
                  Appuyez sur{' '}
                  <span className="inline-flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded px-1 py-0.5 text-slate-700 font-medium">
                    <Share className="w-3 h-3" /> Partager
                  </span>{' '}
                  puis <strong className="text-slate-800">« Sur l'écran d'accueil »</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
