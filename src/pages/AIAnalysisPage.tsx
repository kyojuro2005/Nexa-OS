import React, { useState } from "react";
import { useAppStore } from "../stores/useAppStore";

export default function AIAnalysisPage() {
  const { ui, projects, setView, recalculatePlanning } = useAppStore();
  const project = projects.find(p => p.id === ui.selectedProjectId);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-space-xl gap-space-md">
        <p className="text-body-md text-on-surface-variant">Aucun projet sélectionné.</p>
        <button onClick={() => setView("nouveau-projet")} className="btn-primary">
          Créer un projet
        </button>
      </div>
    );
  }

  const analysis = project.aiAnalysis;
  const allTasks = project.phases.flatMap(ph => ph.tasks);
  const totalHours = Math.round(allTasks.reduce((a, t) => a + t.estimatedMinutes, 0) / 60);

  const handleValidate = () => {
    recalculatePlanning();
    setView("projet-detail", { selectedProjectId: project.id });
  };

  const SEVERITY_COLORS = {
    blocking: "bg-error-container text-on-error-container",
    important: "bg-secondary-fixed text-on-secondary-fixed",
    optional: "bg-surface-container text-on-surface-variant",
  };

  return (
    <div className="flex flex-col gap-space-lg max-w-5xl mx-auto">
      {/* ── Header de session ── */}
      <section className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-xs">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-space-xs text-outline">
              <span className="text-label-sm uppercase tracking-wider text-on-surface-variant flex items-center gap-1 font-mono">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>chat_spark</span>
                Nouveau Chat
              </span>
              <span className="text-outline text-xs">/</span>
              <span className="text-label-sm font-semibold text-primary truncate font-mono">
                Analyse : {project.title}
              </span>
            </div>
            <div className="flex items-center gap-space-sm pt-0.5">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-low">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse" />
                <span className="text-label-sm text-tertiary font-semibold font-mono">
                  Structuration complète
                </span>
              </div>
              <span className="text-label-sm text-on-surface-variant font-mono">
                {project.phases.length} phases · {allTasks.length} tâches · {totalHours}h estimées
              </span>
            </div>
          </div>
          <button
            onClick={handleValidate}
            className="btn-primary shrink-0"
          >
            <span>Valider et insérer dans mon planning</span>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
          </button>
        </div>
      </section>

      {/* ── Conversation ── */}
      <section className="flex flex-col gap-space-lg w-full pb-space-xl">
        {/* Message utilisateur */}
        {project.conversationHistory.find(m => m.role === "user") && (
          <div className="flex flex-col items-end w-full pl-20">
            <div className="flex items-center gap-2 mb-1.5 pr-1">
              <span className="text-label-sm text-outline font-mono">{project.conversationHistory[0]?.role === "user" ? "Vous" : ""}</span>
            </div>
            <div className="bg-surface-container-high text-on-surface rounded-2xl rounded-tr-sm px-space-lg py-space-md shadow-xs max-w-2xl">
              <p className="text-body-md leading-relaxed text-on-surface">
                {project.conversationHistory.find(m => m.role === "user")?.content}
              </p>
            </div>
          </div>
        )}

        {/* Réponse IA — Carte principale d'analyse */}
        <div className="flex flex-col items-start w-full pr-10">
          <div className="flex items-center gap-space-sm mb-2 pl-1">
            <div className="w-6 h-6 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
            </div>
            <span className="text-headline-sm font-semibold text-on-surface">Nexa Kernel</span>
            <span className="text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-secondary font-medium font-mono">Synthèse Décisionnelle</span>
          </div>

          <div className="w-full bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs flex flex-col gap-space-lg">
            {/* Intro */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-low p-space-md rounded-xl">
              <p className="text-body-md text-on-surface font-medium">
                J'ai analysé ton projet. Voici la décomposition et les phases générées :
              </p>
              <div className="flex items-center gap-2 shrink-0 bg-surface-container-lowest px-3 py-1.5 rounded-lg shadow-xs">
                <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 16 }}>energy_savings_leaf</span>
                <span className="text-label-sm font-semibold text-tertiary font-mono">Cadence respectée</span>
              </div>
            </div>

            {analysis && (
              <>
                {/* Objectif */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>track_changes</span>
                    <h3 className="text-headline-sm font-semibold text-on-surface">Objectif général</h3>
                  </div>
                  <p className="text-body-md text-on-surface-variant leading-relaxed">{analysis.objective}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {analysis.technologies.map(tech => (
                      <span key={tech} className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-label-sm shadow-xs font-semibold font-mono">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Fonctionnalités */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-secondary" style={{ fontSize: 20 }}>bolt</span>
                    <h3 className="text-headline-sm font-semibold text-on-surface">Fonctionnalités détectées</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {analysis.features.map((feat, i) => (
                      <div key={i} className="bg-surface-container-low p-space-md rounded-xl">
                        <span className="text-body-sm text-on-surface">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risques */}
                {analysis.risks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-error" style={{ fontSize: 20 }}>warning</span>
                      <h3 className="text-headline-sm font-semibold text-on-surface">Points d'attention</h3>
                    </div>
                    <div className="flex flex-col gap-2">
                      {analysis.risks.map((risk, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${SEVERITY_COLORS[risk.severity]}`}>
                          <span className="text-label-sm font-bold font-mono uppercase px-2 py-0.5 rounded bg-surface-container-lowest/50 shrink-0">
                            {risk.severity === "blocking" ? "BLOQUANT" : risk.severity === "important" ? "IMPORTANT" : "OPTIONNEL"}
                          </span>
                          <div>
                            <div className="text-body-sm font-semibold">{risk.title}</div>
                            <div className="text-body-sm opacity-80">{risk.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Infos manquantes */}
                {analysis.missingInfo.length > 0 && (
                  <div className="p-space-md bg-surface-container-high rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>help_outline</span>
                      <span className="text-headline-sm font-semibold text-on-surface">Informations manquantes</span>
                    </div>
                    <ul className="flex flex-col gap-1">
                      {analysis.missingInfo.map((info, i) => (
                        <li key={i} className="text-body-sm text-on-surface-variant flex items-start gap-2">
                          <span className="text-outline mt-1">·</span>
                          {info}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* Roadmap générée */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>route</span>
                  <h3 className="text-headline-sm font-semibold text-on-surface">Roadmap générée</h3>
                </div>
                <span className="text-label-sm text-outline font-mono">
                  {totalHours}h estimées · {allTasks.length} tâches
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {project.phases.map((phase, phIdx) => (
                  <div key={phase.id} className="bg-surface-container-low rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-surface-container">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-sm font-bold font-mono">
                          {phIdx + 1}
                        </span>
                        <span className="text-headline-sm font-semibold text-on-surface">{phase.title}</span>
                      </div>
                      <span className="text-label-sm text-outline font-mono">
                        {phase.tasks.length} tâches · {Math.round(phase.tasks.reduce((a, t) => a + t.estimatedMinutes, 0) / 60)}h
                      </span>
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                      {phase.tasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low transition-colors">
                          <span className="text-body-sm text-on-surface">{task.title}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-label-sm text-outline font-mono">
                              {task.estimatedMinutes >= 60
                                ? `${Math.floor(task.estimatedMinutes / 60)}h${task.estimatedMinutes % 60 > 0 ? task.estimatedMinutes % 60 + "m" : ""}`
                                : `${task.estimatedMinutes}m`}
                            </span>
                            <span className={`text-label-sm px-2 py-0.5 rounded font-mono ${
                              task.priority === "critical" || task.priority === "high"
                                ? "bg-error-container text-on-error-container"
                                : "bg-surface-container text-outline"
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Récapitulatif */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-space-md border-t border-outline-variant/30">
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col">
                  <span className="text-label-sm text-outline font-mono">Durée estimée</span>
                  <span className="text-headline-md font-semibold text-on-surface">{totalHours}h</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm text-outline font-mono">Complexité</span>
                  <span className="text-headline-md font-semibold text-on-surface capitalize">{analysis?.complexity ?? "-"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm text-outline font-mono">Phases</span>
                  <span className="text-headline-md font-semibold text-on-surface">{project.phases.length}</span>
                </div>
              </div>
              <button onClick={handleValidate} className="btn-primary">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>calendar_add_on</span>
                <span>Injecter dans mon planning</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
