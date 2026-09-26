import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "../stores/useAppStore";
import { aiService } from "../lib/aiService";

const INTENSITY_OPTIONS = [
  { label: "Intensif · 6h / jour", value: 6, tag: "Sprint" },
  { label: "Équilibré · 4h / jour", value: 4, tag: "Idéal" },
  { label: "Soutenable · 2h / jour", value: 2, tag: "Side-project" },
];

const PRESET_PROJECTS = [
  {
    title: "Application Mobile Santé",
    icon: "medical_services",
    tag: "Mobile / PWA",
    description: "PWA géolocalisée avec base Supabase et mode hors-ligne pour la consultation médicale rapide et gestion des officines d'urgence.",
    meta: "~3 phases · 24h dév",
  },
  {
    title: "SaaS B2B Multi-tenant",
    icon: "domain",
    tag: "Plateforme B2B",
    description: "Architecture Next.js App Router, Stripe Subscriptions avec webhooks sécurisés, RBAC pour équipes et authentification sécurisée.",
    meta: "~4 phases · 40h dév",
  },
  {
    title: "Refonte & Automatisation",
    icon: "hub",
    tag: "Data Pipeline",
    description: "Refonte complète de pipeline de données avec scripts Python, orchestrateur et dashboards de contrôle.",
    meta: "~2 phases · 16h dév",
  },
];

