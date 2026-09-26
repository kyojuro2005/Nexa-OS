import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type {
  User, WorkPreferences, Project, Task, Phase, WorkSession,
  BlockedPeriod, UserStats, ChatMessage, DayAvailability,
  ViewId, AppState, AIAnalysis, Subtask,
  AIProvider, AIProviderId, AppNotification,
} from "../types";
import { schedulingEngine } from "../lib/schedulingEngine";
import { signOutUser } from "../lib/supabase";
import {
  syncUserProfile, syncWorkPreferences, syncProjects,
  syncSessions, syncBlockedPeriods, syncStats,
  fetchUserProfile, fetchWorkPreferences, fetchProjects,
  fetchSessions, fetchBlockedPeriods, fetchStats
} from "../lib/supabaseSync";

// ══════════════════════════════════════════════════════════════════════
// Données de démonstration (pour une première utilisation enrichie)
// ══════════════════════════════════════════════════════════════════════

const DEFAULT_AVAILABILITY: DayAvailability[] = [
  {
    day: "lun", enabled: true,
    slots: [
      { start: "09:00", end: "12:00", type: "available" },
      { start: "12:00", end: "14:00", type: "break", label: "Déjeuner" },
      { start: "14:00", end: "18:00", type: "available" },
    ],
  },
  {
    day: "mar", enabled: true,
    slots: [
      { start: "09:00", end: "12:00", type: "available" },
      { start: "12:00", end: "14:00", type: "break", label: "Déjeuner" },
      { start: "14:00", end: "18:00", type: "available" },
    ],
  },
  {
    day: "mer", enabled: true,
    slots: [
      { start: "09:00", end: "12:00", type: "available" },
      { start: "12:00", end: "14:00", type: "break", label: "Déjeuner" },
      { start: "14:00", end: "18:00", type: "available" },
    ],
  },
  {
    day: "jeu", enabled: true,
    slots: [
      { start: "09:00", end: "12:00", type: "available" },
      { start: "12:00", end: "14:00", type: "break", label: "Déjeuner" },
      { start: "14:00", end: "18:00", type: "available" },
    ],
  },
  {
    day: "ven", enabled: true,
    slots: [
      { start: "09:00", end: "12:30", type: "available" },
      { start: "12:30", end: "14:00", type: "break", label: "Déjeuner" },
      { start: "14:00", end: "17:00", type: "available" },
    ],
  },
  { day: "sam", enabled: false, slots: [] },
  { day: "dim", enabled: false, slots: [] },
];

const DEFAULT_PREFS: WorkPreferences = {
  availability: DEFAULT_AVAILABILITY,
  preferredSessionDuration: 90,
  maxSessionDuration: 120,
  breakBetweenSessions: 15,
  peakHoursStart: "09:00",
  peakHoursEnd: "12:00",
  maxDailyWorkHours: 6,
  maxWeeklyWorkHours: 24,
  strictRestMode: true,
};

// ══════════════════════════════════════════════════════════════════════
// Store interface
// ══════════════════════════════════════════════════════════════════════
interface NexaStore {
  // ── État de l'app ──
  ui: AppState;
  setView: (view: ViewId, extra?: Partial<AppState>) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setSearchQuery: (q: string) => void;

  // ── Utilisateur ──
  user: User | null;
  workPreferences: WorkPreferences;
  setUser: (u: User) => void;
  updateUser: (patch: Partial<User>) => void;
  setWorkPreferences: (prefs: WorkPreferences) => void;
  logout: () => void;

  // ── Projets ──
  projects: Project[];
  addProject: (p: Omit<Project, "id" | "createdAt" | "updatedAt" | "progressPercent" | "totalActualMinutes" | "conversationHistory">) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addPhase: (projectId: string, phase: Omit<Phase, "id">) => Phase;
  addTask: (projectId: string, phaseId: string, task: Omit<Task, "id" | "createdAt" | "updatedAt" | "actualMinutes">) => Task;
  updateTask: (projectId: string, taskId: string, patch: Partial<Task>) => void;
  completeTask: (projectId: string, taskId: string, actualMinutes?: number) => void;
  addSubtask: (projectId: string, taskId: string, title: string) => void;
  toggleSubtask: (projectId: string, taskId: string, subtaskId: string) => void;
  setAIAnalysis: (projectId: string, analysis: AIAnalysis) => void;
  addMessage: (projectId: string, msg: Omit<ChatMessage, "id" | "timestamp">) => void;

