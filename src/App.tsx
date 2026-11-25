import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppShell } from "./components/layout/AppShell";
import { AppSkeletonLoader } from "./components/common/AppSkeletonLoader";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import type { ModuleId } from "./types";

// Route-level code-splitting for all 10 modules (ADR-09 Core Web Vitals)
const ModuleAView = lazy(() =>
  import("./views/ModuleAView").then((m) => ({ default: m.ModuleAView }))
);
const ModuleBView = lazy(() =>
  import("./views/ModuleBView").then((m) => ({ default: m.ModuleBView }))
);
const ModuleCView = lazy(() =>
  import("./views/ModuleCView").then((m) => ({ default: m.ModuleCView }))
);
const ModuleDView = lazy(() =>
  import("./views/ModuleDView").then((m) => ({ default: m.ModuleDView }))
);
const ModuleEView = lazy(() =>
  import("./views/ModuleEView").then((m) => ({ default: m.ModuleEView }))
);
const ModuleFView = lazy(() =>
  import("./views/ModuleFView").then((m) => ({ default: m.ModuleFView }))
);
const ModuleGView = lazy(() =>
  import("./views/ModuleGView").then((m) => ({ default: m.ModuleGView }))
);
const ModuleHView = lazy(() =>
  import("./views/ModuleHView").then((m) => ({ default: m.ModuleHView }))
);
const ModuleIView = lazy(() =>
  import("./views/ModuleIView").then((m) => ({ default: m.ModuleIView }))
);
const ModuleJView = lazy(() =>
  import("./views/ModuleJView").then((m) => ({ default: m.ModuleJView }))
);

const AppContent: React.FC = () => {
  const { profile } = useAuth();
  const [activeModule, setActiveModule] = useState<ModuleId>("M1");
  const lastRoutedProfileId = useRef<string | null>(null);

  // Route to role-appropriate default home module once profile loads for a signed-in user
  useEffect(() => {
    if (!profile) {
      lastRoutedProfileId.current = null;
      return;
    }
    if (lastRoutedProfileId.current === profile.id) return;
    lastRoutedProfileId.current = profile.id;

    if (profile.role === "Teacher") setActiveModule("M2");
    else if (profile.role === "Non-Teaching") setActiveModule("M5");
    else setActiveModule("M1");
  }, [profile]);

  const moduleNamesMap: Record<string, string> = {
    M2: "Lesson Log (DLL/DLP) Hub",
    M3: "Faculty Loading & Schedule (SF7)",
    M4: "Online Exam & Item Analysis",
    M7: "Classes, ECR & SF9",
    M8: "RPMS Portfolio & COT Observations",
  };

  return (
    <ProtectedRoute
      activeModule={activeModule}
      onSelectModule={setActiveModule}
      moduleTitle={moduleNamesMap[activeModule] || "Instructional Module"}
    >
      <AppShell activeModule={activeModule} onSelectModule={setActiveModule}>
        <Suspense fallback={<AppSkeletonLoader />}>
          {activeModule === "M1" && <ModuleAView />}
          {activeModule === "M2" && <ModuleCView />}
          {activeModule === "M3" && <ModuleBView />}
          {activeModule === "M4" && <ModuleDView />}
          {activeModule === "M5" && <ModuleEView />}
          {activeModule === "M6" && <ModuleFView />}
          {activeModule === "M7" && <ModuleGView />}
          {activeModule === "M8" && <ModuleHView />}
          {activeModule === "M9" && <ModuleIView />}
          {activeModule === "M10" && <ModuleJView />}
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
