// ══════════════════════════════════════════════════════════════════════
// NEXA OS — Page d'Authentification (Connexion, Inscription, Google OAuth)
// Respect strict des standards de design Luminous Focus & anti-clichés
// ══════════════════════════════════════════════════════════════════════

import React, { useState } from "react";
import { useAppStore } from "../../stores/useAppStore";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  resetPasswordForEmail,
} from "../../lib/supabase";
import { useToast } from "../ui/Toast";

interface AuthPageProps {
  onSuccess?: () => void;
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const { setUser, setView } = useAppStore();
  const { addToast } = useToast();

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Connexion Email/Mot de passe ──────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg("Veuillez renseigner votre email et mot de passe.");
      return;
    }

    try {
      setLoading(true);
      const { user, session } = await signInWithEmail(email.trim(), password);

      if (user) {
        addToast({
          type: "success",
          title: "Connexion réussie",
          message: `Ravi de te revoir !`,
        });

        // Hydrater le store avec l'utilisateur
        const userName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          email.split("@")[0];

        setUser({
          id: user.id,
          name: userName,
          email: user.email || email.trim(),
          role: "Solo Builder",
          avatarUrl: user.user_metadata?.avatar_url,
          theme: "light",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          createdAt: user.created_at || new Date().toISOString(),
          onboardingComplete: true,
        });

        onSuccess?.();
        setView("dashboard");
      }
    } catch (err: any) {
      const msg = err.message || "Erreur de connexion";
      if (msg.includes("Invalid login credentials")) {
        setErrorMsg("Identifiants incorrects. Vérifie ton email et mot de passe.");
      } else if (msg.includes("Email not confirmed")) {
        setErrorMsg("Ton adresse email n'a pas encore été confirmée. Vérifie ta boîte de réception.");
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Inscription Email/Mot de passe ───────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      setLoading(true);
      const { user } = await signUpWithEmail(email.trim(), password, fullName.trim());

      if (user) {
        addToast({
          type: "success",
          title: "Compte créé !",
          message: "Bienvenue sur Nexa OS.",
        });

        const name = fullName.trim() || email.split("@")[0];

        setUser({
          id: user.id,
          name: name,
          email: user.email || email.trim(),
          role: "Solo Builder",
          theme: "light",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          createdAt: new Date().toISOString(),
          onboardingComplete: false,
        });

        onSuccess?.();
        // Rediriger vers l'onboarding pour configurer son rythme
        setView("onboarding");
      }
    } catch (err: any) {
      const msg = err.message || "Erreur lors de l'inscription";
      if (msg.includes("User already registered")) {
        setErrorMsg("Un compte existe déjà avec cette adresse email. Connecte-toi.");
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Continuer avec Google ─────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
      // La redirection est gérée par le provider OAuth
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setErrorMsg(
        err.message ||
        "Impossible de se connecter avec Google. Assure-toi que le provider Google est activé dans ta console Supabase."
      );
      setGoogleLoading(false);
    }
  };

  // ── Réinitialisation de mot de passe ──────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Entre ton adresse email pour recevoir le lien de réinitialisation.");
      return;
    }
    try {
      setLoading(true);
      await resetPasswordForEmail(email.trim());
      setSuccessMsg("Lien de réinitialisation envoyé ! Vérifie ta boîte email.");
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'envoi du mail de réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* ── Logo & En-tête ── */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center shadow-md mb-3 border border-outline-variant/30 p-2">
            <img
              src="/nexawbg.png"
              alt="Nexa OS Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-headline-lg font-semibold text-on-surface tracking-tight">
            Nexa OS
          </h1>
          <p className="text-body-sm text-outline mt-1 font-mono">
            Personal AI Work OS · Connexion Cloud Supabase
          </p>
        </div>

        {/* ── Carte principale ── */}
        <div className="card p-space-xl border border-outline-variant/30 shadow-md">

          {/* Toggle Connexion / Inscription */}
          {mode !== "forgot" ? (
            <div className="flex items-center p-1 bg-surface-container rounded-xl mb-space-lg">
              <button
                type="button"
                onClick={() => { setMode("login"); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 py-2 text-body-sm font-semibold rounded-lg transition-all ${
                  mode === "login"
                    ? "bg-surface-container-lowest text-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 py-2 text-body-sm font-semibold rounded-lg transition-all ${
                  mode === "signup"
                    ? "bg-surface-container-lowest text-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Créer un compte
              </button>
            </div>
          ) : (
            <div className="mb-space-lg">
              <button
                type="button"
                onClick={() => { setMode("login"); setErrorMsg(null); setSuccessMsg(null); }}
                className="flex items-center gap-1 text-label-sm text-outline hover:text-on-surface font-mono transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                <span>Retour à la connexion</span>
              </button>
              <h2 className="text-headline-md font-semibold text-on-surface mt-2">
                Mot de passe oublié
              </h2>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Entre ton email pour recevoir les instructions de récupération.
              </p>
            </div>
          )}

          {/* Message d'erreur */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-error-container/40 border border-error/20 text-on-error-container text-body-sm mb-space-md animate-fade-in">
              <span className="material-symbols-outlined text-error shrink-0" style={{ fontSize: 18 }}>
                error
              </span>
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Message de succès */}
          {successMsg && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-tertiary-fixed-dim/30 border border-tertiary/20 text-tertiary text-body-sm mb-space-md animate-fade-in">
              <span className="material-symbols-outlined shrink-0" style={{ fontSize: 18 }}>
                check_circle
              </span>
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}

          {/* ── Bouton Google OAuth ── */}
          {mode !== "forgot" && (
            <div className="flex flex-col gap-space-md mb-space-lg">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="flex items-center justify-center gap-3 w-full py-2.5 px-4 rounded-xl border border-outline-variant/40 hover:border-outline-variant/80 bg-surface-container-low hover:bg-surface-container text-on-surface font-medium text-body-sm transition-all shadow-xs active:scale-[0.99] cursor-pointer"
              >
                {googleLoading ? (
                  <span className="material-symbols-outlined animate-spin text-primary" style={{ fontSize: 18 }}>
                    refresh
                  </span>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continuer avec Google</span>
              </button>

              {/* Séparateur */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-outline-variant/30" />
                <span className="text-label-sm text-outline font-mono uppercase tracking-wider">
                  ou avec email
                </span>
                <div className="flex-1 h-px bg-outline-variant/30" />
              </div>
            </div>
          )}

          {/* ── Formulaire Email / Mot de passe ── */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="flex flex-col gap-space-md">
              <div>
                <label className="text-label-md text-on-surface-variant block mb-1 font-mono">
                  Adresse email
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: 18 }}>
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="w-full pl-10 pr-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-label-md text-on-surface-variant font-mono">
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setErrorMsg(null); }}
                    className="text-label-sm text-primary hover:underline font-mono"
                  >
                    Oublié ?
                  </button>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: 18 }}>
                    lock
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center mt-1"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>
                    refresh
                  </span>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    login
                  </span>
                )}
                <span>Se connecter</span>
              </button>
            </form>
          )}

          {/* ── Formulaire Inscription ── */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="flex flex-col gap-space-md">
              <div>
                <label className="text-label-md text-on-surface-variant block mb-1 font-mono">
                  Prénom & Nom
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: 18 }}>
                    person
                  </span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Emmanuel Dupont"
                    className="w-full pl-10 pr-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-label-md text-on-surface-variant block mb-1 font-mono">
                  Adresse email <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: 18 }}>
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="w-full pl-10 pr-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-label-md text-on-surface-variant block mb-1 font-mono">
                  Mot de passe <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: 18 }}>
                    lock
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-label-md text-on-surface-variant block mb-1 font-mono">
                  Confirmer le mot de passe <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: 18 }}>
                    lock_reset
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center mt-1"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>
                    refresh
                  </span>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    person_add
                  </span>
                )}
                <span>Créer mon compte</span>
              </button>
            </form>
          )}

          {/* ── Formulaire Mot de passe oublié ── */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-space-md">
              <div>
                <label className="text-label-md text-on-surface-variant block mb-1 font-mono">
                  Adresse email du compte
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: 18 }}>
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="w-full pl-10 pr-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>
                    refresh
                  </span>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    send
                  </span>
                )}
                <span>Envoyer le lien</span>
              </button>
            </form>
          )}

          {/* ── Séparateur mode invité ── */}
          <div className="mt-space-lg pt-space-md border-t border-outline-variant/20 flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                // Permet de tester en local
                setUser({
                  id: "guest-user",
                  name: "Visiteur",
                  email: "guest@nexa-os.local",
                  role: "Solo Builder",
                  theme: "light",
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  createdAt: new Date().toISOString(),
                  onboardingComplete: true,
                });
                setView("dashboard");
              }}
              className="text-label-sm text-outline hover:text-on-surface font-mono flex items-center gap-1 transition-colors"
            >
              <span>Continuer en mode invité local (sans synchronisation cloud)</span>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
            </button>
          </div>

        </div>

        {/* ── Note sécurité Supabase ── */}
        <div className="flex items-center justify-center gap-2 mt-6 text-label-sm text-outline font-mono">
          <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 14 }}>
            lock
          </span>
          <span>Données isolées et chiffrées avec Supabase RLS</span>
        </div>

      </div>
    </div>
  );
}
