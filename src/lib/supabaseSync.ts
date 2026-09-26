// ══════════════════════════════════════════════════════════════════════
// NEXA OS — Synchronisation des données avec Supabase
// Permet de persister et synchroniser toutes les données de l'application
// (profil, préférences, projets, phases, tâches, sessions, périodes)
// ══════════════════════════════════════════════════════════════════════

import { supabase } from "./supabase";
import type {
  User, WorkPreferences, Project, WorkSession,
  BlockedPeriod, UserStats
} from "../types";

export interface SyncStatus {
  lastSyncAt: string | null;
  syncing: boolean;
  error: string | null;
}

// ── Profil utilisateur ─────────────────────────────────────────────────

export async function syncUserProfile(user: User): Promise<boolean> {
  try {
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatarUrl ?? null,
      theme: user.theme ?? "light",
      timezone: user.timezone ?? "Europe/Paris",
      onboarding_complete: user.onboardingComplete ?? true,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn("syncUserProfile notice:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("syncUserProfile catch:", err.message);
    return false;
  }
}

export async function fetchUserProfile(userId: string): Promise<Partial<User> | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      avatarUrl: data.avatar_url,
      theme: data.theme,
      timezone: data.timezone,
      onboardingComplete: data.onboarding_complete,
    };
  } catch {
    return null;
  }
}

// ── Préférences de travail ─────────────────────────────────────────────

