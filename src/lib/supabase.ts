// ══════════════════════════════════════════════════════════════════════
// NEXA OS — Client Supabase & Services d'Authentification
// ══════════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://slkrnnfhlrrjmdvokdso.supabase.co";

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsa3JubmZobHJyam1kdm9rZHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNzIwMTgsImV4cCI6MjEwNTk0ODAxOH0.rz93BzBLGjWiwZ4Z-8KqiXUAqxT6OzD-BomZVaSW03M";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ── Helpers d'authentification ─────────────────────────────────────────

export async function signUpWithEmail(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || splitEmail(email),
        name: fullName || splitEmail(email),
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) console.warn("Supabase signOut error:", error.message);
}

export async function getSupabaseSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn("Erreur session Supabase:", error.message);
    return null;
  }
  return data.session;
}

export async function getSupabaseUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function resetPasswordForEmail(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
  return data;
}

function splitEmail(email: string): string {
  const name = email.split("@")[0] || "Utilisateur";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// ── Upload d'avatar dans Supabase Storage ──────────────────────────────

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // Bust cache avec timestamp
  return `${data.publicUrl}?t=${Date.now()}`;
}
