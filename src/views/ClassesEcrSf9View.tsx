import React, { useState, useEffect, useCallback, useMemo } from"react";
import { useAuth } from"../context/AuthContext";
import { supabase } from"../lib/supabase";
import {
  fetchClassRecords,
  fetchClassRecordDetails,
  updateStudentGradeRecord,
  deleteStudentFromClassRecord,
  syncEnrolledLearnersToClassRecord,
} from"../services/classRecordService";
import {
  fetchTeacherAssignedClassSubjects,
  fetchSchoolTermsAndFaculty,
  type AssignedClassSubjectItem,
} from "../services/classManagementService";
import { schoolReferenceService } from "../services/schoolReferenceService";
import type {
  ClassRecord,
  StudentGrade,
  Subject,
  Section,
  AcademicTerm,
  CurriculumType,
  Profile,
} from"../types";
import { PageHeader } from"../components/common/PageHeader";
import { CreateClassRecordModal } from"../components/grading/CreateClassRecordModal";
import { AddStudentModal } from"../components/grading/AddStudentModal";
import { ClassManagementPanel } from "../components/grading/ClassManagementPanel";
import { ConsolidatedSF9Panel } from "../components/grading/ConsolidatedSF9Panel";
import {
  FileSpreadsheet,
  PlusCircle,
  RefreshCw,
  UserPlus,
  Trash2,
  Users,
  Award,
  BookOpen,
} from"lucide-react";

function formatCurriculumLabel(type: CurriculumType): string {
  const map: Record<CurriculumType, string> = {
    "MATATAG JHS": "JHS MATATAG",
    "MATATAG JHS Skill-Based": "JHS MATATAG (MAPEH/TLE)",
    "SHS Core": "Old SHS Core",
    "SHS Academic": "Old SHS Academic",
    "SHS TVL": "Old SHS TVL",
    "SSHS Core": "SSHS Core (Gr. 11)",
    "SSHS Academic Elective": "SSHS Academic Elective (Gr. 11)",
    "SSHS Field Exposure": "SSHS Field Exposure / Apprenticeship (Gr. 11)",
    "SSHS Arts Sports Health": "SSHS Arts, Sports & Health (Gr. 11)",
    "SSHS Research Design": "SSHS Research & Design (Gr. 11)",
    "SSHS TechPro Elective": "SSHS TechPro Elective (Gr. 11)",
    "SSHS Work Immersion": "SSHS Work Immersion (Gr. 11)",
    "Old SHS Core": "Old SHS Core (Gr. 12)",
    "Old SHS Applied": "Old SHS Applied (Gr. 12)",
    "Old SHS Specialized": "Old SHS Specialized (Gr. 12)",
    "Old SHS TVL": "Old SHS TVL (Gr. 12)",
    "Old SHS Immersion": "Old SHS Immersion (Gr. 12)",
  };
  return map[type] ?? type;
}

