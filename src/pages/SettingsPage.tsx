import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "../stores/useAppStore";
import AIProviderSelector from "../components/ui/AIProviderSelector";
import { uploadAvatar } from "../lib/supabase";

type SettingsTab = "profil" | "ia" | "apparence" | "notifications" | "donnees";

export default function SettingsPage() {
  const {
    user, updateUser, logout, stats,
    activeProviderId, aiProviders,
    theme, setTheme,
    notifications, markAllNotificationsRead, clearNotifications, addNotification,
    cloudSyncStatus, syncToCloud,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profil");
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState(user?.role ?? "");
  const [saved, setSaved] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission((window.Notification as any).permission);
    }
    // Appliquer le thème sauvegardé au montage
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const handleSaveProfile = () => {
    updateUser({ name: name.trim(), role: role.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id || user.id === "guest-user") {
      setAvatarError("Connecte-toi avec un compte pour uploader une photo.");
      return;
    }
    const MAX_MB = 3;
    if (file.size > MAX_MB * 1024 * 1024) {
      setAvatarError(`Image trop grande (max ${MAX_MB} Mo).`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setAvatarError("Le fichier doit être une image.");
      return;
    }
    try {
      setAvatarUploading(true);
      setAvatarError(null);
      const url = await uploadAvatar(user.id, file);
      updateUser({ avatarUrl: url });
    } catch (err: any) {
      setAvatarError(err.message || "Erreur lors de l'upload.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRequestNotifPermission = async () => {
    if (!("Notification" in window)) return;
    const perm = await (window.Notification as any).requestPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      addNotification({
        type: "info",
        title: "Notifications activées",
        body: "Tu recevras des alertes de sessions et de projets.",
      });
    }
  };

  const totalHours = Math.round(stats.totalWorkMinutes / 60);
  const activeProvider = aiProviders.find(p => p.id === activeProviderId);
  const unreadCount = notifications.filter(n => !n.read).length;

  const TABS: { id: SettingsTab; label: string; icon: string }[] = [
    { id: "profil",        label: "Profil",        icon: "person" },
    { id: "ia",            label: "IA & Modèles",  icon: "psychology" },
    { id: "apparence",     label: "Apparence",     icon: "palette" },
    { id: "notifications", label: "Notifications", icon: "notifications" },
    { id: "donnees",       label: "Données",       icon: "database" },
  ];

  return (
    <div className="flex flex-col gap-space-lg max-w-3xl">
      <div>
        <h1 className="text-headline-lg font-semibold text-on-surface">Paramètres</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Profil, modèles IA, apparence et préférences.</p>
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-1 p-1 bg-surface-container rounded-xl overflow-x-auto w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-space-md py-1.5 rounded-lg text-body-sm transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-surface-container-lowest text-primary font-semibold shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tab.icon}</span>
            {tab.label}
            {tab.id === "notifications" && unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center font-mono">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PROFIL ── */}
      {activeTab === "profil" && (
        <div className="flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs flex flex-col gap-space-md">
            <h2 className="text-headline-sm font-semibold text-on-surface">Informations personnelles</h2>

            {/* Avatar avec upload */}
            <div className="flex items-center gap-space-md">
              {/* Zone cliquable pour l'upload */}
              <div className="relative group">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl overflow-hidden cursor-pointer ring-2 ring-transparent hover:ring-primary/40 transition-all"
                >
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary-container text-on-primary flex items-center justify-center text-headline-md font-bold">
                      {name ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?"}
                    </div>
                  )}
                  {/* Overlay au hover */}
                  <div className="absolute inset-0 bg-on-surface/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {avatarUploading ? (
                      <span className="material-symbols-outlined text-white animate-spin" style={{ fontSize: 20 }}>refresh</span>
                    ) : (
                      <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>photo_camera</span>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
              <div>
                <p className="text-body-sm font-semibold text-on-surface">{name || "Utilisateur"}</p>
                <p className="text-label-sm text-outline font-mono">{role || "Rôle non défini"}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="text-label-sm text-primary hover:underline font-mono mt-1 disabled:opacity-40"
                >
                  {avatarUploading ? "Upload en cours…" : user?.avatarUrl ? "Changer la photo" : "Ajouter une photo"}
                </button>
                {avatarError && <p className="text-label-sm text-error font-mono mt-0.5">{avatarError}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-label-md font-mono text-on-surface-variant block mb-1.5">Prénom & Nom</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-md outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-label-md font-mono text-on-surface-variant block mb-1.5">Rôle / Titre</label>
                <input
                  type="text" value={role} onChange={e => setRole(e.target.value)}
                  placeholder="Tech Founder, Développeur freelance..."
                  className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-md outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <button onClick={handleSaveProfile} className="btn-primary w-fit">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {saved ? "check_circle" : "save"}
              </span>
              <span>{saved ? "Sauvegardé !" : "Sauvegarder"}</span>
            </button>

            {/* Cloud sync status */}
            {user && user.id !== "guest-user" && (
              <div className="flex items-center justify-between pt-space-sm border-t border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cloudSyncStatus.syncing ? "bg-secondary animate-pulse" : cloudSyncStatus.error ? "bg-error" : "bg-tertiary-fixed-dim"}`} />
                  <span className="text-label-sm font-mono text-on-surface-variant">
                    {cloudSyncStatus.syncing
                      ? "Synchronisation en cours…"
                      : cloudSyncStatus.error
                      ? `Erreur sync : ${cloudSyncStatus.error}`
                      : cloudSyncStatus.lastSync
                      ? `Synchronisé · ${new Date(cloudSyncStatus.lastSync).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                      : "Non synchronisé"}
                  </span>
                </div>
                <button
                  onClick={() => syncToCloud()}
                  disabled={cloudSyncStatus.syncing}
                  className="flex items-center gap-1 text-label-sm text-primary hover:underline font-mono disabled:opacity-40"
                >
                  <span className={`material-symbols-outlined ${cloudSyncStatus.syncing ? "animate-spin" : ""}`} style={{ fontSize: 14 }}>sync</span>
                  <span>Synchroniser</span>
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs flex flex-col gap-space-md">
            <h2 className="text-headline-sm font-semibold text-on-surface">Statistiques globales</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Heures travaillées", value: `${totalHours}h`, icon: "timer" },
                { label: "Sessions terminées", value: stats.sessionsCompleted, icon: "check_circle" },
                { label: "Tâches terminées", value: stats.tasksCompleted, icon: "task_alt" },
                { label: "Projets terminés", value: stats.projectsCompleted, icon: "done_all" },
              ].map(stat => (
                <div key={stat.label} className="flex flex-col p-space-sm rounded-xl bg-surface-container-low">
                  <span className="material-symbols-outlined text-primary mb-1" style={{ fontSize: 18 }}>{stat.icon}</span>
                  <span className="text-headline-md font-semibold text-on-surface">{stat.value}</span>
                  <span className="text-label-sm text-outline font-mono">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Déconnexion ── */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs flex items-center justify-between">
            <div>
              <div className="text-body-sm font-semibold text-on-surface">Se déconnecter</div>
              <div className="text-label-sm text-outline font-mono mt-0.5">
                {user?.email || "Session locale"} · {user?.id === "guest-user" ? "Mode invité" : "Compte Supabase"}
              </div>
            </div>
            <button
              onClick={() => {
                if (window.confirm("Confirmer la déconnexion ?")) {
                  logout();
                }
              }}
              className="flex items-center gap-2 px-space-md py-2 rounded-xl bg-error-container text-on-error-container text-body-sm font-semibold hover:opacity-80 transition-opacity"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      )}


      {/* ── IA & MODÈLES ── */}
      {activeTab === "ia" && (
        <div className="flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs flex flex-col gap-space-md">
            <div className="flex items-start justify-between gap-space-md">
              <div>
                <h2 className="text-headline-sm font-semibold text-on-surface">Provider IA actif</h2>
                <p className="text-body-sm text-on-surface-variant mt-0.5">
                  Un seul provider peut être actif à la fois. Supprime-le pour en configurer un autre.
                </p>
              </div>
              <div className={`flex items-center gap-1.5 px-space-sm py-1 rounded-full text-label-sm font-mono font-semibold ${
                activeProviderId
                  ? "bg-tertiary-fixed-dim/30 text-tertiary"
                  : "bg-surface-container text-outline"
              }`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                {activeProviderId ? activeProvider?.name ?? activeProviderId : "Aucun — mode démo"}
              </div>
            </div>

            <AIProviderSelector />
          </div>

          {/* Chat IA sur les projets */}
          {activeProviderId && (
            <div className="bg-primary-fixed/30 rounded-2xl p-space-md flex items-start gap-3">
              <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: 20 }}>tips_and_updates</span>
              <div>
                <p className="text-body-sm font-semibold text-on-surface">Chat IA disponible sur tes projets</p>
                <p className="text-body-sm text-on-surface-variant mt-0.5">
                  Ouvre n'importe quel projet et utilise le chat pour discuter avec l'IA : elle connaît le contexte, pose des questions, signale les incohérences et peut te conseiller sur des outils ou des développeurs freelance.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── APPARENCE ── */}
      {activeTab === "apparence" && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs flex flex-col gap-space-md">
          <h2 className="text-headline-sm font-semibold text-on-surface">Apparence</h2>

          {/* Thème */}
          <div>
            <label className="text-label-md font-mono text-on-surface-variant block mb-3">Thème de l'interface</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: "light", label: "Clair", icon: "light_mode", desc: "Interface lumineuse, lisibilité maximale." },
                { id: "dark",  label: "Sombre", icon: "dark_mode", desc: "Interface sombre, confort nocturne." },
              ] as { id: "light" | "dark"; label: string; icon: string; desc: string }[]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className={`flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                    theme === opt.id
                      ? "border-primary bg-primary-fixed/20"
                      : "border-outline-variant/30 hover:border-outline-variant/60 bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`material-symbols-outlined ${theme === opt.id ? "text-primary" : "text-outline"}`} style={{ fontSize: 22 }}>
                      {opt.icon}
                    </span>
                    {theme === opt.id && (
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>check_circle</span>
                    )}
                  </div>
                  <span className="text-body-sm font-semibold text-on-surface">{opt.label}</span>
                  <span className="text-label-sm text-on-surface-variant">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prévisualisation */}
          <div className={`rounded-xl p-space-md border border-outline-variant/20 ${theme === "dark" ? "bg-inverse-surface text-inverse-on-surface" : "bg-surface-container text-on-surface"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>preview</span>
              <span className="text-label-sm font-mono">Prévisualisation du thème</span>
            </div>
            <p className="text-body-sm">Voici un aperçu rapide de l'apparence générale de l'interface.</p>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {activeTab === "notifications" && (
        <div className="flex flex-col gap-space-lg">
          {/* Permission navigateur */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs flex flex-col gap-space-md">
            <h2 className="text-headline-sm font-semibold text-on-surface">Notifications système</h2>
            <p className="text-body-sm text-on-surface-variant">
              Reçois des alertes de démarrage de session et de fin de projet directement dans ton navigateur, même si Nexa OS n'est pas au premier plan.
            </p>

            {!("Notification" in window) ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-error-container/30 text-on-error-container text-body-sm">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                Ton navigateur ne supporte pas les notifications.
              </div>
            ) : notifPermission === "granted" ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-tertiary-fixed-dim/30 text-tertiary text-body-sm">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                Notifications système activées.
              </div>
            ) : notifPermission === "denied" ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-error-container/30 text-on-error-container text-body-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>block</span>
                  Accès refusé par le navigateur. Réactive-les dans les paramètres du navigateur.
                </div>
              </div>
            ) : (
              <button onClick={handleRequestNotifPermission} className="btn-primary w-fit">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>notifications_active</span>
                <span>Activer les notifications système</span>
              </button>
            )}
          </div>

          {/* Types de notifications */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs flex flex-col gap-space-md">
            <h2 className="text-headline-sm font-semibold text-on-surface">Alertes in-app</h2>
            <p className="text-body-sm text-on-surface-variant">Ces notifications apparaissent toujours dans la cloche de l'application.</p>

            {[
              { icon: "bolt", label: "Démarrage de session", desc: "Quand une session est sur le point de commencer." },
              { icon: "task_alt", label: "Tâche terminée", desc: "Confirmation après validation d'une tâche." },
              { icon: "done_all", label: "Projet terminé", desc: "Quand un projet atteint 100% de progression." },
              { icon: "auto_fix_high", label: "Planning recalculé", desc: "Après chaque recalcul automatique du planning." },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-outline-variant/20 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>{item.icon}</span>
                  <div>
                    <p className="text-body-sm font-medium text-on-surface">{item.label}</p>
                    <p className="text-label-sm text-on-surface-variant">{item.desc}</p>
                  </div>
                </div>
                <div className="w-8 h-4 rounded-full bg-primary-container flex items-center justify-end pr-0.5 shrink-0">
                  <span className="block w-3 h-3 rounded-full bg-on-primary shadow-xs" />
                </div>
              </div>
            ))}
          </div>

          {/* Test */}
          <button
            onClick={() => addNotification({
              type: "info",
              title: "Test de notification",
              body: "Les notifications Nexa OS fonctionnent correctement.",
            })}
            className="btn-secondary w-fit"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
            <span>Envoyer une notification test</span>
          </button>
        </div>
      )}

      {/* ── DONNÉES ── */}
      {activeTab === "donnees" && (
        <div className="flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs flex flex-col gap-space-md">
            <h2 className="text-headline-sm font-semibold text-on-surface">Gestion des données</h2>
            <p className="text-body-sm text-on-surface-variant">
              Toutes tes données sont stockées localement dans ton navigateur (localStorage). Rien n'est envoyé à un serveur.
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">
                <span className="text-body-sm text-on-surface">Stockage utilisé</span>
                <span className="text-body-sm font-mono text-on-surface">
                  {(() => {
                    try {
                      const data = JSON.stringify(localStorage.getItem("nexa-os-storage") ?? "");
                      const kb = Math.round(data.length / 1024);
                      return `${kb} KB`;
                    } catch { return "–"; }
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">
                <span className="text-body-sm text-on-surface">Notifications</span>
                <span className="text-body-sm font-mono text-on-surface">{notifications.length} entrées</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2 border-t border-outline-variant/20">
              {notifications.length > 0 && (
                <button onClick={clearNotifications} className="btn-secondary">
                  <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>delete_sweep</span>
                  <span>Effacer les notifications</span>
                </button>
              )}
              <button
                onClick={() => { if (confirm("Réinitialiser l'application et revenir à l'onboarding ?")) logout(); }}
                className="btn-secondary"
              >
                <span className="material-symbols-outlined text-error" style={{ fontSize: 18 }}>logout</span>
                <span className="text-error">Réinitialiser l'application</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
