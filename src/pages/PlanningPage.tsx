import React from "react";
import { useAppStore } from "../stores/useAppStore";
import { schedulingEngine } from "../lib/schedulingEngine";

export default function PlanningPage() {
  const { projects, workPreferences, sessions, blockedPeriods, recalculatePlanning, setView } = useAppStore();

  const activeProjects = projects.filter(p => p.status === "active");
  const upcomingSessions = sessions.filter(s => s.status === "scheduled" && s.date >= new Date().toISOString().slice(0, 10)).slice(0, 20);

  const weeklyAvailHours = schedulingEngine.getWeeklyAvailableHours(workPreferences, blockedPeriods);
  const totalWorkMinutes = upcomingSessions.slice(0, 7).reduce((a, s) => a + s.durationMinutes, 0);
  const totalRestMinutes = workPreferences.availability
    .filter(d => d.enabled)
    .flatMap(d => d.slots.filter(s => s.type === "break"))
    .reduce((a, s) => {
      const [sh, sm] = s.start.split(":").map(Number);
      const [eh, em] = s.end.split(":").map(Number);
      return a + ((eh * 60 + em) - (sh * 60 + sm));
    }, 0);
  const weeklyBreakHours = Math.round(totalRestMinutes * workPreferences.availability.filter(d => d.enabled).length / 60);

  return (
    <div className="flex flex-col gap-space-lg">
      {/* ── Header ── */}
      <section className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg shadow-xs">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-secondary-container/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="flex items-start gap-space-md max-w-3xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-on-primary shadow-md shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>neurology</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-space-sm flex-wrap">
                <span className="text-label-sm uppercase tracking-wider text-secondary px-2 py-0.5 rounded-full bg-secondary-fixed/50 font-semibold font-mono">
                  Moteur Adaptatif v4.2
                </span>
                <span className="text-label-sm text-outline flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> Modèle calibration actif
                </span>
              </div>
              <h1 className="text-headline-lg font-bold text-on-surface">
                Planning de la semaine optimisé selon tes {activeProjects.length} projet{activeProjects.length > 1 ? "s" : ""} actif{activeProjects.length > 1 ? "s" : ""}.
              </h1>
              <p className="text-body-md text-on-surface-variant">
                Les fenêtres de travail sont équilibrées. Les pauses sont sanctuarisées selon tes préférences.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-xs shrink-0">
            <div className="flex flex-col">
              <span className="text-label-md font-semibold text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 16 }}>verified_user</span>
                Repos strictement protégé
              </span>
              <span className="text-label-sm text-outline font-mono">Zéro compression du repos</span>
            </div>
            <div className={`w-12 h-6 rounded-full p-0.5 ${workPreferences.strictRestMode ? "bg-primary-container" : "bg-surface-container-high"}`}>
              <span className={`block w-5 h-5 rounded-full bg-on-primary shadow-xs transform transition-transform ${workPreferences.strictRestMode ? "translate-x-6" : "translate-x-0"}`} />
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 métriques ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="flex flex-col justify-between p-space-md bg-surface-container-lowest rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-label-md font-medium font-mono">Charge prévue</span>
            <span className="p-1.5 rounded-lg bg-surface-container text-primary">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>timer</span>
            </span>
          </div>
          <div className="my-space-sm">
            <div className="flex items-baseline gap-1">
              <span className="text-display-lg font-bold text-on-surface">{Math.round(totalWorkMinutes / 60)}h</span>
              <span className="text-body-sm text-outline">/ {weeklyAvailHours}h dispo</span>
            </div>
            <div className="progress-track mt-space-xs">
              <div className="progress-fill bg-primary" style={{ width: `${Math.min(100, (totalWorkMinutes / 60 / Math.max(1, weeklyAvailHours)) * 100)}%` }} />
            </div>
          </div>
          <span className="text-label-sm text-tertiary font-semibold flex items-center gap-0.5 font-mono">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>trending_up</span>
            {Math.round((totalWorkMinutes / 60 / Math.max(1, weeklyAvailHours)) * 100)}% de charge
          </span>
        </div>

        <div className="flex flex-col justify-between p-space-md bg-surface-container-lowest rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-label-md font-medium font-mono">Repos garanti</span>
            <span className="p-1.5 rounded-lg bg-surface-container text-tertiary">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>spa</span>
            </span>
          </div>
          <div className="my-space-sm">
            <div className="flex items-baseline gap-1">
              <span className="text-display-lg font-bold text-tertiary">{weeklyBreakHours}h</span>
              <span className="text-body-sm text-tertiary font-semibold">sanctuaire</span>
            </div>
            <div className="progress-track mt-space-xs">
              <div className="progress-fill bg-tertiary" style={{ width: "100%" }} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-label-sm text-on-surface-variant font-mono">Préservé d'office</span>
            <span className="text-label-sm px-1.5 py-0.5 rounded bg-surface-container text-tertiary font-medium font-mono">Sans culpabilité</span>
          </div>
        </div>

        <div className="flex flex-col justify-between p-space-md bg-surface-container-lowest rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-label-md font-medium font-mono">Buffer libre</span>
            <span className="p-1.5 rounded-lg bg-surface-container text-secondary">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>hourglass_empty</span>
            </span>
          </div>
          <div className="my-space-sm">
            <div className="flex items-baseline gap-1">
              <span className="text-display-lg font-bold text-on-surface">
                {Math.max(0, weeklyAvailHours - Math.round(totalWorkMinutes / 60))}h
              </span>
              <span className="text-body-sm text-outline">flexibilité</span>
            </div>
          </div>
          <span className="text-label-sm text-secondary font-medium font-mono">Auto-absorbant</span>
        </div>

        <div className="flex flex-col justify-between p-space-md bg-surface-container-lowest rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-label-md font-medium font-mono">Sessions ciblées</span>
            <span className="p-1.5 rounded-lg bg-surface-container text-on-surface">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>grid_view</span>
            </span>
          </div>
          <div className="my-space-sm">
            <div className="flex items-baseline gap-1">
              <span className="text-display-lg font-bold text-on-surface">{upcomingSessions.slice(0, 7).length}</span>
              <span className="text-body-sm text-outline">blocs prévus</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-label-sm text-outline font-mono">Moy. {workPreferences.preferredSessionDuration}m/session</span>
            <span className="text-label-sm text-primary font-medium font-mono">0 surcharge</span>
          </div>
        </div>
      </section>

      {/* ── Prochaines sessions ── */}
      <section className="flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-md font-semibold text-on-surface">Prochaines sessions planifiées</h2>
          <button
            onClick={recalculatePlanning}
            className="btn-secondary text-body-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            <span>Recalculer</span>
          </button>
        </div>

        {upcomingSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-space-xl bg-surface-container-lowest rounded-2xl gap-space-md">
            <span className="material-symbols-outlined text-outline" style={{ fontSize: 48 }}>calendar_today</span>
            <p className="text-body-md text-on-surface-variant">Aucune session planifiée.</p>
            {activeProjects.length === 0 ? (
              <button onClick={() => setView("nouveau-projet")} className="btn-primary">
                Créer un projet
              </button>
            ) : (
              <button onClick={recalculatePlanning} className="btn-primary">
                Générer le planning
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {upcomingSessions.map(session => {
              const project = projects.find(p => p.id === session.projectId);
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-space-md bg-surface-container-lowest rounded-xl shadow-xs hover:shadow-md transition-all"
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-label-sm text-primary font-semibold font-mono">
                        {new Date(session.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                      <span className="text-label-sm text-outline font-mono">{session.startTime} – {session.endTime}</span>
                      <span className="text-label-sm bg-surface-container px-2 py-0.5 rounded text-on-surface-variant font-mono">
                        {session.durationMinutes >= 60 ? `${Math.floor(session.durationMinutes / 60)}h${session.durationMinutes % 60 > 0 ? session.durationMinutes % 60 + "m" : ""}` : `${session.durationMinutes}m`}
                      </span>
                    </div>
                    <span className="text-body-sm font-semibold text-on-surface truncate">{session.title}</span>
                    {project && (
                      <span className="text-label-sm text-secondary font-mono">{project.title}</span>
                    )}
                  </div>
                  <button
                    onClick={() => useAppStore.setState(s => ({
                      ui: { ...s.ui, currentView: "session-focus", activeSessionId: session.id }
                    }))}
                    className="btn-primary py-1.5 shrink-0"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bolt</span>
                    <span>Focus</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
