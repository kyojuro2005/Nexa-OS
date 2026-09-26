import React from "react";
import { useAppStore } from "../../stores/useAppStore";
import type { ViewId } from "../../types";

interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "projets", label: "Projets & Roadmap", icon: "account_tree" },
  { id: "planification", label: "Planification", icon: "psychology" },
  { id: "calendrier", label: "Calendrier", icon: "calendar_today" },
  { id: "disponibilites", label: "Disponibilités & Repos", icon: "battery_charging_full" },
  { id: "bibliotheque", label: "Bibliothèque", icon: "local_library" },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { ui, user, setView, setSidebarCollapsed } = useAppStore();

  const handleNav = (view: ViewId) => {
    setView(view);
    onNavigate?.();
  };
  const currentView = ui.currentView;
  const collapsed = ui.sidebarCollapsed;

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-surface-container-lowest z-50 flex flex-col justify-between shadow-sm transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* ── Logo + Collapse ── */}
      <div className="flex flex-col">
        <div className="h-16 px-space-md flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-space-sm">
              {/* Logo officiel Nexa OS */}
              <img
                src="/nexawbg.png"
                alt="Nexa OS Logo"
                className="w-8 h-8 rounded-lg object-contain"
              />
              <span className="font-semibold text-headline-sm text-on-surface tracking-tight">
                Nexa OS
              </span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto">
              <img
                src="/nexawbg.png"
                alt="Nexa OS Logo"
                className="w-7 h-7 rounded-lg object-contain"
              />
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setSidebarCollapsed(!collapsed)}
              className="text-outline hover:text-on-surface transition-colors p-1 rounded-lg hover:bg-surface-container-low"
              title="Réduire le menu"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>dock_to_left</span>
            </button>
          )}
        </div>

        {/* ── CTA Nouveau projet ── */}
        <div className="px-space-md pt-1 pb-space-sm">
          <button
            onClick={() => handleNav("nouveau-projet")}
            className={`flex items-center justify-center gap-space-sm w-full py-space-sm px-space-md rounded-xl bg-primary-container text-on-primary hover:bg-primary transition-all shadow-primary-glow ${
              collapsed ? "px-2" : ""
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
            {!collapsed && (
              <span className="font-semibold text-body-sm">Nouveau projet</span>
            )}
          </button>
        </div>

        {/* ── Navigation principale ── */}
        <nav className="flex flex-col gap-0.5 px-space-md py-space-xs">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`nav-link ${currentView === item.id ? "active" : ""} ${
                collapsed ? "justify-center px-2" : ""
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="text-body-sm">{item.label}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Bas : Paramètres + Profil ── */}
      <div className="flex flex-col gap-0.5 p-space-md">
        {collapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="nav-link justify-center px-2 mb-2"
            title="Agrandir le menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>dock_to_right</span>
          </button>
        )}
        <button
          onClick={() => handleNav("parametres")}
          className={`nav-link ${currentView === "parametres" ? "active" : ""} ${
            collapsed ? "justify-center px-2" : ""
          }`}
          title={collapsed ? "Paramètres" : undefined}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
          {!collapsed && <span className="text-body-sm">Paramètres</span>}
        </button>

        {/* Profil utilisateur */}
        <button
          onClick={() => handleNav("parametres")}
          className={`flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors cursor-pointer mt-1 ${
            collapsed ? "justify-center px-2" : ""
          }`}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-body-sm font-bold shrink-0">
              {initials}
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1 text-left">
              <span className="text-body-sm font-semibold truncate text-on-surface">
                {user?.name ?? "Utilisateur"}
              </span>
              <span className="text-label-sm text-outline truncate font-mono">
                {user?.role ?? ""}
              </span>
            </div>
          )}
          {!collapsed && (
            <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>unfold_more</span>
          )}
        </button>
      </div>
    </aside>
  );
}
