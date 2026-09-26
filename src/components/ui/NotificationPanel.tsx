import React, { useEffect, useRef } from "react";
import { useAppStore } from "../../stores/useAppStore";
import type { NotificationType } from "../../types";

const TYPE_ICONS: Record<NotificationType, string> = {
  session_start: "bolt",
  session_reminder: "alarm",
  task_done: "task_alt",
  project_done: "done_all",
  planning_recalculated: "auto_fix_high",
  info: "info",
};

const TYPE_COLORS: Record<NotificationType, string> = {
  session_start: "text-primary",
  session_reminder: "text-secondary",
  task_done: "text-tertiary",
  project_done: "text-tertiary",
  planning_recalculated: "text-primary",
  info: "text-outline",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `il y a ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

interface Props {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: Props) {
  const { notifications, markNotificationRead, markAllNotificationsRead, clearNotifications, setView } = useAppStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 overflow-hidden z-50 animate-scale-in"
      style={{ maxHeight: "70vh", display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
        <div className="flex items-center gap-2">
          <span className="text-headline-sm font-semibold text-on-surface">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary text-label-sm font-bold font-mono">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="text-label-sm text-primary hover:text-on-primary-fixed-variant font-mono px-2 py-1 rounded-lg hover:bg-surface-container transition-colors"
            >
              Tout lire
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="text-label-sm text-outline hover:text-error font-mono px-2 py-1 rounded-lg hover:bg-error-container/30 transition-colors"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <span className="material-symbols-outlined text-outline" style={{ fontSize: 36 }}>notifications_none</span>
            <p className="text-body-sm text-on-surface-variant">Aucune notification</p>
            <p className="text-label-sm text-outline font-mono">Les alertes de sessions et de projets apparaîtront ici.</p>
          </div>
        ) : (
          notifications.map(notif => (
            <button
              key={notif.id}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-outline-variant/10 last:border-0 ${
                notif.read ? "bg-transparent hover:bg-surface-container-low/50" : "bg-primary-fixed/20 hover:bg-primary-fixed/30"
              }`}
              onClick={() => {
                markNotificationRead(notif.id);
                if (notif.projectId) {
                  setView("projet-detail", { selectedProjectId: notif.projectId });
                } else if (notif.sessionId) {
                  setView("session-focus", { activeSessionId: notif.sessionId });
                }
                onClose();
              }}
            >
              <span
                className={`material-symbols-outlined shrink-0 mt-0.5 ${TYPE_COLORS[notif.type]}`}
                style={{ fontSize: 18 }}
              >
                {TYPE_ICONS[notif.type]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-body-sm font-semibold truncate ${notif.read ? "text-on-surface-variant" : "text-on-surface"}`}>
                    {notif.title}
                  </span>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                <p className="text-label-sm text-on-surface-variant mt-0.5 line-clamp-2">{notif.body}</p>
                <span className="text-label-sm text-outline font-mono mt-1 block">{timeAgo(notif.createdAt)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Permission navigateur */}
      {typeof window !== "undefined" &&
        "Notification" in window &&
        (window.Notification as any).permission === "default" && (
          <div className="px-4 py-3 border-t border-outline-variant/20 bg-surface-container-low">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-body-sm font-medium text-on-surface">Activer les notifications système</p>
                <p className="text-label-sm text-outline font-mono">Reçois des alertes même hors de l'onglet.</p>
              </div>
              <button
                onClick={async () => {
                  await (window.Notification as any).requestPermission();
                  onClose();
                }}
                className="btn-primary py-1.5 text-label-sm shrink-0"
              >
                Activer
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
