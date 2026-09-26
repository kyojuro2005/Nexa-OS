import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../stores/useAppStore";

type SessionOutcome = "completed" | "partial" | "defer";

export default function FocusSessionPage() {
  const { ui, sessions, projects, setView, completeSession, deferSession, addSubtask, toggleSubtask, updateSession } = useAppStore();

  const sessionId = ui.activeSessionId;
  const session = sessions.find(s => s.id === sessionId);
  const project = session ? projects.find(p => p.id === session.projectId) : null;
  const task = project?.phases.flatMap(ph => ph.tasks).find(t => t.id === session?.taskId);
  const phase = project?.phases.find(ph => ph.tasks.some(t => t.id === session?.taskId));

  // Timer
  const totalSeconds = session ? session.durationMinutes * 60 : 0;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fin de session
  const [showEndModal, setShowEndModal] = useState(false);
  const [outcome, setOutcome] = useState<SessionOutcome>("completed");
  const [actualMins, setActualMins] = useState(session?.durationMinutes ?? 90);
  const [notes, setNotes] = useState("");

  // Scratchpad
  const [thought, setThought] = useState("");
  const [thoughts, setThoughts] = useState<string[]>(session?.thoughts ?? []);

  // Nouveau sous-tâche
  const [newSubtask, setNewSubtask] = useState("");
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);

  const elapsed = totalSeconds - secondsLeft;
  const progress = totalSeconds > 0 ? Math.min(100, (elapsed / totalSeconds) * 100) : 0;
  const circumference = 2 * Math.PI * 106;
  const dashOffset = circumference - (progress / 100) * circumference;

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Démarrer le timer
  useEffect(() => {
    if (session && !sessionStarted) {
      setSecondsLeft(totalSeconds);
      setActualMins(session.durationMinutes);
      setSessionStarted(true);
      // Marquer la session comme active
      updateSession(session.id, { status: "active" });
    }
  }, [sessionId]);

  // Tick du timer
  useEffect(() => {
    if (!sessionStarted || isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          // Timer écoulé → afficher le modal de fin
          setShowEndModal(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [sessionStarted, isPaused]);

  const handlePause = () => {
    setIsPaused(p => !p);
  };

  const handleFinishClick = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActualMins(Math.max(1, Math.round(elapsed / 60)));
    setShowEndModal(true);
  };

  const handleConfirmEnd = () => {
    if (!session) return;
    const mins = Math.max(1, actualMins);

    if (outcome === "completed") {
      completeSession(session.id, mins, notes);
      // Marquer la tâche comme terminée si toutes les sous-tâches sont faites
      if (task && session.projectId) {
        const allSubDone = !task.subtasks.length || task.subtasks.every(s => s.done);
        if (allSubDone) {
          useAppStore.getState().completeTask(session.projectId, session.taskId, mins);
        }
      }
    } else if (outcome === "partial") {
      completeSession(session.id, mins, notes);
      // Recalculer avec le temps restant
      const remaining = Math.max(0, (session.durationMinutes - mins));
      if (remaining > 15) {
        useAppStore.getState().recalculatePlanning();
      }
    } else {
      // Reporter à demain
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      deferSession(session.id, tomorrow.toISOString().slice(0, 10), session.startTime);
    }

    setShowEndModal(false);
    setView("dashboard");
  };

  const saveThought = useCallback(() => {
    if (!thought.trim()) return;
    const newThoughts = [thought, ...thoughts];
    setThoughts(newThoughts);
    if (session) updateSession(session.id, { thoughts: newThoughts });
    setThought("");
  }, [thought, thoughts, session]);

  const addSubtaskHandler = () => {
    if (!newSubtask.trim() || !session) return;
    addSubtask(session.projectId, session.taskId, newSubtask);
    setNewSubtask("");
    setShowSubtaskInput(false);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-body-md text-on-surface-variant mb-4">Aucune session active.</p>
          <button onClick={() => setView("dashboard")} className="btn-primary">Retour au dashboard</button>
        </div>
      </div>
    );
  }

  const subtasksDone = task?.subtasks.filter(s => s.done).length ?? 0;
  const subtasksTotal = task?.subtasks.length ?? 0;

  // Couleur du timer selon le temps restant
  const timerColor = secondsLeft <= 0
    ? "text-error"
    : secondsLeft < totalSeconds * 0.2
    ? "text-error"
    : secondsLeft < totalSeconds * 0.4
    ? "text-secondary"
    : "text-on-surface";

  return (
    <div className="min-h-screen bg-background">
      <div className="relative w-full max-w-4xl mx-auto px-gutter-desktop py-space-md flex flex-col gap-space-lg">

        {/* Halo ambiant */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-fixed-dim/25 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* ── Context Bar ── */}
        <div className="flex items-center justify-between px-space-md py-2.5 rounded-full bg-surface-container-lowest shadow-xs">
          <div className="flex items-center gap-space-sm min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-primary text-label-sm font-semibold tracking-wider uppercase font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              {project?.title ?? "Projet"}
            </span>
            {phase && (
              <span className="text-body-sm text-on-surface-variant font-medium truncate hidden sm:block">
                {phase.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-label-sm font-mono font-semibold ${isPaused ? "text-outline" : "text-tertiary"}`}>
              {isPaused ? "EN PAUSE" : "EN COURS"}
            </span>
            <button
              onClick={() => setView("dashboard")}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-colors"
              title="Retour (session conservée)"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          </div>
        </div>

        {/* ── Zone focus principale ── */}
        <div className="flex flex-col items-center text-center px-space-md pt-space-md pb-space-sm">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed-variant mb-space-sm shadow-xs">
            <span className="text-label-sm tracking-wide font-mono">OBJECTIF DE SESSION</span>
          </div>
          <h1 className="text-headline-lg font-bold text-on-surface max-w-2xl tracking-tight leading-tight">
            {session.title}
          </h1>
          {session.description && (
            <div className="mt-space-sm max-w-xl px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface-variant text-body-sm flex items-start gap-2 text-left shadow-xs">
              <span className="material-symbols-outlined text-primary shrink-0 mt-0.5" style={{ fontSize: 16 }}>psychology</span>
              <p className="leading-relaxed">{session.description}</p>
            </div>
          )}

          {/* Timer circulaire */}
          <div className="relative my-space-lg flex flex-col items-center">
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 240 240">
                <circle className="text-surface-container" cx="120" cy="120" fill="transparent" r="106" stroke="currentColor" strokeWidth="6" />
                <circle
                  className={`${secondsLeft === 0 ? "text-error" : "text-primary-container"} transition-all duration-1000 ease-linear`}
                  cx="120" cy="120" fill="transparent" r="106" stroke="currentColor"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset}
                  strokeLinecap="round" strokeWidth="6"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className={`timer-display text-[2.25rem] font-semibold tracking-tighter tabular-nums ${timerColor}`}>
                  {secondsLeft <= 0 ? "Terminé" : formatTime(secondsLeft)}
                </span>
                <div className="flex items-center gap-1.5 text-on-surface-variant text-label-sm font-mono">
                  <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim" />
                  <span>sur {formatTime(totalSeconds)}</span>
                </div>
                {isPaused && (
                  <span className="text-label-sm text-outline font-mono animate-pulse mt-1">PAUSE</span>
                )}
              </div>
            </div>

            {/* Barre de progression */}
            <div className="w-64 mt-space-sm flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-label-sm text-outline font-mono">
                <span>Progression</span>
                <span className="text-tertiary font-semibold">{Math.round(progress)}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill bg-primary-container" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Sous-tâches mini */}
            {subtasksTotal > 0 && (
              <div className="w-64 mt-2 flex items-center gap-2">
                <span className="text-label-sm text-outline font-mono">Sous-tâches</span>
                <div className="flex gap-1 flex-1">
                  {task!.subtasks.map((sub, i) => (
                    <span key={i} className={`h-1.5 flex-1 rounded-full ${sub.done ? "bg-tertiary-fixed-dim" : "bg-surface-container"}`} />
                  ))}
                </div>
                <span className="text-label-sm text-primary font-semibold font-mono">{subtasksDone}/{subtasksTotal}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-space-sm">
            <button onClick={handlePause} className="btn-secondary">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{isPaused ? "play_arrow" : "pause_circle"}</span>
              <span>{isPaused ? "Reprendre" : "Pause tactique"}</span>
            </button>
            <button onClick={handleFinishClick} className="btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
              <span>Terminer la session</span>
            </button>
            <button onClick={() => {
              if (intervalRef.current) clearInterval(intervalRef.current);
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              deferSession(session.id, tomorrow.toISOString().slice(0, 10), session.startTime);
              setView("dashboard");
            }} className="btn-secondary">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>auto_fix_high</span>
              <span>Reporter à demain</span>
            </button>
          </div>
        </div>

        {/* ── Split : Sous-tâches + Idées ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md">
          {/* Sous-tâches */}
          <div className="md:col-span-7 bg-surface-container-lowest p-space-md rounded-xl shadow-xs">
            <div className="flex items-center justify-between pb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>checklist</span>
                <h2 className="text-headline-sm font-semibold text-on-surface">Sous-tâches</h2>
              </div>
              {subtasksTotal > 0 && (
                <span className="text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-medium font-mono">
                  {subtasksDone} / {subtasksTotal}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {task && task.subtasks.length > 0 ? (
                task.subtasks.map(sub => (
                  <label key={sub.id} className="group flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all hover:bg-surface-container-low">
                    <input
                      type="checkbox"
                      checked={sub.done}
                      onChange={() => toggleSubtask(session.projectId, session.taskId, sub.id)}
                      className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer shrink-0"
                    />
                    <div className="flex flex-col">
                      <span className={`text-body-sm font-medium ${sub.done ? "text-outline line-through" : "text-on-surface"}`}>
                        {sub.title}
                      </span>
                      {sub.detail && (
                        <span className="text-label-sm text-outline mt-0.5">{sub.detail}</span>
                      )}
                    </div>
                  </label>
                ))
              ) : (
                <p className="text-body-sm text-outline py-2">Aucune sous-tâche définie.</p>
              )}
            </div>
            {showSubtaskInput ? (
              <div className="mt-space-sm flex gap-2">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addSubtaskHandler(); if (e.key === "Escape") setShowSubtaskInput(false); }}
                  placeholder="Titre de la sous-tâche..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface text-body-sm outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
                <button onClick={addSubtaskHandler} className="btn-primary py-1.5 text-label-sm">Ajouter</button>
                <button onClick={() => setShowSubtaskInput(false)} className="btn-secondary py-1.5 text-label-sm">Annuler</button>
              </div>
            ) : (
              <button onClick={() => setShowSubtaskInput(true)} className="mt-space-sm inline-flex items-center gap-1.5 text-on-surface-variant hover:text-primary text-body-sm font-medium pt-2 transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                <span>Ajouter une sous-tâche</span>
              </button>
            )}
          </div>

          {/* Idées spontanées */}
          <div className="md:col-span-5 bg-surface-container-lowest p-space-md rounded-xl shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: 20 }}>lightbulb</span>
                <h2 className="text-headline-sm font-semibold text-on-surface">Idées spontanées</h2>
              </div>
              <span className="text-label-sm text-outline font-mono">Sans distraction</span>
            </div>
            <textarea
              value={thought}
              onChange={e => setThought(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveThought(); } }}
              placeholder="Capture tes idées ici pour ne pas te distraire..."
              rows={3}
              className="w-full p-2.5 rounded-lg bg-surface-container-low text-on-surface text-body-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-all"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-label-sm text-outline flex items-center gap-1 font-mono">
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>keyboard_return</span>Entrée pour capturer
              </span>
              <button onClick={saveThought} className="btn-secondary py-1 text-label-sm font-mono">
                Capturer
              </button>
            </div>
            <div className="flex flex-col gap-1.5 mt-2 flex-1 overflow-y-auto max-h-32">
              {thoughts.map((t, i) => (
                <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-container-low text-on-surface text-body-sm group">
                  <span className="truncate text-body-sm">{t}</span>
                  <button
                    onClick={() => setThoughts(prev => prev.filter((_, j) => j !== i))}
                    className="text-outline hover:text-error shrink-0 ml-2 transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between px-space-md py-space-sm rounded-xl bg-surface-container-low text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 16 }}>spa</span>
            <span className="text-body-sm italic">"Focalise-toi sur la tâche actuelle. Le reste suivra naturellement."</span>
          </div>
          <div className="flex items-center gap-space-md text-label-sm text-outline font-mono">
            <span>Écoulé : {formatTime(elapsed)}</span>
            <span>·</span>
            <span>Restant : {formatTime(Math.max(0, secondsLeft))}</span>
          </div>
        </div>
      </div>

      {/* ── Modal de fin de session ── */}
      {showEndModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-on-background/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-xl p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>check_circle</span>
              </div>
              <div>
                <h2 className="text-headline-sm font-semibold text-on-surface">Clôturer la session</h2>
                <p className="text-label-sm text-outline font-mono">{session.title}</p>
              </div>
            </div>

            {/* Résultat */}
            <div className="flex flex-col gap-2">
              <span className="text-label-md font-mono text-on-surface-variant">Résultat</span>
              {([
                { id: "completed", label: "Tâche terminée", desc: "La tâche est complète.", icon: "task_alt" },
                { id: "partial", label: "Partiellement fait", desc: "Du travail reste à faire.", icon: "hourglass_bottom" },
                { id: "defer", label: "Reporter", desc: "Planifier de nouveau demain.", icon: "schedule" },
              ] as { id: SessionOutcome; label: string; desc: string; icon: string }[]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setOutcome(opt.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    outcome === opt.id ? "bg-primary-fixed ring-1 ring-primary/20" : "bg-surface-container-low hover:bg-surface-container"
                  }`}
                >
                  <span className={`material-symbols-outlined ${outcome === opt.id ? "text-primary" : "text-outline"}`} style={{ fontSize: 20 }}>
                    {opt.icon}
                  </span>
                  <div>
                    <div className="text-body-sm font-semibold text-on-surface">{opt.label}</div>
                    <div className="text-label-sm text-on-surface-variant">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Temps réel */}
            {outcome !== "defer" && (
              <div>
                <label className="text-label-md font-mono text-on-surface-variant block mb-1.5">
                  Temps réel passé : <strong className="text-on-surface">{actualMins} min</strong>
                </label>
                <input
                  type="range" min={5} max={Math.max(session.durationMinutes * 2, 30)} step={5}
                  value={actualMins} onChange={e => setActualMins(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-label-sm text-outline font-mono mt-1">
                  <span>Prévu : {session.durationMinutes}m</span>
                  <span className={actualMins > session.durationMinutes ? "text-error" : "text-tertiary"}>
                    {actualMins > session.durationMinutes ? `+${actualMins - session.durationMinutes}m` : `−${session.durationMinutes - actualMins}m`}
                  </span>
                </div>
                {actualMins > session.durationMinutes && (
                  <p className="text-label-sm text-secondary mt-1 font-mono">
                    Le planning sera recalculé pour absorber le dépassement.
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            {outcome !== "defer" && (
              <div>
                <label className="text-label-md font-mono text-on-surface-variant block mb-1.5">Note rapide (optionnel)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ce qui a été fait, ce qui reste..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-on-surface text-body-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowEndModal(false)} className="btn-secondary flex-1 justify-center">Annuler</button>
              <button onClick={handleConfirmEnd} className="btn-primary flex-1 justify-center">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
