import React, { useState } from "react";
import { useAppStore } from "../stores/useAppStore";
import { v4 as uuidv4 } from "uuid";
import type { WorkPreferences, DayAvailability, DayOfWeek, AIProviderId } from "../types";

const AI_PROVIDERS: { id: AIProviderId; name: string; placeholder: string; icon: string }[] = [
  { id: "openai",   name: "OpenAI GPT",    placeholder: "sk-...",                          icon: "auto_awesome" },
  { id: "claude",   name: "Claude",        placeholder: "sk-ant-...",                      icon: "psychology" },
  { id: "gemini",   name: "Gemini",        placeholder: "AIzaSy...",                       icon: "globe" },
  { id: "deepseek", name: "DeepSeek",      placeholder: "sk-...",                          icon: "wind_power" },
];


const STEPS = ["Bienvenue", "Profil", "Disponibilités", "Préférences", "Prêt"];

const DEFAULT_DAYS: { day: DayOfWeek; label: string }[] = [
  { day: "lun", label: "Lundi" },
  { day: "mar", label: "Mardi" },
  { day: "mer", label: "Mercredi" },
  { day: "jeu", label: "Jeudi" },
  { day: "ven", label: "Vendredi" },
  { day: "sam", label: "Samedi" },
  { day: "dim", label: "Dimanche" },
];

function AvatarInitials({ name, size = 64 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className="rounded-2xl bg-primary-container text-on-primary flex items-center justify-center font-bold"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials || "?"}
    </div>
  );
}