  // ── Sessions ──
  sessions: WorkSession[];
  addSession: (s: Omit<WorkSession, "id">) => WorkSession;
  updateSession: (id: string, patch: Partial<WorkSession>) => void;
  completeSession: (id: string, actualMinutes: number, notes?: string) => void;
  deferSession: (id: string, newDate: string, newStart: string) => void;
  deleteSession: (id: string) => void;
  getTodaySessions: () => WorkSession[];
  getUpcomingSessions: (days?: number) => WorkSession[];

  // ── Périodes bloquées ──
  blockedPeriods: BlockedPeriod[];
  addBlockedPeriod: (bp: Omit<BlockedPeriod, "id">) => void;
  removeBlockedPeriod: (id: string) => void;

  // ── Stats ──
  stats: UserStats;
  refreshStats: () => void;

  // ── Recalcul du planning ──
  recalculatePlanning: () => void;

  // ── Providers IA (remplace openAIKey) ──
  aiProviders: AIProvider[];          // liste des providers configurés
  activeProviderId: AIProviderId | null;
  setAIProvider: (id: AIProviderId, key: string) => void;
  removeAIProvider: (id: AIProviderId) => void;
  /** @deprecated – garde pour compat onboarding, renvoie la clé du provider actif */
  openAIKey: string;
  setOpenAIKey: (key: string) => void;

  // ── Notifications ──
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  // ── Thème ──
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;

  // ── Cloud Supabase ──
  cloudSyncStatus: { syncing: boolean; lastSync: string | null; error: string | null };
  syncToCloud: () => Promise<void>;
  loadFromCloud: (userId: string) => Promise<void>;
  clearTestProjects: () => void;
}

// ══════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════

function computeProgress(phases: Phase[]): number {
  const allTasks = phases.flatMap(p => p.tasks);
  if (allTasks.length === 0) return 0;
  const done = allTasks.filter(t => t.status === "done").length;
  return Math.round((done / allTasks.length) * 100);
}


