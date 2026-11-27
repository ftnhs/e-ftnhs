import React, { useState, useEffect, useCallback, useMemo } from"react";
import { useAuth } from"../context/AuthContext";
import { supabase } from"../lib/supabase";
import {
  fetchAssessments,
  fetchAssessmentDetails,
  deleteAssessment,
} from"../services/assessmentService";
import type {
  Assessment,
  AssessmentItemAnalysis,
  Subject,
  Section,
  AcademicTerm,
  Profile,
} from"../types";
import { PageHeader } from"../components/common/PageHeader";
import { AssessmentCard } from"../components/assessment/AssessmentCard";
import { AssessmentImportModal } from"../components/assessment/AssessmentImportModal";
import { ItemAnalysisTable } from"../components/assessment/ItemAnalysisTable";
import { MPSAnalyticsDashboard } from"../components/assessment/MPSAnalyticsDashboard";
import { DepEdItemAnalysisPrintView } from"../components/assessment/DepEdItemAnalysisPrintView";
import {
  BarChart3,
  UploadCloud,
  FileSpreadsheet,
  Search,
  RefreshCw,
  Printer,
  Table,
  Layers,
} from"lucide-react";

export const ItemAnalysisView: React.FC = () => {
  const { profile, isAdmin, isSchoolHead } = useAuth();
  const isPrivileged = isAdmin || isSchoolHead;

  const [activeTab, setActiveTab] = useState<"hub" |"table" |"analytics" |"print">("hub");
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [selectedItems, setSelectedItems] = useState<AssessmentItemAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Aux catalogs
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeTerm, setActiveTerm] = useState<AcademicTerm | null>(null);
  const [principal, setPrincipal] = useState<Profile | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch active term
      const { data: termData } = await supabase
        .from("academic_terms")
        .select("*")
        .eq("is_active", true)
        .single();

      if (termData) setActiveTerm(termData);

      // 2. Fetch catalogs
      let sectionsQuery = supabase.from("sections").select("*").order("grade_level").order("section_name");
      if (termData?.id) {
        sectionsQuery = sectionsQuery.eq("term_id", termData.id);
      }

      const [subjectsRes, sectionsRes, principalRes] = await Promise.all([
        supabase.from("subjects_catalog").select("*").order("subject_name"),
        sectionsQuery,
        supabase
          .from("profiles")
          .select("*")
          .in("role", ["Super Admin","School Head"])
          .limit(1)
          .single(),
      ]);

      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);
      if (principalRes.data) setPrincipal(principalRes.data);

      // 3. Fetch assessments
      const assessmentList = await fetchAssessments(termData?.id);
      setAssessments(assessmentList);

      // Select first assessment by default if available
      if (assessmentList.length > 0) {
        const first = assessmentList[0];
        if (first) {
          const detailed = await fetchAssessmentDetails(first.id);
          setSelectedAssessment(detailed || first);
          setSelectedItems(detailed?.items || []);
        }
      }
    } catch (err) {
      console.error("Error loading assessment data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectAssessment = async (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    const detailed = await fetchAssessmentDetails(assessment.id);
    if (detailed) {
      setSelectedAssessment(detailed);
      setSelectedItems(detailed.items || []);
    }
    setActiveTab("analytics");
  };

  const handlePrintAssessment = async (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    const detailed = await fetchAssessmentDetails(assessment.id);
    if (detailed) {
      setSelectedAssessment(detailed);
      setSelectedItems(detailed.items || []);
    }
    setActiveTab("print");
  };

  const handleDeleteAssessment = async (id: string) => {
    const ok = await deleteAssessment(id);
    if (ok) {
      setAssessments((prev) => prev.filter((a) => a.id !== id));
      if (selectedAssessment?.id === id) {
        const remaining = assessments.filter((a) => a.id !== id);
        setSelectedAssessment(remaining[0] || null);
        setSelectedItems([]);
        setActiveTab("hub");
      }
    }
  };

  const handleAssessmentCreated = (newAssessment: Assessment) => {
    setAssessments((prev) => [newAssessment, ...prev]);
    setSelectedAssessment(newAssessment);
    setSelectedItems(newAssessment.items || []);
    setActiveTab("analytics");
  };

  // Filter assessments for display
  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      // Period filter
      if (selectedPeriod !=="All" && a.grading_period !== selectedPeriod) {
        return false;
      }
      // Type filter
      if (selectedType !=="All" && a.assessment_type !== selectedType) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = a.title.toLowerCase().includes(q);
        const matchesSubject = a.subject?.subject_name.toLowerCase().includes(q);
        const matchesSection = a.section?.section_name.toLowerCase().includes(q);
        const matchesTeacher = a.teacher?.full_name.toLowerCase().includes(q);
        return matchesTitle || matchesSubject || matchesSection || matchesTeacher;
      }
      return true;
    });
  }, [assessments, selectedPeriod, selectedType, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Item Analysis"
        onRefresh={loadData}
        isRefreshing={isLoading}
        primaryAction={{
          label:"Import Assessment",
          icon: <UploadCloud className="w-4 h-4" />,
          onClick: () => setIsImportModalOpen(true),
        }}
      />

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#FFFFFF] border border-[#E3DDD1] rounded-xl w-fit overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("hub")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab ==="hub"
              ?"bg-[#E6EFEA] text-[#0F3D2E]"
              :"text-[#5C6660] hover:text-[#1C2420]"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Assessments ({assessments.length})</span>
        </button>

        {selectedAssessment && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab ==="analytics"
                  ?"bg-[#E6EFEA] text-[#0F3D2E]"
                  :"text-[#5C6660] hover:text-[#1C2420]"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>MPS & Charts</span>
            </button>

              <button
                type="button"
                onClick={() => setActiveTab("table")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "table"
                    ? "bg-[#E6EFEA] text-[#0F3D2E]"
                    : "text-[#5C6660] hover:text-[#1C2420]"
                }`}
              >
                <Table className="w-4 h-4" />
                <span>Item Table ({selectedItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("print")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "print"
                    ? "bg-[#E6EFEA] text-[#0F3D2E]"
                    : "text-[#5C6660] hover:text-[#1C2420]"
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>Print DepEd Form</span>
              </button>
            </>
          )}
        </div>

      {/* 3. Main Views */}
      {isLoading ? (
        <div className="py-16 text-center text-sand-500 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyprus-800" />
          <p className="text-xs">Loading assessments and statistical models...</p>
        </div>
      ) : activeTab ==="hub" ? (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-sand-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sand-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assessments by title, subject, section, or teacher..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-sand-300 bg-sand-50/50 text-cyprus-900 focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs border border-sand-300 bg-white text-cyprus-900 focus:outline-hidden"
              >
                <option value="All">All Terms</option>
                <option value="T1">Term 1</option>
                <option value="T2">Term 2</option>
                <option value="T3">Term 3</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs border border-sand-300 bg-white text-cyprus-900 focus:outline-hidden"
              >
                <option value="All">All Types</option>
                <option value="Summative">Summative</option>
                <option value="Diagnostic">Diagnostic</option>
                <option value="Quarterly Exam">Quarterly Exam</option>
                <option value="Formative">Formative</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredAssessments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-sand-200 p-12 text-center space-y-4">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-sand-400" />
              <div>
                <h3 className="text-sm font-bold text-cyprus-900">
                  No assessments found
                </h3>
                <p className="text-xs text-sand-600 mt-1 max-w-md mx-auto">
                  Import a test result file or adjust your search filters to view item analysis models.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-crimson-600 hover:bg-crimson-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Import First Assessment</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssessments.map((assessment) => (
                <AssessmentCard
                  key={assessment.id}
                  assessment={assessment}
                  onSelect={handleSelectAssessment}
                  onPrint={handlePrintAssessment}
                  onDelete={handleDeleteAssessment}
                  isOwnerOrPrivileged={
                    isPrivileged || assessment.teacher_id === profile?.id
                  }
                />
              ))}
            </div>
          )}
        </div>
      ) : activeTab ==="analytics" && selectedAssessment ? (
        <MPSAnalyticsDashboard
          assessment={selectedAssessment}
          items={selectedItems}
        />
      ) : activeTab ==="table" && selectedAssessment ? (
        <ItemAnalysisTable
          items={selectedItems}
          totalExaminees={selectedAssessment.examinee_count}
        />
      ) : activeTab ==="print" && selectedAssessment ? (
        <DepEdItemAnalysisPrintView
          assessment={selectedAssessment}
          items={selectedItems}
          principal={principal}
          onBack={() => setActiveTab("hub")}
        />
      ) : null}

      {/* 4. Import Modal */}
      {isImportModalOpen && activeTerm && (
        <AssessmentImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          termId={activeTerm.id}
          activeTermNumber={activeTerm.term_number}
          teacherId={profile?.id ||""}
          subjects={subjects}
          sections={sections}
          onAssessmentCreated={handleAssessmentCreated}
        />
      )}
    </div>
  );
};