export const ClassesEcrSf9View: React.FC = () => {
  const { profile, isAdmin, isSchoolHead } = useAuth();
  const isPrivileged = isAdmin || isSchoolHead;

  const [activeTab, setActiveTab] = useState<"ecr" | "classes" | "sf9">("ecr");
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ClassRecord | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTermNumber, setActiveTermNumber] = useState<1 | 2 | 3>(1);

  // Aux catalogs & Class Management integration
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [facultyList, setFacultyList] = useState<Profile[]>([]);
  const [assignedLoads, setAssignedLoads] = useState<AssignedClassSubjectItem[]>([]);
  const [activeTerm, setActiveTerm] = useState<AcademicTerm | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Modals & prefill state
  const [isCreateRecordOpen, setIsCreateRecordOpen] = useState<boolean>(false);
  const [createPrefill, setCreatePrefill] = useState<{
    subjectId?: string;
    sectionId?: string;
    curriculumType?: CurriculumType;
  }>({});
  const [isAddStudentOpen, setIsAddStudentOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: termData } = await supabase
        .from("academic_terms")
        .select("*")
        .eq("is_active", true)
        .single();

      if (termData) {
        setActiveTerm(termData);
        setActiveTermNumber(termData.term_number as 1 | 2 | 3);
      }

      let sectionsQuery = supabase.from("sections").select("*").order("grade_level").order("section_name");
      if (termData?.id) {
        sectionsQuery = sectionsQuery.eq("term_id", termData.id);
      }

      const effectiveTermNum = (termData?.term_number as 1 | 2 | 3) || 1;
      const [subjectsRes, termSubjectMeta, sectionsRes, recordsList, metaRes, myLoads] =
        await Promise.all([
          supabase.from("subjects_catalog").select("*").order("subject_name"),
          termData?.id
            ? schoolReferenceService.fetchTermSubjectIds(termData.id)
            : Promise.resolve({ subjectIds: [], tableMissing: true }),
          sectionsQuery,
          fetchClassRecords(termData?.id, isPrivileged ? undefined : profile?.id),
          fetchSchoolTermsAndFaculty(),
          profile?.id && termData?.id
            ? fetchTeacherAssignedClassSubjects(
                profile.id,
                termData.id,
                effectiveTermNum,
                termData.school_year
              )
            : Promise.resolve([]),
        ]);

      if (subjectsRes.data) {
        const allSubs = subjectsRes.data as Subject[];
        const termSubSet = new Set(termSubjectMeta.subjectIds);
        setSubjects(
          !termSubjectMeta.tableMissing && termSubSet.size > 0
            ? allSubs.filter((s) => termSubSet.has(s.id))
            : allSubs
        );
      }
      if (sectionsRes.data) setSections(sectionsRes.data);
      setFacultyList(metaRes.faculty);
      setAssignedLoads(myLoads);
      setRecords(recordsList);

      if (recordsList.length > 0) {
        const first = recordsList[0];
        if (first) {
          const detailed = await fetchClassRecordDetails(first.id);
          setSelectedRecord(detailed || first);
          setGrades(detailed?.grades || []);
          setActiveTermNumber(first.term_number);
        }
      }
    } catch (err) {
      console.error("Error loading class records:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isPrivileged, profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectRecord = async (record: ClassRecord) => {
    setSelectedRecord(record);
    setActiveTermNumber(record.term_number);
    const detailed = await fetchClassRecordDetails(record.id);
    if (detailed) {
      setSelectedRecord(detailed);
      setGrades(detailed.grades || []);
    }
  };

  const handleSyncLearnersToActiveECR = async () => {
    if (!selectedRecord) return;
    const res = await syncEnrolledLearnersToClassRecord(selectedRecord);
    setGrades(res.grades);
    setSyncNotice(
      res.addedCount > 0
        ? `Synced ${res.addedCount} enrolled learners from Class Management into this E-Class Record.`
        : "All enrolled learners in this section are already in this E-Class Record."
    );
    setTimeout(() => setSyncNotice(null), 4000);
  };

  const handleOpenOrCreateForLoad = async (item: AssignedClassSubjectItem) => {
    if (item.existingRecordId) {
      const existing = records.find((r) => r.id === item.existingRecordId);
      if (existing) {
        await handleSelectRecord(existing);
        setActiveTab("ecr");
        return;
      }
      const detailed = await fetchClassRecordDetails(item.existingRecordId);
      if (detailed) {
        setSelectedRecord(detailed);
        setGrades(detailed.grades || []);
        setActiveTab("ecr");
        return;
      }
    }
    setCreatePrefill({
      sectionId: item.section.id,
      subjectId: item.subject.id,
      curriculumType: item.curriculumType,
    });
    setActiveTab("ecr");
    setIsCreateRecordOpen(true);
  };

  const handleScoreChange = async (
    gradeId: string,
    field:"ww" |"pt" |"qa",
    index: number,
    value: number
  ) => {
    if (!selectedRecord) return;

    setGrades((prev) =>
      prev.map((g) => {
        if (g.id !== gradeId) return g;
        const newWW = [...g.ww_scores];
        const newPT = [...g.pt_scores];
        let newQA = g.qa_score;

        if (field ==="ww") newWW[index] = value;
        if (field ==="pt") newPT[index] = value;
        if (field ==="qa") newQA = value;

        return {
          ...g,
          ww_scores: newWW,
          pt_scores: newPT,
          qa_score: newQA,
        };
      })
    );

    // Debounced or direct persist
    const targetStudent = grades.find((g) => g.id === gradeId);
    if (targetStudent) {
      const newWW = [...targetStudent.ww_scores];
      const newPT = [...targetStudent.pt_scores];
      let newQA = targetStudent.qa_score;

      if (field ==="ww") newWW[index] = value;
      if (field ==="pt") newPT[index] = value;
      if (field ==="qa") newQA = value;

      await updateStudentGradeRecord(gradeId, selectedRecord, newWW, newPT, newQA);
    }
  };

  const handleDeleteStudent = async (gradeId: string, name: string) => {
    if (window.confirm(`Remove ${name} from class record?`)) {
      const ok = await deleteStudentFromClassRecord(gradeId);
      if (ok) {
        setGrades((prev) => prev.filter((g) => g.id !== gradeId));
      }
    }
  };

  const handleRecordCreated = (newRecord: ClassRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
    setSelectedRecord(newRecord);
    setGrades(newRecord.grades || []);
    setActiveTermNumber(newRecord.term_number);
    setAssignedLoads((prev) =>
      prev.map((item) =>
        item.section.id === newRecord.section_id && item.subject.id === newRecord.subject_id
          ? { ...item, existingRecordId: newRecord.id }
          : item
      )
    );
  };

  const handleStudentAdded = (newGrade: StudentGrade) => {
    setGrades((prev) => [...prev, newGrade]);
  };

  // Group by Gender
  const maleStudents = useMemo(() => {
    return grades.filter((g) => g.gender ==="Male");
  }, [grades]);

  const femaleStudents = useMemo(() => {
    return grades.filter((g) => g.gender ==="Female");
  }, [grades]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 print:p-0 print:max-w-none">
      <div className="print:hidden space-y-4">
        <PageHeader
          title="Classes, E-Class Record & SF9"
          onRefresh={loadData}
          isRefreshing={isLoading}
          primaryAction={
            activeTab === "ecr"
              ? {
                  label: "New Class Record",
                  icon: <PlusCircle className="w-4 h-4" />,
                  onClick: () => {
                    setCreatePrefill({});
                    setIsCreateRecordOpen(true);
                  },
                }
              : undefined
          }
        />

        {/* Module Navigation Tabs */}
        <div className="border-b border-[#E3DDD1]">
          <nav className="flex items-center gap-6 overflow-x-auto" aria-label="Grading and Class Management Sections">
            <button
              type="button"
              onClick={() => setActiveTab("ecr")}
              className={`py-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "ecr"
                  ? "border-[#0F3D2E] text-[#0F3D2E] font-semibold"
                  : "border-transparent text-[#5C6660] hover:text-[#1C2420]"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>Subject E-Class Record</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("classes")}
              className={`py-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "classes"
                  ? "border-[#0F3D2E] text-[#0F3D2E] font-semibold"
                  : "border-transparent text-[#5C6660] hover:text-[#1C2420]"
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Class Management (Advisers, Learners &amp; Subjects)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sf9")}
              className={`py-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "sf9"
                  ? "border-[#0F3D2E] text-[#0F3D2E] font-semibold"
                  : "border-transparent text-[#5C6660] hover:text-[#1C2420]"
              }`}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>Class Summary &amp; SF9</span>
            </button>
          </nav>
        </div>
      </div>

      {activeTab === "classes" && profile && (
        <ClassManagementPanel
          activeTerm={activeTerm}
          currentUser={profile}
          isPrivileged={isPrivileged}
          subjects={subjects}
          facultyList={facultyList}
          onCreateOrOpenECR={async ({ sectionId, subjectId, curriculumType }) => {
            const match = records.find(
              (r) => r.section_id === sectionId && r.subject_id === subjectId && r.term_number === activeTermNumber
            );
            if (match) {
              await handleSelectRecord(match);
              setActiveTab("ecr");
            } else {
              setCreatePrefill({ sectionId, subjectId, curriculumType });
              setActiveTab("ecr");
              setIsCreateRecordOpen(true);
            }
          }}
          onDataSynced={loadData}
        />
      )}

      {activeTab === "sf9" && profile && (
        <ConsolidatedSF9Panel
          activeTerm={activeTerm}
          currentUser={profile}
          isPrivileged={isPrivileged}
        />
      )}

      {activeTab === "ecr" && (
        <>
          {syncNotice && (
            <div
              role="status"
              className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium"
            >
              {syncNotice}
            </div>
          )}

          {/* Teacher's Assigned Classes & Subjects Quick-Launch Strip */}
          {assignedLoads.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E3DDD1] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-cyprus-900 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-crimson-600" />
                  <span>My Handled Classes &amp; Subjects (Active Term)</span>
                </div>
                <span className="text-[11px] text-sand-600">
                  Click a handled class to open or create its E-Class Record
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {assignedLoads.map((item) => {
                  const isActive =
                    selectedRecord?.section_id === item.section.id &&
                    selectedRecord?.subject_id === item.subject.id;
                  return (
                    <button
                      key={`${item.section.id}_${item.subject.id}`}
                      type="button"
                      onClick={() => handleOpenOrCreateForLoad(item)}
                      className={`px-3 py-1.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center gap-2 ${
                        isActive
                          ? "bg-[#0F3D2E] text-white border-[#0F3D2E]"
                          : item.existingRecordId
                            ? "bg-[#FAF8F5] hover:bg-sand-100 text-cyprus-900 border-sand-300"
                            : "bg-crimson-50/60 hover:bg-crimson-50 text-crimson-900 border-crimson-200"
                      }`}
                    >
                      <span className="font-bold">
                        Gr. {item.section.grade_level}-{item.section.section_name}
                      </span>
                      <span className={isActive ? "text-sand-200" : "text-sand-600"}>•</span>
                      <span className="truncate max-w-[180px]">{item.subject.subject_name}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isActive
                            ? "bg-white/20 text-white"
                            : item.existingRecordId
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-crimson-100 text-crimson-800"
                        }`}
                      >
                        {item.existingRecordId ? "Open" : "+ Create ECR"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

      {/* Record Selector & Term Switcher Toolbar */}
      <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E3DDD1] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="active-class-record" className="text-xs font-semibold text-[#1C2420] shrink-0">
            Active Class Record:
          </label>
          <select
            id="active-class-record"
            value={selectedRecord?.id ||""}
            onChange={(e) => {
              const rec = records.find((r) => r.id === e.target.value);
              if (rec) handleSelectRecord(rec);
            }}
            className="min-w-[220px] px-3 py-2 rounded-lg text-xs border border-[#E3DDD1] bg-[#FAF8F5] text-[#1C2420] font-medium"
          >
            <option value="">Select class record...</option>
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.subject?.subject_name} • Gr. {r.section?.grade_level}-{r.section?.section_name} • Term {r.term_number} ({formatCurriculumLabel(r.curriculum_type)})
              </option>
            ))}
          </select>
        </div>

        {/* 3 Terms Switcher */}
        {selectedRecord && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-sand-600">Term:</span>
            {[1, 2, 3].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTermNumber(t as 1 | 2 | 3)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTermNumber === t
                    ?"bg-cyprus-900 text-white shadow-xs"
                    :"bg-sand-100 text-sand-700 hover:text-cyprus-900 border border-sand-200"
                }`}
              >
                Term {t}
              </button>
            ))}

            <button
              type="button"
              onClick={handleSyncLearnersToActiveECR}
              className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-sand-300 text-cyprus-900 hover:bg-sand-100 transition-colors cursor-pointer"
              title="Pull enrolled learners from Class Management into this E-Class Record"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
              <span>Sync Class Roster</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddStudentOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-sand-300 text-sand-800 hover:bg-sand-100 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-crimson-600" />
              <span>Add Student</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Main Spreadsheet Matrix */}
      {isLoading ? (
        <div className="py-16 text-center text-sand-500 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyprus-800" />
          <p className="text-xs">Loading E-Class Record and transmutation tables...</p>
        </div>
      ) : !selectedRecord ? (
        <div className="bg-white rounded-2xl border border-sand-200 p-12 text-center space-y-4">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-sand-400" />
          <h3 className="text-sm font-bold text-cyprus-900">
            No active E-Class Record found
          </h3>
          <button
            type="button"
            onClick={() => setIsCreateRecordOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-crimson-600 hover:bg-crimson-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First E-Class Record</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-sand-200 p-5 shadow-xs space-y-4 transition-colors">
          {/* Record Specification Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-sand-200 text-xs flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="font-bold text-cyprus-900">
                Curriculum: {formatCurriculumLabel(selectedRecord.curriculum_type)}
              </span>
              <span className="text-sand-600">
                Written Works: <strong>{Math.round(selectedRecord.ww_weight * 100)}%</strong> • Performance Tasks: <strong>{Math.round(selectedRecord.pt_weight * 100)}%</strong> • Exam: <strong>{Math.round(selectedRecord.qa_weight * 100)}%</strong>
              </span>
            </div>
            <div className="text-[11px] font-semibold text-teal-700">
              SY 2026–2027 Transition: 70.00 Initial → 75 Transmuted
            </div>
          </div>

          {/* Grades Table */}
          <div className="overflow-x-auto rounded-xl border border-sand-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-sand-100/90 text-cyprus-900 font-semibold border-b border-sand-300 text-center">
                  <th className="py-2 px-3 text-left w-52">Learner Name</th>
                  {/* Written Works */}
                  <th colSpan={selectedRecord.ww_max_scores.length} className="border-l border-sand-300 bg-sand-50">
                    Written Works ({Math.round(selectedRecord.ww_weight * 100)}%)
                  </th>
                  <th className="px-2 border-l border-sand-300">Total</th>
                  <th className="px-2">PS</th>
                  <th className="px-2 border-r border-sand-300">WS</th>
                  {/* Performance Tasks */}
                  <th colSpan={selectedRecord.pt_max_scores.length} className="bg-sand-50">
                    Performance Tasks ({Math.round(selectedRecord.pt_weight * 100)}%)
                  </th>
                  <th className="px-2 border-l border-sand-300">Total</th>
                  <th className="px-2">PS</th>
                  <th className="px-2 border-r border-sand-300">WS</th>
                  {/* Quarterly Exam */}
                  <th className="px-2">Exam</th>
                  <th className="px-2">PS</th>
                  <th className="px-2 border-r border-sand-300">WS</th>
                  {/* Final Calculation */}
                  <th className="px-2 font-bold">Initial</th>
                  <th className="px-3 font-bold bg-sand-200/60">Transmuted</th>
                  <th className="px-3">Remarks</th>
                  <th className="px-2"></th>
                </tr>

                {/* Maximum Scores Subheader */}
                <tr className="bg-sand-50 text-[10px] text-sand-600 border-b border-sand-200 text-center">
                  <td className="py-1 px-3 text-left font-bold italic">Highest Possible Score</td>
                  {selectedRecord.ww_max_scores.map((max, idx) => (
                    <td key={`ww-max-${idx}`} className="px-1 font-mono font-bold">{max}</td>
                  ))}
                  <td className="px-1 font-bold font-mono">
                    {selectedRecord.ww_max_scores.reduce((a, b) => a + b, 0)}
                  </td>
                  <td className="px-1">100</td>
                  <td className="px-1 font-bold">{Math.round(selectedRecord.ww_weight * 100)}</td>

                  {selectedRecord.pt_max_scores.map((max, idx) => (
                    <td key={`pt-max-${idx}`} className="px-1 font-mono font-bold">{max}</td>
                  ))}
                  <td className="px-1 font-bold font-mono">
                    {selectedRecord.pt_max_scores.reduce((a, b) => a + b, 0)}
                  </td>
                  <td className="px-1">100</td>
                  <td className="px-1 font-bold">{Math.round(selectedRecord.pt_weight * 100)}</td>

                  <td className="px-1 font-bold font-mono">{selectedRecord.qa_max_score}</td>
                  <td className="px-1">100</td>
                  <td className="px-1 font-bold">{Math.round(selectedRecord.qa_weight * 100)}</td>

                  <td className="px-1">100</td>
                  <td className="px-1 font-bold">100</td>
                  <td className="px-1"></td>
                  <td></td>
                </tr>
              </thead>

              <tbody className="divide-y divide-sand-200 bg-white">
                {/* MALE Section Header */}
                <tr className="bg-sand-100/50 font-bold text-xs text-cyprus-900">
                  <td colSpan={24} className="py-1.5 px-3">
                    MALE ({maleStudents.length})
                  </td>
                </tr>

                {maleStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-sand-50 text-center">
                    <td className="py-1.5 px-3 text-left font-semibold text-cyprus-900">
                      {st.student_name}
                    </td>

                    {/* WW Inputs */}
                    {selectedRecord.ww_max_scores.map((_, idx) => (
                      <td key={`ww-${idx}`} className="p-0.5">
                        <input
                          type="number"
                          min="0"
                          max={selectedRecord.ww_max_scores[idx]}
                          value={st.ww_scores[idx] ?? 0}
                          onChange={(e) =>
                            handleScoreChange(st.id,"ww", idx, parseFloat(e.target.value) || 0)
                          }
                          className="w-9 py-0.5 text-center font-mono text-xs rounded border border-sand-200 bg-transparent focus:bg-white focus:ring-1 focus:ring-cyprus-700"
                        />
                      </td>
                    ))}
                    <td className="font-mono text-xs font-semibold">{st.ww_total}</td>
                    <td className="font-mono text-[11px] text-sand-600">{Number(st.ww_percentage_score).toFixed(1)}</td>
                    <td className="font-mono text-xs font-bold text-cyprus-900">{Number(st.ww_weighted_score).toFixed(2)}</td>

                    {/* PT Inputs */}
                    {selectedRecord.pt_max_scores.map((_, idx) => (
                      <td key={`pt-${idx}`} className="p-0.5">
                        <input
                          type="number"
                          min="0"
                          max={selectedRecord.pt_max_scores[idx]}
                          value={st.pt_scores[idx] ?? 0}
                          onChange={(e) =>
                            handleScoreChange(st.id,"pt", idx, parseFloat(e.target.value) || 0)
                          }
                          className="w-9 py-0.5 text-center font-mono text-xs rounded border border-sand-200 bg-transparent focus:bg-white focus:ring-1 focus:ring-cyprus-700"
                        />
                      </td>
                    ))}
                    <td className="font-mono text-xs font-semibold">{st.pt_total}</td>
                    <td className="font-mono text-[11px] text-sand-600">{Number(st.pt_percentage_score).toFixed(1)}</td>
                    <td className="font-mono text-xs font-bold text-cyprus-900">{Number(st.pt_weighted_score).toFixed(2)}</td>

                    {/* QA Input */}
                    <td className="p-0.5">
                      <input
                        type="number"
                        min="0"
                        max={selectedRecord.qa_max_score}
                        value={st.qa_score ?? 0}
                        onChange={(e) =>
                          handleScoreChange(st.id,"qa", 0, parseFloat(e.target.value) || 0)
                        }
                        className="w-10 py-0.5 text-center font-mono text-xs font-bold rounded border border-sand-200 bg-transparent focus:bg-white focus:ring-1 focus:ring-cyprus-700 text-crimson-600"
                      />
                    </td>
                    <td className="font-mono text-[11px] text-sand-600">{Number(st.qa_percentage_score).toFixed(1)}</td>
                    <td className="font-mono text-xs font-bold text-cyprus-900">{Number(st.qa_weighted_score).toFixed(2)}</td>

                    {/* Initial & Transmuted */}
                    <td className="font-mono text-xs font-semibold">{Number(st.initial_grade).toFixed(2)}</td>
                    <td className="font-mono text-sm font-extrabold bg-sand-100/70 text-cyprus-950">
                      {st.transmuted_grade}
                    </td>
                    <td>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          st.transmuted_grade >= 75
                            ?"bg-teal-100 text-teal-800"
                            :"bg-crimson-100 text-crimson-800"
                        }`}
                      >
                        {st.remarks}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(st.id, st.student_name)}
                        className="p-1 text-sand-400 hover:text-crimson-600 cursor-pointer"
                        title="Delete Student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* FEMALE Section Header */}
                <tr className="bg-sand-100/50 font-bold text-xs text-cyprus-900">
                  <td colSpan={24} className="py-1.5 px-3">
                    FEMALE ({femaleStudents.length})
                  </td>
                </tr>

                {femaleStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-sand-50 text-center">
                    <td className="py-1.5 px-3 text-left font-semibold text-cyprus-900">
                      {st.student_name}
                    </td>

                    {/* WW Inputs */}
                    {selectedRecord.ww_max_scores.map((_, idx) => (
                      <td key={`ww-${idx}`} className="p-0.5">
                        <input
                          type="number"
                          min="0"
                          max={selectedRecord.ww_max_scores[idx]}
                          value={st.ww_scores[idx] ?? 0}
                          onChange={(e) =>
                            handleScoreChange(st.id,"ww", idx, parseFloat(e.target.value) || 0)
                          }
                          className="w-9 py-0.5 text-center font-mono text-xs rounded border border-sand-200 bg-transparent focus:bg-white focus:ring-1 focus:ring-cyprus-700"
                        />
                      </td>
                    ))}
                    <td className="font-mono text-xs font-semibold">{st.ww_total}</td>
                    <td className="font-mono text-[11px] text-sand-600">{Number(st.ww_percentage_score).toFixed(1)}</td>
                    <td className="font-mono text-xs font-bold text-cyprus-900">{Number(st.ww_weighted_score).toFixed(2)}</td>

                    {/* PT Inputs */}
                    {selectedRecord.pt_max_scores.map((_, idx) => (
                      <td key={`pt-${idx}`} className="p-0.5">
                        <input
                          type="number"
                          min="0"
                          max={selectedRecord.pt_max_scores[idx]}
                          value={st.pt_scores[idx] ?? 0}
                          onChange={(e) =>
                            handleScoreChange(st.id,"pt", idx, parseFloat(e.target.value) || 0)
                          }
                          className="w-9 py-0.5 text-center font-mono text-xs rounded border border-sand-200 bg-transparent focus:bg-white focus:ring-1 focus:ring-cyprus-700"
                        />
                      </td>
                    ))}
                    <td className="font-mono text-xs font-semibold">{st.pt_total}</td>
                    <td className="font-mono text-[11px] text-sand-600">{Number(st.pt_percentage_score).toFixed(1)}</td>
                    <td className="font-mono text-xs font-bold text-cyprus-900">{Number(st.pt_weighted_score).toFixed(2)}</td>

                    {/* QA Input */}
                    <td className="p-0.5">
                      <input
                        type="number"
                        min="0"
                        max={selectedRecord.qa_max_score}
                        value={st.qa_score ?? 0}
                        onChange={(e) =>
                          handleScoreChange(st.id,"qa", 0, parseFloat(e.target.value) || 0)
                        }
                        className="w-10 py-0.5 text-center font-mono text-xs font-bold rounded border border-sand-200 bg-transparent focus:bg-white focus:ring-1 focus:ring-cyprus-700 text-crimson-600"
                      />
                    </td>
                    <td className="font-mono text-[11px] text-sand-600">{Number(st.qa_percentage_score).toFixed(1)}</td>
                    <td className="font-mono text-xs font-bold text-cyprus-900">{Number(st.qa_weighted_score).toFixed(2)}</td>

                    {/* Initial & Transmuted */}
                    <td className="font-mono text-xs font-semibold">{Number(st.initial_grade).toFixed(2)}</td>
                    <td className="font-mono text-sm font-extrabold bg-sand-100/70 text-cyprus-950">
                      {st.transmuted_grade}
                    </td>
                    <td>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          st.transmuted_grade >= 75
                            ?"bg-teal-100 text-teal-800"
                            :"bg-crimson-100 text-crimson-800"
                        }`}
                      >
                        {st.remarks}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(st.id, st.student_name)}
                        className="p-1 text-sand-400 hover:text-crimson-600 cursor-pointer"
                        title="Delete Student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* Modals */}
      {isCreateRecordOpen && activeTerm && profile && (
        <CreateClassRecordModal
          isOpen={isCreateRecordOpen}
          onClose={() => setIsCreateRecordOpen(false)}
          termId={activeTerm.id}
          teacherId={profile.id}
          subjects={subjects}
          sections={sections}
          initialSubjectId={createPrefill.subjectId}
          initialSectionId={createPrefill.sectionId}
          initialCurriculumType={createPrefill.curriculumType}
          initialTermNumber={activeTermNumber}
          onRecordCreated={handleRecordCreated}
        />
      )}

      {isAddStudentOpen && selectedRecord && (
        <AddStudentModal
          isOpen={isAddStudentOpen}
          onClose={() => setIsAddStudentOpen(false)}
          record={selectedRecord}
          onStudentAdded={handleStudentAdded}
        />
      )}
    </div>
  );
};