// ══════════════════════════════════════════════════════════════════════
// Store
// ══════════════════════════════════════════════════════════════════════
export const useAppStore = create<NexaStore>()(
  persist(
    (set, get) => ({
      // ── UI ──────────────────────────────────────────────────────────
      ui: {
        currentView: "onboarding",
        selectedProjectId: null,
        selectedTaskId: null,
        activeSessionId: null,
        sidebarCollapsed: false,
        searchQuery: "",
      },

      setView: (view, extra = {}) =>
        set(s => ({ ui: { ...s.ui, currentView: view, ...extra } })),

      setSidebarCollapsed: (v) =>
        set(s => ({ ui: { ...s.ui, sidebarCollapsed: v } })),

      setSearchQuery: (q) =>
        set(s => ({ ui: { ...s.ui, searchQuery: q } })),

      // ── User ─────────────────────────────────────────────────────────
      user: null,
      workPreferences: DEFAULT_PREFS,

      setUser: (u) => {
        // Nettoyer les projets et sessions de démo résiduels
        const cleanedProjects = get().projects.filter(
          p => !p.id.includes("demo") && !p.id.toLowerCase().includes("leadorapro")
        );
        const cleanedSessions = get().sessions.filter(
          s => !s.id.includes("demo") && !s.projectId?.toLowerCase().includes("leadorapro")
        );

        set({
          user: u,
          projects: cleanedProjects,
          sessions: cleanedSessions,
          ui: {
            ...get().ui,
            currentView: u.onboardingComplete ? "dashboard" : "onboarding",
          },
        });

        // Charger les données distantes Supabase si utilisateur connecté
        if (u.id && u.id !== "guest-user") {
          setTimeout(() => {
            get().loadFromCloud(u.id);
          }, 100);
        }
      },

      updateUser: (patch) => {
        set(s => ({ user: s.user ? { ...s.user, ...patch } : s.user }));
        const u = get().user;
        if (u && u.id && u.id !== "guest-user") {
          syncUserProfile(u);
        }
      },

      setWorkPreferences: (prefs) => {
        set({ workPreferences: prefs });
        get().recalculatePlanning();
        const u = get().user;
        if (u && u.id && u.id !== "guest-user") {
          syncWorkPreferences(u.id, prefs);
        }
      },

      logout: () => {
        try {
          signOutUser();
        } catch {}
        set({
          user: null,
          ui: { ...get().ui, currentView: "auth", selectedProjectId: null, activeSessionId: null },
        });
      },

      clearTestProjects: () => {
        set(s => ({
          projects: s.projects.filter(
            p => !p.id.includes("demo") && !p.id.toLowerCase().includes("leadorapro")
          ),
          sessions: s.sessions.filter(
            s => !s.id.includes("demo") && !s.projectId?.toLowerCase().includes("leadorapro")
          ),
        }));
        get().recalculatePlanning();
      },

      // ── Cloud Supabase ──
      cloudSyncStatus: {
        syncing: false,
        lastSync: null,
        error: null,
      },

      syncToCloud: async () => {
        const { user, workPreferences, projects, sessions, blockedPeriods, stats } = get();
        if (!user || !user.id || user.id === "guest-user") return;

        set(s => ({ cloudSyncStatus: { ...s.cloudSyncStatus, syncing: true, error: null } }));
        try {
          await Promise.allSettled([
            syncUserProfile(user),
            syncWorkPreferences(user.id, workPreferences),
            syncProjects(user.id, projects),
            syncSessions(user.id, sessions),
            syncBlockedPeriods(user.id, blockedPeriods),
            syncStats(user.id, stats),
          ]);
          set({
            cloudSyncStatus: {
              syncing: false,
              lastSync: new Date().toISOString(),
              error: null,
            },
          });
        } catch (err: any) {
          set({
            cloudSyncStatus: {
              syncing: false,
              lastSync: get().cloudSyncStatus.lastSync,
              error: err?.message || "Erreur de synchronisation",
            },
          });
        }
      },

      loadFromCloud: async (userId: string) => {
        if (!userId || userId === "guest-user") return;

        set(s => ({ cloudSyncStatus: { ...s.cloudSyncStatus, syncing: true, error: null } }));
        try {
          const [remoteProfile, remotePrefs, remoteProjects, remoteSessions, remoteBlocked, remoteStats] =
            await Promise.all([
              fetchUserProfile(userId),
              fetchWorkPreferences(userId),
              fetchProjects(userId),
              fetchSessions(userId),
              fetchBlockedPeriods(userId),
              fetchStats(userId),
            ]);

          const patch: any = {};
          if (remoteProfile && get().user) {
            patch.user = { ...get().user!, ...remoteProfile };
          }
          if (remotePrefs) {
            patch.workPreferences = remotePrefs;
          }
          if (remoteProjects && remoteProjects.length > 0) {
            patch.projects = remoteProjects.filter(
              p => !p.id.includes("demo") && !p.id.toLowerCase().includes("leadorapro")
            );
          }
          if (remoteSessions && remoteSessions.length > 0) {
            patch.sessions = remoteSessions.filter(
              s => !s.id.includes("demo") && !s.projectId?.toLowerCase().includes("leadorapro")
            );
          }
          if (remoteBlocked && remoteBlocked.length > 0) {
            patch.blockedPeriods = remoteBlocked;
          }
          if (remoteStats) {
            patch.stats = remoteStats;
          }

          set(patch);
          set({
            cloudSyncStatus: {
              syncing: false,
              lastSync: new Date().toISOString(),
              error: null,
            },
          });
          get().recalculatePlanning();
        } catch (err: any) {
          console.warn("loadFromCloud notice:", err);
          set({
            cloudSyncStatus: {
              syncing: false,
              lastSync: null,
              error: err?.message || "Erreur chargement cloud",
            },
          });
        }
      },

      // ── Projects ──────────────────────────────────────────────────────
      projects: [],

      addProject: (p) => {
        const project: Project = {
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          progressPercent: 0,
          totalActualMinutes: 0,
          conversationHistory: [],
          ...p,
        };
        set(s => ({ projects: [...s.projects, project] }));
        setTimeout(() => {
          get().recalculatePlanning();
          get().syncToCloud();
        }, 100);
        return project;
      },

      updateProject: (id, patch) => {
        set(s => ({
          projects: s.projects.map(p =>
            p.id === id
              ? {
                  ...p, ...patch,
                  updatedAt: new Date().toISOString(),
                  progressPercent: patch.phases ? computeProgress(patch.phases) : p.progressPercent,
                }
              : p
          ),
        }));
        setTimeout(() => get().syncToCloud(), 500);
      },

      deleteProject: (id) => {
        const u = get().user;
        if (u && u.id && u.id !== "guest-user") {
          import("../lib/supabaseSync").then(m => m.deleteProjectFromCloud(u.id, id));
        }
        set(s => ({
          projects: s.projects.filter(p => p.id !== id),
          sessions: s.sessions.filter(s => s.projectId !== id),
        }));
        setTimeout(() => {
          get().recalculatePlanning();
          get().syncToCloud();
        }, 100);
      },

      addPhase: (projectId, phase) => {
        const newPhase: Phase = { id: uuidv4(), ...phase };
        set(s => ({
          projects: s.projects.map(p =>
            p.id === projectId
              ? {
                  ...p,
                  phases: [...p.phases, newPhase],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
        return newPhase;
      },

      addTask: (projectId, phaseId, task) => {
        const newTask: Task = {
          ...task,
          id: uuidv4(),
          projectId,
          phaseId,
          actualMinutes: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(s => ({
          projects: s.projects.map(p => {
            if (p.id !== projectId) return p;
            const phases = p.phases.map(ph =>
              ph.id === phaseId
                ? { ...ph, tasks: [...ph.tasks, newTask] }
                : ph
            );
            return {
              ...p,
              phases,
              progressPercent: computeProgress(phases),
              totalEstimatedMinutes: phases.flatMap(ph => ph.tasks).reduce((a, t) => a + t.estimatedMinutes, 0),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        setTimeout(() => get().recalculatePlanning(), 50);
        return newTask;
      },

      updateTask: (projectId, taskId, patch) => {
        set(s => ({
          projects: s.projects.map(p => {
            if (p.id !== projectId) return p;
            const phases = p.phases.map(ph => ({
              ...ph,
              tasks: ph.tasks.map(t =>
                t.id === taskId
                  ? { ...t, ...patch, updatedAt: new Date().toISOString() }
                  : t
              ),
            }));
            return {
              ...p,
              phases,
              progressPercent: computeProgress(phases),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      completeTask: (projectId, taskId, actualMinutes) => {
        set(s => ({
          projects: s.projects.map(p => {
            if (p.id !== projectId) return p;
            const phases = p.phases.map(ph => ({
              ...ph,
              tasks: ph.tasks.map(t =>
                t.id === taskId
                  ? {
                      ...t,
                      status: "done" as const,
                      completedAt: new Date().toISOString(),
                      actualMinutes: actualMinutes ?? t.estimatedMinutes,
                      updatedAt: new Date().toISOString(),
                    }
                  : t
              ),
            }));
            const progress = computeProgress(phases);
            return {
              ...p,
              phases,
              progressPercent: progress,
              totalActualMinutes: p.totalActualMinutes + (actualMinutes ?? 0),
              status: progress === 100 ? "completed" as const : p.status,
              completedAt: progress === 100 ? new Date().toISOString() : p.completedAt,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        // Libérer les sessions futures si la tâche est terminée
        const sessions = get().sessions;
        const futureSessions = sessions.filter(
          s => s.taskId === taskId && s.status === "scheduled"
        );
        if (futureSessions.length > 0) {
          set(s => ({
            sessions: s.sessions.map(s =>
              s.taskId === taskId && s.status === "scheduled"
                ? { ...s, status: "skipped" as const }
                : s
            ),
          }));
        }
        get().refreshStats();
        setTimeout(() => get().recalculatePlanning(), 50);
      },

      addSubtask: (projectId, taskId, title) => {
        const sub: Subtask = { id: uuidv4(), title, done: false };
        set(s => ({
          projects: s.projects.map(p => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              phases: p.phases.map(ph => ({
                ...ph,
                tasks: ph.tasks.map(t =>
                  t.id === taskId
                    ? { ...t, subtasks: [...t.subtasks, sub] }
                    : t
                ),
              })),
            };
          }),
        }));
      },

      toggleSubtask: (projectId, taskId, subtaskId) => {
        set(s => ({
          projects: s.projects.map(p => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              phases: p.phases.map(ph => ({
                ...ph,
                tasks: ph.tasks.map(t =>
                  t.id === taskId
                    ? {
                        ...t,
                        subtasks: t.subtasks.map(sub =>
                          sub.id === subtaskId ? { ...sub, done: !sub.done } : sub
                        ),
                      }
                    : t
                ),
              })),
            };
          }),
        }));
      },

      setAIAnalysis: (projectId, analysis) => {
        set(s => ({
          projects: s.projects.map(p =>
            p.id === projectId ? { ...p, aiAnalysis: analysis } : p
          ),
        }));
      },

      addMessage: (projectId, msg) => {
        const message: ChatMessage = {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          ...msg,
        };
        set(s => ({
          projects: s.projects.map(p =>
            p.id === projectId
              ? { ...p, conversationHistory: [...p.conversationHistory, message] }
              : p
          ),
        }));
        return message;
      },

      // ── Sessions ──────────────────────────────────────────────────────
      sessions: [],

      addSession: (s) => {
        const session: WorkSession = { id: uuidv4(), ...s };
        set(state => ({ sessions: [...state.sessions, session] }));
        return session;
      },

      updateSession: (id, patch) =>
        set(s => ({
          sessions: s.sessions.map(s => s.id === id ? { ...s, ...patch } : s),
        })),

      completeSession: (id, actualMinutes, notes) => {
        const session = get().sessions.find(s => s.id === id);
        if (!session) return;
        set(s => ({
          sessions: s.sessions.map(s =>
            s.id === id
              ? {
                  ...s,
                  status: "completed" as const,
                  completed: true,
                  actualDurationMinutes: actualMinutes,
                  completionNotes: notes,
                }
              : s
          ),
        }));
        // Si la durée réelle dépasse la durée prévue → recalcul
        if (actualMinutes > session.durationMinutes) {
          setTimeout(() => get().recalculatePlanning(), 100);
        }
        get().refreshStats();
      },

      deferSession: (id, newDate, newStart) => {
        const session = get().sessions.find(s => s.id === id);
        if (!session) return;
        const dur = session.durationMinutes;
        const [h, m] = newStart.split(":").map(Number);
        const endMin = h * 60 + m + dur;
        const endH = Math.floor(endMin / 60);
        const endM = endMin % 60;
        const newEnd = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
        set(s => ({
          sessions: s.sessions.map(s =>
            s.id === id
              ? { ...s, status: "deferred" as const, date: newDate, startTime: newStart, endTime: newEnd }
              : s
          ),
        }));
        get().refreshStats();
      },

      deleteSession: (id) =>
        set(s => ({ sessions: s.sessions.filter(s => s.id !== id) })),

      getTodaySessions: () => {
        const today = new Date().toISOString().slice(0, 10);
        return get().sessions
          .filter(s => s.date === today && s.status !== "skipped")
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
      },

      getUpcomingSessions: (days = 7) => {
        const today = new Date();
        const sessions: WorkSession[] = [];
        for (let i = 0; i < days; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          const dateStr = d.toISOString().slice(0, 10);
          const daySessions = get().sessions.filter(
            s => s.date === dateStr && s.status === "scheduled"
          );
          sessions.push(...daySessions);
        }
        return sessions.sort((a, b) =>
          a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)
        );
      },

      // ── Blocked periods ────────────────────────────────────────────────
      blockedPeriods: [],

      addBlockedPeriod: (bp) =>
        set(s => ({
          blockedPeriods: [...s.blockedPeriods, { id: uuidv4(), ...bp }],
        })),

      removeBlockedPeriod: (id) =>
        set(s => ({
          blockedPeriods: s.blockedPeriods.filter(b => b.id !== id),
        })),

      // ── Stats ──────────────────────────────────────────────────────────
      stats: {
        totalWorkMinutes: 0,
        sessionsCompleted: 0,
        sessionsDeferred: 0,
        projectsCompleted: 0,
        tasksCompleted: 0,
        averageSessionAccuracy: 1,
        weeklyWorkMinutes: [0, 0, 0, 0, 0, 0, 0],
        estimationFactor: 1,
      },

      refreshStats: () => {
        const { sessions, projects } = get();
        const completed = sessions.filter(s => s.status === "completed");
        const totalWork = completed.reduce((a, s) => a + (s.actualDurationMinutes ?? s.durationMinutes), 0);
        const accuracies = completed
          .filter(s => s.actualDurationMinutes != null)
          .map(s => (s.actualDurationMinutes! / s.durationMinutes));
        const avgAccuracy = accuracies.length ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length : 1;

        // Calcul des 7 derniers jours
        const weekly: number[] = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);
          const mins = completed
            .filter(s => s.date === dateStr)
            .reduce((a, s) => a + (s.actualDurationMinutes ?? s.durationMinutes), 0);
          weekly.push(mins);
        }

        set({
          stats: {
            totalWorkMinutes: totalWork,
            sessionsCompleted: completed.length,
            sessionsDeferred: sessions.filter(s => s.status === "deferred").length,
            projectsCompleted: projects.filter(p => p.status === "completed").length,
            tasksCompleted: projects.flatMap(p => p.phases.flatMap(ph => ph.tasks)).filter(t => t.status === "done").length,
            averageSessionAccuracy: avgAccuracy,
            weeklyWorkMinutes: weekly,
            estimationFactor: avgAccuracy,
          },
        });
      },

      // ── Recalcul planning ──────────────────────────────────────────────
      recalculatePlanning: () => {
        const { projects, workPreferences, blockedPeriods, sessions } = get();
        const activeProjects = projects.filter(p => p.status === "active");
        if (activeProjects.length === 0) return;

        // Supprimer les sessions futures non-complétées
        const today = new Date().toISOString().slice(0, 10);
        const pastSessions = sessions.filter(
          s => s.date < today || s.status === "completed" || s.status === "skipped"
        );

        // Générer nouvelles sessions
        const newSessions = schedulingEngine.generateSessions(
          activeProjects,
          workPreferences,
          blockedPeriods,
          today,
          28 // horizont de 4 semaines
        );

        set({ sessions: [...pastSessions, ...newSessions] });
      },

      // ── Providers IA ──────────────────────────────────────────────────
      aiProviders: [] as AIProvider[],
      activeProviderId: null as AIProviderId | null,

      setAIProvider: (id: AIProviderId, key: string) => {
        set(s => {
          const exists = s.aiProviders.find(p => p.id === id);
          const providerName: Record<AIProviderId, string> = {
            openai: "ChatGPT (OpenAI)",
            gemini: "Gemini (Google)",
            claude: "Claude (Anthropic)",
            deepseek: "DeepSeek",
          };
          const updated: AIProvider[] = exists
            ? s.aiProviders.map(p => p.id === id ? { ...p, apiKey: key } : p)
            : [...s.aiProviders, { id, name: providerName[id], apiKey: key }];
          return { aiProviders: updated, activeProviderId: id };
        });
      },

      removeAIProvider: (id: AIProviderId) => {
        set(s => ({
          aiProviders: s.aiProviders.filter(p => p.id !== id),
          activeProviderId: s.activeProviderId === id ? null : s.activeProviderId,
        }));
      },

      // openAIKey — compat legacy
      openAIKey: "",
      setOpenAIKey: (key: string) => {
        const state = get();
        const targetId: AIProviderId = state.activeProviderId ?? "openai";
        state.setAIProvider(targetId, key);
        set({ openAIKey: key });
      },

      // ── Notifications ──────────────────────────────────────────────────
      notifications: [] as AppNotification[],

      addNotification: (n) => {
        const notification: AppNotification = {
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          read: false,
          ...n,
        };
        set(s => ({ notifications: [notification, ...s.notifications].slice(0, 50) }));
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          (window.Notification as any).permission === "granted"
        ) {
          try {
            new (window.Notification as any)(`Nexa OS — ${notification.title}`, {
              body: notification.body,
              icon: "/nexawbg.png",
            });
          } catch {}
        }
      },

      markNotificationRead: (id: string) =>
        set(s => ({
          notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
        })),

      markAllNotificationsRead: () =>
        set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) })),

      clearNotifications: () => set({ notifications: [] as AppNotification[] }),

      // ── Thème ──────────────────────────────────────────────────────────
      theme: "light" as "light" | "dark",

      setTheme: (t: "light" | "dark") => {
        set({ theme: t });
        if (t === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },
    }),

    {
      name: "nexa-os-storage",
      partialize: (state) => ({
        user: state.user,
        workPreferences: state.workPreferences,
        projects: state.projects,
        sessions: state.sessions,
        blockedPeriods: state.blockedPeriods,
        stats: state.stats,
        aiProviders: state.aiProviders,
        activeProviderId: state.activeProviderId,
        openAIKey: state.openAIKey,
        notifications: state.notifications,
        theme: state.theme,
      }),
    }
  )
);
