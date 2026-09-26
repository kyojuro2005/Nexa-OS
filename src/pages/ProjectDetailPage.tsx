import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "../stores/useAppStore";
import { aiService } from "../lib/aiService";
import type { Task, TaskStatus, ChatMessage } from "../types";

type TabId = "apercu" | "roadmap" | "taches" | "planning" | "chat";

const STATUS_ICONS: Record<TaskStatus, string> = {
  todo: "radio_button_unchecked",
  in_progress: "hourglass_top",
  done: "check_circle",
  blocked: "block",
  deferred: "schedule",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "text-outline",
  in_progress: "text-primary",
  done: "text-tertiary",
  blocked: "text-error",
  deferred: "text-secondary",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-error-container text-on-error-container",
  high: "bg-secondary-fixed text-on-secondary-fixed",
  medium: "bg-surface-container text-on-surface-variant",
  low: "bg-surface-container text-outline",
};

export default function ProjectDetailPage() {
  const { ui, projects, setView, updateTask, completeTask, addTask, sessions, aiProviders, activeProviderId, addMessage } = useAppStore();
  const project = projects.find(p => p.id === ui.selectedProjectId);
  const [tab, setTab] = useState<TabId>("taches");
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  // Chat IA
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll vers le bas du chat quand un nouveau message arrive
  useEffect(() => {
    if (tab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [project?.conversationHistory?.length, tab]);

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading || !activeProviderId || !project) return;
    const userText = chatInput.trim();
    setChatInput("");
    setChatError("");
    setChatLoading(true);

    // Ajouter le message utilisateur immédiatement
    addMessage(project.id, { role: "user", content: userText });

    try {
      const activeProvider = aiProviders.find(p => p.id === activeProviderId);
      if (!activeProvider) throw new Error("Aucun provider configuré.");

      // Construire le contexte projet approfondi (avancement, écarts de temps, risques)
      const allTasks = project.phases.flatMap(ph => ph.tasks);
      const doneTasks = allTasks.filter(t => t.status === "done").length;
      const delayedTasks = allTasks.filter(t => (t.actualMinutes || 0) > t.estimatedMinutes);
      const totalEstimated = Math.round(allTasks.reduce((a, t) => a + t.estimatedMinutes, 0) / 60);
      const totalActual = Math.round(allTasks.reduce((a, t) => a + (t.actualMinutes || 0), 0) / 60);

      const context = [
        `Projet : ${project.title} (${project.type})`,
        `Description : ${project.description}`,
        `Progression : ${project.progressPercent}% (${doneTasks}/${allTasks.length} tâches terminées)`,
        `Temps passé vs estimé : ${totalActual}h réelles passées pour ${totalEstimated}h estimées initialement`,
        delayedTasks.length > 0
          ? `⚠️ Tâches ayant pris plus de temps que prévu : ${delayedTasks.map(t => `"${t.title}" (${t.actualMinutes}m réelles vs ${t.estimatedMinutes}m prévues)`).join("; ")}`
          : "Toutes les tâches terminées respectent ou améliorent les estimations.",
        `Phases : ${project.phases.map(ph => `${ph.title} (${ph.tasks.filter(t => t.status === "done").length}/${ph.tasks.length} tâches faites)`).join(", ")}`,
        project.targetDate ? `Échéance visée : ${new Date(project.targetDate + "T12:00:00").toLocaleDateString("fr-FR")}` : "",
        `Technologies : ${project.aiAnalysis?.technologies?.join(", ") ?? "Non spécifiées"}`,
        project.aiAnalysis?.missingInfo?.length
          ? `Informations manquantes signalées au départ : ${project.aiAnalysis.missingInfo.join("; ")}`
          : "",
        project.aiAnalysis?.risks?.length
          ? `Risques identifiés : ${project.aiAnalysis.risks.map(r => `[${r.severity}] ${r.title}`).join("; ")}`
          : "",
      ].filter(Boolean).join("\n");

      // Historique pour le contexte (rôles user/assistant seulement)
      const history = (project.conversationHistory ?? [])
        .filter(m => m.role === "user" || m.role === "assistant")
        .slice(-8)
        .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

      const reply = await aiService.chat(history, userText, context, {
        providerId: activeProvider.id,
        apiKey: activeProvider.apiKey,
      });

      addMessage(project.id, { role: "assistant", content: reply });
    } catch (err: any) {
      setChatError(err?.message ?? "Erreur lors de la communication avec l'IA.");
    } finally {
      setChatLoading(false);
    }
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-space-xl gap-space-md">
        <p className="text-body-md text-on-surface-variant">Projet introuvable.</p>
        <button onClick={() => setView("projets")} className="btn-primary">Retour aux projets</button>
      </div>
    );
  }

  const allTasks = project.phases.flatMap(ph => ph.tasks);
  const doneTasks = allTasks.filter(t => t.status === "done").length;
  const totalHoursEstimated = Math.round(allTasks.reduce((a, t) => a + t.estimatedMinutes, 0) / 60);
  const totalHoursActual = Math.round(allTasks.reduce((a, t) => a + t.actualMinutes, 0) / 60);
  const projectSessions = sessions.filter(s => s.projectId === project.id);
  const upcomingSessions = projectSessions.filter(s => s.status === "scheduled").slice(0, 3);

  const togglePhase = (phId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phId)) next.delete(phId);
      else next.add(phId);
      return next;
    });
  };

  const handleCompleteTask = (task: Task) => {
    if (task.status === "done") return;
    const mins = parseInt(prompt(`Temps réel passé (minutes, estimé: ${task.estimatedMinutes})`) ?? "", 10);
    const actual = isNaN(mins) ? task.estimatedMinutes : mins;
    completeTask(project.id, task.id, actual);
  };

  return (
    <div className="flex flex-col gap-space-lg">
      {/* ── Back + Project Header ── */}
      <button
        onClick={() => setView("projets")}
        className="flex items-center gap-1 text-body-sm text-outline hover:text-on-surface transition-colors w-fit"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
        <span>Projets</span>
      </button>

      {/* Hero card */}
      <div className="relative bg-surface-container-lowest rounded-xl shadow-xs p-space-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-lg">
          <div className="flex flex-col gap-space-xs max-w-3xl">
            <div className="flex flex-wrap items-center gap-space-sm mb-1">
              <span className="text-label-sm uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-semibold font-mono">
                {project.type}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-body-sm font-medium ${
                project.status === "active" ? "bg-tertiary-fixed-dim/30 text-tertiary" : "bg-surface-container text-outline"
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {project.status === "active" ? "En cours" : project.status}
              </span>
            </div>
            <h1 className="text-headline-lg text-on-surface tracking-tight">{project.title}</h1>
            <p className="text-body-md text-on-surface-variant mt-1 leading-relaxed">{project.description}</p>
          </div>
          <div className="flex items-center gap-space-sm self-start lg:self-center">
            <button
              onClick={() => setView("nouveau-projet")}
              className="btn-secondary"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>psychology</span>
              <span>Continuer le chat IA</span>
            </button>
          </div>
        </div>

        {/* Métriques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md pt-space-md border-t border-outline-variant/20">
          <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low">
            <div className="flex flex-col">
              <span className="text-label-sm text-outline uppercase tracking-wider font-mono">Progression</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-display-lg text-on-surface font-bold leading-none">{project.progressPercent}</span>
                <span className="text-headline-md text-primary font-semibold">%</span>
              </div>
              <span className="text-label-sm text-tertiary font-medium mt-1 font-mono">
                {doneTasks}/{allTasks.length} tâches
              </span>
            </div>
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path className="text-surface-dim" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                <path className="text-primary-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${project.progressPercent}, 100`} strokeLinecap="round" strokeWidth="3.5" />
              </svg>
              <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-primary" style={{ fontSize: 20 }}>insights</span>
            </div>
          </div>
          <div className="flex flex-col justify-between p-space-md rounded-xl bg-surface-container-low">
            <div className="flex items-center justify-between">
              <span className="text-label-sm text-outline uppercase tracking-wider font-mono">Temps investi</span>
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>timer</span>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-headline-lg text-on-surface font-semibold">{totalHoursActual}h</span>
                <span className="text-body-sm text-outline">/ {totalHoursEstimated}h prévues</span>
              </div>
              <div className="progress-track mt-2">
                <div className="progress-fill bg-secondary" style={{ width: `${Math.min(100, (totalHoursActual / Math.max(1, totalHoursEstimated)) * 100)}%` }} />
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between p-space-md rounded-xl bg-surface-container-low">
            <div className="flex items-center justify-between">
              <span className="text-label-sm text-outline uppercase tracking-wider font-mono">Sessions planifiées</span>
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>calendar_month</span>
            </div>
            <div>
              <span className="text-headline-md text-on-surface font-semibold block">{upcomingSessions.length} à venir</span>
              <span className="text-label-sm text-outline font-mono">{projectSessions.filter(s => s.status === "completed").length} terminées</span>
            </div>
          </div>
          <div className="flex flex-col justify-between p-space-md rounded-xl bg-surface-container-low">
            <div className="flex items-center justify-between">
              <span className="text-label-sm text-outline uppercase tracking-wider font-mono">Phases</span>
              <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 18 }}>account_tree</span>
            </div>
            <div>
              <span className="text-headline-lg text-tertiary font-bold">{project.phases.filter(ph => ph.status === "completed").length}</span>
              <span className="text-body-sm text-outline"> / {project.phases.length} complètes</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 p-1 bg-surface-container-low rounded-xl w-fit overflow-x-auto">
        {([
          { id: "apercu", label: "Vue d'ensemble", icon: "dashboard_customize" },
          { id: "roadmap", label: "Roadmap", icon: "timeline" },
          { id: "taches", label: `Tâches (${allTasks.length})`, icon: "checklist_rtl" },
          { id: "planning", label: "Planning", icon: "calendar_month" },
          { id: "chat", label: "Chat IA", icon: "chat_spark" },
        ] as { id: TabId; label: string; icon: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-space-md py-2 rounded-lg text-body-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              tab === t.id
                ? "bg-surface-container-lowest text-primary font-semibold shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Contenu des onglets ── */}

      {/* Tâches */}
      {tab === "taches" && (
        <div className="flex flex-col gap-space-md">
          {/* Barre de filtre */}
          <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-lowest shadow-xs">
            <div className="flex items-center gap-1 overflow-x-auto">
              {["Toutes", "À faire", "En cours", "Terminées"].map((f, i) => {
                const count = i === 0 ? allTasks.length
                  : i === 1 ? allTasks.filter(t => t.status === "todo").length
                  : i === 2 ? allTasks.filter(t => t.status === "in_progress").length
                  : allTasks.filter(t => t.status === "done").length;
                return (
                  <button key={f} className="px-3 py-1.5 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container-low transition-colors flex items-center gap-1.5">
                    <span>{f}</span>
                    <span className="text-label-sm px-1.5 rounded bg-surface-container-low text-outline font-mono">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Phases et tâches */}
          {project.phases.map(phase => {
            const phaseDone = phase.tasks.filter(t => t.status === "done").length;
            const isExpanded = !expandedPhases.has(phase.id);
            return (
              <div key={phase.id} className={`flex flex-col bg-surface-container-lowest rounded-xl shadow-xs overflow-hidden ${
                phase.status === "active" ? "ring-1 ring-primary/20" : ""
              }`}>
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="flex items-center justify-between p-space-md bg-surface-container-low/50 hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-space-sm">
                    <span className={`material-symbols-outlined ${
                      phaseDone === phase.tasks.length ? "text-tertiary" : "text-primary"
                    }`} style={{ fontSize: 20 }}>
                      {phaseDone === phase.tasks.length ? "folder_check" : "play_circle"}
                    </span>
                    <div className="text-left">
                      <span className="text-label-sm uppercase tracking-wider text-outline font-semibold font-mono block">
                        Phase {phase.order}
                      </span>
                      <span className="text-headline-sm font-semibold text-on-surface">{phase.title}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-semibold font-mono ${
                      phaseDone === phase.tasks.length
                        ? "bg-tertiary-fixed-dim/30 text-tertiary"
                        : "bg-secondary-container/20 text-secondary"
                    }`}>
                      {phaseDone === phase.tasks.length
                        ? <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span> Complète</>
                        : `${phaseDone}/${phase.tasks.length}`
                      }
                    </span>
                    <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>
                      {isExpanded ? "expand_less" : "expand_more"}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="flex flex-col p-space-sm gap-1">
                    {phase.tasks.map(task => (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors group ${
                          task.status === "in_progress"
                            ? "bg-surface-container-low shadow-xs ring-1 ring-primary/20"
                            : "hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => task.status !== "done" && handleCompleteTask(task)}
                            className={`shrink-0 ${STATUS_COLORS[task.status]}`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: task.status === "done" ? "'FILL' 1" : "'FILL' 0" }}>
                              {STATUS_ICONS[task.status]}
                            </span>
                          </button>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-body-md ${task.status === "done" ? "text-on-surface-variant line-through" : "text-on-surface"}`}>
                              {task.title}
                            </span>
                            {task.status === "in_progress" && (
                              <span className="text-label-sm text-primary font-semibold font-mono mt-0.5">En cours</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-label-sm text-outline flex items-center gap-1 font-mono">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
                            {task.estimatedMinutes >= 60 ? `${Math.floor(task.estimatedMinutes / 60)}h${task.estimatedMinutes % 60 > 0 ? task.estimatedMinutes % 60 + "m" : ""}` : `${task.estimatedMinutes}m`}
                          </span>
                          <span className={`text-label-sm px-2 py-0.5 rounded font-mono ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </span>
                          {task.status !== "done" && (
                            <button
                              onClick={() => {
                                useAppStore.getState().updateSession(
                                  sessions.find(s => s.taskId === task.id && s.status === "scheduled")?.id ?? "",
                                  {}
                                );
                                useAppStore.setState(s => ({
                                  ui: {
                                    ...s.ui,
                                    currentView: "session-focus",
                                    selectedProjectId: project.id,
                                    activeSessionId: sessions.find(ss => ss.taskId === task.id && ss.status === "scheduled")?.id ?? null,
                                  }
                                }));
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity btn-primary py-1.5 text-label-sm"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>bolt</span>
                              <span>Focus</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Roadmap */}
      {tab === "roadmap" && (
        <div className="flex flex-col gap-space-md">
          {project.phases.map((phase, idx) => (
            <div key={phase.id} className="flex gap-space-md">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-label-sm font-bold font-mono shrink-0 ${
                  phase.status === "completed" ? "bg-primary text-on-primary"
                  : phase.status === "active" ? "bg-primary-fixed text-on-primary-fixed-variant ring-2 ring-primary"
                  : "bg-surface-container text-outline"
                }`}>
                  {idx + 1}
                </div>
                {idx < project.phases.length - 1 && (
                  <div className="w-0.5 flex-1 bg-outline-variant/30 my-1" />
                )}
              </div>
              <div className="flex-1 pb-space-md">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-headline-sm font-semibold text-on-surface">{phase.title}</h3>
                  <span className="text-label-sm text-outline font-mono">
                    {Math.round(phase.tasks.reduce((a, t) => a + t.estimatedMinutes, 0) / 60)}h
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {phase.tasks.map(task => (
                    <span
                      key={task.id}
                      className={`text-label-sm px-2.5 py-1 rounded-lg font-mono ${
                        task.status === "done" ? "bg-tertiary-fixed-dim/30 text-tertiary line-through"
                        : task.status === "in_progress" ? "bg-primary-fixed text-on-primary-fixed-variant"
                        : "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {task.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Planning */}
      {tab === "planning" && (
        <div className="flex flex-col gap-space-md">
          <p className="text-body-sm text-on-surface-variant font-mono">Prochaines sessions planifiées pour ce projet :</p>
          {upcomingSessions.length === 0 ? (
            <div className="p-space-lg bg-surface-container-lowest rounded-xl text-center">
              <p className="text-body-sm text-on-surface-variant">Aucune session planifiée. Toutes les tâches sont terminées ou en attente de recalcul.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingSessions.map(session => (
                <div key={session.id} className="flex items-center justify-between p-space-md bg-surface-container-lowest rounded-xl shadow-xs hover:shadow-md transition-all">
                  <div className="flex flex-col">
                    <span className="text-label-sm text-primary font-semibold font-mono">
                      {new Date(session.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}
                      {" · "}{session.startTime} – {session.endTime}
                    </span>
                    <span className="text-body-sm font-semibold text-on-surface mt-0.5">{session.title}</span>
                  </div>
                  <button
                    onClick={() => useAppStore.setState(s => ({
                      ui: { ...s.ui, currentView: "session-focus", activeSessionId: session.id }
                    }))}
                    className="btn-primary py-1.5"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bolt</span>
                    <span>Focus</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat IA */}
      {tab === "chat" && (
        <div className="flex flex-col gap-space-md">
          {/* En-tête */}
          <div className="flex items-center justify-between p-space-md bg-surface-container-lowest rounded-xl shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
              </div>
              <span className="text-headline-sm font-semibold text-on-surface">Nexa Kernel</span>
              <span className="text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-secondary font-mono">
                {activeProviderId
                  ? aiProviders.find(p => p.id === activeProviderId)?.name ?? activeProviderId
                  : "Mode démo — configure un provider dans Paramètres"}
              </span>
            </div>
            {!activeProviderId && (
              <button onClick={() => setView("parametres")} className="btn-secondary text-label-sm">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>settings</span>
                Configurer un provider
              </button>
            )}
          </div>

          {/* Historique de la conversation */}
          <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto px-1">
            {(!project.conversationHistory || project.conversationHistory.length === 0) && (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined" style={{ fontSize: 28 }}>chat_spark</span>
                </div>
                <p className="text-body-sm font-semibold text-on-surface">Commence une conversation avec l'IA</p>
                <p className="text-body-sm text-on-surface-variant max-w-sm">
                  Pose des questions sur ton projet, demande des suggestions, signale un blocage. L'IA connaît ton contexte complet.
                </p>
              </div>
            )}
            {(project.conversationHistory ?? []).map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                {msg.role !== "system" && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-label-sm text-outline font-mono">
                      {msg.role === "user" ? "Toi" : "Nexa Kernel"}
                    </span>
                    <span className="text-label-sm text-outline font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}
                {msg.role !== "system" && (
                  <div className={`px-space-md py-3 rounded-2xl max-w-xl text-body-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-surface-container-high text-on-surface rounded-tr-sm"
                      : "bg-surface-container text-on-surface rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-start gap-2">
                <div className="px-space-md py-3 rounded-2xl bg-surface-container text-on-surface-variant rounded-tl-sm flex items-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-primary" style={{ fontSize: 16 }}>refresh</span>
                  <span className="text-body-sm">Nexa réfléchit...</span>
                </div>
              </div>
            )}
            {chatError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-error-container/40 text-on-error-container text-body-sm">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                {chatError}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 items-end">
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={async e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  await handleChatSend();
                }
              }}
              placeholder={
                activeProviderId
                  ? "Pose une question sur ce projet... (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
                  : "Configure un provider IA dans Paramètres pour activer le chat."
              }
              rows={2}
              disabled={chatLoading || !activeProviderId}
              className="flex-1 px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/20 resize-none disabled:opacity-50"
            />
            <button
              onClick={handleChatSend}
              disabled={!chatInput.trim() || chatLoading || !activeProviderId}
              className="btn-primary py-2.5 px-3 disabled:opacity-40"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
            </button>
          </div>

          {/* Suggestions rapides */}
          {activeProviderId && (project.conversationHistory ?? []).filter(m => m.role !== "system").length < 2 && (
            <div className="flex flex-wrap gap-2">
              {[
                "As-tu des questions pour mieux cerner mon projet ?",
                "Quels agents IA ou amis devs me conseilles-tu ?",
                "Fais-moi des remarques et corrections sur l'architecture.",
                "Qu'est-ce qui pourrait bloquer ou ralentir ce projet ?",
                "Mes estimations de temps sont-elles réalistes ?",
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setChatInput(suggestion)}
                  className="text-label-sm px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors font-mono"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aperçu */}
      {tab === "apercu" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          <div className="flex flex-col gap-space-sm bg-surface-container-lowest rounded-xl p-space-lg shadow-xs">
            <h3 className="text-headline-sm font-semibold text-on-surface">Description du projet</h3>
            <p className="text-body-md text-on-surface-variant leading-relaxed">{project.description}</p>
            {project.aiAnalysis && (
              <>
                <div className="mt-space-sm">
                  <h4 className="text-label-md font-semibold text-on-surface mb-2 font-mono uppercase tracking-wider">Technologies</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.aiAnalysis.technologies.map(t => (
                      <span key={t} className="text-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono">{t}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col gap-space-sm bg-surface-container-lowest rounded-xl p-space-lg shadow-xs">
            <h3 className="text-headline-sm font-semibold text-on-surface">Résumé de progression</h3>
            {project.phases.map(phase => (
              <div key={phase.id} className="flex items-center justify-between py-1.5 border-b border-outline-variant/20">
                <span className="text-body-sm text-on-surface">{phase.title}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-container rounded-full"
                      style={{
                        width: `${phase.tasks.length === 0 ? 0 : (phase.tasks.filter(t => t.status === "done").length / phase.tasks.length) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-label-sm text-outline font-mono">
                    {phase.tasks.filter(t => t.status === "done").length}/{phase.tasks.length}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
