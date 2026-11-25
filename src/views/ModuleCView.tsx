import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  fetchAllLessonPlans,
  computeLessonPlanAnalytics,
  deleteLessonPlan,
} from "../services/lessonPlanService";
import { PageHeader } from "../components/common/PageHeader";
import { LessonPlanAnalytics } from "../components/lesson-plans/LessonPlanAnalytics";
import { ComplianceMatrix } from "../components/lesson-plans/ComplianceMatrix";
import { LessonPlanList } from "../components/lesson-plans/LessonPlanList";
import { LessonPlanSubmitModal } from "../components/lesson-plans/LessonPlanSubmitModal";
import { LessonPlanReviewModal } from "../components/lesson-plans/LessonPlanReviewModal";
import type { LessonPlan } from "../types";
import {
  BarChart3,
  Grid,
  ListFilter,
  PlusCircle,
  RefreshCw,
} from "lucide-react";

export const ModuleCView: React.FC = () => {
  const { profile, user, isAdmin, isSchoolHead } = useAuth();
  const isPrivileged = isAdmin || isSchoolHead;
  const currentUserId = profile?.id || user?.id;

  const [viewMode, setViewMode] = useState<"supervisor" | "my-teaching">(
    isAdmin ? "my-teaching" : isPrivileged ? "supervisor" : "my-teaching"
  );
  const effectivePrivileged = isPrivileged && viewMode === "supervisor";

  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"analytics" | "matrix" | "queue">("analytics");

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);
  const [reviewPlan, setReviewPlan] = useState<LessonPlan | null>(null);

  const loadLessonPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const roleParam = effectivePrivileged ? profile?.role : "Teacher";
      const data = await fetchAllLessonPlans(currentUserId, roleParam);
      setPlans(data);
    } catch (err) {
      console.error("[ModuleCView] Error loading lesson plans:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, effectivePrivileged, profile?.role]);

  useEffect(() => {
    loadLessonPlans();
  }, [loadLessonPlans]);

  const analyticsData = useMemo(() => {
    return computeLessonPlanAnalytics(plans);
  }, [plans]);

  const handlePlanSubmitted = (newPlan: LessonPlan) => {
    setPlans((prev) => [newPlan, ...prev]);
  };

  const handlePlanReviewed = (updatedPlan: LessonPlan) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    );
  };

  const handlePlanUpdated = (updatedPlan: LessonPlan) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    );
  };

  const handlePlanDeleted = async (plan: LessonPlan) => {
    if (
      !window.confirm(
        `Delete lesson plan "${plan.title}"? This will permanently remove the submission and its uploaded files.`
      )
    ) {
      return;
    }
    try {
      await deleteLessonPlan(plan);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      if (reviewPlan?.id === plan.id) {
        setReviewPlan(null);
      }
    } catch (err) {
      console.error("[ModuleCView] Error deleting lesson plan:", err);
      window.alert("Failed to delete lesson plan. Please try again.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Lesson Plans"
        onRefresh={loadLessonPlans}
        isRefreshing={isLoading}
        primaryAction={{
          label: "Submit Lesson Log",
          icon: <PlusCircle className="w-4 h-4" />,
          onClick: () => setIsSubmitModalOpen(true),
        }}
      />

      {/* Tabs + Inline Dual-Role Segmented Control */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#FFFFFF] border border-[#E3DDD1] rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === "analytics"
                ? "bg-[#E6EFEA] text-[#0F3D2E]"
                : "text-[#5C6660] hover:text-[#1C2420]"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === "matrix"
                ? "bg-[#E6EFEA] text-[#0F3D2E]"
                : "text-[#5C6660] hover:text-[#1C2420]"
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>{effectivePrivileged ? "10-Week Matrix" : "10-Week Tracker"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === "queue"
                ? "bg-[#E6EFEA] text-[#0F3D2E]"
                : "text-[#5C6660] hover:text-[#1C2420]"
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>{effectivePrivileged ? "Review Queue" : "My Submissions"}</span>
            {analyticsData.pendingReviewCount > 0 && effectivePrivileged && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#FBECEF] text-[#9E1B32] text-[10px] font-bold">
                {analyticsData.pendingReviewCount}
              </span>
            )}
          </button>
        </div>

        {isPrivileged && (
          <div className="flex items-center p-1 bg-[#FFFFFF] border border-[#E3DDD1] rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("my-teaching")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                viewMode === "my-teaching"
                  ? "bg-[#0F3D2E] text-[#FFFFFF]"
                  : "text-[#5C6660] hover:text-[#1C2420]"
              }`}
            >
              My Teaching DLLs
            </button>
            <button
              type="button"
              onClick={() => setViewMode("supervisor")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                viewMode === "supervisor"
                  ? "bg-[#0F3D2E] text-[#FFFFFF]"
                  : "text-[#5C6660] hover:text-[#1C2420]"
              }`}
            >
              School Review Desk
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 text-center bg-[#FFFFFF] rounded-xl border border-[#E3DDD1]">
          <RefreshCw className="w-6 h-6 text-[#0F3D2E] animate-spin mx-auto mb-2" />
          <p className="text-xs text-[#5C6660]">Loading lesson logs...</p>
        </div>
      ) : (
        <>
          {activeTab === "analytics" && (
            <LessonPlanAnalytics data={analyticsData} isPrivileged={effectivePrivileged} />
          )}

          {activeTab === "matrix" && (
            <ComplianceMatrix
              plans={plans}
              onSelectPlan={(plan) => setReviewPlan(plan)}
              isPrivileged={effectivePrivileged}
            />
          )}

          {activeTab === "queue" && (
            <LessonPlanList
              plans={plans}
              currentUserId={currentUserId}
              onSelectPlan={(plan) => setReviewPlan(plan)}
              onEditPlan={(plan) => setEditingPlan(plan)}
              onDeletePlan={handlePlanDeleted}
              isPrivileged={effectivePrivileged}
            />
          )}
        </>
      )}

      <LessonPlanSubmitModal
        isOpen={isSubmitModalOpen || !!editingPlan}
        onClose={() => {
          setIsSubmitModalOpen(false);
          setEditingPlan(null);
        }}
        onSubmitted={handlePlanSubmitted}
        initialData={editingPlan}
        onUpdated={handlePlanUpdated}
      />

      <LessonPlanReviewModal
        plan={reviewPlan}
        isOpen={!!reviewPlan}
        onClose={() => setReviewPlan(null)}
        onReviewed={handlePlanReviewed}
        onEdit={(plan) => setEditingPlan(plan)}
        onDelete={handlePlanDeleted}
      />
    </div>
  );
};

export default ModuleCView;
