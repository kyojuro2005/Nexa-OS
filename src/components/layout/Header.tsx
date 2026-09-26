import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "../../stores/useAppStore";
import type { ViewId } from "../../types";
import NotificationPanel from "../ui/NotificationPanel";
import { usePWA } from "../../hooks/usePWA";

const SEARCH_SHORTCUTS: { label: string; icon: string; view: ViewId }[] = [
  { label: "Dashboard", icon: "dashboard", view: "dashboard" },
  { label: "Nouveau projet", icon: "auto_awesome", view: "nouveau-projet" },
  { label: "Calendrier", icon: "calendar_today", view: "calendrier" },
  { label: "Planification", icon: "psychology", view: "planification" },
  { label: "Bibliothèque", icon: "local_library", view: "bibliotheque" },
  { label: "Paramètres", icon: "settings", view: "parametres" },
];

interface HeaderProps {
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
  mobileMenuOpen?: boolean;
}

export default function Header({ onMobileMenuToggle, isMobile, mobileMenuOpen }: HeaderProps) {
  const { ui, user, setView, setSearchQuery, notifications, activeProviderId } = useAppStore();
  const { isInstalled, promptInstall } = usePWA();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const notifBtnRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const sidebarWidth = ui.sidebarCollapsed ? 64 : 256;

  // Raccourci clavier ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = query
    ? SEARCH_SHORTCUTS.filter(s => s.label.toLowerCase().includes(query.toLowerCase()))
    : SEARCH_SHORTCUTS;

  return (
    <>
      <header
        className="fixed top-0 right-0 h-16 bg-surface/80 backdrop-blur-xl shadow-sm z-40 flex items-center justify-between px-gutter-desktop transition-all duration-200"
        style={{ left: sidebarWidth }}
      >
        {/* ── Barre de recherche ── */}
        <div className="flex items-center gap-space-sm">
          {/* Bouton hamburger mobile */}
          {isMobile && (
            <button
              onClick={onMobileMenuToggle}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-colors mr-1"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          )}
          <button
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="flex items-center gap-space-sm px-space-md py-1.5 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-outline" style={{ fontSize: 16 }}>search</span>
            <span className="text-body-sm text-outline hidden sm:block">
              Recherche ou commande...
            </span>
            <span className="text-label-sm px-1.5 py-0.5 rounded bg-surface-container-lowest text-outline shadow-xs hidden md:block font-mono">
              ⌘K
            </span>
          </button>
        </div>

        {/* ── Statut IA + Actions ── */}
        <div className="flex items-center gap-space-sm sm:gap-space-md">
          {/* Bouton Installer PWA style PC / Chromium */}
          {!isInstalled && (
            <button
              onClick={promptInstall}
              title="Installer l'application sur le bureau ou mobile"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1351b4] hover:bg-[#0f4498] text-white shadow-xs transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="13" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="16" x2="12" y2="21" />
                <polyline points="8 10 12 14 16 10" />
                <line x1="12" y1="6" x2="12" y2="14" />
              </svg>
              <span className="text-label-md font-semibold hidden sm:inline">Installer</span>
            </button>
          )}

          {/* Indicateur IA actif */}
          <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-container-low">
            <span className={`w-2 h-2 rounded-full ${activeProviderId ? "bg-tertiary-fixed-dim animate-pulse" : "bg-outline"}`}></span>
            <span className="text-label-sm text-tertiary font-medium font-mono">
              {activeProviderId ? "AI Active" : "Mode démo"}
            </span>
          </div>

          {/* Notifications */}
          <div ref={notifBtnRef} className="relative">
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center font-mono">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <NotificationPanel onClose={() => setNotifOpen(false)} />
            )}
          </div>

          {/* Avatar */}
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover cursor-pointer"
              onClick={() => setView("parametres")}
            />
          ) : (
            <button
              onClick={() => setView("parametres")}
              className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-body-sm font-bold"
            >
              {user?.name ? user.name[0].toUpperCase() : "?"}
            </button>
          )}
        </div>
      </header>

      {/* ── Palette de commandes (⌘K) ── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-20 bg-on-background/20 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-space-sm px-space-md py-3 border-b border-outline-variant/30">
              <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>search</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setSearchQuery(e.target.value);
                }}
                placeholder="Rechercher une vue, un projet, une tâche..."
                className="flex-1 bg-transparent text-on-surface text-body-md outline-none placeholder:text-outline"
              />
              <kbd className="text-label-sm px-1.5 py-0.5 rounded bg-surface-container text-outline font-mono shadow-xs">
                Esc
              </kbd>
            </div>
            <div className="p-2">
              {filtered.length === 0 ? (
                <div className="px-space-md py-3 text-body-sm text-outline">
                  Aucun résultat
                </div>
              ) : (
                filtered.map(item => (
                  <button
                    key={item.view}
                    onClick={() => {
                      setView(item.view);
                      setSearchOpen(false);
                      setQuery("");
                    }}
                    className="w-full flex items-center gap-space-sm px-space-md py-2.5 rounded-xl hover:bg-surface-container-low transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>
                      {item.icon}
                    </span>
                    <span className="text-body-sm text-on-surface">{item.label}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
