import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "../stores/useAppStore";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    notifyListeners();
  });
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  });
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    const update = () => {
      setDeferredPrompt(globalDeferredPrompt);
      if (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
      ) {
        setIsInstalled(true);
      }
    };

    listeners.add(update);
    update();

    return () => {
      listeners.delete(update);
    };
  }, []);

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  const isInstallable = !isInstalled && (!!deferredPrompt || isIOS);

  const promptInstall = useCallback(async () => {
    if (globalDeferredPrompt) {
      await globalDeferredPrompt.prompt();
      const choice = await globalDeferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      notifyListeners();
    } else {
      // Guide modal pour desktop Safari/Firefox ou iOS
      setShowGuideModal(true);
    }
  }, []);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    hasNativePrompt: !!deferredPrompt,
    promptInstall,
    showGuideModal,
    setShowGuideModal,
  };
}
