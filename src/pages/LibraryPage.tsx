import React, { useState } from "react";
import { useAppStore } from "../stores/useAppStore";

type LibSection = "projets" | "conversations" | "historique" | "statistiques";

function minutesToHM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`) : `${m}m`;
}

export default function LibraryPage() {
  const { projects, sessions, stats, setView } = useAppStore();
  const [section, setSection] = useState<LibSection>("statistiques");
  const [search, setSearch] = useState("");

  const completedProjects = projects.filter(p => p.status === "completed");
  const allProjectsWithConversations = projects.filter(p => p.conversationHistory.length > 0);
  const completedSessions = sessions.filter(s => s.status === "completed");

  const filterText = (text: string) => text.toLowerCase().includes(search.toLowerCase());

  // Calcul des statistiques avancées
  const totalHours = Math.round(stats.totalWorkMinutes / 60);
  const avgSessionMins = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((a, s) => a + (s.actualDurationMinutes ?? s.durationMinutes), 0) / completedSessions.length)
    : 0;
  const overrunSessions = completedSessions.filter(s => s.actualDurationMinutes != null && s.actualDurationMinutes > s.durationMinutes).length;
  const underrunSessions = completedSessions.filter(s => s.actualDurationMinutes != null && s.actualDurationMinutes < s.durationMinutes * 0.8).length;

  const maxBar = Math.max(...stats.weeklyWorkMinutes, 1);

  // Projets par temps travaillé
  const projectTimeMap: Record<string, number> = {};
  completedSessions.forEach(s => {
    projectTimeMap[s.projectId] = (projectTimeMap[s.projectId] ?? 0) + (s.actualDurationMinutes ?? s.durationMinutes);
  });

  return (
    <div className="flex flex-col gap-space-lg">
      {/* ── Header ── */}
      <div>
        <h1 className="text-headline-lg font-semibold text-on-surface">Bibliothèque</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Historique complet : projets, conversations, sessions et statistiques.
        </p>
      </div>

      {/* ── Recherche ── */}
      <div className="flex items-center gap-space-sm px-space-md py-2.5 rounded-xl bg-surface-container-lowest shadow-xs">
        <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>search</span>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher dans la bibliothèque..."
          className="flex-1 bg-transparent text-on-surface text-body-md outline-none placeholder:text-outline"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-outline hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 p-1 bg-surface-container rounded-xl w-fit overflow-x-auto">
        {([
          { id: "statistiques", label: "Statistiques", icon: "analytics" },
          { id: "projets", label: "Projets", icon: "folder", count: projects.length },
          { id: "conversations", label: "Conversations IA", icon: "chat_spark", count: allProjectsWithConversations.length },
          { id: "historique", label: "Sessions", icon: "history", count: completedSessions.length },
        ] as { id: LibSection; label: string; icon: string; count?: number }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className={`px-space-md py-1.5 rounded-lg text-body-sm transition-all flex items-center gap-1.5 whitespace-nowrap ${
              section === tab.id ? "bg-surface-container-lowest text-primary font-semibold shadow-xs" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tab.icon}</span>
            {tab.label}
            {tab.count != null && (
              <span className="text-label-sm text-outline font-mono">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── STATISTIQUES ── */}
      {section === "statistiques" && (
        <div className="flex flex-col gap-space-lg">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
            {[
              { label: "Heures de travail", value: `${totalHours}h`, icon: "timer", color: "text-primary" },
              { label: "Sessions terminées", value: stats.sessionsCompleted, icon: "check_circle", color: "text-tertiary" },
              { label: "Tâches accomplies", value: stats.tasksCompleted, icon: "task_alt", color: "text-secondary" },
              { label: "Projets terminés", value: stats.projectsCompleted, icon: "done_all", color: "text-primary" },
            ].map(kpi => (
              <div key={kpi.label} className="bg-surface-container-lowest rounded-2xl p-space-md shadow-xs flex flex-col gap-2">
                <span className={`material-symbols-outlined ${kpi.color}`} style={{ fontSize: 22 }}>{kpi.icon}</span>
                <span className="text-headline-lg font-bold text-on-surface">{kpi.value}</span>
                <span className="text-label-sm text-outline font-mono">{kpi.label}</span>
              </div>
            ))}
          </div>

          {/* Activité hebdomadaire */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs">
            <h3 className="text-headline-sm font-semibold text-on-surface mb-space-md">Activité des 7 derniers jours</h3>
            {stats.weeklyWorkMinutes.every(m => m === 0) ? (
              <p className="text-body-sm text-outline">Aucune session enregistrée cette semaine.</p>
            ) : (
              <div className="flex items-end gap-2 h-24">
                {stats.weeklyWorkMinutes.map((mins, i) => {
                  const pct = (mins / maxBar) * 100;
                  const dayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
                  const isToday = i === 6;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
                        <div
                          className={`w-full rounded-t-lg transition-all ${isToday ? "bg-primary-container" : "bg-surface-container-high"}`}
                          style={{ height: `${Math.max(4, pct)}%` }}
                          title={minutesToHM(mins)}
                        />
                      </div>
                      <span className="text-label-sm text-outline font-mono">{dayLabels[i]}</span>
                      {mins > 0 && (
                        <span className="text-label-sm text-primary font-mono font-semibold">{minutesToHM(mins)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Précision des estimations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs flex flex-col gap-space-md">
              <h3 className="text-headline-sm font-semibold text-on-surface">Précision des estimations</h3>
              <div className="flex items-center gap-space-md">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle className="text-surface-container" cx="40" cy="40" fill="transparent" r="32" stroke="currentColor" strokeWidth="6" />
                    <circle className="text-primary-container" cx="40" cy="40" fill="transparent" r="32" stroke="currentColor"
                      strokeDasharray={`${Math.round(Math.min(100, (1 / Math.max(0.5, stats.estimationFactor)) * 100))} 100`}
                      strokeLinecap="round" strokeWidth="6" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-label-md font-bold text-on-surface font-mono">
                    {stats.estimationFactor > 0 ? `${stats.estimationFactor.toFixed(1)}x` : "–"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-headline-sm font-semibold text-on-surface">
                    Facteur d'estimation : {stats.estimationFactor > 0 ? stats.estimationFactor.toFixed(2) : "–"}
                  </span>
                  <p className="text-body-sm text-on-surface-variant">
                    {stats.estimationFactor === 1 || stats.sessionsCompleted < 3
                      ? "Pas encore assez de données pour calibrer."
                      : stats.estimationFactor > 1.15
                      ? `Tes sessions prennent en moyenne ${Math.round((stats.estimationFactor - 1) * 100)}% plus de temps qu'estimé. Le moteur ajuste ses calculs.`
                      : stats.estimationFactor < 0.85
                      ? "Tu termines tes sessions plus vite qu'estimé. Tes estimations sont peut-être conservatives."
                      : "Tes estimations sont précises."}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-label-sm text-outline font-mono">Dépassements</span>
                  <span className="text-headline-md font-semibold text-error">{overrunSessions}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm text-outline font-mono">Sous-estimations</span>
                  <span className="text-headline-md font-semibold text-tertiary">{underrunSessions}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm text-outline font-mono">Durée moyenne</span>
                  <span className="text-headline-md font-semibold text-on-surface font-mono">{avgSessionMins}m</span>
                </div>
              </div>
            </div>

            {/* Temps par projet */}
            <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs flex flex-col gap-space-md">
              <h3 className="text-headline-sm font-semibold text-on-surface">Temps par projet</h3>
              {Object.keys(projectTimeMap).length === 0 ? (
                <p className="text-body-sm text-outline">Aucune session terminée.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {Object.entries(projectTimeMap)
                    .sort((a, b) => b[1] - a[1])
                    .map(([projId, mins]) => {
                      const proj = projects.find(p => p.id === projId);
                      if (!proj) return null;
                      const totalMins = Object.values(projectTimeMap).reduce((a, b) => a + b, 1);
                      return (
                        <div key={projId}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-body-sm text-on-surface font-medium">{proj.title}</span>
                            <span className="text-label-sm text-outline font-mono">{minutesToHM(mins)}</span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill bg-primary-container" style={{ width: `${(mins / totalMins) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PROJETS ── */}
      {section === "projets" && (
        <div className="flex flex-col gap-space-md">
          {[
            { title: "Projets actifs", items: projects.filter(p => p.status === "active" && filterText(p.title)) },
            { title: "Projets terminés", items: projects.filter(p => p.status === "completed" && filterText(p.title)) },
            { title: "Projets archivés", items: projects.filter(p => p.status === "archived" && filterText(p.title)) },
          ].map(group => group.items.length > 0 && (
            <div key={group.title}>
              <h3 className="text-label-md font-semibold text-on-surface-variant mb-2 font-mono uppercase tracking-wider">{group.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.items.map(project => (
                  <button
                    key={project.id}
                    onClick={() => setView("projet-detail", { selectedProjectId: project.id })}
                    className="flex items-center justify-between p-space-md bg-surface-container-lowest rounded-xl shadow-xs hover:shadow-md transition-all text-left"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-label-sm text-primary font-semibold font-mono">{project.type}</span>
                      <span className="text-body-sm font-semibold text-on-surface truncate">{project.title}</span>
                      <span className="text-label-sm text-outline font-mono">
                        {project.phases.flatMap(ph => ph.tasks).filter(t => t.status === "done").length} / {project.phases.flatMap(ph => ph.tasks).length} tâches
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-headline-sm font-semibold text-primary">{project.progressPercent}%</span>
                      <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>chevron_right</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {projects.filter(p => filterText(p.title)).length === 0 && (
            <p className="text-body-sm text-outline text-center py-space-xl">Aucun projet trouvé.</p>
          )}
        </div>
      )}

      {/* ── CONVERSATIONS ── */}
      {section === "conversations" && (
        <div className="flex flex-col gap-space-md">
          {allProjectsWithConversations.filter(p => filterText(p.title)).length === 0 ? (
            <p className="text-body-sm text-outline text-center py-space-xl">Aucune conversation enregistrée.</p>
          ) : (
            allProjectsWithConversations.filter(p => filterText(p.title)).map(project => (
              <div key={project.id} className="bg-surface-container-lowest rounded-2xl shadow-xs overflow-hidden">
                <div className="flex items-center justify-between p-space-md bg-surface-container-low">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
                    </div>
                    <span className="text-headline-sm font-semibold text-on-surface">{project.title}</span>
                  </div>
                  <span className="text-label-sm text-outline font-mono">{project.conversationHistory.length} messages</span>
                </div>
                <div className="p-space-md flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {project.conversationHistory.map(msg => (
                    <div key={msg.id} className={`text-body-sm p-2.5 rounded-xl ${
                      msg.role === "user" ? "bg-surface-container-high text-on-surface ml-8" : "bg-surface-container text-on-surface mr-8"
                    }`}>
                      <span className="text-label-sm text-outline font-mono block mb-0.5">
                        {msg.role === "user" ? "Vous" : "Nexa IA"}
                        {" · "}
                        {new Date(msg.timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {msg.content}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── HISTORIQUE SESSIONS ── */}
      {section === "historique" && (
        <div className="flex flex-col gap-2">
          {completedSessions.filter(s => filterText(s.title)).length === 0 ? (
            <p className="text-body-sm text-outline text-center py-space-xl">Aucune session terminée.</p>
          ) : (
            completedSessions
              .filter(s => filterText(s.title))
              .reverse()
              .slice(0, 50)
              .map(session => {
                const project = projects.find(p => p.id === session.projectId);
                const overrun = session.actualDurationMinutes != null && session.actualDurationMinutes > session.durationMinutes;
                const underrun = session.actualDurationMinutes != null && session.actualDurationMinutes < session.durationMinutes * 0.8;
                return (
                  <div key={session.id} className="flex items-center justify-between p-space-md bg-surface-container-lowest rounded-xl shadow-xs hover:shadow-md transition-all">
                    <div className="flex flex-col min-w-0">
                      <span className="text-body-sm font-semibold text-on-surface truncate">{session.title}</span>
                      <span className="text-label-sm text-outline font-mono">
                        {new Date(session.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                        {" · "}{session.startTime} – {session.endTime}
                        {project && ` · ${project.title}`}
                      </span>
                      {session.completionNotes && (
                        <span className="text-label-sm text-on-surface-variant mt-0.5 italic">{session.completionNotes}</span>
                      )}
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-3">
                      <span className="text-label-sm text-tertiary font-semibold font-mono flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                        Terminé
                      </span>
                      {session.actualDurationMinutes != null && (
                        <span className={`text-label-sm font-mono ${overrun ? "text-error" : underrun ? "text-secondary" : "text-outline"}`}>
                          {minutesToHM(session.actualDurationMinutes)} réelles
                          {overrun && ` (+${minutesToHM(session.actualDurationMinutes - session.durationMinutes)})`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}
