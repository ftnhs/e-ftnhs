import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppShell } from "./components/layout/AppShell";
import { AppSkeletonLoader } from "./components/common/AppSkeletonLoader";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginView } from "./views/LoginView";
import {
  resolvePathname,
  getRoutePathForModule,
  getModuleTitleForRole,
} from "./components/navigation/navigationData";
import type { ModuleId, UserRole } from "./types";

// Route-level code-splitting for all 10 portal pages (ADR-09 Core Web Vitals)
const AdminSettingsView = lazy(() =>
  import("./views/AdminSettingsView").then((m) => ({ default: m.AdminSettingsView }))
);
const ScheduleView = lazy(() =>
  import("./views/ScheduleView").then((m) => ({ default: m.ScheduleView }))
);
const LessonPlansView = lazy(() =>
  import("./views/LessonPlansView").then((m) => ({ default: m.LessonPlansView }))
);
const ItemAnalysisView = lazy(() =>
  import("./views/ItemAnalysisView").then((m) => ({ default: m.ItemAnalysisView }))
);
const SchoolMemosView = lazy(() =>
  import("./views/SchoolMemosView").then((m) => ({ default: m.SchoolMemosView }))
);
const OrganizationsView = lazy(() =>
  import("./views/OrganizationsView").then((m) => ({ default: m.OrganizationsView }))
);
const ClassesEcrSf9View = lazy(() =>
  import("./views/ClassesEcrSf9View").then((m) => ({ default: m.ClassesEcrSf9View }))
);
const RpmsCotView = lazy(() =>
  import("./views/RpmsCotView").then((m) => ({ default: m.RpmsCotView }))
);
const LeaveReliefView = lazy(() =>
  import("./views/LeaveReliefView").then((m) => ({ default: m.LeaveReliefView }))
);
const CalendarSf2View = lazy(() =>
  import("./views/CalendarSf2View").then((m) => ({ default: m.CalendarSf2View }))
);
const SchoolPortalsView = lazy(() =>
  import("./views/SchoolPortalsView").then((m) => ({ default: m.SchoolPortalsView }))
);

function getDefaultModuleForRole(role?: UserRole): ModuleId {
  if (role === "Teacher") return "M2";
  if (role === "Non-Teaching") return "M5";
  return "M1";
}

const AppContent: React.FC = () => {
  const { user, profile, isLoading, logout } = useAuth();

  const initialRoute = resolvePathname(window.location.pathname);
  const [pageView, setPageView] = useState<"landing" | "login" | "portal">(initialRoute.pageView);
  const [activeModule, setActiveModule] = useState<ModuleId>(
    initialRoute.pageView === "portal" ? initialRoute.moduleId : "M1"
  );
  const hasExplicitInitialPortalRoute = useRef<boolean>(initialRoute.pageView === "portal");
  const lastRoutedProfileId = useRef<string | null>(null);

  const navigateTo = useCallback(
    (
      nextView: "landing" | "login" | "portal",
      nextModule?: ModuleId,
      options?: { replace?: boolean }
    ) => {
      const resolvedModule = nextModule || activeModule;
      const targetUrl =
        nextView === "landing"
          ? "/"
          : nextView === "login"
            ? "/login"
            : getRoutePathForModule(resolvedModule, profile?.role);

      setPageView(nextView);
      if (nextView === "portal" && nextModule) {
        setActiveModule(nextModule);
      }

      if (window.location.pathname !== targetUrl) {
        if (options?.replace) {
          window.history.replaceState(null, "", targetUrl);
        } else {
          window.history.pushState(null, "", targetUrl);
        }
      }
    },
    [activeModule, profile?.role]
  );

  const handleSelectModule = useCallback(
    (moduleId: ModuleId) => {
      navigateTo("portal", moduleId);
    },
    [navigateTo]
  );

  // Support browser Back / Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const parsed = resolvePathname(window.location.pathname);
      setPageView(parsed.pageView);
      if (parsed.pageView === "portal") {
        setActiveModule(parsed.moduleId);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Route to role-appropriate default home module once profile loads,
  // unless the user refreshed directly on an explicit module URL (e.g. /schedule)
  useEffect(() => {
    if (!profile) {
      lastRoutedProfileId.current = null;
      return;
    }
    if (lastRoutedProfileId.current === profile.id) return;
    lastRoutedProfileId.current = profile.id;

    if (hasExplicitInitialPortalRoute.current) {
      hasExplicitInitialPortalRoute.current = false;
      return;
    }

    const defaultModule = getDefaultModuleForRole(profile.role);
    setActiveModule(defaultModule);
    if (pageView === "portal") {
      const targetUrl = getRoutePathForModule(defaultModule, profile.role);
      if (window.location.pathname !== targetUrl) {
        window.history.replaceState(null, "", targetUrl);
      }
    }
  }, [profile, pageView]);

  // Enter the Faculty Portal upon signing in from /login,
  // and return cleanly to / upon signing out from the Portal.
  useEffect(() => {
    if (pageView === "login" && user) {
      const targetModule = profile
        ? getDefaultModuleForRole(profile.role)
        : activeModule;
      navigateTo("portal", targetModule, { replace: true });
    } else if (pageView === "portal" && !isLoading && !user) {
      navigateTo("landing", undefined, { replace: true });
    }
  }, [pageView, user, profile, isLoading, activeModule, navigateTo]);

  // Keep browser tab title synchronized with the active page
  useEffect(() => {
    if (pageView === "landing") {
      document.title = "e-FTNHS — Fermin Tayabas National High School";
    } else if (pageView === "login") {
      document.title = "Faculty Sign In — e-FTNHS";
    } else {
      document.title = `${getModuleTitleForRole(activeModule, profile?.role)} — e-FTNHS`;
    }
  }, [pageView, activeModule, profile?.role]);

  const handleSignOut = async () => {
    await logout();
    navigateTo("landing", undefined, { replace: true });
  };

  if (pageView === "landing") {
    return (
      <LandingPage
        isAuthenticated={Boolean(user)}
        userName={profile?.full_name || user?.email || null}
        onEnterPortal={() => {
          const targetModule = getDefaultModuleForRole(profile?.role);
          navigateTo("portal", targetModule);
        }}
        onSignIn={() => {
          if (user) {
            navigateTo("portal", getDefaultModuleForRole(profile?.role));
          } else {
            navigateTo("login");
          }
        }}
        onSignOut={handleSignOut}
      />
    );
  }

  if (pageView === "login" && !user) {
    return <LoginView onBackToHome={() => navigateTo("landing")} />;
  }

  const currentModuleTitle = getModuleTitleForRole(activeModule, profile?.role);

  return (
    <ProtectedRoute
      activeModule={activeModule}
      onSelectModule={handleSelectModule}
      moduleTitle={currentModuleTitle}
    >
      <AppShell
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        onGoHome={() => navigateTo("landing")}
      >
        <Suspense fallback={<AppSkeletonLoader />}>
          {activeModule === "M1" && <AdminSettingsView />}
          {activeModule === "M2" && <LessonPlansView />}
          {activeModule === "M3" && <ScheduleView />}
          {activeModule === "M4" && <ItemAnalysisView />}
          {activeModule === "M5" && <SchoolMemosView />}
          {activeModule === "M6" && <OrganizationsView />}
          {activeModule === "M7" && <ClassesEcrSf9View />}
          {activeModule === "M8" && <RpmsCotView />}
          {activeModule === "M9" && <LeaveReliefView />}
          {activeModule === "M10" && <CalendarSf2View />}
          {activeModule === "M11" && <SchoolPortalsView />}
        </Suspense>
      </AppShell>
    </ProtectedRoute>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
