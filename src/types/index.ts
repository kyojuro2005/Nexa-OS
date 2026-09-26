// ══════════════════════════════════════════════════════════════════════
// NEXA OS — Types centraux
// ══════════════════════════════════════════════════════════════════════

// ── Utilisateur ────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;           // ex: "Tech Founder"
  avatarUrl?: string;
  theme: "light" | "dark";
  accentColor?: string;
  timezone: string;       // ex: "Europe/Paris"
  createdAt: string;      // ISO date
  onboardingComplete: boolean;
}

// ── Disponibilités ─────────────────────────────────────────────────────
export type DayOfWeek = "lun" | "mar" | "mer" | "jeu" | "ven" | "sam" | "dim";

export interface TimeSlot {
  start: string;   // "HH:MM"
  end: string;     // "HH:MM"
  type: "available" | "busy" | "break" | "blocked";
  label?: string;
}

export interface DayAvailability {
  day: DayOfWeek;
  enabled: boolean;
  slots: TimeSlot[];
}

export interface WorkPreferences {
  availability: DayAvailability[];
  preferredSessionDuration: number;  // minutes
  maxSessionDuration: number;        // minutes
  breakBetweenSessions: number;      // minutes
  peakHoursStart: string;            // "HH:MM"
  peakHoursEnd: string;              // "HH:MM"
  maxDailyWorkHours: number;         // heures
  maxWeeklyWorkHours: number;        // heures
  strictRestMode: boolean;
}

// ── Projets ────────────────────────────────────────────────────────────
export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type Priority = "critical" | "high" | "medium" | "low";
export type TaskStatus = "todo" | "in_progress" | "done" | "blocked" | "deferred";

export interface Task {
  id: string;
  projectId: string;
  phaseId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  estimatedMinutes: number;
  actualMinutes: number;
  dependencies: string[];  // task IDs
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  deferredTo?: string;     // ISO date
  subtasks: Subtask[];
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  detail?: string;
}

export interface Phase {
  id: string;
  projectId: string;
  title: string;
  order: number;
  status: "pending" | "active" | "completed";
  tasks: Task[];
  color?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  type: string;            // ex: "SaaS B2B", "PWA Mobile"
  status: ProjectStatus;
  priority: Priority;
  progressPercent: number;
  phases: Phase[];
  targetDate?: string;     // ISO date
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  color: string;           // couleur d'accent du projet
  totalEstimatedMinutes: number;
  totalActualMinutes: number;
  aiAnalysis?: AIAnalysis;
  conversationHistory: ChatMessage[];
}

// ── Analyse IA ─────────────────────────────────────────────────────────
export interface AIAnalysis {
  objective: string;
  features: string[];
  constraints: string[];
  technologies: string[];
  dependencies: string[];
  risks: AIRisk[];
  missingInfo: string[];
  complexity: "low" | "medium" | "high" | "very_high";
  estimatedTotalHours: number;
  generatedAt: string;
}

export interface AIRisk {
  title: string;
  description: string;
  severity: "blocking" | "important" | "optional";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  attachments?: string[];
}

// ── Sessions de travail ────────────────────────────────────────────────
export type SessionStatus = "scheduled" | "active" | "completed" | "skipped" | "deferred";

export interface WorkSession {
  id: string;
  projectId: string;
  taskId: string;
  title: string;
  description?: string;
  date: string;           // ISO date "YYYY-MM-DD"
  startTime: string;      // "HH:MM"
  endTime: string;        // "HH:MM"
  durationMinutes: number;
  status: SessionStatus;
  actualDurationMinutes?: number;
  completionNotes?: string;
  completed: boolean;
  thoughts: string[];     // idées spontanées capturées
}

// ── Calendrier bloqué ─────────────────────────────────────────────────
export interface BlockedPeriod {
  id: string;
  date: string;           // ISO date
  startTime?: string;     // si null = toute la journée
  endTime?: string;
  label: string;
  type: "personal" | "meeting" | "holiday" | "other";
}

// ── Statistiques ──────────────────────────────────────────────────────
export interface UserStats {
  totalWorkMinutes: number;
  sessionsCompleted: number;
  sessionsDeferred: number;
  projectsCompleted: number;
  tasksCompleted: number;
  averageSessionAccuracy: number;  // ratio estimé/réel
  weeklyWorkMinutes: number[];     // 7 derniers jours
  estimationFactor: number;        // ex: 1.3 = dépasse de 30% l'estimation
}

// ── Navigation ────────────────────────────────────────────────────────
export type ViewId =
  | "dashboard"
  | "nouveau-projet"
  | "analyse-ia"
  | "projets"
  | "projet-detail"
  | "calendrier"
  | "planification"
  | "disponibilites"
  | "bibliotheque"
  | "session-focus"
  | "parametres"
  | "onboarding"
  | "auth";

// ── Planning engine ───────────────────────────────────────────────────
export interface ScheduleConflict {
  type: "overload" | "dependency" | "deadline" | "overlap";
  message: string;
  affectedSessionIds: string[];
  suggestion?: string;
}

export interface DailyPlan {
  date: string;               // "YYYY-MM-DD"
  sessions: WorkSession[];
  breaks: TimeSlot[];
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  utilization: number;        // 0-1
  conflicts: ScheduleConflict[];
}

// ── App state global ──────────────────────────────────────────────────
export interface AppState {
  currentView: ViewId;
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  activeSessionId: string | null;
  sidebarCollapsed: boolean;
  searchQuery: string;
}

// ── Fournisseurs IA ───────────────────────────────────────────────────
export type AIProviderId = "openai" | "gemini" | "claude" | "deepseek";

export interface AIProvider {
  id: AIProviderId;
  name: string;
  apiKey: string;
}

// ── Notifications ─────────────────────────────────────────────────────
export type NotificationType = "session_start" | "session_reminder" | "task_done" | "project_done" | "planning_recalculated" | "info";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  projectId?: string;
  sessionId?: string;
}
