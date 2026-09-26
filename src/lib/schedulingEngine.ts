// ══════════════════════════════════════════════════════════════════════
// NEXA OS — Moteur de planification intelligent
// Responsable du calcul des créneaux, contraintes et dépendances.
// L'IA analyse et estime ; ce moteur place et contraint.
// ══════════════════════════════════════════════════════════════════════

import { v4 as uuidv4 } from "uuid";
import type {
  Project, Task, WorkSession, WorkPreferences,
  BlockedPeriod, DayOfWeek
} from "../types";

const DAY_ORDER: DayOfWeek[] = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

// Correspondance jour JS (0=dim) → DayOfWeek
const JS_DAY_MAP: Record<number, DayOfWeek> = {
  0: "dim", 1: "lun", 2: "mar", 3: "mer", 4: "jeu", 5: "ven", 6: "sam",
};

interface TimeBlock {
  start: number;  // minutes depuis minuit
  end: number;
  type: "available" | "busy" | "break" | "blocked";
  label?: string;
}

interface DaySchedule {
  date: string;
  dayOfWeek: DayOfWeek;
  blocks: TimeBlock[];
  freeSlots: TimeBlock[];   // créneaux réellement disponibles après filtrage
  usedMinutes: number;
}

// ─── Conversion "HH:MM" → minutes depuis minuit ────────────────────────
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// ─── Minutes → "HH:MM" ────────────────────────────────────────────────
function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─── Construire le planning d'une journée ─────────────────────────────
function buildDaySchedule(
  date: string,
  prefs: WorkPreferences,
  blocked: BlockedPeriod[],
  existingSessions: WorkSession[]
): DaySchedule {
  const dateObj = new Date(date + "T12:00:00");
  const jsDay = dateObj.getDay();
  const dayOfWeek = JS_DAY_MAP[jsDay];

  const dayAvail = prefs.availability.find(d => d.day === dayOfWeek);
  if (!dayAvail || !dayAvail.enabled) {
    return { date, dayOfWeek, blocks: [], freeSlots: [], usedMinutes: 0 };
  }

  // Construire les blocs de base depuis les disponibilités
  const blocks: TimeBlock[] = dayAvail.slots.map(s => ({
    start: toMinutes(s.start),
    end: toMinutes(s.end),
    type: s.type,
    label: s.label,
  }));

  // Supprimer les créneaux occupés par les périodes bloquées
  const dayBlocked = blocked.filter(b => b.date === date);
  const busyBlocks: TimeBlock[] = dayBlocked.map(b => ({
    start: b.startTime ? toMinutes(b.startTime) : 0,
    end: b.endTime ? toMinutes(b.endTime) : 24 * 60,
    type: "blocked" as const,
    label: b.label,
  }));

  // Créneaux déjà occupés par des sessions existantes
  const existingBlocks: TimeBlock[] = existingSessions
    .filter(s => s.date === date && s.status !== "skipped")
    .map(s => ({
      start: toMinutes(s.startTime),
      end: toMinutes(s.endTime),
      type: "busy" as const,
    }));

  // Calculer les créneaux disponibles (type available UNIQUEMENT)
  const availableBlocks = blocks.filter(b => b.type === "available");
  const allBusy = [...busyBlocks, ...existingBlocks];

  // Soustraire les créneaux occupés des disponibles
  const freeSlots: TimeBlock[] = [];
  for (const avail of availableBlocks) {
    let freeParts: TimeBlock[] = [{ ...avail }];
    for (const busy of allBusy) {
      const newParts: TimeBlock[] = [];
      for (const part of freeParts) {
        if (busy.end <= part.start || busy.start >= part.end) {
          // Pas de chevauchement
          newParts.push(part);
        } else {
          // Chevauchement : découper
          if (busy.start > part.start) {
            newParts.push({ ...part, end: busy.start });
          }
          if (busy.end < part.end) {
            newParts.push({ ...part, start: busy.end });
          }
        }
      }
      freeParts = newParts;
    }
    freeSlots.push(...freeParts.filter(p => p.end - p.start >= 15));
  }

  const usedMinutes = existingBlocks.reduce((a, b) => a + (b.end - b.start), 0);

  return { date, dayOfWeek, blocks, freeSlots, usedMinutes };
}

// ─── Trier les tâches par priorité et dépendances ─────────────────────
function sortTasksByPriorityAndDependencies(tasks: Task[], completedTaskIds: Set<string>): Task[] {
  const PRIORITY_ORDER: Record<string, number> = {
    critical: 0, high: 1, medium: 2, low: 3,
  };

  const ready: Task[] = [];
  const blocked: Task[] = [];

  for (const t of tasks) {
    if (t.status === "done" || t.status === "in_progress") continue;
    const depsOk = t.dependencies.every(depId => completedTaskIds.has(depId));
    if (depsOk) ready.push(t);
    else blocked.push(t);
  }

  ready.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  return [...ready, ...blocked];
}

