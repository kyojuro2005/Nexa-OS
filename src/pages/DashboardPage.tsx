import React, { useEffect } from "react";
import { useAppStore } from "../stores/useAppStore";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { WorkSession } from "../types";

function minutesToDisplay(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function useCurrentSession(sessions: WorkSession[]): WorkSession | null {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Cherche d'abord une session active
  const active = sessions.find(s => s.status === "active" && s.date === todayStr);
  if (active) return active;

  // Sinon la prochaine session planifiée du jour (pas encore commencée)
  const upcoming = sessions
    .filter(s => s.date === todayStr && s.status === "scheduled")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // La session dont le créneau est en cours ou à venir dans les 30 prochaines minutes
  return upcoming.find(s => {
    const start = timeToMinutes(s.startTime);
    const end = timeToMinutes(s.endTime);
    return nowMins >= start - 5 && nowMins < end;
  }) ?? upcoming[0] ?? null;
}

export default function DashboardPage() {
  const {
    user, projects, sessions, setView, workPreferences, stats,
    refreshStats, recalculatePlanning,
  } = useAppStore();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todaySessions = sessions
    .filter(s => s.date === todayStr && s.status !== "skipped")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const currentSession = useCurrentSession(sessions);
  const nextSessions = todaySessions
    .filter(s => s.id !== currentSession?.id && s.status === "scheduled")
    .slice(0, 3);

  const activeProjects = projects.filter(p => p.status === "active");
  const totalPlannedToday = todaySessions.reduce((a, s) => a + s.durationMinutes, 0);
  const completedToday = todaySessions.filter(s => s.status === "completed").length;
  const currentProject = currentSession
    ? projects.find(p => p.id === currentSession.projectId)
    : null;

  const dayName = format(today, "EEEE d MMMM", { locale: fr });
  const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);

  const greeting = () => {
    const h = today.getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bonne journée";
    return "Bonsoir";
  };

  // Recalculer si aucune session planifiée et qu'il y a des projets actifs
  useEffect(() => {
    if (activeProjects.length > 0 && todaySessions.length === 0) {
      recalculatePlanning();
    }
    refreshStats();
  }, [projects.length]);

  const startFocus = (session: WorkSession) => {
    useAppStore.setState(s => ({
      ui: {
        ...s.ui,
        currentView: "session-focus",
        activeSessionId: session.id,
        selectedProjectId: session.projectId,
      },
    }));
    useAppStore.getState().updateSession(session.id, { status: "active" });
  };

  return (
    <div className="flex flex-col gap-space-xl">
      {/* ── En-tête ── */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs max-w-2xl">
          <div className="flex items-center gap-space-xs">
            <span className="text-label-sm uppercase tracking-widest text-primary font-semibold font-mono">
              SYNCHRONISATION QUOTIDIENNE
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="text-label-sm text-outline font-mono">{dayNameCap}</span>
          </div>
          <h1 className="text-headline-lg font-semibold text-on-surface tracking-tight">
            {greeting()} {user?.name?.split(" ")[0] ?? ""}
          </h1>
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            {todaySessions.length > 0
              ? `${todaySessions.length} session${todaySessions.length > 1 ? "s" : ""} planifiée${todaySessions.length > 1 ? "s" : ""} · ${minutesToDisplay(totalPlannedToday)} de travail prévu`
              : activeProjects.length > 0
              ? "Le planning est en cours de calcul…"
              : "Crée un projet pour générer ton planning personnalisé."}
          </p>
        </div>

        {/* Capsule de télémétrie */}
        <div className="flex flex-wrap items-center gap-space-sm bg-surface-container-lowest p-space-xs rounded-xl shadow-xs self-start lg:self-end">
          <div className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container-low text-on-surface">
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>verified</span>
            <span className="text-label-sm font-medium font-mono">
              {completedToday}/{todaySessions.length} sessions
            </span>
          </div>
          {totalPlannedToday > 0 && (
            <div className="flex items-center gap-1 px-space-sm py-1 rounded-lg bg-surface-container text-outline text-label-sm font-mono">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
              <span>{minutesToDisplay(totalPlannedToday)}</span>
            </div>
          )}
          {activeProjects.length > 0 && (
            <button
              onClick={() => recalculatePlanning()}
              className="px-space-sm py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors text-label-sm flex items-center gap-1"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
              <span className="hidden sm:inline font-mono">Recalculer</span>
            </button>
          )}
        </div>
      </section>

      {/* ── Zone principale : Session actuelle + Métriques ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Hero Card : MAINTENANT */}
        <div className="lg:col-span-8 relative overflow-hidden rounded-2xl bg-surface-container-lowest shadow-md p-space-lg flex flex-col justify-between min-h-[260px]">
          {/* Halo ambiant */}
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary-fixed/25 blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-56 h-56 rounded-full bg-surface-variant/30 blur-2xl pointer-events-none" />

          {currentSession ? (
            <>
              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md">
                  <div className="flex items-center gap-space-sm">
                    <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-md bg-primary-container/15 text-primary text-label-sm font-semibold tracking-wide font-mono">
                      <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
                      MAINTENANT
                    </span>
                    {currentProject && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container-low text-on-surface text-label-sm font-mono">
                        <span className="material-symbols-outlined text-secondary" style={{ fontSize: 12 }}>folder_open</span>
                        {currentProject.title}
                        {" · "}
                        {currentProject.phases.find(ph =>
                          ph.tasks.some(t => t.id === currentSession.taskId)
                        )?.title ?? ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-space-xs text-label-sm text-outline font-mono">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
                    <span>{currentSession.startTime} – {currentSession.endTime}</span>
                    <span>·</span>
                    <span>{minutesToDisplay(currentSession.durationMinutes)}</span>
                  </div>
                </div>

                <div className="my-space-md">
                  <h2 className="text-headline-lg font-semibold text-on-surface tracking-tight mb-space-xs max-w-xl">
                    {currentSession.title}
                  </h2>
                  {currentSession.description && (
                    <p className="text-body-md text-on-surface-variant max-w-lg line-clamp-2">
                      {currentSession.description}
                    </p>
                  )}
                </div>

                {/* Sous-tâches rapides */}
                {(() => {
                  const task = currentProject?.phases
                    .flatMap(ph => ph.tasks)
                    .find(t => t.id === currentSession.taskId);
                  if (!task?.subtasks?.length) return null;
                  const done = task.subtasks.filter(s => s.done).length;
                  return (
                    <div className="mb-space-md p-space-sm rounded-xl bg-surface-container-low/70 flex items-center gap-space-md">
                      <span className="text-label-sm text-outline font-mono">Sous-tâches</span>
                      <div className="flex gap-1 flex-1">
                        {task.subtasks.map((sub, i) => (
                          <span key={i} className={`h-1.5 flex-1 rounded-full ${sub.done ? "bg-primary-container" : "bg-surface-container"}`} />
                        ))}
                      </div>
                      <span className="text-label-md font-semibold text-primary font-mono">{done}/{task.subtasks.length}</span>
                    </div>
                  );
                })()}
              </div>

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-space-sm pt-space-sm">
                <div className="flex items-center gap-space-sm">
                  <button onClick={() => startFocus(currentSession)} className="btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>bolt</span>
                    <span>Commencer le Focus</span>
                  </button>
                  <button
                    onClick={() => {
                      const next = new Date();
                      next.setHours(next.getHours() + 1);
                      useAppStore.getState().deferSession(
                        currentSession.id,
                        next.toISOString().slice(0, 10),
                        `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`
                      );
                    }}
                    className="btn-secondary"
                  >
                    <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>update</span>
                    <span>Reporter +1h</span>
                  </button>
                </div>
                <button
                  onClick={() => setView("projet-detail", { selectedProjectId: currentSession.projectId })}
                  className="text-on-surface-variant hover:text-primary text-body-sm font-medium transition-colors flex items-center gap-1"
                >
                  <span>Voir le projet</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </button>
              </div>
            </>
          ) : (
            /* Pas de session — CTA créer projet */
            <div className="relative z-10 flex flex-col items-center justify-center text-center py-space-xl gap-space-md">
              <div className="w-16 h-16 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined" style={{ fontSize: 32 }}>auto_awesome</span>
              </div>
              <div>
                <h2 className="text-headline-md font-semibold text-on-surface mb-1">
                  {activeProjects.length > 0
                    ? "Aucune session pour cette heure"
                    : "Aucune session planifiée"}
                </h2>
                <p className="text-body-sm text-on-surface-variant max-w-sm">
                  {activeProjects.length > 0
                    ? "Toutes tes sessions du jour sont terminées, ou aucune n'est planifiée dans ce créneau."
                    : "Crée un projet et le moteur planifiera automatiquement tes sessions de travail."}
                </p>
              </div>
              {activeProjects.length === 0 ? (
                <button onClick={() => setView("nouveau-projet")} className="btn-primary">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                  <span>Nouveau projet</span>
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setView("calendrier")} className="btn-secondary">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>calendar_today</span>
                    <span>Voir le calendrier</span>
                  </button>
                  <button onClick={() => setView("nouveau-projet")} className="btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                    <span>Nouveau projet</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Métriques AUJOURD'HUI */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-space-md bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs">
          <div className="flex items-center justify-between pb-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>analytics</span>
              <h3 className="text-headline-sm font-semibold text-on-surface">AUJOURD'HUI</h3>
            </div>
            <span className="text-label-sm text-tertiary bg-surface-container px-2 py-0.5 rounded-full font-semibold font-mono">
              {totalPlannedToday > 0
                ? `${Math.round((completedToday / todaySessions.length) * 100)}% fait`
                : "Libre"}
            </span>
          </div>

          <div className="flex flex-col gap-space-md my-auto">
            {/* Travail prévu */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-label-md font-mono">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />Travail prévu
                </span>
                <span className="font-semibold text-on-surface">
                  {minutesToDisplay(totalPlannedToday)}{" "}
                  <span className="text-outline font-normal">/ {workPreferences.maxDailyWorkHours}h</span>
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-fill bg-primary-container"
                  style={{ width: `${Math.min(100, (totalPlannedToday / (workPreferences.maxDailyWorkHours * 60)) * 100)}%` }} />
              </div>
            </div>

            {/* Sessions */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-label-md font-mono">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary" />Sessions
                </span>
                <span className="font-semibold text-on-surface">
                  {completedToday} <span className="text-outline font-normal">/ {todaySessions.length}</span>
                </span>
              </div>
              <div className="flex gap-1.5 pt-1">
                {todaySessions.length > 0
                  ? Array.from({ length: Math.min(todaySessions.length, 6) }, (_, i) => (
                      <span key={i} className={`h-2 flex-1 rounded-full transition-all ${
                        i < completedToday ? "bg-primary-container"
                        : i === completedToday ? "bg-surface-container animate-pulse"
                        : "bg-surface-container"
                      }`} />
                    ))
                  : <span className="text-label-sm text-outline font-mono">Aucune session aujourd'hui</span>
                }
              </div>
            </div>

            {/* Repos */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-label-md font-mono">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim" />Repos
                </span>
                <span className="font-semibold text-tertiary">
                  {workPreferences.strictRestMode ? "Sanctuarisé" : "Flexible"}
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-fill bg-tertiary-container" style={{ width: "100%" }} />
              </div>
            </div>

            {/* Stats hebdo */}
            {stats.weeklyWorkMinutes.some(m => m > 0) && (
              <div className="flex flex-col gap-1">
                <span className="text-label-sm text-outline font-mono">7 derniers jours</span>
                <div className="flex items-end gap-0.5 h-8">
                  {stats.weeklyWorkMinutes.map((mins, i) => {
                    const maxMins = Math.max(...stats.weeklyWorkMinutes, 1);
                    const pct = (mins / maxMins) * 100;
                    const isToday = i === 6;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div
                          className={`w-full rounded-sm transition-all ${isToday ? "bg-primary-container" : "bg-surface-container"}`}
                          style={{ height: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Recommandation */}
          <div className="p-space-sm rounded-xl bg-surface-container-low flex items-start gap-space-xs">
            <span className="material-symbols-outlined text-secondary shrink-0" style={{ fontSize: 16, marginTop: 2 }}>psychology</span>
            <p className="text-body-sm leading-tight text-on-surface">
              {todaySessions.length === 0
                ? "Crée un projet pour générer un planning personnalisé."
                : completedToday === todaySessions.length
                ? "Toutes les sessions du jour sont complètes !"
                : currentSession
                ? `Prochaine session : ${currentSession.startTime}`
                : `${todaySessions.length - completedToday} session${todaySessions.length - completedToday > 1 ? "s" : ""} restante${todaySessions.length - completedToday > 1 ? "s" : ""}.`}
            </p>
          </div>
        </div>
      </div>

      {/* ── ENSUITE : Séquence du jour ── */}
      {nextSessions.length > 0 && (
        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="text-label-sm uppercase tracking-widest text-outline font-semibold font-mono">SÉQUENCE DU JOUR</span>
              <h3 className="text-headline-md font-semibold text-on-surface">ENSUITE</h3>
            </div>
            <button onClick={() => setView("planification")} className="text-body-sm text-primary hover:text-on-primary-fixed-variant font-medium flex items-center gap-1 transition-colors">
              <span>Voir la planification</span>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            {nextSessions.map(session => {
              const project = projects.find(p => p.id === session.projectId);
              return (
                <div key={session.id} className="group rounded-xl p-space-md shadow-xs bg-surface-container-lowest hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-space-sm">
                      <span className="text-label-md font-semibold font-mono px-2 py-0.5 rounded-md text-primary bg-primary-fixed/40">
                        {session.startTime} – {session.endTime}
                      </span>
                      <span className="text-label-sm text-outline font-mono">{minutesToDisplay(session.durationMinutes)}</span>
                    </div>
                    <h4 className="text-headline-sm font-semibold text-on-surface mb-1 group-hover:text-primary transition-colors line-clamp-2">
                      {session.title}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between pt-space-xs">
                    {project && (
                      <span className="inline-flex items-center gap-1 text-label-sm text-secondary bg-surface-container-low px-2 py-0.5 rounded font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        {project.title}
                      </span>
                    )}
                    <button
                      onClick={() => startFocus(session)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity btn-primary py-1 text-label-sm"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>bolt</span>
                      Focus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Projets actifs ── */}
      {activeProjects.length > 0 && (
        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="text-label-sm uppercase tracking-widest text-outline font-semibold font-mono">PORTFOLIO</span>
              <h3 className="text-headline-md font-semibold text-on-surface">MES PROJETS ACTIFS</h3>
            </div>
            <button onClick={() => setView("projets")} className="text-body-sm text-primary hover:underline font-medium flex items-center gap-1">
              <span>Voir tous</span>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
            {activeProjects.slice(0, 3).map(project => {
              const allTasks = project.phases.flatMap(ph => ph.tasks);
              const nextTask = allTasks.find(t => t.status === "todo" || t.status === "in_progress");
              const daysUntilDeadline = project.targetDate
                ? Math.ceil((new Date(project.targetDate + "T12:00:00").getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                : null;
              return (
                <button
                  key={project.id}
                  onClick={() => setView("projet-detail", { selectedProjectId: project.id })}
                  className="bg-surface-container-lowest rounded-2xl p-space-md flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
                >
                  <div>
                    <div className="flex items-start justify-between mb-space-sm">
                      <div>
                        <span className="text-label-sm text-primary font-semibold uppercase tracking-wider font-mono">{project.type}</span>
                        <h4 className="text-headline-sm font-semibold text-on-surface">{project.title}</h4>
                      </div>
                      <span className={`text-label-sm px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                        project.progressPercent >= 80 ? "bg-tertiary-fixed-dim/30 text-tertiary" : "bg-surface-container text-secondary"
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {project.progressPercent}%
                      </span>
                    </div>
                    <div className="my-space-md">
                      <div className="progress-track">
                        <div className="progress-fill bg-primary-container" style={{ width: `${project.progressPercent}%` }} />
                      </div>
                    </div>
                    {nextTask && (
                      <div className="p-space-sm rounded-xl bg-surface-container-low">
                        <span className="text-label-sm text-outline block mb-0.5 font-mono">Prochaine tâche</span>
                        <p className="text-body-sm font-semibold text-on-surface line-clamp-1">{nextTask.title}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-space-sm text-label-sm text-outline font-mono mt-space-sm border-t border-outline-variant/20">
                    {daysUntilDeadline != null && (
                      <span className={`flex items-center gap-1 ${daysUntilDeadline <= 3 ? "text-error" : "text-on-surface-variant"}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>event</span>
                        J-{daysUntilDeadline}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>account_tree</span>
                      {allTasks.filter(t => t.status === "done").length}/{allTasks.length} tâches
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── CTA si aucun projet ── */}
      {activeProjects.length === 0 && (
        <section className="flex flex-col items-center justify-center py-space-xl gap-space-md text-center bg-surface-container-lowest rounded-2xl shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
            <span className="material-symbols-outlined" style={{ fontSize: 32 }}>add_circle</span>
          </div>
          <div>
            <h3 className="text-headline-md font-semibold text-on-surface mb-1">Aucun projet actif</h3>
            <p className="text-body-sm text-on-surface-variant max-w-md">
              Décris ton projet en langage naturel. L'IA le structure, génère les tâches et planifie les sessions selon tes disponibilités.
            </p>
          </div>
          <button onClick={() => setView("nouveau-projet")} className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
            <span>Créer mon premier projet</span>
          </button>
        </section>
      )}
    </div>
  );
}