export default function NewProjectPage() {
  const {
    openAIKey, activeProviderId, aiProviders,
    addProject, setAIAnalysis, addMessage, setView,
    workPreferences, setWorkPreferences, recalculatePlanning,
    addNotification,
  } = useAppStore();
  const [prompt, setPrompt] = useState("");
  const [intensity, setIntensity] = useState(4);
  const [showIntensityMenu, setShowIntensityMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handler = () => {
      setShowIntensityMenu(false);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const handleSubmit = async () => {
    const text = prompt.trim();
    if (!text) { textareaRef.current?.focus(); return; }
    setLoading(true);
    setError("");

    try {
      let result;

      const activeProvider = aiProviders.find(p => p.id === activeProviderId);

      if (activeProvider) {
        result = await aiService.generateProjectStructure(text, {
          providerId: activeProvider.id,
          apiKey: activeProvider.apiKey,
        });
      } else {
        // Mode démo sans provider configuré
        await new Promise(r => setTimeout(r, 1500));
        result = aiService.generateDemoStructure(text);
      }

      // Créer le projet
      const project = addProject({
        title: result.projectTitle,
        description: result.projectDescription,
        type: result.projectType,
        status: "active",
        priority: "high",
        phases: result.phases.map(ph => ({ ...ph, projectId: "" })) as import("../types").Phase[],
        color: "#3525cd",
        totalEstimatedMinutes: result.phases
          .flatMap(ph => ph.tasks)
          .reduce((a, t) => a + t.estimatedMinutes, 0),
      });

      // Mettre à jour les projectId/phaseId dans les tâches
      useAppStore.setState(s => ({
        projects: s.projects.map(p => {
          if (p.id !== project.id) return p;
          return {
            ...p,
            phases: p.phases.map(ph => ({
              ...ph,
              projectId: p.id,
              tasks: ph.tasks.map(t => ({ ...t, projectId: p.id, phaseId: ph.id })),
            })),
          };
        }),
      }));

      setAIAnalysis(project.id, result.analysis);

      // Ajouter le message utilisateur et la réponse IA à l'historique
      addMessage(project.id, { role: "user", content: text });
      addMessage(project.id, {
        role: "assistant",
        content: `J'ai analysé ton projet **${result.projectTitle}**. Complexité estimée : ${result.analysis.complexity}. ${result.phases.length} phases générées avec ${result.phases.flatMap(ph => ph.tasks).length} tâches pour un total de ${Math.round(result.analysis.estimatedTotalHours)}h.`,
      });

      // Ajuster la durée max journalière selon l'intensité choisie
      setWorkPreferences({ ...workPreferences, maxDailyWorkHours: intensity });

      // Recalculer le planning avec le nouveau projet
      setTimeout(() => recalculatePlanning(), 100);

      // Notification
      addNotification({
        type: "info",
        title: "Projet créé",
        body: `"${result.projectTitle}" a été structuré — ${result.phases.flatMap(ph => ph.tasks).length} tâches générées.`,
        projectId: project.id,
      });

      // Aller à la page d'analyse IA
      setView("analyse-ia", { selectedProjectId: project.id });

    } catch (err: any) {
      setError(err?.message ?? "Une erreur est survenue. Vérifie ta clé API ou réessaie.");
    } finally {
      setLoading(false);
    }
  };

  // Entrée pour soumettre
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const weeklyHours = useAppStore.getState().workPreferences.maxWeeklyWorkHours;

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto gap-space-xl">
      {/* ── Hero ── */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container shadow-xs mb-5 cursor-default">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <span className="text-label-sm uppercase tracking-wider text-primary font-semibold font-mono">
            Architecte de Projets v4.2
          </span>
          <span className="text-label-sm px-1.5 py-0.5 rounded bg-surface-container-lowest text-outline shadow-xs font-mono">
            {activeProviderId
              ? aiProviders.find(p => p.id === activeProviderId)?.name ?? activeProviderId
              : "Mode démo"}
          </span>
        </div>
        <h1 className="text-display-lg font-bold text-on-surface tracking-tight mb-3">
          Que veux-tu <span className="text-primary">construire</span> ?
        </h1>
        <p className="text-body-lg text-on-surface-variant leading-relaxed">
          Décris ton projet comme tu l'expliquerais à un associé. L'IA synthétisera les phases, dépendances et sessions selon tes disponibilités.
        </p>
      </div>

      {/* ── Zone de prompt ── */}
      <div className="w-full bg-surface-container-lowest rounded-2xl shadow-md p-5 transition-all focus-within:shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>psychology</span>
            <span className="text-label-md font-semibold text-on-surface font-mono">Prompt Stratégique</span>
          </div>
          <div className="flex items-center gap-1.5 text-outline text-label-sm font-mono">
            <span>Mode :</span>
            <span className="text-on-surface font-semibold bg-surface-container-low px-2 py-0.5 rounded">Deep Architect</span>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={5}
          placeholder="Ex : Je veux créer une application web permettant de gérer les pharmacies de garde. Je veux utiliser une PWA, Supabase et permettre aux utilisateurs de trouver les pharmacies disponibles autour d'eux avec géolocalisation et calcul d'itinéraires d'urgence..."
          className="w-full bg-surface-container-low focus:bg-surface-container-lowest text-on-surface text-body-md placeholder:text-outline/70 p-4 rounded-xl resize-none outline-none transition-colors leading-relaxed focus:ring-2 focus:ring-primary/20"
          disabled={loading}
        />

        {/* Actions bar */}
        <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3">
          {/* Gauche */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Intensité */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowIntensityMenu(!showIntensityMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all shadow-xs"
                disabled={loading}
              >
                <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 18 }}>battery_charging_full</span>
                <span className="text-body-sm font-medium">
                  Intensité : <span className="text-on-surface font-semibold">{intensity}h/j</span>
                </span>
                <span className="material-symbols-outlined text-outline" style={{ fontSize: 14 }}>expand_more</span>
              </button>
              {showIntensityMenu && (
                <div className="absolute left-0 mt-1 w-56 rounded-xl bg-surface-container-lowest shadow-xl p-1 z-30">
                  {INTENSITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setIntensity(opt.value); setShowIntensityMenu(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-body-sm flex justify-between items-center transition-colors ${
                        intensity === opt.value
                          ? "bg-surface-container text-primary font-semibold"
                          : "hover:bg-surface-container-low"
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className={`text-label-sm font-mono ${intensity === opt.value ? "text-primary" : "text-outline"}`}>
                        {opt.tag}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bouton Soumettre */}
          <button
            onClick={handleSubmit}
            disabled={loading || !prompt.trim()}
            className="relative group flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-body-sm font-semibold shadow-md transition-all hover:bg-primary-container active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>refresh</span>
                <span>Structuration en cours...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined group-hover:translate-x-0.5 transition-transform" style={{ fontSize: 18 }}>bolt</span>
                <span>Structurer avec l'IA</span>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
              </>
            )}
          </button>
        </div>

        {/* Barème contextuel */}
        <div className="mt-4 pt-3 flex items-center justify-between text-outline">
          <div className="flex items-center gap-3">
            <span className="text-label-sm flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              Disponible cette semaine : <strong className="text-on-surface">{workPreferences.maxWeeklyWorkHours}h nettes</strong>
            </span>
          </div>
          <div className="text-label-sm font-mono hidden sm:block">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface shadow-xs">⌘</kbd>
            {" + "}
            <kbd className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface shadow-xs">↵</kbd>
            {" pour générer"}
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mt-3 p-3 rounded-xl bg-error-container text-on-error-container text-body-sm flex items-start gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="w-full p-4 rounded-xl bg-surface-container-highest shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: 24 }}>cyclone</span>
            <div>
              <div className="text-headline-sm font-semibold text-on-surface">Structuration IA en cours...</div>
              <div className="text-body-sm text-on-surface-variant">
                Analyse sémantique, extraction des tâches et vérification des dépendances.
              </div>
            </div>
          </div>
          <span className="text-label-sm px-3 py-1 rounded-full bg-surface-container-lowest text-primary font-bold shadow-xs font-mono">
            {activeProviderId ? aiProviders.find(p => p.id === activeProviderId)?.name ?? activeProviderId : "Mode démo"}
          </span>
        </div>
      )}

      {/* ── Suggestions de projets fréquents ── */}
      {!loading && (
        <div className="w-full">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>auto_fix_high</span>
              <h2 className="text-headline-sm font-semibold text-on-surface">Suggestions de projets</h2>
            </div>
            <span className="text-label-sm text-outline font-mono">Cliquer pour charger</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRESET_PROJECTS.map(preset => (
              <button
                key={preset.title}
                onClick={() => setPrompt(`Projet : ${preset.title}\nDescription : ${preset.description}`)}
                className="group p-5 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{preset.icon}</span>
                    </span>
                    <span className="text-label-sm px-2 py-0.5 rounded-md bg-surface-container text-secondary font-medium font-mono">
                      {preset.tag}
                    </span>
                  </div>
                  <h3 className="text-headline-sm font-semibold text-on-surface mb-1 group-hover:text-primary transition-colors">
                    {preset.title}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {preset.description.slice(0, 80)}...
                  </p>
                </div>
                <div className="mt-4 pt-3 flex items-center justify-between text-outline">
                  <span className="text-label-sm font-mono">{preset.meta}</span>
                  <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform" style={{ fontSize: 16 }}>arrow_forward</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Workflow Nexa AI ── */}
      {!loading && (
        <div className="w-full bg-surface-container-low/70 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 20 }}>schema</span>
              <span className="text-label-md font-bold text-on-surface tracking-tight uppercase font-mono">
                Workflow Nexa AI
              </span>
            </div>
            <span className="text-label-sm text-outline font-mono">Zéro surchauffe cognitive</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { num: "1", title: "Description", desc: "Expression naturelle sans formalisme technique.", footer: "Capture fluide" },
              { num: "2", title: "Dépendances", desc: "Détection des goulots, jalons critiques et bloquants.", footer: "Mapping logique" },
              { num: "3", title: "Estimation", desc: "Calcul des heures réelles selon tes statistiques.", footer: "Modèle calibration", color: "bg-tertiary-fixed" },
              { num: "4", title: "Injection", desc: "Placement dans le calendrier selon tes plages d'énergie.", footer: "Respect du repos", footerColor: "text-tertiary" },
            ].map(step => (
              <div key={step.num} className="bg-surface-container-lowest p-4 rounded-xl flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-label-sm font-bold font-mono ${
                      step.color ?? "bg-primary-fixed text-on-primary-fixed-variant"
                    }`}>
                      {step.num}
                    </span>
                    <span className="text-headline-sm font-semibold text-on-surface">{step.title}</span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant leading-normal">{step.desc}</p>
                </div>
                <span className={`text-label-sm mt-3 pt-2 font-mono ${step.footerColor ?? "text-outline"}`}>
                  {step.footer}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
