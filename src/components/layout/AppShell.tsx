import React, { useState, useEffect } from "react";
import { useAppStore } from "../../stores/useAppStore";
import Sidebar from "./Sidebar";
import Header from "./Header";
import DashboardPage from "../../pages/DashboardPage";
import NewProjectPage from "../../pages/NewProjectPage";
import AIAnalysisPage from "../../pages/AIAnalysisPage";
import ProjectsPage from "../../pages/ProjectsPage";
import ProjectDetailPage from "../../pages/ProjectDetailPage";
import CalendarPage from "../../pages/CalendarPage";
import PlanningPage from "../../pages/PlanningPage";
import AvailabilityPage from "../../pages/AvailabilityPage";
import LibraryPage from "../../pages/LibraryPage";
import FocusSessionPage from "../../pages/FocusSessionPage";
import SettingsPage from "../../pages/SettingsPage";
import OnboardingPage from "../../pages/OnboardingPage";
import AuthPage from "../auth/AuthPage";
import { supabase } from "../../lib/supabase";

// Détecter si on est sur mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function AppShell() {
  const { ui, user, setUser, setView, setSidebarCollapsed } = useAppStore();
  const { currentView, sidebarCollapsed } = ui;
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // ── Restauration de session Supabase au chargement ──────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const state = useAppStore.getState();
      const currentUser = state.user;

      if (session?.user) {
        if (!currentUser) {
          const u = session.user;
          const name =
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split("@")[0] ||
            "Utilisateur";
          setUser({
            id: u.id,
            name,
            email: u.email || "",
            role: u.user_metadata?.role || "Solo Builder",
            avatarUrl: u.user_metadata?.avatar_url,
            theme: "light",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            createdAt: u.created_at || new Date().toISOString(),
            onboardingComplete: true,
          });
        } else {
          // L'utilisateur existe déjà en local : charger les données distantes Supabase
          state.loadFromCloud(session.user.id);
          // Si l'onboarding est déjà validé, ne jamais rester sur l'onboarding
          if (currentUser.onboardingComplete && (currentView === "onboarding" || currentView === "auth")) {
            setView("dashboard");
          }
        }
      } else if (!session && !currentUser) {
        // Pas de session et pas d'utilisateur local → page d'auth
        setView("auth");
      } else if (currentUser?.onboardingComplete && (currentView === "onboarding" || currentView === "auth")) {
        setView("dashboard");
      }
      setAuthChecking(false);
    });

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const u = session.user;
          const name =
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split("@")[0] ||
            "Utilisateur";
          // Seulement mettre à jour si pas encore d'utilisateur
          if (!useAppStore.getState().user) {
            setUser({
              id: u.id,
              name,
              email: u.email || "",
              role: u.user_metadata?.role || "Solo Builder",
              avatarUrl: u.user_metadata?.avatar_url,
              theme: "light",
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              createdAt: u.created_at || new Date().toISOString(),
              onboardingComplete: true,
            });
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Sur mobile, forcer la sidebar en mode collapsed
  useEffect(() => {
    if (isMobile && !sidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  // ── Splash screen pendant la vérification de session ─────────────────
  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/nexawbg.png"
            alt="Nexa OS Logo"
            className="w-14 h-14 object-contain animate-pulse"
          />
          <div className="flex items-center gap-2 text-body-sm text-outline font-mono">
            <span className="material-symbols-outlined animate-spin text-primary" style={{ fontSize: 16 }}>refresh</span>
            <span>Connexion en cours…</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Page d'authentification ───────────────────────────────────────────
  if (currentView === "auth" || (!user && currentView === "onboarding")) {
    return <AuthPage />;
  }

  // ── Onboarding — pas de shell ─────────────────────────────────────────
  if (currentView === "onboarding") {
    // Si l'utilisateur est déjà inscrit avec onboarding validé, ne JAMAIS lui réafficher l'onboarding !
    if (user?.onboardingComplete) {
      setView("dashboard");
      return null;
    }
    return <OnboardingPage />;
  }

  // ── Session focus — plein écran sans sidebar/header ───────────────────
  if (currentView === "session-focus") {
    return <FocusSessionPage />;
  }

  const sidebarWidth = isMobile ? 0 : (sidebarCollapsed ? 64 : 256);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sidebar desktop ── */}
      {!isMobile && <Sidebar />}

      {/* ── Drawer mobile ── */}
      {isMobile && mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-on-background/20 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Sidebar en drawer */}
          <div className="fixed left-0 top-0 h-full z-50 w-64 animate-slide-in">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </>
      )}

      {/* ── Contenu principal ── */}
      <div
        style={{ paddingLeft: sidebarWidth }}
        className="transition-all duration-200"
      >
        <Header
          onMobileMenuToggle={() => setMobileMenuOpen(m => !m)}
          isMobile={isMobile}
          mobileMenuOpen={mobileMenuOpen}
        />
        <main className="pt-16 min-h-screen">
          <div className="px-gutter-desktop pb-space-xl pt-space-lg">
            {currentView === "dashboard"       && <DashboardPage />}
            {currentView === "nouveau-projet"  && <NewProjectPage />}
            {currentView === "analyse-ia"      && <AIAnalysisPage />}
            {currentView === "projets"         && <ProjectsPage />}
            {currentView === "projet-detail"   && <ProjectDetailPage />}
            {currentView === "calendrier"      && <CalendarPage />}
            {currentView === "planification"   && <PlanningPage />}
            {currentView === "disponibilites"  && <AvailabilityPage />}
            {currentView === "bibliotheque"    && <LibraryPage />}
            {currentView === "parametres"      && <SettingsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}
