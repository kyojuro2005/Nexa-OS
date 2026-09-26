import React, { useState, useEffect } from "react";
import { usePWA } from "../hooks/usePWA";
import { useAppStore } from "../stores/useAppStore";

export default function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isIOS, hasNativePrompt, promptInstall, showGuideModal, setShowGuideModal } = usePWA();
  const [showBanner, setShowBanner] = useState(false);
  const { addNotification, notifications } = useAppStore();

  useEffect(() => {
    if (isInstalled) return;

    // Vérifier si l'utilisateur a masqué le bandeau récemment (24h)
    const dismissedTime = localStorage.getItem("pwa-banner-dismissed");
    if (dismissedTime && Date.now() - Number(dismissedTime) < 24 * 60 * 60 * 1000) {
      return;
    }

    // Afficher le bandeau après 3.5 secondes
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 3500);

    // Déclencher une notification dans le centre de notifications de l'application
    const notifSent = localStorage.getItem("pwa-notif-sent");
    if (!notifSent) {
      setTimeout(() => {
        addNotification({
          type: "info",
          title: "Installer Nexa OS",
          body: "Installez l'application sur votre écran d'accueil pour un accès instantané et le support hors-ligne.",
        });
        localStorage.setItem("pwa-notif-sent", "true");

        // Proposer la notification native du navigateur si supportée
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "default") {
            Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                try {
                  new Notification("Nexa OS disponible à l'installation", {
                    body: "Cliquez sur 'Installer' dans la barre pour ajouter Nexa OS à votre bureau.",
                    icon: "/nexawbg.png",
                  });
                } catch {}
              }
            });
          }
        }
      }, 5000);
    }

    return () => clearTimeout(timer);
  }, [isInstalled]);

  const handleDismissBanner = () => {
    localStorage.setItem("pwa-banner-dismissed", String(Date.now()));
    setShowBanner(false);
  };

  const handleInstallClick = async () => {
    setShowBanner(false);
    await promptInstall();
  };

  if (isInstalled) return null;

  return (
    <>
      {/* ── Bandeau flottant d'invitation (mobile & desktop) ── */}
      {showBanner && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[500] w-[calc(100%-2rem)] max-w-md animate-fade-in"
          style={{ animationDuration: "300ms" }}
        >
          <div className="bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant/30 rounded-2xl p-4 shadow-xl flex items-start gap-3.5">
            {/* Logo Nexa officiel */}
            <img
              src="/nexawbg.png"
              alt="Nexa OS Logo"
              className="w-12 h-12 rounded-xl object-contain bg-surface-container-low p-1 shrink-0 border border-outline-variant/20 shadow-xs"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-body-sm font-semibold text-on-surface">
                  Installer Nexa OS
                </h4>
                <button
                  onClick={handleDismissBanner}
                  className="text-outline hover:text-on-surface transition-colors p-1"
                  aria-label="Fermer"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              <p className="text-label-sm text-outline mt-0.5 font-mono">
                {isIOS
                  ? "Ajoute l'app sur ton écran d'accueil via le menu Partager."
                  : "Accède à tes projets en un clic, directement depuis ton écran d'accueil ou bureau."}
              </p>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1351b4] hover:bg-[#0f4498] text-white text-label-sm font-semibold shadow-xs transition-transform active:scale-95"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="13" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="16" x2="12" y2="21" />
                    <polyline points="8 10 12 14 16 10" />
                    <line x1="12" y1="6" x2="12" y2="14" />
                  </svg>
                  Installer
                </button>
                <button
                  onClick={handleDismissBanner}
                  className="text-label-sm text-outline hover:text-on-surface px-2.5 py-1.5 font-mono transition-colors"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Guide d'installation si pas de prompt natif disponible ── */}
      {showGuideModal && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-on-background/40 backdrop-blur-sm"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl p-6 border border-outline-variant/30"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/nexawbg.png"
                  alt="Nexa OS"
                  className="w-10 h-10 rounded-xl object-contain bg-surface-container-low p-1"
                />
                <div>
                  <h3 className="text-headline-sm font-semibold text-on-surface">Installer Nexa OS</h3>
                  <p className="text-label-sm text-outline font-mono">Application web progressive (PWA)</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-outline hover:text-on-surface p-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-body-sm text-on-surface">
                <p>Pour installer sur iPhone ou iPad :</p>
                <ol className="list-decimal list-inside space-y-2 text-outline font-mono text-label-sm">
                  <li>Ouvre cette page dans Safari.</li>
                  <li>Touche l'icône <strong className="text-primary font-bold">Partager</strong> en bas de l'écran.</li>
                  <li>Fais défiler et touche <strong className="text-primary font-bold">« Sur l'écran d'accueil »</strong>.</li>
                  <li>Valide en touchant <strong className="text-primary font-bold">Ajouter</strong>.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-body-sm text-on-surface">
                <p className="text-on-surface-variant">
                  Sur ordinateur (Chrome, Edge, Brave) :
                </p>
                <div className="p-3 bg-surface-container rounded-xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>install_desktop</span>
                  <p className="text-label-sm text-on-surface-variant font-mono">
                    Clique sur l'icône <strong>Installer</strong> dans la barre d'adresse du navigateur tout à droite, ou dans le menu (⋮) &gt; <em>« Installer Nexa OS »</em>.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="btn-primary"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