export default function OnboardingPage() {
  const { setUser, setWorkPreferences, setAIProvider, setView, user } = useAppStore();
  const [step, setStep] = useState(0);

  // Profil — pré-rempli depuis Supabase si dispo
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState(user?.role ?? "");
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [nameError, setNameError] = useState("");
  const nameFromAuth = !!(user?.name);  // nom déjà connu via OAuth/Auth

  // Disponibilités
  const [availability, setAvailability] = useState<DayAvailability[]>(
    DEFAULT_DAYS.map(({ day }) => ({
      day,
      enabled: ["lun", "mar", "mer", "jeu", "ven"].includes(day),
      slots: ["lun", "mar", "mer", "jeu", "ven"].includes(day)
        ? [
            { start: "09:00", end: "12:00", type: "available" as const },
            { start: "12:00", end: "14:00", type: "break" as const, label: "Déjeuner" },
            { start: "14:00", end: "18:00", type: "available" as const },
          ]
        : [],
    }))
  );

  // Préférences
  const [preferredSession, setPreferredSession] = useState(90);
  const [maxDaily, setMaxDaily] = useState(6);
  const [strictRest, setStrictRest] = useState(true);
  const [peakStart, setPeakStart] = useState("09:00");
  const [peakEnd, setPeakEnd] = useState("12:00");

  const enabledDays = availability.filter(d => d.enabled);
  const weeklyHours = enabledDays.reduce((total, day) => {
    return total + day.slots.filter(s => s.type === "available").reduce((a, s) => {
      const [sh, sm] = s.start.split(":").map(Number);
      const [eh, em] = s.end.split(":").map(Number);
      return a + ((eh * 60 + em) - (sh * 60 + sm));
    }, 0);
  }, 0);

  const toggleDay = (day: DayOfWeek) => {
    setAvailability(prev =>
      prev.map(d =>
        d.day === day
          ? {
              ...d,
              enabled: !d.enabled,
              slots: !d.enabled
                ? [
                    { start: "09:00", end: "12:00", type: "available" as const },
                    { start: "12:00", end: "14:00", type: "break" as const, label: "Déjeuner" },
                    { start: "14:00", end: "18:00", type: "available" as const },
                  ]
                : [],
            }
          : d
      )
    );
  };

  const validateAndNext = (nextStep: number) => {
    if (nextStep === 2) {
      if (!name.trim()) {
        setNameError("Le prénom est obligatoire");
        return;
      }
      setNameError("");
    }
    setStep(nextStep);
  };

  const handleFinish = () => {
    if (!name.trim()) return;

    const prefs: WorkPreferences = {
      availability,
      preferredSessionDuration: preferredSession,
      maxSessionDuration: Math.min(preferredSession + 30, 150),
      breakBetweenSessions: 15,
      peakHoursStart: peakStart,
      peakHoursEnd: peakEnd,
      maxDailyWorkHours: maxDaily,
      maxWeeklyWorkHours: maxDaily * enabledDays.length,
      strictRestMode: strictRest,
    };

    // Sauvegarder les préférences
    setWorkPreferences(prefs);
    if (apiKey.trim()) setAIProvider(selectedProvider, apiKey.trim());

    // Créer/mettre à jour l'utilisateur
    setUser({
      id: user?.id || uuidv4(),
      name: name.trim(),
      email: user?.email || "",
      role: role.trim() || "Développeur indépendant",
      avatarUrl: user?.avatarUrl,
      theme: "light",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: user?.createdAt || new Date().toISOString(),
      onboardingComplete: true,
    });
    setView("dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center shadow-md mb-3 border border-outline-variant/30 p-2">
            <img
              src="/nexawbg.png"
              alt="Nexa OS Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-headline-lg font-semibold text-on-surface tracking-tight">Nexa OS</span>
          <span className="text-body-sm text-outline mt-1 font-mono">Personal AI Work OS</span>
        </div>

        {/* Indicateur de progression */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 ${i <= step ? "text-primary" : "text-outline"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-label-sm font-bold font-mono transition-all ${
                  i < step ? "bg-primary text-on-primary" :
                  i === step ? "bg-primary-fixed text-on-primary-fixed-variant ring-2 ring-primary/30" :
                  "bg-surface-container text-outline"
                }`}>
                  {i < step
                    ? <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                    : i + 1}
                </div>
                <span className="text-label-sm hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px max-w-8 transition-all ${i < step ? "bg-primary" : "bg-surface-container"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Carte du step */}
        <div className="card p-space-xl shadow-md">

          {/* ── STEP 0 : Bienvenue ── */}
          {step === 0 && (
            <div className="flex flex-col items-center text-center gap-space-md">
              <div className="w-16 h-16 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined" style={{ fontSize: 32 }}>psychology</span>
              </div>
              <h1 className="text-headline-lg font-semibold text-on-surface">
                Bienvenue dans Nexa OS
              </h1>
              <p className="text-body-lg text-on-surface-variant max-w-md leading-relaxed">
                Ton OS personnel pour transformer des idées de projets en travail planifié, exécutable et respectueux de ton énergie.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-2 text-left">
                {[
                  { icon: "chat_spark", title: "Décris ton projet", desc: "En langage naturel, sans formulaire" },
                  { icon: "account_tree", title: "Structuration IA", desc: "Phases, tâches, dépendances auto" },
                  { icon: "calendar_today", title: "Planning adaptatif", desc: "Respecte ton rythme et ton repos" },
                ].map(item => (
                  <div key={item.title} className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>{item.icon}</span>
                    <span className="text-headline-sm font-semibold text-on-surface">{item.title}</span>
                    <span className="text-body-sm text-on-surface-variant">{item.desc}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => setStep(1)} className="btn-primary mt-2 w-full justify-center">
                Commencer la configuration
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
              </button>
            </div>
          )}


          {/* ── STEP 1 : Profil ── */}
          {step === 1 && (
            <div className="flex flex-col gap-space-md">
              <div className="flex items-start gap-space-md">
                {name && <AvatarInitials name={name} size={52} />}
                <div>
                  <h2 className="text-headline-md font-semibold text-on-surface mb-1">Ton profil</h2>
                  <p className="text-body-sm text-on-surface-variant">Quelques informations pour personnaliser ton expérience.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-label-md text-on-surface-variant block mb-1.5 font-mono">
                    Prénom &amp; Nom <span className="text-error">*</span>
                    {nameFromAuth && <span className="text-outline ml-2 normal-case font-sans text-xs">(récupéré depuis ton compte)</span>}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setNameError(""); }}
                    placeholder="Emmanuel Dupont"
                    autoComplete="off"
                    disabled={nameFromAuth}
                    className={`w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-md placeholder:text-outline outline-none focus:ring-2 focus:bg-surface-container-lowest transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                      nameError ? "ring-2 ring-error/50" : "focus:ring-primary/20"
                    }`}
                    autoFocus={!nameFromAuth}
                  />
                  {nameError && <p className="text-label-sm text-error mt-1 font-mono">{nameError}</p>}
                </div>
                <div>
                  <label className="text-label-md text-on-surface-variant block mb-1.5 font-mono">Rôle / Titre</label>
                  <input
                    type="text"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    placeholder="Tech Founder, Freelance développeur, Product Manager..."
                    autoComplete="off"
                    className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-md placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  />
                </div>
                {/* ── Sélecteur de provider IA ── */}
                <div>
                  <label className="text-label-md text-on-surface-variant block mb-1.5 font-mono">
                    Modèle IA <span className="text-outline ml-2 normal-case font-sans">(optionnel — active l'IA réelle)</span>
                  </label>
                  {/* Onglets providers */}
                  <div className="flex gap-1 p-1 bg-surface-container rounded-xl mb-2">
                    {AI_PROVIDERS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedProvider(p.id); setApiKey(""); }}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-label-sm transition-all ${
                          selectedProvider === p.id
                            ? "bg-surface-container-lowest text-primary font-semibold shadow-xs"
                            : "text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{p.icon}</span>
                        <span className="truncate w-full text-center" style={{ fontSize: 10 }}>{p.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={AI_PROVIDERS.find(p => p.id === selectedProvider)?.placeholder ?? ""}
                    autoComplete="off"
                    className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-md placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all font-mono"
                  />
                  <div className={`flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-label-sm font-mono ${
                    apiKey ? "bg-tertiary-fixed-dim/30 text-tertiary" : "bg-surface-container text-outline"
                  }`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{apiKey ? "check_circle" : "info"}</span>
                    {apiKey
                      ? `${AI_PROVIDERS.find(p => p.id === selectedProvider)?.name} configuré — IA réelle activée`
                      : "Sans clé : mode démonstration avec structure générée localement"}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep(0)} className="btn-secondary flex-1 justify-center">Retour</button>
                <button onClick={() => validateAndNext(2)} className="btn-primary flex-1 justify-center">
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2 : Disponibilités ── */}
          {step === 2 && (
            <div className="flex flex-col gap-space-md">
              <div>
                <h2 className="text-headline-md font-semibold text-on-surface mb-1">Tes disponibilités</h2>
                <p className="text-body-sm text-on-surface-variant">
                  Le moteur de planification ne touche jamais aux créneaux non sélectionnés.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {DEFAULT_DAYS.map(({ day, label }) => {
                  const avail = availability.find(d => d.day === day)!;
                  const availHours = avail.slots.filter(s => s.type === "available").reduce((a, s) => {
                    const [sh, sm] = s.start.split(":").map(Number);
                    const [eh, em] = s.end.split(":").map(Number);
                    return a + ((eh * 60 + em) - (sh * 60 + sm));
                  }, 0);
                  return (
                    <div
                      key={day}
                      className={`flex items-center gap-space-sm p-3 rounded-xl transition-colors ${
                        avail.enabled ? "bg-surface-container-low" : "bg-surface-container"
                      }`}
                    >
                      <button
                        onClick={() => toggleDay(day)}
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors relative shrink-0 ${
                          avail.enabled ? "bg-primary-container" : "bg-surface-container-high"
                        }`}
                      >
                        <span className={`block w-4 h-4 rounded-full bg-on-primary shadow-xs transform transition-transform ${
                          avail.enabled ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </button>
                      <span className={`text-body-sm font-medium w-20 ${avail.enabled ? "text-on-surface" : "text-outline"}`}>
                        {label}
                      </span>
                      {avail.enabled ? (
                        <span className="text-label-sm text-on-surface-variant font-mono flex-1">
                          Matin 09h–12h · Pause déjeuner · Après-midi 14h–18h
                        </span>
                      ) : (
                        <span className="text-label-sm text-outline font-mono">Repos</span>
                      )}
                      {avail.enabled && (
                        <span className="text-label-sm text-primary font-semibold font-mono shrink-0">
                          {Math.round(availHours / 60)}h dispo
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container">
                <span className="text-body-sm text-on-surface-variant">Total disponible / semaine :</span>
                <span className="text-headline-sm font-semibold text-primary font-mono">
                  {Math.round(weeklyHours / 60)}h nettes
                </span>
              </div>

              <p className="text-label-sm text-outline font-mono">
                Tu pourras affiner les horaires précis dans Disponibilités après la configuration.
              </p>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center">Retour</button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1 justify-center">Continuer</button>
              </div>
            </div>
          )}

          {/* ── STEP 3 : Préférences ── */}
          {step === 3 && (
            <div className="flex flex-col gap-space-md">
              <div>
                <h2 className="text-headline-md font-semibold text-on-surface mb-1">Préférences de travail</h2>
                <p className="text-body-sm text-on-surface-variant">Configure ton rythme idéal. Ces paramètres guident le moteur de planification.</p>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-label-md font-mono text-on-surface-variant block mb-2">
                    Durée préférée d'une session : <strong className="text-on-surface">{preferredSession} min</strong>
                  </label>
                  <input type="range" min={30} max={150} step={15} value={preferredSession}
                    onChange={e => setPreferredSession(Number(e.target.value))} className="w-full accent-primary" />
                  <div className="flex justify-between text-label-sm text-outline font-mono mt-1">
                    <span>30 min</span><span>90 min</span><span>150 min</span>
                  </div>
                </div>
                <div>
                  <label className="text-label-md font-mono text-on-surface-variant block mb-2">
                    Max heures de travail / jour : <strong className="text-on-surface">{maxDaily}h</strong>
                  </label>
                  <input type="range" min={2} max={10} step={0.5} value={maxDaily}
                    onChange={e => setMaxDaily(Number(e.target.value))} className="w-full accent-primary" />
                  <div className="flex justify-between text-label-sm text-outline font-mono mt-1">
                    <span>2h</span><span>6h</span><span>10h</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-label-md font-mono text-on-surface-variant block mb-1.5">Pic d'énergie – début</label>
                    <input type="time" value={peakStart} onChange={e => setPeakStart(e.target.value)}
                      className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-md outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-label-md font-mono text-on-surface-variant block mb-1.5">Pic d'énergie – fin</label>
                    <input type="time" value={peakEnd} onChange={e => setPeakEnd(e.target.value)}
                      className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-md outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low">
                  <div>
                    <div className="text-body-sm font-semibold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 18 }}>verified_user</span>
                      Repos strictement protégé
                    </div>
                    <div className="text-label-sm text-outline font-mono">Aucune session planifiée dans les pauses</div>
                  </div>
                  <button onClick={() => setStrictRest(!strictRest)}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors ${strictRest ? "bg-primary-container" : "bg-surface-container-high"}`}>
                    <span className={`block w-5 h-5 rounded-full bg-on-primary shadow-xs transform transition-transform ${strictRest ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>

                {/* Fin des options */}
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1 justify-center">Retour</button>
                <button onClick={() => setStep(4)} className="btn-primary flex-1 justify-center">Finaliser</button>
              </div>
            </div>
          )}

          {/* ── STEP 4 : Prêt ── */}
          {step === 4 && (
            <div className="flex flex-col items-center text-center gap-space-md">
              <div className="w-20 h-20 rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined" style={{ fontSize: 40 }}>rocket_launch</span>
              </div>
              <h2 className="text-headline-lg font-semibold text-on-surface">
                Nexa OS est prêt, {name.split(" ")[0]} !
              </h2>
              <div className="bg-surface-container-low rounded-xl p-space-md text-left w-full">
                <div className="text-label-md font-mono text-on-surface-variant mb-3 uppercase tracking-wider">Récapitulatif</div>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Nom", value: name },
                    { label: "Rôle", value: role || "Non spécifié" },
                    {
                      label: "Jours actifs",
                      value: availability.filter(d => d.enabled)
                        .map(d => d.day.charAt(0).toUpperCase() + d.day.slice(1)).join(", "),
                    },
                    { label: "Session préférée", value: `${preferredSession} min`, mono: true },
                    { label: "Max / jour", value: `${maxDaily}h`, mono: true },
                    { label: "Disponible / semaine", value: `${Math.round(weeklyHours / 60)}h`, mono: true },
                    { label: "Mode IA", value: apiKey ? "Provider configuré" : "Mode démonstration", color: apiKey ? "text-tertiary" : "text-outline", mono: true },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between text-body-sm border-b border-outline-variant/20 pb-1.5">
                      <span className="text-on-surface-variant">{row.label}</span>
                      <span className={`${row.mono ? "font-mono" : ""} ${row.color ?? "text-on-surface"} font-semibold`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleFinish} className="btn-primary w-full justify-center">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bolt</span>
                <span>Lancer Nexa OS</span>
              </button>
              <button onClick={() => setStep(3)} className="text-body-sm text-outline hover:text-on-surface transition-colors">
                Modifier les paramètres
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