export async function syncWorkPreferences(userId: string, prefs: WorkPreferences): Promise<boolean> {
  try {
    const { error } = await supabase.from("work_preferences").upsert({
      user_id: userId,
      availability: prefs.availability,
      preferred_session_duration: prefs.preferredSessionDuration,
      max_session_duration: prefs.maxSessionDuration,
      break_between_sessions: prefs.breakBetweenSessions,
      peak_hours_start: prefs.peakHoursStart,
      peak_hours_end: prefs.peakHoursEnd,
      max_daily_work_hours: prefs.maxDailyWorkHours,
      max_weekly_work_hours: prefs.maxWeeklyWorkHours,
      strict_rest_mode: prefs.strictRestMode,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) {
      console.warn("syncWorkPreferences notice:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("syncWorkPreferences catch:", err.message);
    return false;
  }
}

export async function fetchWorkPreferences(userId: string): Promise<WorkPreferences | null> {
  try {
    const { data, error } = await supabase
      .from("work_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      availability: data.availability,
      preferredSessionDuration: data.preferred_session_duration,
      maxSessionDuration: data.max_session_duration,
      breakBetweenSessions: data.break_between_sessions,
      peakHoursStart: data.peak_hours_start,
      peakHoursEnd: data.peak_hours_end,
      maxDailyWorkHours: Number(data.max_daily_work_hours),
      maxWeeklyWorkHours: Number(data.max_weekly_work_hours),
      strictRestMode: data.strict_rest_mode,
    };
  } catch {
    return null;
  }
}

// ── Projets ────────────────────────────────────────────────────────────

export async function syncProjects(userId: string, projects: Project[]): Promise<boolean> {
  try {
    if (!projects || projects.length === 0) return true;

    const rows = projects.map(p => ({
      id: p.id,
      user_id: userId,
      title: p.title,
      description: p.description ?? "",
      type: p.type ?? "Projet",
      status: p.status,
      priority: p.priority,
      progress_percent: p.progressPercent,
      phases: p.phases ?? [],
      target_date: p.targetDate ?? null,
      color: p.color ?? "#3525cd",
      total_estimated_minutes: p.totalEstimatedMinutes ?? 0,
      total_actual_minutes: p.totalActualMinutes ?? 0,
      ai_analysis: p.aiAnalysis ?? null,
      conversation_history: p.conversationHistory ?? [],
      created_at: p.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("projects").upsert(rows, { onConflict: "id" });
    if (error) {
      console.warn("syncProjects notice:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("syncProjects catch:", err.message);
    return false;
  }
}

export async function fetchProjects(userId: string): Promise<Project[] | null> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return null;
    return data.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      priority: row.priority,
      progressPercent: row.progress_percent,
      phases: row.phases || [],
      targetDate: row.target_date,
      color: row.color,
      totalEstimatedMinutes: row.total_estimated_minutes,
      totalActualMinutes: row.total_actual_minutes,
      aiAnalysis: row.ai_analysis,
      conversationHistory: row.conversation_history || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return null;
  }
}

export async function deleteProjectFromCloud(userId: string, projectId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("user_id", userId);
    return !error;
  } catch {
    return false;
  }
}

// ── Sessions de travail ────────────────────────────────────────────────

export async function syncSessions(userId: string, sessions: WorkSession[]): Promise<boolean> {
  try {
    if (!sessions || sessions.length === 0) return true;

    const rows = sessions.map(s => ({
      id: s.id,
      user_id: userId,
      project_id: s.projectId ?? null,
      task_id: s.taskId ?? null,
      title: s.title,
      description: s.description ?? "",
      date: s.date,
      start_time: s.startTime,
      end_time: s.endTime,
      duration_minutes: s.durationMinutes,
      status: s.status,
      actual_duration_minutes: s.actualDurationMinutes ?? null,
      completion_notes: s.completionNotes ?? null,
      completed: s.completed ?? false,
      thoughts: s.thoughts ?? [],
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("work_sessions").upsert(rows, { onConflict: "id" });
    if (error) {
      console.warn("syncSessions notice:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("syncSessions catch:", err.message);
    return false;
  }
}

export async function fetchSessions(userId: string): Promise<WorkSession[] | null> {
  try {
    const { data, error } = await supabase
      .from("work_sessions")
      .select("*")
      .eq("user_id", userId);

    if (error || !data) return null;
    return data.map(row => ({
      id: row.id,
      projectId: row.project_id,
      taskId: row.task_id,
      title: row.title,
      description: row.description,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      durationMinutes: row.duration_minutes,
      status: row.status,
      actualDurationMinutes: row.actual_duration_minutes,
      completionNotes: row.completion_notes,
      completed: row.completed,
      thoughts: row.thoughts || [],
    }));
  } catch {
    return null;
  }
}

// ── Périodes bloquées ─────────────────────────────────────────────────

export async function syncBlockedPeriods(userId: string, periods: BlockedPeriod[]): Promise<boolean> {
  try {
    if (!periods || periods.length === 0) return true;

    const rows = periods.map(p => ({
      id: p.id,
      user_id: userId,
      date: p.date,
      start_time: p.startTime ?? null,
      end_time: p.endTime ?? null,
      label: p.label,
      type: p.type ?? "personal",
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("blocked_periods").upsert(rows, { onConflict: "id" });
    if (error) {
      console.warn("syncBlockedPeriods notice:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("syncBlockedPeriods catch:", err.message);
    return false;
  }
}

export async function fetchBlockedPeriods(userId: string): Promise<BlockedPeriod[] | null> {
  try {
    const { data, error } = await supabase
      .from("blocked_periods")
      .select("*")
      .eq("user_id", userId);

    if (error || !data) return null;
    return data.map(row => ({
      id: row.id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      label: row.label,
      type: row.type,
    }));
  } catch {
    return null;
  }
}

// ── Statistiques ──────────────────────────────────────────────────────

export async function syncStats(userId: string, stats: UserStats): Promise<boolean> {
  try {
    const { error } = await supabase.from("user_stats").upsert({
      user_id: userId,
      total_work_minutes: stats.totalWorkMinutes,
      sessions_completed: stats.sessionsCompleted,
      sessions_deferred: stats.sessionsDeferred,
      projects_completed: stats.projectsCompleted,
      tasks_completed: stats.tasksCompleted,
      average_session_accuracy: stats.averageSessionAccuracy,
      weekly_work_minutes: stats.weeklyWorkMinutes,
      estimation_factor: stats.estimationFactor,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) {
      console.warn("syncStats notice:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("syncStats catch:", err.message);
    return false;
  }
}

export async function fetchStats(userId: string): Promise<UserStats | null> {
  try {
    const { data, error } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      totalWorkMinutes: data.total_work_minutes ?? 0,
      sessionsCompleted: data.sessions_completed ?? 0,
      sessionsDeferred: data.sessions_deferred ?? 0,
      projectsCompleted: data.projects_completed ?? 0,
      tasksCompleted: data.tasks_completed ?? 0,
      averageSessionAccuracy: Number(data.average_session_accuracy ?? 1.0),
      weeklyWorkMinutes: data.weekly_work_minutes ?? [0, 0, 0, 0, 0, 0, 0],
      estimationFactor: Number(data.estimation_factor ?? 1.0),
    };
  } catch {
    return null;
  }
}

// ── Synchronisation complète ──────────────────────────────────────────

export async function syncAllDataToCloud(params: {
  user: User;
  workPreferences: WorkPreferences;
  projects: Project[];
  sessions: WorkSession[];
  blockedPeriods: BlockedPeriod[];
  stats: UserStats;
}): Promise<boolean> {
  const { user, workPreferences, projects, sessions, blockedPeriods, stats } = params;
  if (!user || !user.id) return false;

  try {
    await Promise.allSettled([
      syncUserProfile(user),
      syncWorkPreferences(user.id, workPreferences),
      syncProjects(user.id, projects),
      syncSessions(user.id, sessions),
      syncBlockedPeriods(user.id, blockedPeriods),
      syncStats(user.id, stats),
    ]);
    return true;
  } catch (e) {
    console.warn("syncAllDataToCloud failed:", e);
    return false;
  }
}
