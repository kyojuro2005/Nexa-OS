import React, { useState } from "react";
import { useAppStore } from "../stores/useAppStore";
import type { ProjectStatus } from "../types";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Actif",
  paused: "En pause",
  completed: "Terminé",
  archived: "Archivé",
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "bg-tertiary-fixed-dim/30 text-tertiary",
  paused: "bg-surface-container text-outline",
  completed: "bg-primary-fixed text-primary",
  archived: "bg-surface-container text-on-surface-variant",
};

function minutesToHours(mins: number): string {
  return `${Math.round(mins / 60)}h`;
}

export default function ProjectsPage() {
  const { projects, setView, deleteProject } = useAppStore();
  const [filter, setFilter] = useState<"all" | ProjectStatus>("all");

  const filtered = filter === "all" ? projects : projects.filter(p => p.status === filter);

  return (
    <div className="flex flex-col gap-space-lg">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs mb-1">
            <span className="text-label-sm uppercase tracking-widest text-outline font-semibold font-mono">
              PORTFOLIO
            </span>
          </div>
          <h1 className="text-headline-lg font-semibold text-on-surface">Mes projets</h1>
        </div>
        <button onClick={() => setView("nouveau-projet")} className="btn-primary self-start sm:self-end">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          <span>Nouveau projet</span>
        </button>
      </div>

      {/* ── Filtres ── */}
      <div className="flex items-center gap-2 p-1 bg-surface-container rounded-xl w-fit">
        {(["all", "active", "paused", "completed", "archived"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-space-md py-1.5 rounded-lg text-body-sm transition-all ${
              filter === f
                ? "bg-surface-container-lowest text-primary font-semibold shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {f === "all" ? "Tous" : STATUS_LABELS[f]}
            <span className="ml-1.5 text-label-sm text-outline font-mono">
              ({f === "all" ? projects.length : projects.filter(p => p.status === f).length})
            </span>
          </button>
        ))}
      </div>

      {/* ── Grille de projets ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-space-xl gap-space-md bg-surface-container-lowest rounded-2xl">
          <span className="material-symbols-outlined text-outline" style={{ fontSize: 48 }}>inbox</span>
          <p className="text-body-md text-on-surface-variant">Aucun projet {filter !== "all" ? STATUS_LABELS[filter as ProjectStatus].toLowerCase() : ""}</p>
          <button onClick={() => setView("nouveau-projet")} className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            <span>Créer un projet</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg">
          {filtered.map(project => {
            const allTasks = project.phases.flatMap(ph => ph.tasks);
            const doneTasks = allTasks.filter(t => t.status === "done").length;
            const nextTask = allTasks.find(t => t.status === "todo" || t.status === "in_progress");

            return (
              <div
                key={project.id}
                className="bg-surface-container-lowest rounded-2xl p-space-md flex flex-col justify-between shadow-xs hover:shadow-md transition-all cursor-pointer"
                onClick={() => setView("projet-detail", { selectedProjectId: project.id })}
              >
                <div>
                  <div className="flex items-start justify-between mb-space-sm">
                    <div>
                      <span className="text-label-sm text-primary font-semibold uppercase tracking-wider font-mono">
                        {project.type}
                      </span>
                      <h3 className="text-headline-sm font-semibold text-on-surface mt-0.5">{project.title}</h3>
                    </div>
                    <span className={`text-label-sm px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${STATUS_COLORS[project.status]}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {STATUS_LABELS[project.status]}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-body-sm text-on-surface-variant line-clamp-2 mb-space-sm">
                      {project.description}
                    </p>
                  )}

                  <div className="my-space-md">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-body-sm text-outline">Avancement</span>
                      <span className="text-headline-sm font-semibold text-primary">{project.progressPercent}%</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill bg-primary-container"
                        style={{ width: `${project.progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-label-sm text-outline font-mono">{doneTasks} / {allTasks.length} tâches</span>
                      {project.totalEstimatedMinutes > 0 && (
                        <span className="text-label-sm text-outline font-mono">
                          {minutesToHours(project.totalActualMinutes)} / {minutesToHours(project.totalEstimatedMinutes)}
                        </span>
                      )}
                    </div>
                  </div>

                  {nextTask && (
                    <div className="p-space-sm rounded-xl bg-surface-container-low mb-space-sm">
                      <span className="text-label-sm text-outline block mb-0.5 font-mono">Prochaine tâche</span>
                      <p className="text-body-sm font-semibold text-on-surface line-clamp-1">{nextTask.title}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-space-xs text-label-sm text-outline font-mono border-t border-outline-variant/20 mt-space-sm">
                  <div className="flex items-center gap-3">
                    {project.targetDate && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>event</span>
                        {new Date(project.targetDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>account_tree</span>
                      {project.phases.length} phases
                    </span>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm(`Supprimer "${project.title}" ?`)) deleteProject(project.id);
                    }}
                    className="p-1 rounded hover:bg-error-container hover:text-on-error-container transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
