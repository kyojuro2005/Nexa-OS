import React, { useState } from "react";
import { useAppStore } from "../stores/useAppStore";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";

type CalendarView = "jour" | "semaine" | "mois";

const HOUR_HEIGHT = 60; // px par heure
const START_HOUR = 7;
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function timeToOffset(time: string, startHour = START_HOUR): number {
  const [h, m] = time.split(":").map(Number);
  return ((h - startHour) * 60 + m) / 60 * HOUR_HEIGHT;
}

function durationToHeight(durationMinutes: number): number {
  return (durationMinutes / 60) * HOUR_HEIGHT;
}

const PROJECT_SESSION_COLORS = [
  "bg-primary-fixed text-on-primary-fixed",
  "bg-secondary-fixed text-on-secondary-fixed",
  "bg-tertiary-fixed text-on-tertiary-fixed",
];

const DAY_LABELS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

export default function CalendarPage() {
  const { sessions, projects, workPreferences, setView } = useAppStore();
  const [view, setViewMode] = useState<CalendarView>("semaine");
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Sessions de la semaine
  const weekDates = weekDays.map(d => format(d, "yyyy-MM-dd"));
  const weekSessions = sessions.filter(s => weekDates.includes(s.date));

  // Couleur par projet
  const projectColorMap: Record<string, string> = {};
  projects.forEach((p, i) => {
    projectColorMap[p.id] = PROJECT_SESSION_COLORS[i % PROJECT_SESSION_COLORS.length];
  });

  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} – ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: fr })}`;

  const hoursLabels = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => `${String(i + START_HOUR).padStart(2, "0")}:00`);

  return (
    <div className="flex flex-col gap-space-lg">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs mb-1">
            <span className="text-label-sm text-secondary uppercase tracking-widest font-mono">Nexa Dynamic Schedule</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary-container" />
          </div>
          <h1 className="text-headline-lg font-semibold text-on-surface">Calendrier Dynamique</h1>
        </div>
        <div className="flex flex-wrap items-center gap-space-sm">
          {/* Vue */}
          <div className="flex items-center p-1 rounded-xl bg-surface-container shadow-xs">
            {(["jour", "semaine", "mois"] as CalendarView[]).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-space-md py-1.5 rounded-lg text-body-sm transition-all capitalize ${
                  view === v ? "bg-surface-container-lowest text-primary font-semibold shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          {/* Navigation semaine */}
          <div className="flex items-center gap-1 rounded-xl bg-surface-container p-1 shadow-xs">
            <button onClick={() => setWeekOffset(w => w - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
            </button>
            <span className="px-space-sm text-label-md text-on-surface font-medium font-mono">{weekLabel}</span>
            <button onClick={() => setWeekOffset(w => w + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
            </button>
          </div>
          <button
            onClick={() => useAppStore.getState().recalculatePlanning()}
            className="btn-primary"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_fix_high</span>
            <span>Rééquilibrer</span>
          </button>
        </div>
      </div>

      {/* ── Légende ── */}
      <div className="grid grid-cols-3 gap-space-sm">
        <div className="flex items-center justify-between p-space-sm px-space-md rounded-xl bg-surface-container-lowest shadow-xs">
          <div className="flex items-center gap-space-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
            <span className="text-body-sm text-on-surface-variant">Sessions Focus</span>
          </div>
          <span className="text-label-md font-semibold text-on-surface font-mono">
            {weekSessions.filter(s => s.status !== "skipped").length} prévues
          </span>
        </div>
        <div className="flex items-center justify-between p-space-sm px-space-md rounded-xl bg-surface-container-lowest shadow-xs">
          <div className="flex items-center gap-space-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim" />
            <span className="text-body-sm text-on-surface-variant">Récupération</span>
          </div>
          <span className="text-label-md font-semibold text-tertiary font-mono">Sanctuarisée</span>
        </div>
        <div className="flex items-center justify-between p-space-sm px-space-md rounded-xl bg-surface-container-lowest shadow-xs">
          <div className="flex items-center gap-space-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-outline" />
            <span className="text-body-sm text-on-surface-variant">Complétées</span>
          </div>
          <span className="text-label-md font-semibold text-on-surface font-mono">
            {weekSessions.filter(s => s.status === "completed").length}
          </span>
        </div>
      </div>

      {/* ── Grille semaine ── */}
      <div className="rounded-2xl bg-surface-container-lowest shadow-md overflow-hidden flex flex-col">
        {/* Header jours */}
        <div className="grid grid-cols-8 bg-surface-container-low py-space-sm px-space-xs">
          <div className="flex items-center justify-center text-label-sm text-outline font-mono">HEURE</div>
          {weekDays.map((day, i) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isToday = dateStr === format(today, "yyyy-MM-dd");
            return (
              <div key={i} className={`flex flex-col items-center py-1 ${isToday ? "rounded-xl bg-surface-container-lowest shadow-xs" : "opacity-70"}`}>
                <span className={`text-label-sm font-semibold font-mono ${isToday ? "text-primary" : "text-on-surface-variant"}`}>
                  {DAY_LABELS[i]}
                </span>
                <span className={`text-headline-sm font-bold ${isToday ? "text-on-surface" : "text-on-surface"}`}>
                  {format(day, "d")}
                </span>
                {isToday && <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-0.5" />}
              </div>
            );
          })}
        </div>

        {/* Grille horaire */}
        <div className="relative grid grid-cols-8 overflow-y-auto" style={{ maxHeight: 600 }}>
          {/* Labels horaires */}
          <div className="flex flex-col bg-surface-container-lowest/50 select-none sticky left-0 z-10">
            {hoursLabels.map(h => (
              <div key={h} style={{ height: HOUR_HEIGHT }} className="flex items-start pt-1 pr-space-sm text-right">
                <span className="text-label-sm text-outline font-mono w-full text-right pr-2">{h}</span>
              </div>
            ))}
          </div>

          {/* Colonnes jours */}
          {weekDays.map((day, colIdx) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const daySessions = weekSessions.filter(s => s.date === dateStr && s.status !== "skipped");
            const isToday = dateStr === format(today, "yyyy-MM-dd");

            // Pauses depuis les préférences
            const jsDay = day.getDay();
            const dayMap: Record<number, string> = { 0: "dim", 1: "lun", 2: "mar", 3: "mer", 4: "jeu", 5: "ven", 6: "sam" };
            const dayAvail = workPreferences.availability.find(d => d.day === dayMap[jsDay]);
            const breakSlots = dayAvail?.slots.filter(s => s.type === "break") ?? [];

            return (
              <div
                key={colIdx}
                className={`relative flex flex-col p-0.5 ${isToday ? "bg-surface-container-low/40" : "bg-surface-container-lowest hover:bg-surface-container-low/20 transition-colors"}`}
                style={{ minHeight: TOTAL_HOURS * HOUR_HEIGHT }}
              >
                {/* Lignes horaires */}
                {hoursLabels.map((_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-t border-outline-variant/10" style={{ top: i * HOUR_HEIGHT }} />
                ))}

                {/* Pauses */}
                {breakSlots.map((slot, bi) => {
                  const top = timeToOffset(slot.start);
                  const height = durationToHeight(
                    (parseInt(slot.end.split(":")[0]) * 60 + parseInt(slot.end.split(":")[1])) -
                    (parseInt(slot.start.split(":")[0]) * 60 + parseInt(slot.start.split(":")[1]))
                  );
                  if (top < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null;
                  return (
                    <div
                      key={bi}
                      className="absolute left-1 right-1 px-space-xs py-1 rounded-xl bg-tertiary-fixed shadow-xs flex flex-col justify-between overflow-hidden"
                      style={{ top, height: Math.max(height, 20) }}
                    >
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 12 }}>spa</span>
                        <span className="text-label-sm font-bold text-on-tertiary-fixed uppercase truncate">{slot.label ?? "Pause"}</span>
                      </div>
                      <span className="text-label-sm text-tertiary font-mono">{slot.start} – {slot.end}</span>
                    </div>
                  );
                })}

                {/* Sessions */}
                {daySessions.map((session, si) => {
                  const top = timeToOffset(session.startTime);
                  const height = durationToHeight(session.durationMinutes);
                  if (top < 0) return null;
                  const pColor = projectColorMap[session.projectId] ?? "bg-primary-fixed text-on-primary-fixed";
                  const isCompleted = session.status === "completed";
                  return (
                    <button
                      key={session.id}
                      onClick={() => useAppStore.setState(s => ({
                        ui: { ...s.ui, currentView: "session-focus", activeSessionId: session.id }
                      }))}
                      className={`absolute left-1 right-1 p-space-xs rounded-xl shadow-md flex flex-col justify-between overflow-hidden hover:scale-[1.01] transition-all cursor-pointer ${pColor} ${isCompleted ? "opacity-60" : ""}`}
                      style={{ top, height: Math.max(height, 28) }}
                    >
                      <div>
                        <span className="text-label-sm font-bold uppercase tracking-wider line-clamp-1">
                          {projects.find(p => p.id === session.projectId)?.title ?? ""}
                        </span>
                        <h4 className="text-body-sm font-bold leading-tight line-clamp-2 mt-0.5">{session.title}</h4>
                      </div>
                      <span className="text-label-sm opacity-80 font-mono">
                        {session.startTime} – {session.endTime}
                      </span>
                    </button>
                  );
                })}

                {/* Ligne du temps actuel */}
                {isToday && (() => {
                  const now = new Date();
                  const nowOffset = timeToOffset(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
                  if (nowOffset < 0 || nowOffset > TOTAL_HOURS * HOUR_HEIGHT) return null;
                  return (
                    <div className="absolute left-0 right-0 z-30 flex items-center pointer-events-none" style={{ top: nowOffset }}>
                      <span className="w-2.5 h-2.5 rounded-full bg-error ml-[-5px]" />
                      <div className="flex-1 h-0.5 bg-error/70" />
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
