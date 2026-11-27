import React, { useState, useEffect, useCallback, useMemo } from "react";
import type {
  Section,
  Subject,
  Profile,
  Learner,
  SectionSubject,
  CurriculumType,
  EnrollmentStatus,
  AcademicTerm,
} from "../../types";
import {
  fetchClassesWithStats,
  updateSectionAdviserAndTrack,
  fetchLearnersBySection,
  enrollLearner,
  bulkImportLearnersToSection,
  updateLearner,
  deleteLearner,
  syncSectionLearnersAcrossSchoolYear,
  fetchSectionSubjects,
  upsertSectionSubject,
  deleteSectionSubject,
  syncSectionSubjectsFromLoads,
  type ClassOverviewItem,
} from "../../services/classManagementService";
import { inferCurriculumAndUnits } from "../../services/transmutationEngine";
import {
  parseSF1File,
  parseSF1Text,
  type SF1ParseResult,
} from "../../services/sf1ParserService";
import {
  Users,
  BookOpen,
  UserPlus,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Save,
  Sparkles,
  UserCheck,
  X,
  ArrowRight,
  Edit,
  ShieldCheck,
} from "lucide-react";

interface ClassManagementPanelProps {
  activeTerm: AcademicTerm | null;
  currentUser: Profile;
  isPrivileged: boolean;
  subjects: Subject[];
  facultyList: Profile[];
  onCreateOrOpenECR: (payload: {
    sectionId: string;
    subjectId: string;
    curriculumType: CurriculumType;
  }) => void;
  onDataSynced?: () => void;
}

const CURRICULUM_OPTIONS: Array<{ value: CurriculumType; label: string }> = [
  { value: "MATATAG JHS", label: "JHS MATATAG Core (20/50/30)" },
  { value: "MATATAG JHS Skill-Based", label: "JHS MATATAG MAPEH/TLE (20/60/20)" },
  { value: "SSHS Core", label: "SSHS Core / Academic (20/50/30)" },
  { value: "SSHS Academic Elective", label: "SSHS Academic Elective (20/50/30)" },
  { value: "SSHS Field Exposure", label: "SSHS Field Exposure / Creative Prod (15/70/15)" },
  { value: "SSHS Arts Sports Health", label: "SSHS Arts, Sports & Health (20/60/20)" },
  { value: "SSHS Research Design", label: "SSHS Research & Design (40/60/0)" },
  { value: "SSHS TechPro Elective", label: "SSHS TechPro Elective (15/65/20)" },
  { value: "SSHS Work Immersion", label: "SSHS Work Immersion (20/80/0)" },
  { value: "Old SHS Core", label: "Old SHS Core — SY 2026-2027 Gr. 12 (25/50/25)" },
  { value: "Old SHS Applied", label: "Old SHS Applied — SY 2026-2027 Gr. 12 (25/45/30)" },
  { value: "Old SHS Specialized", label: "Old SHS Specialized — SY 2026-2027 Gr. 12 (25/45/30)" },
  { value: "Old SHS TVL", label: "Old SHS TVL — SY 2026-2027 Gr. 12 (20/60/20)" },
  { value: "Old SHS Immersion", label: "Old SHS Immersion / Research — SY 2026-2027 Gr. 12 (35/40/25)" },
];