// ─── Interface principale ─────────────────────────────────────────────
class SchedulingEngine {
  /**
   * Génère des WorkSessions pour toutes les tâches actives,
   * dans le respect des disponibilités, pauses, dépendances.
   */
  generateSessions(
    projects: Project[],
    prefs: WorkPreferences,
    blocked: BlockedPeriod[],
    startDate: string,
    horizonDays: number
  ): WorkSession[] {
    const sessions: WorkSession[] = [];
    const completedTaskIds = new Set<string>(
      projects
        .flatMap(p => p.phases.flatMap(ph => ph.tasks))
        .filter(t => t.status === "done")
        .map(t => t.id)
    );

    // Collecter toutes les tâches non terminées, triées par priorité
    const allTasks: { task: Task; project: Project }[] = [];
    for (const project of projects) {
      if (project.status !== "active") continue;
      const phaseTasks = project.phases
        .flatMap(ph => ph.tasks)
        .filter(t => t.status !== "done");
      const sorted = sortTasksByPriorityAndDependencies(phaseTasks, completedTaskIds);
      for (const task of sorted) {
        allTasks.push({ task, project });
      }
    }

    if (allTasks.length === 0) return [];

    // Construire le calendrier jour par jour
    const today = new Date(startDate + "T00:00:00");
    let taskIndex = 0;
    let remainingMinutes: Map<string, number> = new Map(
      allTasks.map(({ task }) => [task.id, task.estimatedMinutes])
    );

    for (let dayOffset = 0; dayOffset < horizonDays; dayOffset++) {
      if (taskIndex >= allTasks.length) break;

      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() + dayOffset);
      const dateStr = dayDate.toISOString().slice(0, 10);

      const daySchedule = buildDaySchedule(dateStr, prefs, blocked, sessions);
      if (daySchedule.freeSlots.length === 0) continue;

      let dailyWorkMinutes = daySchedule.usedMinutes;
      const maxDaily = prefs.maxDailyWorkHours * 60;

      for (const slot of daySchedule.freeSlots) {
        if (taskIndex >= allTasks.length) break;
        if (dailyWorkMinutes >= maxDaily) break;

        let slotStart = slot.start;
        const slotEnd = slot.end;

        while (slotStart < slotEnd && taskIndex < allTasks.length) {
          if (dailyWorkMinutes >= maxDaily) break;

          const { task, project } = allTasks[taskIndex];
          const remaining = remainingMinutes.get(task.id) ?? task.estimatedMinutes;
          if (remaining <= 0) {
            taskIndex++;
            continue;
          }

          // Vérifier les dépendances : si des tâches requises ne sont pas dans completedTaskIds, skip
          const depsReady = task.dependencies.every(
            depId => completedTaskIds.has(depId) ||
              sessions.some(s => s.taskId === depId && s.status === "completed")
          );
          if (!depsReady) {
            taskIndex++;
            continue;
          }

          const available = Math.min(slotEnd - slotStart, maxDaily - dailyWorkMinutes);
          if (available < 15) break;  // Créneau trop petit

          const sessionDuration = Math.min(
            remaining,
            Math.min(available, prefs.preferredSessionDuration)
          );

          if (sessionDuration < 15) {
            slotStart += available;
            break;
          }

          const session: WorkSession = {
            id: uuidv4(),
            projectId: project.id,
            taskId: task.id,
            title: task.title,
            description: task.description,
            date: dateStr,
            startTime: fromMinutes(slotStart),
            endTime: fromMinutes(slotStart + sessionDuration),
            durationMinutes: sessionDuration,
            status: "scheduled",
            completed: false,
            thoughts: [],
          };

          sessions.push(session);
          dailyWorkMinutes += sessionDuration;
          slotStart += sessionDuration + prefs.breakBetweenSessions;

          const newRemaining = remaining - sessionDuration;
          remainingMinutes.set(task.id, newRemaining);

          if (newRemaining <= 0) {
            taskIndex++;
          }
        }
      }
    }

    return sessions;
  }

  /**
   * Calcule combien d'heures nettes sont disponibles cette semaine.
   */
  getWeeklyAvailableHours(prefs: WorkPreferences, blocked: BlockedPeriod[]): number {
    const today = new Date();
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const sched = buildDaySchedule(dateStr, prefs, blocked, []);
      total += sched.freeSlots.reduce((a, s) => a + (s.end - s.start), 0);
    }
    return Math.round(total / 60);
  }

  /**
   * Détecte les conflits dans un ensemble de sessions planifiées.
   */
  detectConflicts(sessions: WorkSession[]): string[] {
    const conflicts: string[] = [];
    const byDate: Record<string, WorkSession[]> = {};
    for (const s of sessions) {
      if (!byDate[s.date]) byDate[s.date] = [];
      byDate[s.date].push(s);
    }
    for (const [date, daySessions] of Object.entries(byDate)) {
      const sorted = [...daySessions].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i];
        const b = sorted[i + 1];
        if (toMinutes(a.endTime) > toMinutes(b.startTime)) {
          conflicts.push(`Chevauchement le ${date}: ${a.title} et ${b.title}`);
        }
      }
    }
    return conflicts;
  }

  /**
   * Recalcule le temps restant pour un projet.
   */
  getProjectRemainingMinutes(project: Project): number {
    return project.phases
      .flatMap(ph => ph.tasks)
      .filter(t => t.status !== "done")
      .reduce((a, t) => a + t.estimatedMinutes, 0);
  }

  /**
   * Estime la date de fin d'un projet selon les disponibilités.
   */
  estimateProjectEndDate(
    project: Project,
    prefs: WorkPreferences,
    blocked: BlockedPeriod[]
  ): string | null {
    const remainingMins = this.getProjectRemainingMinutes(project);
    if (remainingMins === 0) return new Date().toISOString().slice(0, 10);

    const today = new Date();
    let accumulated = 0;

    for (let i = 0; i < 180; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const sched = buildDaySchedule(dateStr, prefs, blocked, []);
      const available = Math.min(
        sched.freeSlots.reduce((a, s) => a + (s.end - s.start), 0),
        prefs.maxDailyWorkHours * 60
      );
      accumulated += available;
      if (accumulated >= remainingMins) return dateStr;
    }

    return null;
  }
}

export const schedulingEngine = new SchedulingEngine();
