import React from "react";
import { useAuth } from "../../context/AuthContext";
import { LoginView } from "../../views/LoginView";
import { PendingVerificationView } from "../../views/PendingVerificationView";
import { AppSkeletonLoader } from "../common/AppSkeletonLoader";
import { NonTeachingNotice } from "../common/NonTeachingNotice";
import type { ModuleId, UserRole } from "../../types";

interface ProtectedRouteProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  allowedRoles?: UserRole[];
  restrictedModulesForNonTeaching?: ModuleId[];
  moduleTitle?: string;
  children: React.ReactNode;
}

/**
 * Fail-closed Route Guard enforcing:
 * 1. Verified Supabase Auth session (`user`)
 * 2. Provisioned & Approved profile (`profile?.status === 'Approved'`)
 * 3. Role-based module boundaries (isolates Non-Teaching from instructional modules)
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  activeModule,
  onSelectModule,
  allowedRoles,
  restrictedModulesForNonTeaching = ["M2", "M3", "M4", "M7", "M8"],
  moduleTitle = "Instructional Module",
  children,
}) => {
  const { user, profile, isLoading, isApproved } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linen-textured flex items-center justify-center">
        <AppSkeletonLoader />
      </div>
    );
  }

  // Gate 1: Unauthenticated -> LoginView
  if (!user) {
    return <LoginView />;
  }

  // Gate 2: Unprovisioned (null profile) or unapproved/pending/rejected -> fail-closed quarantine
  if (!profile || !isApproved) {
    return <PendingVerificationView />;
  }

  // Gate 3: Role-based route protection
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <NonTeachingNotice moduleName={moduleTitle} onSelectModule={onSelectModule} />;
  }

  if (
    profile.role === "Non-Teaching" &&
    restrictedModulesForNonTeaching.includes(activeModule)
  ) {
    return <NonTeachingNotice moduleName={moduleTitle} onSelectModule={onSelectModule} />;
  }

  return <>{children}</>;
};