function computeAgeDisplay(birthdate?: string | null): string {
  if (!birthdate) return "—";
  const dob = new Date(`${birthdate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? String(age) : "—";
}

export const ClassManagementPanel: React.FC<ClassManagementPanelProps> = ({
  activeTerm,
  currentUser,
  isPrivileged,
  subjects,
  facultyList,
  onCreateOrOpenECR,
  onDataSynced,
}) => {
  const [classes, setClasses] = useState<ClassOverviewItem[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [innerTab, setInnerTab] = useState<"learners" | "subjects">("learners");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Adviser & Track inline state
  const [adviserId, setAdviserId] = useState<string>("");
  const [trackStrand, setTrackStrand] = useState<string>("");
  const [isSavingClassMeta, setIsSavingClassMeta] = useState<boolean>(false);

  // Learners & Section Subjects state
  const [learners, setLearners] = useState<Learner[]>([]);
  const [sectionSubjects, setSectionSubjects] = useState<SectionSubject[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Single Learner form state
  const [newName, setNewName] = useState<string>("");
  const [newLrn, setNewLrn] = useState<string>("");
  const [newGender, setNewGender] = useState<"Male" | "Female">("Male");
  const [newBirthdate, setNewBirthdate] = useState<string>("");
  const [isAddingLearner, setIsAddingLearner] = useState<boolean>(false);

  // Bulk Import modal (AI-Assisted DepEd SF1 Importer)
  const [isBulkOpen, setIsBulkOpen] = useState<boolean>(false);
  const [bulkText, setBulkText] = useState<string>("");
  const [sf1Preview, setSf1Preview] = useState<SF1ParseResult | null>(null);
  const [isParsingBulk, setIsParsingBulk] = useState<boolean>(false);
  const [isImportingBulk, setIsImportingBulk] = useState<boolean>(false);

  // Full SF1 Learner Profile Modal
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);
  const [isSavingLearnerProfile, setIsSavingLearnerProfile] = useState<boolean>(false);

  // Connect Subject form state
  const [showAllGradeSubjects, setShowAllGradeSubjects] = useState<boolean>(false);
  const [connectSubjectId, setConnectSubjectId] = useState<string>("");
  const [connectTeacherId, setConnectTeacherId] = useState<string>("");
  const [connectCurriculum, setConnectCurriculum] = useState<CurriculumType>("MATATAG JHS");
  const [connectUnits, setConnectUnits] = useState<number>(1);
  const [isConnectingSubject, setIsConnectingSubject] = useState<boolean>(false);

  const showMessage = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadClasses = useCallback(async () => {
    if (!activeTerm?.id) return;
    setIsLoading(true);
    try {
      const list = await fetchClassesWithStats(activeTerm.id);
      const visible = isPrivileged
        ? list
        : list.filter((c) => c.section.adviser_id === currentUser.id);
      setClasses(visible.length > 0 ? visible : isPrivileged ? list : []);

      setSelectedSectionId((prev) => {
        if (prev && visible.some((v) => v.section.id === prev)) return prev;
        return visible[0]?.section.id || "";
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeTerm?.id, isPrivileged, currentUser.id]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.section.id === selectedSectionId)?.section || null,
    [classes, selectedSectionId]
  );

  const canManageSelectedClass = Boolean(
    selectedClass && (isPrivileged || selectedClass.adviser_id === currentUser.id)
  );

  const loadSectionDetails = useCallback(async (section: Section) => {
    setIsLoadingDetails(true);
    try {
      const [lList, sList] = await Promise.all([
        fetchLearnersBySection(section.id),
        fetchSectionSubjects(section.id),
      ]);
      setLearners(lList);
      setSectionSubjects(sList);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setLearners([]);
      setSectionSubjects([]);
      return;
    }
    setAdviserId(selectedClass.adviser_id || "");
    setTrackStrand(selectedClass.track_strand || "");
    loadSectionDetails(selectedClass);
  }, [selectedClass, loadSectionDetails]);

  // Filter subjects for Connect Subject dropdown
  const availableSubjectsForGrade = useMemo(() => {
    if (!selectedClass) return subjects;
    if (showAllGradeSubjects) return subjects;
    return subjects.filter((s) => s.grade_level === selectedClass.grade_level);
  }, [subjects, selectedClass, showAllGradeSubjects]);

  useEffect(() => {
    if (availableSubjectsForGrade.length > 0 && selectedClass) {
      const first = availableSubjectsForGrade.find(
        (s) => !sectionSubjects.some((ss) => ss.subject_id === s.id)
      ) || availableSubjectsForGrade[0];
      if (first) {
        setConnectSubjectId(first.id);
        const inferred = inferCurriculumAndUnits(
          selectedClass.grade_level,
          first,
          selectedClass,
          activeTerm?.school_year
        );
        setConnectCurriculum(inferred.curriculumType);
        setConnectUnits(inferred.units);
      }
    }
  }, [availableSubjectsForGrade, selectedClass, sectionSubjects, activeTerm?.school_year]);

  const handleSaveAdviserAndTrack = async () => {
    if (!selectedClass || !isPrivileged) return;
    setIsSavingClassMeta(true);
    try {
      await updateSectionAdviserAndTrack(
        selectedClass,
        adviserId || null,
        trackStrand || null,
        true
      );
      showMessage("Class adviser and track/strand updated across SY terms.");
      await loadClasses();
      onDataSynced?.();
    } catch (err) {
      console.error(err);
      showMessage("Failed to update class adviser/track.", "error");
    } finally {
      setIsSavingClassMeta(false);
    }
  };

  const handleAddSingleLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !newName.trim() || !newLrn.trim()) return;
    setIsAddingLearner(true);
    try {
      await enrollLearner({
        section: selectedClass,
        lrn: newLrn.trim(),
        full_name: newName.trim(),
        gender: newGender,
        birthdate: newBirthdate || null,
        syncAcrossSchoolYear: true,
      });
      setNewName("");
      setNewLrn("");
      setNewBirthdate("");
      showMessage("Learner enrolled and synced across school year terms.");
      await Promise.all([loadSectionDetails(selectedClass), loadClasses()]);
    } catch (err) {
      console.error(err);
      showMessage("Failed to enroll learner (verify LRN is unique).", "error");
    } finally {
      setIsAddingLearner(false);
    }
  };

  const handleBulkTextAnalyze = (textVal: string) => {
    setBulkText(textVal);
    if (!textVal.trim()) {
      setSf1Preview(null);
      return;
    }
    try {
      const parsed = parseSF1Text(textVal);
      setSf1Preview(parsed);
    } catch {
      setSf1Preview(null);
    }
  };

  const handleBulkPasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;

    const preview = sf1Preview || (bulkText.trim() ? parseSF1Text(bulkText) : null);
    if (!preview || preview.learners.length === 0) {
      showMessage(
        "No valid learner rows detected. Upload a DepEd SF1 (.xlsx/.csv) file or paste learner rows.",
        "error"
      );
      return;
    }

    setIsImportingBulk(true);
    try {
      const count = await bulkImportLearnersToSection(selectedClass, preview.learners, true);
      setBulkText("");
      setSf1Preview(null);
      setIsBulkOpen(false);
      showMessage(
        `Enrolled ${count} learners (${preview.detectedFormat}) into Grade ${selectedClass.grade_level} - ${selectedClass.section_name} across SY terms.`
      );
      await Promise.all([loadSectionDetails(selectedClass), loadClasses()]);
    } catch (err) {
      console.error(err);
      showMessage("Bulk import failed. Check LRN formatting and uniqueness.", "error");
    } finally {
      setIsImportingBulk(false);
    }
  };

  const handleBulkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingBulk(true);
    try {
      const parsed = await parseSF1File(file);
      setSf1Preview(parsed);
      if (file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".tsv")) {
        setBulkText(await file.text());
      } else {
        setBulkText(`[Parsed file: ${file.name} — ${parsed.learners.length} learners ready for review]`);
      }
    } catch (err) {
      console.error(err);
      showMessage("Failed to read SF1 file. Please ensure it is a valid .xlsx or .csv file.", "error");
    } finally {
      setIsParsingBulk(false);
      e.target.value = "";
    }
  };

  const handleSaveLearnerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLearner) return;
    setIsSavingLearnerProfile(true);
    try {
      const updated = await updateLearner(editingLearner.id, {
        lrn: editingLearner.lrn,
        full_name: editingLearner.full_name,
        gender: editingLearner.gender,
        birthdate: editingLearner.birthdate,
        age_june: editingLearner.age_june,
        mother_tongue: editingLearner.mother_tongue,
        ip_ethnic_group: editingLearner.ip_ethnic_group,
        religion: editingLearner.religion,
        address_street: editingLearner.address_street,
        address_barangay: editingLearner.address_barangay,
        address_municipality: editingLearner.address_municipality,
        address_province: editingLearner.address_province,
        father_name: editingLearner.father_name,
        mother_maiden_name: editingLearner.mother_maiden_name,
        guardian_name: editingLearner.guardian_name,
        guardian_relationship: editingLearner.guardian_relationship,
        parent_guardian_contact: editingLearner.parent_guardian_contact,
        learning_modality: editingLearner.learning_modality,
        sf1_remarks: editingLearner.sf1_remarks,
        enrollment_status: editingLearner.enrollment_status,
      });
      setLearners((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setEditingLearner(null);
      showMessage("Learner SF1 profile updated.");
    } catch (err) {
      console.error(err);
      showMessage("Failed to update learner profile.", "error");
    } finally {
      setIsSavingLearnerProfile(false);
    }
  };

  const handleSyncRosterAcrossTerms = async () => {
    if (!selectedClass) return;
    try {
      const count = await syncSectionLearnersAcrossSchoolYear(selectedClass);
      showMessage(
        count > 0
          ? `Synced ${count} learners across Term 1, Term 2, and Term 3.`
          : "No learners or sibling terms to sync."
      );
    } catch (err) {
      console.error(err);
      showMessage("Failed to sync roster across terms.", "error");
    }
  };

  const handleUpdateLearnerStatus = async (learnerId: string, status: EnrollmentStatus) => {
    try {
      const updated = await updateLearner(learnerId, { enrollment_status: status });
      setLearners((prev) => prev.map((l) => (l.id === learnerId ? updated : l)));
      showMessage("Learner status updated.");
    } catch (err) {
      console.error(err);
      showMessage("Failed to update learner.", "error");
    }
  };

  const handleDeleteLearner = async (learner: Learner) => {
    if (!selectedClass) return;
    if (!window.confirm(`Remove ${learner.full_name} (LRN: ${learner.lrn}) from this class?`)) {
      return;
    }
    try {
      await deleteLearner(learner.id);
      setLearners((prev) => prev.filter((l) => l.id !== learner.id));
      showMessage("Learner removed.");
      loadClasses();
    } catch (err) {
      console.error(err);
      showMessage("Failed to remove learner.", "error");
    }
  };

  const handleConnectSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !connectSubjectId) return;
    const targetSubject = subjects.find((s) => s.id === connectSubjectId);
    if (!targetSubject) return;

    setIsConnectingSubject(true);
    try {
      await upsertSectionSubject({
        section: selectedClass,
        subject: targetSubject,
        teacherId: connectTeacherId || null,
        curriculumType: connectCurriculum,
        units: Number(connectUnits) || 1,
        sortOrder: sectionSubjects.length + 1,
        syncAcrossSchoolYear: true,
      });
      showMessage(`Connected ${targetSubject.subject_name} to Grade ${selectedClass.grade_level} - ${selectedClass.section_name}.`);
      await Promise.all([loadSectionDetails(selectedClass), loadClasses()]);
      onDataSynced?.();
    } catch (err) {
      console.error(err);
      showMessage("Failed to connect subject to class.", "error");
    } finally {
      setIsConnectingSubject(false);
    }
  };

  const handleChangeSubjectTeacher = async (ss: SectionSubject, nextTeacherId: string) => {
    if (!selectedClass || !ss.subject) return;
    try {
      await upsertSectionSubject({
        section: selectedClass,
        subject: ss.subject,
        teacherId: nextTeacherId || null,
        curriculumType: ss.curriculum_type,
        units: ss.units,
        sortOrder: ss.sort_order,
        syncAcrossSchoolYear: false,
      });
      showMessage("Subject teacher assignment updated.");
      loadSectionDetails(selectedClass);
      onDataSynced?.();
    } catch (err) {
      console.error(err);
      showMessage("Failed to update subject teacher.", "error");
    }
  };

  const handlePullFromFacultyLoading = async () => {
    if (!selectedClass) return;
    try {
      const count = await syncSectionSubjectsFromLoads(selectedClass);
      showMessage(
        count > 0
          ? `Connected ${count} subjects & teachers from Faculty Loading (SF7).`
          : "No Faculty Loading entries found for this section yet."
      );
      await Promise.all([loadSectionDetails(selectedClass), loadClasses()]);
      onDataSynced?.();
    } catch (err) {
      console.error(err);
      showMessage("Failed to sync from Faculty Loading.", "error");
    }
  };

  const handleDeleteSectionSubject = async (ss: SectionSubject) => {
    if (!selectedClass) return;
    if (!window.confirm(`Disconnect ${ss.subject?.subject_name || "subject"} from this class?`)) return;
    try {
      await deleteSectionSubject(ss.id);
      setSectionSubjects((prev) => prev.filter((item) => item.id !== ss.id));
      showMessage("Subject disconnected.");
      loadClasses();
    } catch (err) {
      console.error(err);
      showMessage("Failed to disconnect subject.", "error");
    }
  };

  const maleLearners = useMemo(() => learners.filter((l) => l.gender === "Male"), [learners]);
  const femaleLearners = useMemo(() => learners.filter((l) => l.gender === "Female"), [learners]);

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sand-600 space-y-2">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyprus-800" />
        <p className="text-xs">Loading classes, advisers, and rosters...</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-sand-200 p-10 text-center space-y-3">
        <Users className="w-10 h-10 mx-auto text-sand-400" />
        <h3 className="text-sm font-bold text-cyprus-900">
          {isPrivileged
            ? "No sections found for the active academic term."
            : "You are not currently assigned as a Class Adviser."}
        </h3>
        <p className="text-xs text-sand-600 max-w-md mx-auto">
          {isPrivileged
            ? "Create sections under Admin & Settings → Sections first, then return here to assign advisers, enroll learners, and connect subjects."
            : "Ask your School Head or Super Admin to designate you as Class Adviser for your section. You can still manage your Subject E-Class Records in the first tab."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div
          role="status"
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            toast.type === "error"
              ? "bg-crimson-50 border-crimson-200 text-crimson-900"
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-crimson-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Class Selector & Adviser Metadata Card */}
      <div className="bg-white rounded-2xl border border-[#E3DDD1] p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="cm-section-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Select Class / Section
            </label>
            <select
              id="cm-section-select"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-[#FAF8F5] text-cyprus-900 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
            >
              {classes.map((c) => (
                <option key={c.section.id} value={c.section.id}>
                  Grade {c.section.grade_level} - {c.section.section_name} ({c.learnerCount} learners • {c.subjectCount} subjects)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cm-adviser-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Class Adviser
            </label>
            {isPrivileged ? (
              <select
                id="cm-adviser-select"
                value={adviserId}
                onChange={(e) => setAdviserId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                <option value="">-- No Adviser Assigned --</option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.full_name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2.5 rounded-xl border border-sand-200 bg-sand-50 text-xs font-semibold text-cyprus-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>{selectedClass?.adviser?.full_name || "Unassigned"}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label htmlFor="cm-track-input" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Track / Strand (SHS &amp; SF9)
              </label>
              <input
                id="cm-track-input"
                type="text"
                value={trackStrand}
                onChange={(e) => setTrackStrand(e.target.value)}
                disabled={!isPrivileged}
                placeholder="e.g. SSHS Academic - ASSH"
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white disabled:bg-sand-50 text-cyprus-900 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              />
            </div>
            {isPrivileged && (
              <button
                type="button"
                onClick={handleSaveAdviserAndTrack}
                disabled={isSavingClassMeta}
                className="px-4 py-2.5 rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingClassMeta ? "Saving..." : "Save Class"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-sand-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInnerTab("learners")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                innerTab === "learners"
                  ? "bg-cyprus-900 text-white"
                  : "bg-sand-100 text-sand-800 hover:bg-sand-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Enrolled Learners ({learners.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setInnerTab("subjects")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                innerTab === "subjects"
                  ? "bg-cyprus-900 text-white"
                  : "bg-sand-100 text-sand-800 hover:bg-sand-200"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Connected Subjects &amp; Teachers ({sectionSubjects.length})</span>
            </button>
          </div>

          {innerTab === "learners" && canManageSelectedClass && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkOpen(true)}
                className="px-3 py-2 rounded-xl border border-sand-300 bg-white hover:bg-sand-50 text-cyprus-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-crimson-600" />
                <span>Bulk Import / Paste</span>
              </button>
              <button
                type="button"
                onClick={handleSyncRosterAcrossTerms}
                className="px-3 py-2 rounded-xl border border-sand-300 bg-white hover:bg-sand-50 text-cyprus-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyprus-700" />
                <span>Sync Roster to T1–T3</span>
              </button>
            </div>
          )}

          {innerTab === "subjects" && canManageSelectedClass && (
            <button
              type="button"
              onClick={handlePullFromFacultyLoading}
              className="px-3 py-2 rounded-xl border border-sand-300 bg-white hover:bg-sand-50 text-cyprus-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-crimson-600" />
              <span>Sync from Faculty Loading (SF7)</span>
            </button>
          )}
        </div>
      </div>

      {/* INNER TAB 1: LEARNERS MASTERLIST */}
      {innerTab === "learners" && selectedClass && (
        <div className="space-y-4">
          {canManageSelectedClass && (
            <form
              onSubmit={handleAddSingleLearner}
              className="bg-white rounded-2xl border border-sand-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
            >
              <div className="sm:col-span-4">
                <label htmlFor="enroll-name" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                  Learner Full Name (Last, First M.I.)
                </label>
                <input
                  id="enroll-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Dela Cruz, Juan M."
                  className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-xs text-cyprus-900"
                />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="enroll-lrn" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                  DepEd LRN (12 digits)
                </label>
                <input
                  id="enroll-lrn"
                  type="text"
                  required
                  maxLength={14}
                  value={newLrn}
                  onChange={(e) => setNewLrn(e.target.value)}
                  placeholder="109283746501"
                  className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-xs font-mono text-cyprus-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="enroll-gender" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                  Sex
                </label>
                <select
                  id="enroll-gender"
                  value={newGender}
                  onChange={(e) => setNewGender(e.target.value as "Male" | "Female")}
                  className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-xs text-cyprus-900"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="enroll-dob" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                  Birthdate
                </label>
                <input
                  id="enroll-dob"
                  type="date"
                  value={newBirthdate}
                  onChange={(e) => setNewBirthdate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-xs text-cyprus-900"
                />
              </div>
              <div className="sm:col-span-1">
                <button
                  type="submit"
                  disabled={isAddingLearner}
                  className="w-full py-2 px-3 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Enroll Learner"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="sm:hidden lg:inline">Add</span>
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl border border-sand-200 overflow-hidden shadow-xs">
            {isLoadingDetails ? (
              <div className="py-10 text-center text-xs text-sand-500">Loading class roster...</div>
            ) : learners.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Users className="w-8 h-8 mx-auto text-sand-400" />
                <p className="text-xs font-semibold text-cyprus-900">
                  No learners enrolled in Grade {selectedClass.grade_level} - {selectedClass.section_name} yet.
                </p>
                <p className="text-[11px] text-sand-600">
                  Add learners individually above or click &ldquo;Bulk Import / Paste&rdquo; to enroll the entire section at once.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-sand-100 border-b border-sand-200 text-[11px] font-bold text-cyprus-900 uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10">#</th>
                      <th className="py-2.5 px-3">Learner Name &amp; Modality</th>
                      <th className="py-2.5 px-3">LRN</th>
                      <th className="py-2.5 px-3">Sex</th>
                      <th className="py-2.5 px-3">Birthdate / Age</th>
                      <th className="py-2.5 px-3">Address (Brgy / Municipality)</th>
                      <th className="py-2.5 px-3">Parents / Guardian</th>
                      <th className="py-2.5 px-3">Status &amp; Remarks</th>
                      {canManageSelectedClass && <th className="py-2.5 px-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-200">
                    {[
                      { label: "MALE LEARNERS", rows: maleLearners },
                      { label: "FEMALE LEARNERS", rows: femaleLearners },
                    ].map((group) => (
                      <React.Fragment key={group.label}>
                        <tr className="bg-sand-50 font-bold text-[11px] text-cyprus-900">
                          <td colSpan={canManageSelectedClass ? 9 : 8} className="py-1.5 px-3">
                            {group.label} ({group.rows.length})
                          </td>
                        </tr>
                        {group.rows.map((l, idx) => (
                          <tr key={l.id} className="hover:bg-sand-50/70">
                            <td className="py-2 px-3 font-mono text-sand-600">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-cyprus-900">{l.full_name}</div>
                              <div className="text-[10px] text-sand-600">
                                {l.learning_modality || "Face to Face"}
                                {l.mother_tongue ? ` • ${l.mother_tongue}` : ""}
                              </div>
                            </td>
                            <td className="py-2 px-3 font-mono text-sand-800">{l.lrn}</td>
                            <td className="py-2 px-3">{l.gender === "Male" ? "M" : "F"}</td>
                            <td className="py-2 px-3 font-mono text-sand-700 whitespace-nowrap">
                              <div>{l.birthdate ? l.birthdate.slice(0, 10) : "—"}</div>
                              <div className="text-[10px] text-sand-500">
                                Age: {l.age_june ?? computeAgeDisplay(l.birthdate)}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-[11px] text-sand-700">
                              {[l.address_barangay, l.address_municipality].filter(Boolean).join(", ") || "—"}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-sand-700 max-w-[200px]">
                              <div className="truncate">{l.father_name || l.guardian_name || "—"}</div>
                              {l.mother_maiden_name && (
                                <div className="text-[10px] text-sand-500 truncate">{l.mother_maiden_name}</div>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {canManageSelectedClass ? (
                                <select
                                  value={l.enrollment_status}
                                  onChange={(e) =>
                                    handleUpdateLearnerStatus(l.id, e.target.value as EnrollmentStatus)
                                  }
                                  aria-label={`Enrollment status for ${l.full_name}`}
                                  className="px-2 py-1 rounded-lg border border-sand-200 bg-white text-[11px] font-semibold text-cyprus-900"
                                >
                                  <option value="Enrolled">Enrolled</option>
                                  <option value="Transferred In">Transferred In</option>
                                  <option value="Transferred Out">Transferred Out</option>
                                  <option value="Dropped">Dropped</option>
                                </select>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800">
                                  {l.enrollment_status}
                                </span>
                              )}
                              {l.sf1_remarks && (
                                <div className="text-[10px] text-amber-800 font-medium mt-0.5">
                                  {l.sf1_remarks}
                                </div>
                              )}
                            </td>
                            {canManageSelectedClass && (
                              <td className="py-2 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingLearner(l)}
                                    className="p-1.5 rounded-lg text-sand-600 hover:text-cyprus-800 hover:bg-sand-100 cursor-pointer"
                                    aria-label={`Edit SF1 profile for ${l.full_name}`}
                                    title="View / Edit Full SF1 Profile"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLearner(l)}
                                    className="p-1.5 rounded-lg text-sand-400 hover:text-crimson-600 cursor-pointer"
                                    aria-label={`Remove ${l.full_name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INNER TAB 2: CONNECTED SUBJECTS & TEACHERS */}
      {innerTab === "subjects" && selectedClass && (
        <div className="space-y-4">
          {canManageSelectedClass && (
            <form
              onSubmit={handleConnectSubjectSubmit}
              className="bg-white rounded-2xl border border-sand-200 p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-cyprus-900">
                  Connect Subject &amp; Assign Subject Teacher
                </h3>
                <label className="flex items-center gap-1.5 text-[11px] text-sand-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAllGradeSubjects}
                    onChange={(e) => setShowAllGradeSubjects(e.target.checked)}
                    className="rounded border-sand-300 text-crimson-600"
                  />
                  <span>Show subjects from all grade levels</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <label htmlFor="cs-subject" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Subject
                  </label>
                  <select
                    id="cs-subject"
                    value={connectSubjectId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setConnectSubjectId(nextId);
                      const sub = subjects.find((s) => s.id === nextId);
                      if (sub) {
                        const inf = inferCurriculumAndUnits(
                          selectedClass.grade_level,
                          sub,
                          selectedClass,
                          activeTerm?.school_year
                        );
                        setConnectCurriculum(inf.curriculumType);
                        setConnectUnits(inf.units);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-xs text-cyprus-900"
                  >
                    {availableSubjectsForGrade.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subject_name} ({s.subject_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="cs-teacher" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Assigned Subject Teacher
                  </label>
                  <select
                    id="cs-teacher"
                    value={connectTeacherId}
                    onChange={(e) => setConnectTeacherId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-xs text-cyprus-900"
                  >
                    <option value="">-- Unassigned --</option>
                    {facultyList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="cs-curriculum" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Curriculum Weight Standard
                  </label>
                  <select
                    id="cs-curriculum"
                    value={connectCurriculum}
                    onChange={(e) => setConnectCurriculum(e.target.value as CurriculumType)}
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-xs text-cyprus-900"
                  >
                    {CURRICULUM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label htmlFor="cs-units" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Units
                  </label>
                  <input
                    id="cs-units"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="12"
                    value={connectUnits}
                    onChange={(e) => setConnectUnits(parseFloat(e.target.value) || 1)}
                    className="w-full px-2.5 py-2 rounded-xl border border-sand-300 bg-white text-xs font-mono text-cyprus-900"
                  />
                </div>

                <div className="sm:col-span-1">
                  <button
                    type="submit"
                    disabled={isConnectingSubject || !connectSubjectId}
                    className="w-full py-2 px-3 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="sm:hidden lg:inline">Link</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl border border-sand-200 overflow-hidden shadow-xs">
            {sectionSubjects.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <BookOpen className="w-8 h-8 mx-auto text-sand-400" />
                <p className="text-xs font-semibold text-cyprus-900">
                  No subjects connected to Grade {selectedClass.grade_level} - {selectedClass.section_name} yet.
                </p>
                <p className="text-[11px] text-sand-600">
                  Click &ldquo;Sync from Faculty Loading (SF7)&rdquo; above or connect subjects manually.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-sand-100 border-b border-sand-200 text-[11px] font-bold text-cyprus-900 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Curriculum Standard</th>
                      <th className="py-2.5 px-3 text-center">Units/Term</th>
                      <th className="py-2.5 px-3">Subject Teacher</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-200">
                    {sectionSubjects.map((ss) => {
                      const isMySubject = ss.teacher_id === currentUser.id || isPrivileged;
                      return (
                        <tr key={ss.id} className="hover:bg-sand-50/70">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-cyprus-900">{ss.subject?.subject_name}</div>
                            <div className="text-[10px] font-mono text-sand-600">
                              {ss.subject?.subject_code}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sand-100 text-sand-800 border border-sand-200">
                              {ss.subject?.category || "Core"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] font-medium text-cyprus-800">
                            {ss.curriculum_type}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            {ss.units}
                          </td>
                          <td className="py-2.5 px-3">
                            {canManageSelectedClass ? (
                              <select
                                value={ss.teacher_id || ""}
                                onChange={(e) => handleChangeSubjectTeacher(ss, e.target.value)}
                                aria-label={`Subject teacher for ${ss.subject?.subject_name}`}
                                className="px-2.5 py-1.5 rounded-lg border border-sand-300 bg-white text-xs text-cyprus-900 max-w-[220px]"
                              >
                                <option value="">-- Unassigned --</option>
                                {facultyList.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.full_name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-medium text-cyprus-900">
                                {ss.teacher?.full_name || "Unassigned"}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {isMySubject && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onCreateOrOpenECR({
                                      sectionId: selectedClass.id,
                                      subjectId: ss.subject_id,
                                      curriculumType: ss.curriculum_type,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-[#0F3D2E] hover:bg-[#0A2E22] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <span>E-Class Record</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                              {canManageSelectedClass && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSectionSubject(ss)}
                                  className="p-1.5 rounded-lg text-sand-400 hover:text-crimson-600 cursor-pointer"
                                  aria-label={`Remove ${ss.subject?.subject_name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI-ASSISTED SF1 & BULK IMPORT LEARNERS MODAL */}
      {isBulkOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-sand-200 rounded-3xl w-full max-w-4xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-sand-200">
              <div>
                <h3 className="text-base font-bold text-cyprus-900 font-display flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-crimson-600" />
                  <span>AI-Assisted DepEd SF1 &amp; Roster Upload — Grade {selectedClass.grade_level} - {selectedClass.section_name}</span>
                </h3>
                <p className="text-xs text-sand-600">
                  Supports official DepEd LIS School Form 1 (.xlsx, .xls, .csv) with all 19 fields, or quick-pasted learner rows.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBulkOpen(false);
                  setSf1Preview(null);
                }}
                className="p-1.5 rounded-lg text-sand-500 hover:text-cyprus-900 cursor-pointer"
                aria-label="Close bulk import modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBulkPasteSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bulk-learners-file" className="block text-xs font-semibold text-cyprus-900 mb-1.5">
                    Upload DepEd SF1 Excel / CSV File
                  </label>
                  <input
                    id="bulk-learners-file"
                    type="file"
                    accept=".csv,.tsv,.xlsx,.xls"
                    onChange={handleBulkFileUpload}
                    disabled={isParsingBulk || isImportingBulk}
                    className="block w-full text-xs text-sand-700 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border file:border-sand-300 file:text-xs file:font-semibold file:bg-sand-50 hover:file:bg-sand-100 cursor-pointer"
                  />
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>CWE-1236 Formula Injection Defense &amp; SF1 Header Detection active</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="bulk-learners-text" className="block text-xs font-semibold text-cyprus-900 mb-1">
                    Or Paste SF1 / CSV / Excel Rows Directly
                  </label>
                  <textarea
                    id="bulk-learners-text"
                    rows={4}
                    value={bulkText}
                    onChange={(e) => handleBulkTextAnalyze(e.target.value)}
                    placeholder="Paste your SF1 CSV text or Excel columns here..."
                    className="w-full p-2.5 rounded-xl border border-sand-300 bg-white font-mono text-[11px] text-cyprus-900 focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
                  />
                </div>
              </div>

              {/* Parsed SF1 Detection & Preview Table */}
              {sf1Preview && (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs flex flex-wrap items-center justify-between gap-2 text-teal-900">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>
                        Detected: <strong>{sf1Preview.detectedFormat}</strong> —{" "}
                        <strong>{sf1Preview.learners.length}</strong> learners (
                        {sf1Preview.learners.filter((l) => l.gender === "Male").length} Male,{" "}
                        {sf1Preview.learners.filter((l) => l.gender === "Female").length} Female)
                        {sf1Preview.metadata.gradeLevel || sf1Preview.metadata.sectionName
                          ? ` • File Header: ${sf1Preview.metadata.gradeLevel || ""} ${sf1Preview.metadata.sectionName || ""}`
                          : ""}
                      </span>
                    </div>
                  </div>

                  {sf1Preview.metadata.sectionName &&
                    !selectedClass.section_name.toLowerCase().includes(sf1Preview.metadata.sectionName.toLowerCase()) && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>
                          Note: The uploaded SF1 header says <strong>{sf1Preview.metadata.gradeLevel} - {sf1Preview.metadata.sectionName}</strong>, while you currently selected <strong>Grade {selectedClass.grade_level} - {selectedClass.section_name}</strong>.
                        </span>
                      </div>
                    )}

                  <div className="border border-sand-200 rounded-xl overflow-x-auto max-h-64">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-sand-100 sticky top-0 border-b border-sand-200 font-bold text-cyprus-900">
                        <tr>
                          <th className="py-2 px-2.5">LRN</th>
                          <th className="py-2 px-2.5">Learner Name</th>
                          <th className="py-2 px-2.5">Sex</th>
                          <th className="py-2 px-2.5">Birthdate</th>
                          <th className="py-2 px-2.5">Age</th>
                          <th className="py-2 px-2.5">Address</th>
                          <th className="py-2 px-2.5">Parents / Guardian</th>
                          <th className="py-2 px-2.5">Modality &amp; Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sand-200">
                        {sf1Preview.learners.map((item, i) => (
                          <tr key={`${item.lrn}-${i}`} className="hover:bg-sand-50">
                            <td className="py-1.5 px-2.5 font-mono">{item.lrn}</td>
                            <td className="py-1.5 px-2.5 font-semibold text-cyprus-900">{item.full_name}</td>
                            <td className="py-1.5 px-2.5">{item.gender === "Male" ? "M" : "F"}</td>
                            <td className="py-1.5 px-2.5 font-mono">{item.birthdate || "—"}</td>
                            <td className="py-1.5 px-2.5 font-mono">{item.age_june ?? "—"}</td>
                            <td className="py-1.5 px-2.5">
                              {[item.address_barangay, item.address_municipality].filter(Boolean).join(", ") || "—"}
                            </td>
                            <td className="py-1.5 px-2.5 max-w-[180px] truncate">
                              {item.father_name || item.mother_maiden_name || item.guardian_name || "—"}
                            </td>
                            <td className="py-1.5 px-2.5">
                              <span>{item.learning_modality || "Face to Face"}</span>
                              {item.sf1_remarks && (
                                <span className="ml-1 text-[10px] font-bold text-amber-700">
                                  ({item.sf1_remarks})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-sand-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkOpen(false);
                    setSf1Preview(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-sand-300 text-xs font-semibold text-sand-800 hover:bg-sand-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImportingBulk || !sf1Preview || sf1Preview.learners.length === 0}
                  className="px-5 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isImportingBulk
                    ? "Enrolling..."
                    : `Confirm & Enroll ${sf1Preview?.learners.length || 0} Learners`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL SF1 LEARNER PROFILE EDITOR MODAL */}
      {editingLearner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-sand-200 rounded-3xl w-full max-w-3xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-sand-200">
              <div>
                <h3 className="text-base font-bold text-cyprus-900 font-display">
                  DepEd SF1 Learner Profile — {editingLearner.full_name}
                </h3>
                <p className="text-xs text-sand-600">LRN: {editingLearner.lrn}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLearner(null)}
                className="p-1.5 rounded-lg text-sand-500 hover:text-cyprus-900 cursor-pointer"
                aria-label="Close SF1 profile modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLearnerProfile} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="sf1-edit-name" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Full Name (Last, First, Middle)
                  </label>
                  <input
                    id="sf1-edit-name"
                    type="text"
                    required
                    value={editingLearner.full_name}
                    onChange={(e) => setEditingLearner({ ...editingLearner, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="sf1-edit-lrn" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    LRN
                  </label>
                  <input
                    id="sf1-edit-lrn"
                    type="text"
                    required
                    value={editingLearner.lrn}
                    onChange={(e) => setEditingLearner({ ...editingLearner, lrn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="sf1-edit-sex" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Sex (M/F)
                  </label>
                  <select
                    id="sf1-edit-sex"
                    value={editingLearner.gender}
                    onChange={(e) =>
                      setEditingLearner({ ...editingLearner, gender: e.target.value as "Male" | "Female" })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="sf1-edit-dob" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Birth Date
                  </label>
                  <input
                    id="sf1-edit-dob"
                    type="date"
                    value={editingLearner.birthdate ? editingLearner.birthdate.slice(0, 10) : ""}
                    onChange={(e) => setEditingLearner({ ...editingLearner, birthdate: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="sf1-edit-age" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Age (1st Friday June)
                  </label>
                  <input
                    id="sf1-edit-age"
                    type="number"
                    value={editingLearner.age_june ?? ""}
                    onChange={(e) =>
                      setEditingLearner({
                        ...editingLearner,
                        age_june: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="sf1-edit-tongue" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Mother Tongue
                  </label>
                  <input
                    id="sf1-edit-tongue"
                    type="text"
                    value={editingLearner.mother_tongue || ""}
                    onChange={(e) => setEditingLearner({ ...editingLearner, mother_tongue: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="sf1-edit-ip" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    IP (Ethnic Group)
                  </label>
                  <input
                    id="sf1-edit-ip"
                    type="text"
                    value={editingLearner.ip_ethnic_group || ""}
                    onChange={(e) =>
                      setEditingLearner({ ...editingLearner, ip_ethnic_group: e.target.value || null })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="sf1-edit-religion" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Religion
                  </label>
                  <input
                    id="sf1-edit-religion"
                    type="text"
                    value={editingLearner.religion || ""}
                    onChange={(e) => setEditingLearner({ ...editingLearner, religion: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-sand-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="sf1-edit-street" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    House # / Street / Purok
                  </label>
                  <input
                    id="sf1-edit-street"
                    type="text"
                    value={editingLearner.address_street || ""}
                    onChange={(e) => setEditingLearner({ ...editingLearner, address_street: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="sf1-edit-brgy" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Barangay
                  </label>
                  <input
                    id="sf1-edit-brgy"
                    type="text"
                    value={editingLearner.address_barangay || ""}
                    onChange={(e) =>
                      setEditingLearner({ ...editingLearner, address_barangay: e.target.value || null })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="sf1-edit-muni" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Municipality / City
                  </label>
                  <input
                    id="sf1-edit-muni"
                    type="text"
                    value={editingLearner.address_municipality || ""}
                    onChange={(e) =>
                      setEditingLearner({ ...editingLearner, address_municipality: e.target.value || null })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="sf1-edit-prov" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Province
                  </label>
                  <input
                    id="sf1-edit-prov"
                    type="text"
                    value={editingLearner.address_province || ""}
                    onChange={(e) =>
                      setEditingLearner({ ...editingLearner, address_province: e.target.value || null })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-sand-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="sf1-edit-father" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Father&apos;s Name
                  </label>
                  <input
                    id="sf1-edit-father"
                    type="text"
                    value={editingLearner.father_name || ""}
                    onChange={(e) => setEditingLearner({ ...editingLearner, father_name: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="sf1-edit-mother" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Mother&apos;s Maiden Name
                  </label>
                  <input
                    id="sf1-edit-mother"
                    type="text"
                    value={editingLearner.mother_maiden_name || ""}
                    onChange={(e) =>
                      setEditingLearner({ ...editingLearner, mother_maiden_name: e.target.value || null })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="sf1-edit-guardian" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Guardian Name (if Not Parent)
                  </label>
                  <input
                    id="sf1-edit-guardian"
                    type="text"
                    value={editingLearner.guardian_name || ""}
                    onChange={(e) => setEditingLearner({ ...editingLearner, guardian_name: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="sf1-edit-rel" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                      Relationship
                    </label>
                    <input
                      id="sf1-edit-rel"
                      type="text"
                      value={editingLearner.guardian_relationship || ""}
                      onChange={(e) =>
                        setEditingLearner({ ...editingLearner, guardian_relationship: e.target.value || null })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="sf1-edit-contact" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                      Contact Number
                    </label>
                    <input
                      id="sf1-edit-contact"
                      type="text"
                      value={editingLearner.parent_guardian_contact || ""}
                      onChange={(e) =>
                        setEditingLearner({ ...editingLearner, parent_guardian_contact: e.target.value || null })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="sf1-edit-modality" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    Learning Modality
                  </label>
                  <input
                    id="sf1-edit-modality"
                    type="text"
                    value={editingLearner.learning_modality || ""}
                    onChange={(e) =>
                      setEditingLearner({ ...editingLearner, learning_modality: e.target.value || null })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="sf1-edit-remarks" className="block text-[11px] font-semibold text-cyprus-900 mb-1">
                    SF1 Remarks / Indicator (T/I, T/O, DRP, CCT)
                  </label>
                  <input
                    id="sf1-edit-remarks"
                    type="text"
                    value={editingLearner.sf1_remarks || ""}
                    onChange={(e) => setEditingLearner({ ...editingLearner, sf1_remarks: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-sand-200">
                <button
                  type="button"
                  onClick={() => setEditingLearner(null)}
                  className="px-4 py-2 rounded-xl border border-sand-300 text-xs font-semibold text-sand-800 hover:bg-sand-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLearnerProfile}
                  className="px-5 py-2 rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSavingLearnerProfile ? "Saving..." : "Save SF1 Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
