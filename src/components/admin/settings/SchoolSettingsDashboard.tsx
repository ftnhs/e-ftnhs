import React, { useState, useEffect, useMemo, useCallback } from"react";
import { schoolReferenceService } from"../../../services/schoolReferenceService";
import type {
  SchoolSettings,
  AcademicTerm,
  Section,
  Department,
  Subject,
  TimeSlot,
  TimeSlotOverride,
  TimeSlotScopeType,
  ResolvedTimeSlot,
  Room,
  Profile,
  SubjectCategory,
  SubjectCurriculumVersion,
} from"../../../types";
import { resolveTimeSlotsForSection } from "../../../services/timetableService";
import {
  School,
  Calendar,
  Users,
  BookOpen,
  Clock,
  Building2,
  Briefcase,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Save,
  Search,
  AlertCircle,
  X,
  RotateCcw,
} from"lucide-react";

interface SchoolSettingsDashboardProps {
  facultyList: Profile[];
  onRefresh?: () => void;
}

type SettingsTab =
  |"school_info"
  |"academic_terms"
  |"sections"
  |"departments"
  |"subjects"
  |"time_slots"
  |"rooms";

export const SchoolSettingsDashboard: React.FC<SchoolSettingsDashboardProps> = ({
  facultyList,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("school_info");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeSlotOverrides, setTimeSlotOverrides] = useState<TimeSlotOverride[]>([]);
  const [bellSections, setBellSections] = useState<Section[]>([]);
  const [bellScope, setBellScope] = useState<"BASE" | TimeSlotScopeType>("BASE");
  const [selectedBellSectionId, setSelectedBellSectionId] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type:"success" |"error";
  } | null>(null);

  // Data states
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({
    id:"default-settings",
    school_name:"FERMIN TAYABAS NATIONAL HIGH SCHOOL",
    school_id:"302851",
    region:"REGION VII",
    division:"DIVISION OF BOHOL",
    district:"DISTRICT OF CALAPE",
    address:"Cabayugan, Calape, Bohol",
    principal_name:"Pee Jay Baslan, EdD",
    principal_designation:"School-in-Charge",
    psds_name:"MA. TERESITA I. ALAMPAYAN, PhD",
    psds_designation:"Public Schools District Supervisor",
    sds_name:"FAY C. LUAREZ EdD, PhD TM, CESO V",
    sds_designation:"Schools Division Superintendent",
    jhs_coordinator_name:"MAURINE D. CUARIO",
    jhs_coordinator_designation:"Teacher III / JHS Coordinator",
    shs_coordinator_name:"DELLIE T. VIGONTE",
    shs_coordinator_designation:"Teacher III / SHS Coordinator",
  });
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  // Search & Filter queries
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("ALL");
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>("");

  // Modal states for CRUD operations
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
  const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const showToast = (text: string, type:"success" |"error" ="success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllReferenceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        settingsData,
        termsData,
        deptsData,
        subjectsData,
        slotsData,
        roomsData,
      ] = await Promise.all([
        schoolReferenceService.fetchSchoolSettings(),
        schoolReferenceService.fetchAcademicTerms(),
        schoolReferenceService.fetchDepartments(),
        schoolReferenceService.fetchSubjects(),
        schoolReferenceService.fetchTimeSlots(),
        schoolReferenceService.fetchRooms(),
      ]);

      // Fetch sections filtered to the active term to avoid showing all 3 terms (30 rows)
      const activeTermId = termsData.find((t) => t.is_active)?.id;
      const sectionsData = await schoolReferenceService.fetchSections(activeTermId);

      setSchoolSettings(settingsData);
      setTerms(termsData);
      setSections(sectionsData);
      setDepartments(deptsData);
      setSubjects(subjectsData);
      setTimeSlots(slotsData);
      setRooms(roomsData);

      setSelectedTermFilter((prev) => {
        if (prev && (prev ==="ALL" || termsData.some((t) => t.id === prev))) {
          return prev;
        }
        const active = termsData.find((t) => t.is_active) || termsData[0];
        return active?.id ||"ALL";
      });
    } catch (err) {
      console.error("Error loading school reference data:", err);
      showToast("Error loading reference settings.","error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllReferenceData();
  }, [loadAllReferenceData]);

  // Re-fetch sections whenever the term filter changes (sections are stored per-term)
  useEffect(() => {
    if (!selectedTermFilter) return;
    const termId = selectedTermFilter === "ALL" ? undefined : selectedTermFilter;
    schoolReferenceService.fetchSections(termId).then(setSections).catch(console.error);
  }, [selectedTermFilter]);

  // Active Term helper
  const activeTerm = useMemo(() => terms.find((t) => t.is_active), [terms]);

  // Load Bell Schedule overrides & active-term sections for section-specific schedules
  const refreshTimeSlotOverrides = useCallback(async () => {
    try {
      const overridesData = await schoolReferenceService.fetchTimeSlotOverrides();
      setTimeSlotOverrides(overridesData);
    } catch (err) {
      console.error("Failed to fetch time slot overrides:", err);
    }
  }, []);

  useEffect(() => {
    refreshTimeSlotOverrides();
  }, [refreshTimeSlotOverrides]);

  useEffect(() => {
    const targetTermId = activeTerm?.id;
    schoolReferenceService
      .fetchSections(targetTermId)
      .then((secs) => {
        setBellSections(secs);
        setSelectedBellSectionId((prev) =>
          prev && secs.some((s) => s.id === prev) ? prev : secs[0]?.id || ""
        );
      })
      .catch(console.error);
  }, [activeTerm?.id, sections]);

  const selectedBellSection = useMemo(
    () => bellSections.find((s) => s.id === selectedBellSectionId) || null,
    [bellSections, selectedBellSectionId]
  );

  const displayedBellSlots = useMemo<ResolvedTimeSlot[]>(() => {
    if (bellScope === "BASE") {
      return timeSlots.map((slot) => ({
        ...slot,
        override_scope: null,
        override_id: null,
        is_overridden: false,
      }));
    }

    if (bellScope === "JHS" || bellScope === "SHS") {
      return [...timeSlots]
        .map((slot): ResolvedTimeSlot => {
          const ov = timeSlotOverrides.find(
            (o) => o.time_slot_id === slot.id && o.scope_type === bellScope && !o.section_id
          );
          if (ov) {
            return {
              ...slot,
              start_time: ov.start_time,
              end_time: ov.end_time,
              duration_minutes: ov.duration_minutes,
              slot_label: ov.slot_label || slot.slot_label,
              slot_type: ov.slot_type || slot.slot_type,
              override_scope: bellScope,
              override_id: ov.id,
              is_overridden: true,
            };
          }
          return {
            ...slot,
            override_scope: null,
            override_id: null,
            is_overridden: false,
          };
        })
        .sort((a, b) => a.sort_order - b.sort_order || a.start_time.localeCompare(b.start_time));
    }

    return resolveTimeSlotsForSection(timeSlots, timeSlotOverrides, selectedBellSection);
  }, [bellScope, timeSlots, timeSlotOverrides, selectedBellSection]);

  const jhsOverrideCount = useMemo(
    () => timeSlotOverrides.filter((o) => o.scope_type === "JHS" && !o.section_id).length,
    [timeSlotOverrides]
  );
  const shsOverrideCount = useMemo(
    () => timeSlotOverrides.filter((o) => o.scope_type === "SHS" && !o.section_id).length,
    [timeSlotOverrides]
  );
  const sectionOverrideCount = useMemo(
    () =>
      selectedBellSectionId
        ? timeSlotOverrides.filter(
            (o) => o.scope_type === "SECTION" && o.section_id === selectedBellSectionId
          ).length
        : 0,
    [timeSlotOverrides, selectedBellSectionId]
  );

  // =========================================================================
  // HANDLERS: SCHOOL INFO
  // =========================================================================
  const handleSaveSchoolInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await schoolReferenceService.updateSchoolSettings(schoolSettings);
      setSchoolSettings(updated);
      showToast("Institutional profile saved successfully.");
    } catch (err) {
      console.error("Failed to save school settings:", err);
      showToast("Failed to save school settings.","error");
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // HANDLERS: ACADEMIC TERMS
  // =========================================================================
  const handleSetActiveTerm = async (termId: string) => {
    try {
      await schoolReferenceService.setActiveAcademicTerm(termId);
      setTerms((prev) =>
        prev.map((t) => ({ ...t, is_active: t.id === termId }))
      );
      showToast("Active academic term updated successfully.");
    } catch (err) {
      console.error("Failed to activate term:", err);
      showToast("Failed to set active term.","error");
    }
  };

  const handleSaveTerm = async (termData: {
    school_year: string;
    term_number: 1 | 2 | 3;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
  }) => {
    setIsSaving(true);
    try {
      if (editingTerm) {
        const updated = await schoolReferenceService.updateAcademicTerm(
          editingTerm.id,
          termData
        );
        setTerms((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        showToast("Academic term updated successfully.");
      } else {
        const created = await schoolReferenceService.createAcademicTerm(termData);
        setTerms((prev) => [created, ...prev]);
        showToast("New academic term created successfully.");
      }
      setIsTermModalOpen(false);
      setEditingTerm(null);
      loadAllReferenceData();
    } catch (err) {
      console.error("Failed to save academic term:", err);
      showToast("Failed to save academic term.","error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTerm = async (termId: string) => {
    if (!window.confirm("Are you sure you want to delete this academic term?")) return;
    try {
      await schoolReferenceService.deleteAcademicTerm(termId);
      setTerms((prev) => prev.filter((t) => t.id !== termId));
      showToast("Academic term deleted.");
    } catch (err) {
      console.error("Failed to delete term:", err);
      showToast("Cannot delete term with existing student records or timetables.","error");
    }
  };

  // =========================================================================
  // HANDLERS: SECTIONS
  // =========================================================================
  const handleSaveSection = async (sectionData: {
    term_id: string;
    grade_level: number;
    section_name: string;
    track_strand?: string | null;
    adviser_id: string | null;
    room_id: string | null;
  }) => {
    setIsSaving(true);
    try {
      if (editingSection) {
        const updated = await schoolReferenceService.updateSection(
          editingSection.id,
          sectionData
        );
        setSections((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
        showToast("Section updated successfully.");
      } else {
        const created = await schoolReferenceService.createSection(sectionData);
        setSections((prev) => [...prev, created]);
        showToast("New section created successfully.");
      }
      setIsSectionModalOpen(false);
      setEditingSection(null);
      loadAllReferenceData();
    } catch (err) {
      console.error("Failed to save section:", err);
      showToast("Failed to save section. Ensure section name is unique for grade.","error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm("Delete this section? Timetable references will also be removed.")) return;
    try {
      await schoolReferenceService.deleteSection(sectionId);
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      showToast("Section removed.");
    } catch (err) {
      console.error("Failed to delete section:", err);
      showToast("Cannot delete section with existing schedule entries.","error");
    }
  };

  // =========================================================================
  // HANDLERS: DEPARTMENTS
  // =========================================================================
  const handleSaveDept = async (deptData: {
    dept_code: string;
    dept_name: string;
    dept_head_id: string | null;
    description: string | null;
    is_active: boolean;
    sort_order: number;
  }) => {
    setIsSaving(true);
    try {
      if (editingDept) {
        const updated = await schoolReferenceService.updateDepartment(
          editingDept.id,
          deptData
        );
        setDepartments((prev) =>
          prev.map((d) => (d.id === updated.id ? updated : d))
        );
        showToast("Department updated successfully.");
      } else {
        const created = await schoolReferenceService.createDepartment(deptData);
        setDepartments((prev) => [...prev, created]);
        showToast("New department created successfully.");
      }
      setIsDeptModalOpen(false);
      setEditingDept(null);
      loadAllReferenceData();
    } catch (err) {
      console.error("Failed to save department:", err);
      showToast("Failed to save department. Department code must be unique.","error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDept = async (deptId: string) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    try {
      await schoolReferenceService.deleteDepartment(deptId);
      setDepartments((prev) => prev.filter((d) => d.id !== deptId));
      showToast("Department deleted.");
    } catch (err) {
      console.error("Failed to delete department:", err);
      showToast("Failed to delete department.","error");
    }
  };

  // =========================================================================
  // HANDLERS: SUBJECTS
  // =========================================================================
  const handleSaveSubject = async (subjectData: {
    subject_code: string;
    subject_name: string;
    grade_level: number;
    track_strand: string | null;
    category: SubjectCategory;
    curriculum_version: SubjectCurriculumVersion;
    minutes_per_week: number;
    requires_lab: boolean;
  }) => {
    setIsSaving(true);
    try {
      if (editingSubject) {
        const updated = await schoolReferenceService.updateSubject(
          editingSubject.id,
          subjectData
        );
        setSubjects((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
        showToast("Subject updated successfully.");
      } else {
        const created = await schoolReferenceService.createSubject(subjectData);
        setSubjects((prev) => [...prev, created]);
        showToast("New subject added to catalog.");
      }
      setIsSubjectModalOpen(false);
      setEditingSubject(null);
      loadAllReferenceData();
    } catch (err) {
      console.error("Failed to save subject:", err);
      showToast("Failed to save subject. Code must be unique.","error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!window.confirm("Delete this subject from the catalog?")) return;
    try {
      await schoolReferenceService.deleteSubject(subjectId);
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
      showToast("Subject removed from catalog.");
    } catch (err) {
      console.error("Failed to delete subject:", err);
      showToast("Cannot delete subject with existing teaching loads.","error");
    }
  };

  // =========================================================================
  // HANDLERS: BELL SCHEDULE & TIME SLOTS
  // =========================================================================
  const handleSaveTimeSlotOrOverride = async (slotData: {
    slot_number: number;
    slot_label: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    slot_type: "Academic" | "Flag Ceremony" | "Recess" | "Lunch" | "Homeroom";
    sort_order: number;
  }) => {
    if (bellScope === "BASE" || !editingTimeSlot) {
      await handleSaveTimeSlot(slotData);
      return;
    }

    if (bellScope === "SECTION" && !selectedBellSectionId) {
      showToast("Please select a section first.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const saved = await schoolReferenceService.upsertTimeSlotOverride({
        time_slot_id: editingTimeSlot.id,
        scope_type: bellScope,
        section_id: bellScope === "SECTION" ? selectedBellSectionId : null,
        start_time: slotData.start_time,
        end_time: slotData.end_time,
        duration_minutes: slotData.duration_minutes,
        slot_label: slotData.slot_label,
        slot_type: slotData.slot_type,
      });

      setTimeSlotOverrides((prev) => {
        const filtered = prev.filter((o) => o.id !== saved.id);
        return [...filtered, saved];
      });
      setIsTimeSlotModalOpen(false);
      setEditingTimeSlot(null);
      showToast(
        bellScope === "SECTION"
          ? "Custom section time range saved."
          : `${bellScope} time range override saved.`
      );
    } catch (err) {
      console.error("Failed to save time slot override:", err);
      showToast("Failed to save time range override.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSlotOverride = async (slot: ResolvedTimeSlot) => {
    if (!slot.override_id) return;
    try {
      await schoolReferenceService.deleteTimeSlotOverride(slot.override_id);
      setTimeSlotOverrides((prev) => prev.filter((o) => o.id !== slot.override_id));
      showToast("Period reverted to inherited time schedule.");
    } catch (err) {
      console.error("Failed to reset time slot override:", err);
      showToast("Failed to reset time range override.", "error");
    }
  };

  const handleClearScopeOverrides = async () => {
    if (bellScope === "BASE") return;
    const scopeText =
      bellScope === "SECTION"
        ? `Grade ${selectedBellSection?.grade_level} - ${selectedBellSection?.section_name}`
        : bellScope;
    if (!window.confirm(`Reset all custom time ranges for ${scopeText} back to inherited defaults?`)) {
      return;
    }
    try {
      await schoolReferenceService.clearTimeSlotOverridesForScope(
        bellScope,
        bellScope === "SECTION" ? selectedBellSectionId : null
      );
      setTimeSlotOverrides((prev) =>
        prev.filter((o) => {
          if (bellScope === "SECTION") {
            return !(o.scope_type === "SECTION" && o.section_id === selectedBellSectionId);
          }
          return !(o.scope_type === bellScope && !o.section_id);
        })
      );
      showToast(`Cleared custom time overrides for ${scopeText}.`);
    } catch (err) {
      console.error("Failed to clear overrides:", err);
      showToast("Failed to reset schedule overrides.", "error");
    }
  };
  const handleSaveTimeSlot = async (slotData: {
    slot_number: number;
    slot_label: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    slot_type:"Academic" |"Flag Ceremony" |"Recess" |"Lunch" |"Homeroom";
    sort_order: number;
  }) => {
    setIsSaving(true);
    try {
      if (editingTimeSlot) {
        const updated = await schoolReferenceService.updateTimeSlot(
          editingTimeSlot.id,
          slotData
        );
        setTimeSlots((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
        showToast("Time slot updated.");
      } else {
        const created = await schoolReferenceService.createTimeSlot(slotData);
        setTimeSlots((prev) => [...prev, created]);
        showToast("New time slot added.");
      }
      setIsTimeSlotModalOpen(false);
      setEditingTimeSlot(null);
      loadAllReferenceData();
    } catch (err) {
      console.error("Failed to save time slot:", err);
      showToast("Failed to save time slot.","error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTimeSlot = async (slotId: string) => {
    if (!window.confirm("Delete this time slot?")) return;
    try {
      await schoolReferenceService.deleteTimeSlot(slotId);
      setTimeSlots((prev) => prev.filter((s) => s.id !== slotId));
      showToast("Time slot deleted.");
    } catch (err) {
      console.error("Failed to delete time slot:", err);
      showToast("Cannot delete time slot with active timetable entries.","error");
    }
  };

  // =========================================================================
  // HANDLERS: ROOMS & LABORATORIES
  // =========================================================================
  const handleSaveRoom = async (roomData: {
    room_number: string;
    room_name: string;
    room_type:"Standard Classroom" |"Science Laboratory" |"Computer Laboratory" |"TVL Workshop" |"Covered Court";
    capacity: number;
    is_specialized: boolean;
  }) => {
    setIsSaving(true);
    try {
      if (editingRoom) {
        const updated = await schoolReferenceService.updateRoom(
          editingRoom.id,
          roomData
        );
        setRooms((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
        showToast("Room updated.");
      } else {
        const created = await schoolReferenceService.createRoom(roomData);
        setRooms((prev) => [...prev, created]);
        showToast("New room added to facilities directory.");
      }
      setIsRoomModalOpen(false);
      setEditingRoom(null);
      loadAllReferenceData();
    } catch (err) {
      console.error("Failed to save room:", err);
      showToast("Failed to save room. Room number must be unique.","error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm("Delete this room from directory?")) return;
    try {
      await schoolReferenceService.deleteRoom(roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      showToast("Room deleted.");
    } catch (err) {
      console.error("Failed to delete room:", err);
      showToast("Cannot delete room currently allocated in timetable.","error");
    }
  };

  // =========================================================================
  // FILTERED DATA
  // =========================================================================
  const termMap = useMemo(() => {
    const map = new Map<string, AcademicTerm>();
    terms.forEach((t) => map.set(t.id, t));
    return map;
  }, [terms]);

  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      if (selectedTermFilter && selectedTermFilter !=="ALL" && s.term_id !== selectedTermFilter) {
        return false;
      }
      if (selectedGradeFilter !=="ALL" && s.grade_level.toString() !== selectedGradeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.section_name.toLowerCase().includes(q) ||
          s.adviser?.full_name?.toLowerCase().includes(q) ||
          s.room?.room_name?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sections, selectedTermFilter, selectedGradeFilter, searchQuery]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      if (selectedGradeFilter !=="ALL" && sub.grade_level.toString() !== selectedGradeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          sub.subject_code.toLowerCase().includes(q) ||
          sub.subject_name.toLowerCase().includes(q) ||
          (sub.track_strand && sub.track_strand.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [subjects, selectedGradeFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2.5 transition-all animate-in slide-in-from-bottom-3 ${
            toastMessage.type ==="success"
              ?"bg-emerald-50 border-emerald-300 text-emerald-800"
              :"bg-crimson-50 border-crimson-300 text-crimson-800"
          }`}
        >
          {toastMessage.type ==="success" ? (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-crimson-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Secondary Sub-Tabs Navigation (Single Scrollable Pill Bar) */}
      <div className="bg-[#FFFFFF] rounded-xl border border-[#E3DDD1] p-1.5 flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab("school_info");
            setSearchQuery("");
            setSelectedGradeFilter("ALL");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            activeTab ==="school_info"
              ?"bg-[#E6EFEA] text-[#0F3D2E]"
              :"text-[#5C6660] hover:text-[#1C2420]"
          }`}
        >
          <School className="w-3.5 h-3.5" />
          <span>School Info</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("academic_terms");
            setSearchQuery("");
            setSelectedGradeFilter("ALL");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            activeTab ==="academic_terms"
              ?"bg-[#E6EFEA] text-[#0F3D2E]"
              :"text-[#5C6660] hover:text-[#1C2420]"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Terms</span>
          {activeTerm && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#0F3D2E] text-[#FFFFFF]">
              T{activeTerm.term_number}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("sections");
            setSearchQuery("");
            setSelectedGradeFilter("ALL");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            activeTab ==="sections"
              ?"bg-[#E6EFEA] text-[#0F3D2E]"
              :"text-[#5C6660] hover:text-[#1C2420]"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Sections ({sections.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("departments");
            setSearchQuery("");
            setSelectedGradeFilter("ALL");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            activeTab ==="departments"
              ?"bg-[#E6EFEA] text-[#0F3D2E]"
              :"text-[#5C6660] hover:text-[#1C2420]"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("subjects");
            setSearchQuery("");
            setSelectedGradeFilter("ALL");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            activeTab ==="subjects"
              ?"bg-[#E6EFEA] text-[#0F3D2E]"
              :"text-[#5C6660] hover:text-[#1C2420]"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Subjects ({subjects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("time_slots");
            setSearchQuery("");
            setSelectedGradeFilter("ALL");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            activeTab ==="time_slots"
              ?"bg-[#E6EFEA] text-[#0F3D2E]"
              :"text-[#5C6660] hover:text-[#1C2420]"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Bell Schedule ({timeSlots.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("rooms");
            setSearchQuery("");
            setSelectedGradeFilter("ALL");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            activeTab ==="rooms"
              ?"bg-[#E6EFEA] text-[#0F3D2E]"
              :"text-[#5C6660] hover:text-[#1C2420]"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Rooms ({rooms.length})</span>
        </button>
      </div>

      {/* Main Content Area Based on Active Sub-Tab */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-medium text-sand-500 bg-white rounded-2xl border border-sand-200">
          Loading institutional reference configuration...
        </div>
      ) : (
        <>
          {/* =========================================================================
              SUB-TAB 1: SCHOOL INFO & DEPED HEADERS
          ========================================================================== */}
          {activeTab ==="school_info" && (
            <div className="bg-white rounded-2xl border border-sand-200 shadow-xs p-6 space-y-6 transition-colors">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-sand-200 pb-4">
                <div>
                  <h2 className="text-base font-bold text-cyprus-900 font-display">
                    Institutional Profile & DepEd Printable Header Configuration
                  </h2>
                  <p className="text-xs text-sand-600 mt-0.5">
                    Values configured here dynamically populate all official printable DepEd PDF documents (SF7, Class Programs, Form 6 Leave Letters, SF2, and Item Analysis Reports).
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSchoolInfo} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ref-school-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      School Name (Full Institutional Title)
                    </label>
                    <input
                      id="ref-school-name"
                      type="text"
                      value={schoolSettings.school_name}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, school_name: e.target.value })}
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-school-id" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      Official DepEd School ID
                    </label>
                    <input
                      id="ref-school-id"
                      type="text"
                      value={schoolSettings.school_id}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, school_id: e.target.value })}
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-mono font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-region" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      Region
                    </label>
                    <input
                      id="ref-region"
                      type="text"
                      value={schoolSettings.region}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, region: e.target.value })}
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-division" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      Schools Division
                    </label>
                    <input
                      id="ref-division"
                      type="text"
                      value={schoolSettings.division}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, division: e.target.value })}
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-district" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      District
                    </label>
                    <input
                      id="ref-district"
                      type="text"
                      value={schoolSettings.district}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, district: e.target.value })}
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-address" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      School Address / Station Location
                    </label>
                    <input
                      id="ref-address"
                      type="text"
                      value={schoolSettings.address}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, address: e.target.value })}
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-principal-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      School Head / Principal Name
                    </label>
                    <input
                      id="ref-principal-name"
                      type="text"
                      value={schoolSettings.principal_name}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, principal_name: e.target.value })}
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-principal-designation" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      Principal Designation / Official Title
                    </label>
                    <input
                      id="ref-principal-designation"
                      type="text"
                      value={schoolSettings.principal_designation}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, principal_designation: e.target.value })}
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-psds-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      Public Schools District Supervisor (PSDS) Name
                    </label>
                    <input
                      id="ref-psds-name"
                      type="text"
                      value={schoolSettings.psds_name || ""}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, psds_name: e.target.value })}
                      placeholder="e.g. MA. TERESITA I. ALAMPAYAN, PhD"
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-psds-designation" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      PSDS Official Title
                    </label>
                    <input
                      id="ref-psds-designation"
                      type="text"
                      value={schoolSettings.psds_designation || ""}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, psds_designation: e.target.value })}
                      placeholder="Public Schools District Supervisor"
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-sds-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      Schools Division Superintendent (SDS) Name
                    </label>
                    <input
                      id="ref-sds-name"
                      type="text"
                      value={schoolSettings.sds_name || ""}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, sds_name: e.target.value })}
                      placeholder="e.g. FAY C. LUAREZ EdD, PhD TM, CESO V"
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-sds-designation" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      SDS Official Title
                    </label>
                    <input
                      id="ref-sds-designation"
                      type="text"
                      value={schoolSettings.sds_designation || ""}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, sds_designation: e.target.value })}
                      placeholder="Schools Division Superintendent"
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-jhs-coord-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      JHS Coordinator Name
                    </label>
                    <input
                      id="ref-jhs-coord-name"
                      type="text"
                      value={schoolSettings.jhs_coordinator_name || ""}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, jhs_coordinator_name: e.target.value })}
                      placeholder="e.g. MAURINE D. CUARIO"
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-jhs-coord-designation" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      JHS Coordinator Designation
                    </label>
                    <input
                      id="ref-jhs-coord-designation"
                      type="text"
                      value={schoolSettings.jhs_coordinator_designation || ""}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, jhs_coordinator_designation: e.target.value })}
                      placeholder="Teacher III / JHS Coordinator"
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-shs-coord-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      SHS Coordinator Name
                    </label>
                    <input
                      id="ref-shs-coord-name"
                      type="text"
                      value={schoolSettings.shs_coordinator_name || ""}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, shs_coordinator_name: e.target.value })}
                      placeholder="e.g. DELLIE T. VIGONTE"
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ref-shs-coord-designation" className="block text-xs font-semibold text-cyprus-900 mb-1">
                      SHS Coordinator Designation
                    </label>
                    <input
                      id="ref-shs-coord-designation"
                      type="text"
                      value={schoolSettings.shs_coordinator_designation || ""}
                      onChange={(e) => setSchoolSettings({ ...schoolSettings, shs_coordinator_designation: e.target.value })}
                      placeholder="Teacher III / SHS Coordinator"
                      className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-sand-200 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F3D2E] hover:bg-[#0A2E22] text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ?"Saving..." :"Save Institutional Profile"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =========================================================================
              SUB-TAB 2: SCHOOL YEARS & ACADEMIC TERMS
          ========================================================================== */}
          {activeTab ==="academic_terms" && (
            <div className="bg-white rounded-2xl border border-sand-200 shadow-xs p-6 space-y-6 transition-colors">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-sand-200 pb-4">
                <div>
                  <h2 className="text-base font-bold text-cyprus-900 font-display">
                    School Years & 3-Term Academic Structure
                  </h2>
                  <p className="text-xs text-sand-600 mt-0.5">
                    Define operational school years (e.g. 2024-2025, 2025-2026, 2026-2027) and activate the current Term (Term 1, 2, or 3) across all lesson logs, timetables, and E-Class Records.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTerm(null);
                    setIsTermModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add School Year / Term</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-sand-200 text-[11px] font-bold text-sand-600 uppercase tracking-wider">
                      <th className="py-3 px-4">School Year</th>
                      <th className="py-3 px-4">Term</th>
                      <th className="py-3 px-4">Duration Dates</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-200 text-xs">
                    {terms.map((term) => (
                      <tr key={term.id} className="hover:bg-sand-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-cyprus-900 font-mono">
                          SY {term.school_year}
                        </td>
                        <td className="py-3 px-4 font-semibold text-cyprus-800">
                          Term {term.term_number}
                        </td>
                        <td className="py-3 px-4 text-sand-600 font-mono text-[11px]">
                          {term.start_date ||"—"} to {term.end_date ||"—"}
                        </td>
                        <td className="py-3 px-4">
                          {term.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle className="w-3 h-3" />
                              Active Term
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetActiveTerm(term.id)}
                              className="text-[11px] font-semibold text-sand-600 hover:text-cyprus-800 underline cursor-pointer"
                            >
                              Set as Active
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2"><button
                            type="button"
                            onClick={() => {
                              setEditingTerm(term);
                              setIsTermModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-sand-600 hover:text-cyprus-800 hover:bg-sand-100 transition-colors"
                            aria-label={`Edit ${term.school_year} Term ${term.term_number}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {!term.is_active && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTerm(term.id)}
                              className="p-1.5 rounded-lg text-crimson-600 hover:text-crimson-700 hover:bg-crimson-50 transition-colors"
                              aria-label={`Delete ${term.school_year} Term ${term.term_number}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}</div>
                        </td>
                      </tr>
                    ))}
                    {terms.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-sand-500">
                          No academic terms configured yet. Click"+ Add School Year / Term" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              SUB-TAB 3: GRADES & SECTIONS
          ========================================================================== */}
          {activeTab ==="sections" && (
            <div className="bg-white rounded-2xl border border-sand-200 shadow-xs p-6 space-y-6 transition-colors">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-sand-200 pb-4">
                <div>
                  <h2 className="text-base font-bold text-cyprus-900 font-display">
                    Grade Levels & Class Sections
                  </h2>
                  <p className="text-xs text-sand-600 mt-0.5">
                    Manage classes from Grade 7 to Grade 12 (JHS Matatag & SHS Tracks), assign official Class Advisers and standard home classrooms.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSection(null);
                    setIsSectionModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Section</span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sand-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search section, adviser, or room..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-sand-300 bg-white text-xs font-medium text-cyprus-900"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {/* Term Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-sand-600 font-semibold whitespace-nowrap">
                      Term:
                    </span>
                    <select
                      value={selectedTermFilter}
                      onChange={(e) => setSelectedTermFilter(e.target.value)}
                      aria-label="Filter sections by academic term"
                      className="py-1.5 px-3 rounded-lg border border-sand-300 bg-white text-xs font-semibold text-cyprus-900"
                    >
                      <option value="ALL">All Terms</option>
                      {terms.map((t) => (
                        <option key={t.id} value={t.id}>
                          SY {t.school_year} • Term {t.term_number}
                          {t.is_active ?" (Active)" :""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Grade Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-sand-600 font-semibold whitespace-nowrap">
                      Grade Level:
                    </span>
                    <select
                      value={selectedGradeFilter}
                      onChange={(e) => setSelectedGradeFilter(e.target.value)}
                      aria-label="Filter sections by grade level"
                      className="py-1.5 px-3 rounded-lg border border-sand-300 bg-white text-xs font-semibold text-cyprus-900"
                    >
                      <option value="ALL">All Grades (7-12)</option>
                      <option value="7">Grade 7</option>
                      <option value="8">Grade 8</option>
                      <option value="9">Grade 9</option>
                      <option value="10">Grade 10</option>
                      <option value="11">Grade 11 (SHS)</option>
                      <option value="12">Grade 12 (SHS)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-sand-200 text-[11px] font-bold text-sand-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Term</th>
                      <th className="py-3 px-4">Grade</th>
                      <th className="py-3 px-4">Section Name</th>
                      <th className="py-3 px-4">Class Adviser</th>
                      <th className="py-3 px-4">Classroom</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-200 text-xs">
                    {filteredSections.map((sec) => {
                      const termInfo = termMap.get(sec.term_id);
                      return (
                        <tr key={sec.id} className="hover:bg-sand-50/60 transition-colors">
                          <td className="py-3 px-4">
                            {termInfo ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${termInfo.is_active ?"bg-emerald-100 text-emerald-700" :"bg-sand-100 text-sand-600"}`}>
                                T{termInfo.term_number}{termInfo.is_active ?" ●" :""}
                              </span>
                            ) :"—"}
                          </td>
                          <td className="py-3 px-4 font-bold text-cyprus-900">
                            Grade {sec.grade_level}
                          </td>
                          <td className="py-3 px-4 font-bold text-cyprus-800">
                            {sec.section_name}
                          </td>
                          <td className="py-3 px-4 text-sand-700">
                            {sec.adviser ? (
                              <div className="font-medium">{sec.adviser.full_name}</div>
                            ) : (
                              <span className="text-sand-400 italic">No Adviser Assigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sand-600">
                            {sec.room ? `${sec.room.room_number} - ${sec.room.room_name}` :"—"}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2"><button
                              type="button"
                              onClick={() => {
                                setEditingSection(sec);
                                setIsSectionModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-sand-600 hover:text-cyprus-800 hover:bg-sand-100 transition-colors"
                              aria-label={`Edit ${sec.section_name}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(sec.id)}
                              className="p-1.5 rounded-lg text-crimson-600 hover:text-crimson-700 hover:bg-crimson-50 transition-colors"
                              aria-label={`Delete ${sec.section_name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button></div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSections.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-sand-500">
                          No sections found matching your filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              SUB-TAB 4: DEPARTMENTS & UNITS
          ========================================================================== */}
          {activeTab ==="departments" && (
            <div className="bg-white rounded-2xl border border-sand-200 shadow-xs p-6 space-y-6 transition-colors">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-sand-200 pb-4">
                <div>
                  <h2 className="text-base font-bold text-cyprus-900 font-display">
                    Academic Departments & Institutional Units
                  </h2>
                  <p className="text-xs text-sand-600 mt-0.5">
                    Maintain official DepEd departments (JHS, SHS, Science, Math, English, TVL, Admin, etc.) used for faculty assignment and DLL compliance tracking.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDept(null);
                    setIsDeptModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Department</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-sand-200 text-[11px] font-bold text-sand-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Department Name</th>
                      <th className="py-3 px-4">Department Head / Coordinator</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-200 text-xs">
                    {departments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-sand-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-cyprus-900">
                          {dept.dept_code}
                        </td>
                        <td className="py-3 px-4 font-bold text-cyprus-800">
                          {dept.dept_name}
                        </td>
                        <td className="py-3 px-4 text-sand-700">
                          {dept.dept_head ? (
                            <div className="font-medium">{dept.dept_head.full_name}</div>
                          ) : (
                            <span className="text-sand-400 italic">None Designated</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sand-600 text-[11px] max-w-xs truncate">
                          {dept.description ||"—"}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2"><button
                            type="button"
                            onClick={() => {
                              setEditingDept(dept);
                              setIsDeptModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-sand-600 hover:text-cyprus-800 hover:bg-sand-100 transition-colors"
                            aria-label={`Edit ${dept.dept_name}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDept(dept.id)}
                            className="p-1.5 rounded-lg text-crimson-600 hover:text-crimson-700 hover:bg-crimson-50 transition-colors"
                            aria-label={`Delete ${dept.dept_name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button></div>
                        </td>
                      </tr>
                    ))}
                    {departments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-sand-500">
                          No departments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              SUB-TAB 5: SUBJECTS CATALOG
          ========================================================================== */}
          {activeTab ==="subjects" && (
            <div className="bg-white rounded-2xl border border-sand-200 shadow-xs p-6 space-y-6 transition-colors">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-sand-200 pb-4">
                <div>
                  <h2 className="text-base font-bold text-cyprus-900 font-display">
                    Curriculum Subjects Catalog
                  </h2>
                  <p className="text-xs text-sand-600 mt-0.5">
                    Configure curriculum subjects across JHS Matatag and SHS tracks, contact minutes weekly, and laboratory requirements.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSubject(null);
                    setIsSubjectModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Subject</span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sand-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search subject code, title, or track..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-sand-300 bg-white text-xs font-medium text-cyprus-900"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-sand-600 font-semibold whitespace-nowrap">
                    Grade Level:
                  </span>
                  <select
                    value={selectedGradeFilter}
                    onChange={(e) => setSelectedGradeFilter(e.target.value)}
                    className="py-1.5 px-3 rounded-lg border border-sand-300 bg-white text-xs font-semibold text-cyprus-900"
                  >
                    <option value="ALL">All Grades (7-12)</option>
                    <option value="7">Grade 7</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11 (SHS)</option>
                    <option value="12">Grade 12 (SHS)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-sand-200 text-[11px] font-bold text-sand-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Subject Title</th>
                      <th className="py-3 px-4">Grade</th>
                      <th className="py-3 px-4">Category / Track</th>
                      <th className="py-3 px-4">Minutes / Wk</th>
                      <th className="py-3 px-4">Lab Required</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-200 text-xs">
                    {filteredSubjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-sand-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-cyprus-900">
                          {sub.subject_code}
                        </td>
                        <td className="py-3 px-4 font-bold text-cyprus-800">
                          {sub.subject_name}
                        </td>
                        <td className="py-3 px-4 font-semibold text-cyprus-900">
                          Grade {sub.grade_level}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {sub.curriculum_version && (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                                  sub.curriculum_version === "SSHS"
                                    ? "bg-teal-50 text-teal-800 border-teal-200"
                                    : sub.curriculum_version === "Old SHS"
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-cyprus-50 text-cyprus-800 border-cyprus-200"
                                }`}
                              >
                                {sub.curriculum_version}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sand-100 text-sand-800 border border-sand-200">
                              {sub.category} {sub.track_strand ? `• ${sub.track_strand}` :""}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sand-700 font-mono">
                          {sub.minutes_per_week} mins
                        </td>
                        <td className="py-3 px-4">
                          {sub.requires_lab ? (
                            <span className="text-[11px] font-bold text-amber-700">Yes (Lab)</span>
                          ) : (
                            <span className="text-[11px] text-sand-400">No</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2"><button
                            type="button"
                            onClick={() => {
                              setEditingSubject(sub);
                              setIsSubjectModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-sand-600 hover:text-cyprus-800 hover:bg-sand-100 transition-colors"
                            aria-label={`Edit ${sub.subject_name}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubject(sub.id)}
                            className="p-1.5 rounded-lg text-crimson-600 hover:text-crimson-700 hover:bg-crimson-50 transition-colors"
                            aria-label={`Delete ${sub.subject_name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button></div>
                        </td>
                      </tr>
                    ))}
                    {filteredSubjects.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-sand-500">
                          No subjects found matching your filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              SUB-TAB 6: BELL SCHEDULE & TIME SLOTS
          ========================================================================== */}
          {activeTab ==="time_slots" && (
            <div className="bg-white rounded-2xl border border-sand-200 shadow-xs p-6 space-y-5 transition-colors">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-sand-200 pb-4">
                <div>
                  <h2 className="text-base font-bold text-cyprus-900 font-display">
                    Bell Schedule & Daily Time Periods
                  </h2>
                  <p className="text-xs text-sand-600 mt-0.5">
                    Define base school periods and customize separate time ranges for JHS, SHS, or specific sections.
                  </p>
                </div>
                {bellScope === "BASE" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTimeSlot(null);
                      setIsTimeSlotModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Time Period</span>
                  </button>
                ) : (
                  ((bellScope === "JHS" && jhsOverrideCount > 0) ||
                    (bellScope === "SHS" && shsOverrideCount > 0) ||
                    (bellScope === "SECTION" && sectionOverrideCount > 0)) && (
                    <button
                      type="button"
                      onClick={handleClearScopeOverrides}
                      className="px-3.5 py-2 rounded-xl border border-crimson-200 bg-crimson-50 hover:bg-crimson-100 text-crimson-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset All {bellScope === "SECTION" ? "Section" : bellScope} Overrides</span>
                    </button>
                  )
                )}
              </div>

              {/* Scope Selector */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-sand-50/80 border border-sand-200 rounded-xl p-3">
                <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Bell schedule scope">
                  {(
                    [
                      { id: "BASE", label: "Base / Shared Default", count: 0 },
                      { id: "JHS", label: "JHS (Grades 7–10)", count: jhsOverrideCount },
                      { id: "SHS", label: "SHS (Grades 11–12)", count: shsOverrideCount },
                      { id: "SECTION", label: "Custom Section", count: sectionOverrideCount },
                    ] as const
                  ).map((item) => {
                    const active = bellScope === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setBellScope(item.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          active
                            ? "bg-cyprus-900 text-white shadow-xs"
                            : "bg-white text-sand-700 border border-sand-200 hover:bg-sand-100"
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.count > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                              active ? "bg-white/20 text-white" : "bg-cyprus-100 text-cyprus-900"
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {bellScope === "SECTION" && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="bell-section-select" className="text-[11px] font-bold text-sand-600 uppercase">
                      Section:
                    </label>
                    <select
                      id="bell-section-select"
                      value={selectedBellSectionId}
                      onChange={(e) => setSelectedBellSectionId(e.target.value)}
                      className="py-1.5 px-3 rounded-lg border border-sand-300 bg-white text-xs font-semibold text-cyprus-900 focus-visible:ring-2 focus-visible:ring-cyprus-700"
                    >
                      {bellSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          Grade {sec.grade_level} - {sec.section_name} ({sec.grade_level >= 11 ? "SHS" : "JHS"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {bellScope !== "BASE" && (
                <div className="px-3.5 py-2.5 rounded-xl bg-cyprus-50/60 border border-cyprus-200 text-xs text-cyprus-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyprus-700 shrink-0" />
                  <span>
                    {bellScope === "JHS" &&
                      "Junior High School (Grades 7–10) inherits Base periods unless customized here. Editing a period sets its JHS time range without altering SHS or other sections."}
                    {bellScope === "SHS" &&
                      "Senior High School (Grades 11–12) inherits Base periods unless customized here. Editing a period sets its SHS time range without altering JHS or other sections."}
                    {bellScope === "SECTION" &&
                      (selectedBellSection
                        ? `Section override for Grade ${selectedBellSection.grade_level} - ${selectedBellSection.section_name}. Uncustomized periods inherit from ${selectedBellSection.grade_level >= 11 ? "SHS" : "JHS"} → Base defaults.`
                        : "Select a section above to customize its period time ranges.")}
                  </span>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-sand-200 text-[11px] font-bold text-sand-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Period #</th>
                      <th className="py-3 px-4">Period Label</th>
                      <th className="py-3 px-4">Time Window</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Type</th>
                      {bellScope !== "BASE" && <th className="py-3 px-4">Source</th>}
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-200 text-xs">
                    {displayedBellSlots.map((slot) => {
                      const isDirectOverride =
                        bellScope === "BASE"
                          ? false
                          : bellScope === "SECTION"
                          ? slot.override_scope === "SECTION"
                          : slot.override_scope === bellScope;

                      return (
                        <tr key={slot.id} className="hover:bg-sand-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-cyprus-900">
                            {slot.slot_number === 11 ? "Midday" : `P${slot.slot_number}`}
                          </td>
                          <td className="py-3 px-4 font-bold text-cyprus-800">
                            {slot.slot_label}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-sand-700 font-semibold">
                            {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-sand-600">
                            {slot.duration_minutes} mins
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                slot.slot_type ==="Academic"
                                  ?"bg-sky-100 text-sky-800 border border-sky-300"
                                  : slot.slot_type ==="Recess" || slot.slot_type ==="Lunch"
                                  ?"bg-amber-100 text-amber-800 border border-amber-300"
                                  :"bg-sand-100 text-sand-800 border border-sand-300"
                              }`}
                            >
                              {slot.slot_type}
                            </span>
                          </td>
                          {bellScope !== "BASE" && (
                            <td className="py-3 px-4">
                              {isDirectOverride ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyprus-100 text-cyprus-900 border border-cyprus-300">
                                  Custom ({bellScope === "SECTION" ? "Section" : bellScope})
                                </span>
                              ) : slot.override_scope ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  Inherited ({slot.override_scope})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sand-100 text-sand-600 border border-sand-200">
                                  Base Default
                                </span>
                              )}
                            </td>
                          )}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTimeSlot(slot);
                                  setIsTimeSlotModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-sand-600 hover:text-cyprus-800 hover:bg-sand-100 transition-colors cursor-pointer"
                                aria-label={`Edit ${slot.slot_label}`}
                                title={bellScope === "BASE" ? "Edit base period" : "Customize time range"}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              {bellScope === "BASE" ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTimeSlot(slot.id)}
                                  className="p-1.5 rounded-lg text-crimson-600 hover:text-crimson-700 hover:bg-crimson-50 transition-colors cursor-pointer"
                                  aria-label={`Delete ${slot.slot_label}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                isDirectOverride && (
                                  <button
                                    type="button"
                                    onClick={() => handleResetSlotOverride(slot)}
                                    className="p-1.5 rounded-lg text-crimson-600 hover:text-crimson-700 hover:bg-crimson-50 transition-colors cursor-pointer"
                                    aria-label={`Reset ${slot.slot_label} override`}
                                    title="Reset to inherited time range"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {displayedBellSlots.length === 0 && (
                      <tr>
                        <td colSpan={bellScope === "BASE" ? 6 : 7} className="py-8 text-center text-xs text-sand-500">
                          No time slots found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              SUB-TAB 7: ROOMS & LABORATORIES
          ========================================================================== */}
          {activeTab ==="rooms" && (
            <div className="bg-white rounded-2xl border border-sand-200 shadow-xs p-6 space-y-6 transition-colors">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-sand-200 pb-4">
                <div>
                  <h2 className="text-base font-bold text-cyprus-900 font-display">
                    Rooms & Specialized Laboratories Directory
                  </h2>
                  <p className="text-xs text-sand-600 mt-0.5">
                    Maintain campus facilities (Standard Classrooms, Science Laboratory, Computer Laboratory, TVL Workshops, Covered Court) used for timetable room allocation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRoom(null);
                    setIsRoomModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Room</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-sand-200 text-[11px] font-bold text-sand-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Room #</th>
                      <th className="py-3 px-4">Facility Name</th>
                      <th className="py-3 px-4">Facility Type</th>
                      <th className="py-3 px-4">Capacity</th>
                      <th className="py-3 px-4">Specialized Lab</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-200 text-xs">
                    {rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-sand-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-cyprus-900">
                          {room.room_number}
                        </td>
                        <td className="py-3 px-4 font-bold text-cyprus-800">
                          {room.room_name}
                        </td>
                        <td className="py-3 px-4 text-sand-700">
                          {room.room_type}
                        </td>
                        <td className="py-3 px-4 font-mono text-sand-700">
                          {room.capacity} students
                        </td>
                        <td className="py-3 px-4">
                          {room.is_specialized ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Specialized Lab
                            </span>
                          ) : (
                            <span className="text-sand-400 text-[11px]">Standard</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2"><button
                            type="button"
                            onClick={() => {
                              setEditingRoom(room);
                              setIsRoomModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-sand-600 hover:text-cyprus-800 hover:bg-sand-100 transition-colors"
                            aria-label={`Edit ${room.room_name}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(room.id)}
                            className="p-1.5 rounded-lg text-crimson-600 hover:text-crimson-700 hover:bg-crimson-50 transition-colors"
                            aria-label={`Delete ${room.room_name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button></div>
                        </td>
                      </tr>
                    ))}
                    {rooms.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-sand-500">
                          No rooms found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          MODALS FOR CREATING & EDITING REFERENCE ENTITIES
      ========================================================================== */}

      {/* 1. Academic Term Modal */}
      {isTermModalOpen && (
        <AcademicTermFormModal
          isOpen={isTermModalOpen}
          initialData={editingTerm}
          onClose={() => {
            setIsTermModalOpen(false);
            setEditingTerm(null);
          }}
          onSave={handleSaveTerm}
          isSaving={isSaving}
        />
      )}

      {/* 2. Section Modal */}
      {isSectionModalOpen && (
        <SectionFormModal
          isOpen={isSectionModalOpen}
          initialData={editingSection}
          terms={terms}
          facultyList={facultyList}
          rooms={rooms}
          onClose={() => {
            setIsSectionModalOpen(false);
            setEditingSection(null);
          }}
          onSave={handleSaveSection}
          isSaving={isSaving}
        />
      )}

      {/* 3. Department Modal */}
      {isDeptModalOpen && (
        <DepartmentFormModal
          isOpen={isDeptModalOpen}
          initialData={editingDept}
          facultyList={facultyList}
          onClose={() => {
            setIsDeptModalOpen(false);
            setEditingDept(null);
          }}
          onSave={handleSaveDept}
          isSaving={isSaving}
        />
      )}

      {/* 4. Subject Modal */}
      {isSubjectModalOpen && (
        <SubjectFormModal
          isOpen={isSubjectModalOpen}
          initialData={editingSubject}
          onClose={() => {
            setIsSubjectModalOpen(false);
            setEditingSubject(null);
          }}
          onSave={handleSaveSubject}
          isSaving={isSaving}
        />
      )}

      {/* 5. Time Slot Modal */}
      {isTimeSlotModalOpen && (
        <TimeSlotFormModal
          isOpen={isTimeSlotModalOpen}
          initialData={editingTimeSlot}
          isOverrideMode={bellScope !== "BASE"}
          scopeLabel={
            bellScope === "SECTION"
              ? selectedBellSection
                ? `Grade ${selectedBellSection.grade_level} - ${selectedBellSection.section_name}`
                : "Section Override"
              : bellScope !== "BASE"
              ? bellScope
              : undefined
          }
          onClose={() => {
            setIsTimeSlotModalOpen(false);
            setEditingTimeSlot(null);
          }}
          onSave={handleSaveTimeSlotOrOverride}
          isSaving={isSaving}
        />
      )}

      {/* 6. Room Modal */}
      {isRoomModalOpen && (
        <RoomFormModal
          isOpen={isRoomModalOpen}
          initialData={editingRoom}
          onClose={() => {
            setIsRoomModalOpen(false);
            setEditingRoom(null);
          }}
          onSave={handleSaveRoom}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};

// =============================================================================
// SUBCOMPONENT MODALS
// =============================================================================

// 1. Term Modal
interface AcademicTermFormModalProps {
  isOpen: boolean;
  initialData: AcademicTerm | null;
  onClose: () => void;
  onSave: (data: {
    school_year: string;
    term_number: 1 | 2 | 3;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
  }) => Promise<void>;
  isSaving: boolean;
}

const AcademicTermFormModal: React.FC<AcademicTermFormModalProps> = ({
  initialData,
  onClose,
  onSave,
  isSaving,
}) => {
  const [schoolYear, setSchoolYear] = useState(initialData?.school_year ||"2026-2027");
  const [termNumber, setTermNumber] = useState<1 | 2 | 3>(initialData?.term_number || 1);
  const [isActive, setIsActive] = useState<boolean>(initialData?.is_active || false);
  const [startDate, setStartDate] = useState(initialData?.start_date ||"");
  const [endDate, setEndDate] = useState(initialData?.end_date ||"");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      school_year: schoolYear,
      term_number: termNumber,
      is_active: isActive,
      start_date: startDate || null,
      end_date: endDate || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-sand-300 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-sand-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-cyprus-900 font-display">
            {initialData ?"Edit Academic Term" :"Add School Year & Term"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-sand-500 hover:text-sand-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="modal-term-sy" className="block text-xs font-semibold text-cyprus-900 mb-1">
              School Year (e.g. 2026-2027)
            </label>
            <input
              id="modal-term-sy"
              type="text"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              placeholder="2026-2027"
              pattern="^\d{4}-\d{4}$"
              title="Format must be YYYY-YYYY e.g. 2026-2027"
              className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-mono font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
              required
            />
          </div>

          <div>
            <label htmlFor="modal-term-num" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Term Number (3-Term School Year)
            </label>
            <select
              id="modal-term-num"
              value={termNumber}
              onChange={(e) => setTermNumber(Number(e.target.value) as 1 | 2 | 3)}
              className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-semibold text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
            >
              <option value={1}>Term 1 (First Term)</option>
              <option value={2}>Term 2 (Second Term)</option>
              <option value={3}>Term 3 (Third Term)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-term-start" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Start Date
              </label>
              <input
                id="modal-term-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-mono text-cyprus-900"
              />
            </div>
            <div>
              <label htmlFor="modal-term-end" className="block text-xs font-semibold text-cyprus-900 mb-1">
                End Date
              </label>
              <input
                id="modal-term-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-mono text-cyprus-900"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <input
              id="modal-term-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-crimson-600 rounded-sm focus-visible:ring-crimson-600"
            />
            <label htmlFor="modal-term-active" className="text-xs font-semibold text-cyprus-900 cursor-pointer">
              Set as the currently active academic term
            </label>
          </div>

          <div className="pt-3 border-t border-sand-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-sand-300 text-xs font-semibold text-sand-700 hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isSaving ?"Saving..." :"Save Academic Term"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 2. Section Modal
interface SectionFormModalProps {
  isOpen: boolean;
  initialData: Section | null;
  terms: AcademicTerm[];
  facultyList: Profile[];
  rooms: Room[];
  onClose: () => void;
  onSave: (data: {
    term_id: string;
    grade_level: number;
    section_name: string;
    track_strand?: string | null;
    adviser_id: string | null;
    room_id: string | null;
  }) => Promise<void>;
  isSaving: boolean;
}

const SectionFormModal: React.FC<SectionFormModalProps> = ({
  initialData,
  terms,
  facultyList,
  rooms,
  onClose,
  onSave,
  isSaving,
}) => {
  const activeTerm = terms.find((t) => t.is_active) || terms[0];
  const [termId, setTermId] = useState(initialData?.term_id || activeTerm?.id ||"");
  const [gradeLevel, setGradeLevel] = useState<number>(initialData?.grade_level || 7);
  const [sectionName, setSectionName] = useState(initialData?.section_name ||"");
  const [trackStrand, setTrackStrand] = useState(initialData?.track_strand || "");
  const [adviserId, setAdviserId] = useState<string>(initialData?.adviser_id ||"");
  const [roomId, setRoomId] = useState<string>(initialData?.room_id ||"");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      term_id: termId,
      grade_level: gradeLevel,
      section_name: sectionName.trim(),
      track_strand: trackStrand.trim() || null,
      adviser_id: adviserId || null,
      room_id: roomId || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-sand-300 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-sand-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-cyprus-900 font-display">
            {initialData ?"Edit Class Section" :"Add New Class Section"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-sand-500 hover:text-sand-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="modal-sec-term" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Academic Term / School Year
            </label>
            <select
              id="modal-sec-term"
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-semibold text-cyprus-900"
              required
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  SY {t.school_year} • Term {t.term_number} {t.is_active ?"(Active)" :""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-sec-grade" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Grade Level
              </label>
              <select
                id="modal-sec-grade"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(Number(e.target.value))}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-semibold text-cyprus-900"
              >
                <option value={7}>Grade 7</option>
                <option value={8}>Grade 8</option>
                <option value={9}>Grade 9</option>
                <option value={10}>Grade 10</option>
                <option value={11}>Grade 11 (SHS)</option>
                <option value={12}>Grade 12 (SHS)</option>
              </select>
            </div>

            <div>
              <label htmlFor="modal-sec-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Section Name
              </label>
              <input
                id="modal-sec-name"
                type="text"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="e.g. Mabini, Newton"
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-medium text-cyprus-900"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="modal-sec-track" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Track / Strand (Optional — for SHS &amp; SF9)
            </label>
            <input
              id="modal-sec-track"
              type="text"
              value={trackStrand}
              onChange={(e) => setTrackStrand(e.target.value)}
              placeholder="e.g. JHS MATATAG, SSHS Academic - ASSH, SSHS TechPro - ICT, Old SHS TVL - ICT"
              className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-medium text-cyprus-900"
            />
          </div>

          <div>
            <label htmlFor="modal-sec-adviser" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Class Adviser
            </label>
            <select
              id="modal-sec-adviser"
              value={adviserId}
              onChange={(e) => setAdviserId(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-medium text-cyprus-900"
            >
              <option value="">-- No Class Adviser Assigned --</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name} ({f.role} • {f.department ||"General"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="modal-sec-room" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Classroom Facility
            </label>
            <select
              id="modal-sec-room"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-medium text-cyprus-900"
            >
              <option value="">-- No Standard Classroom Assigned --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.room_number} - {r.room_name} ({r.room_type})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-sand-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-sand-300 text-xs font-semibold text-sand-700 hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isSaving ?"Saving..." :"Save Section"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3. Department Modal
interface DepartmentFormModalProps {
  isOpen: boolean;
  initialData: Department | null;
  facultyList: Profile[];
  onClose: () => void;
  onSave: (data: {
    dept_code: string;
    dept_name: string;
    dept_head_id: string | null;
    description: string | null;
    is_active: boolean;
    sort_order: number;
  }) => Promise<void>;
  isSaving: boolean;
}

const DepartmentFormModal: React.FC<DepartmentFormModalProps> = ({
  initialData,
  facultyList,
  onClose,
  onSave,
  isSaving,
}) => {
  const [deptCode, setDeptCode] = useState(initialData?.dept_code ||"");
  const [deptName, setDeptName] = useState(initialData?.dept_name ||"");
  const [deptHeadId, setDeptHeadId] = useState(initialData?.dept_head_id ||"");
  const [description, setDescription] = useState(initialData?.description ||"");
  const [sortOrder, setSortOrder] = useState<number>(initialData?.sort_order || 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      dept_code: deptCode.trim().toUpperCase(),
      dept_name: deptName.trim(),
      dept_head_id: deptHeadId || null,
      description: description.trim() || null,
      is_active: true,
      sort_order: sortOrder,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-sand-300 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-sand-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-cyprus-900 font-display">
            {initialData ?"Edit Department" :"Add Academic Department"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-sand-500 hover:text-sand-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="modal-dept-code" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Dept Code
              </label>
              <input
                id="modal-dept-code"
                type="text"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                placeholder="e.g. SCI"
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-mono font-bold text-cyprus-900"
                required
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="modal-dept-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Department Name
              </label>
              <input
                id="modal-dept-name"
                type="text"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Science & Technology"
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-medium text-cyprus-900"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="modal-dept-head" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Department Head / Coordinator
            </label>
            <select
              id="modal-dept-head"
              value={deptHeadId}
              onChange={(e) => setDeptHeadId(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-medium text-cyprus-900"
            >
              <option value="">-- No Department Head Assigned --</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name} ({f.designation || f.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="modal-dept-desc" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Description / Mandate
            </label>
            <textarea
              id="modal-dept-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope of subjects, teachers, and curriculum supervision..."
              className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-medium text-cyprus-900"
            />
          </div>

          <div>
            <label htmlFor="modal-dept-order" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Display Sort Order
            </label>
            <input
              id="modal-dept-order"
              type="number"
              min={1}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-24 py-1.5 px-3 rounded-lg border border-sand-300 bg-white text-xs font-mono font-medium text-cyprus-900"
            />
          </div>

          <div className="pt-3 border-t border-sand-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-sand-300 text-xs font-semibold text-sand-700 hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isSaving ?"Saving..." :"Save Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 4. Subject Modal
interface SubjectFormModalProps {
  isOpen: boolean;
  initialData: Subject | null;
  onClose: () => void;
  onSave: (data: {
    subject_code: string;
    subject_name: string;
    grade_level: number;
    track_strand: string | null;
    category: SubjectCategory;
    curriculum_version: SubjectCurriculumVersion;
    minutes_per_week: number;
    requires_lab: boolean;
  }) => Promise<void>;
  isSaving: boolean;
}

const SubjectFormModal: React.FC<SubjectFormModalProps> = ({
  initialData,
  onClose,
  onSave,
  isSaving,
}) => {
  const defaultCurriculumForGrade = (grade: number): SubjectCurriculumVersion =>
    grade === 11 ? "SSHS" : grade === 12 ? "Old SHS" : "JHS MATATAG";

  const [subjectCode, setSubjectCode] = useState(initialData?.subject_code ||"");
  const [subjectName, setSubjectName] = useState(initialData?.subject_name ||"");
  const [gradeLevel, setGradeLevel] = useState<number>(initialData?.grade_level || 7);
  const [trackStrand, setTrackStrand] = useState(initialData?.track_strand ||"");
  const [category, setCategory] = useState<SubjectCategory>(initialData?.category ||"Core");
  const [curriculumVersion, setCurriculumVersion] = useState<SubjectCurriculumVersion>(
    initialData?.curriculum_version || defaultCurriculumForGrade(initialData?.grade_level || 7)
  );
  const [minutesPerWeek, setMinutesPerWeek] = useState<number>(initialData?.minutes_per_week || 240);
  const [requiresLab, setRequiresLab] = useState<boolean>(initialData?.requires_lab || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      subject_code: subjectCode.trim().toUpperCase(),
      subject_name: subjectName.trim(),
      grade_level: gradeLevel,
      track_strand: trackStrand.trim() || null,
      category,
      curriculum_version: curriculumVersion,
      minutes_per_week: minutesPerWeek,
      requires_lab: requiresLab,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-sand-300 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-sand-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-cyprus-900 font-display">
            {initialData ?"Edit Curriculum Subject" :"Add Curriculum Subject"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-sand-500 hover:text-sand-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="modal-sub-code" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Subject Code
              </label>
              <input
                id="modal-sub-code"
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                placeholder="MATH-7"
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-mono font-bold text-cyprus-900"
                required
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="modal-sub-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Subject Title
              </label>
              <input
                id="modal-sub-name"
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Mathematics 7"
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-medium text-cyprus-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-sub-grade" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Grade Level
              </label>
              <select
                id="modal-sub-grade"
                value={gradeLevel}
                onChange={(e) => {
                  const nextGrade = Number(e.target.value);
                  setGradeLevel(nextGrade);
                  if (!initialData) {
                    setCurriculumVersion(defaultCurriculumForGrade(nextGrade));
                  }
                }}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-semibold text-cyprus-900"
              >
                <option value={7}>Grade 7</option>
                <option value={8}>Grade 8</option>
                <option value={9}>Grade 9</option>
                <option value={10}>Grade 10</option>
                <option value={11}>Grade 11 (SSHS)</option>
                <option value={12}>Grade 12 (Old SHS)</option>
              </select>
            </div>

            <div>
              <label htmlFor="modal-sub-cat" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Category
              </label>
              <select
                id="modal-sub-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as SubjectCategory)}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-semibold text-cyprus-900"
              >
                <option value="Core">Core</option>
                <option value="Applied">Applied</option>
                <option value="Specialized">Specialized</option>
                <option value="TVL">TVL</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="modal-sub-curriculum-ver" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Curriculum Version
            </label>
            <select
              id="modal-sub-curriculum-ver"
              value={curriculumVersion}
              onChange={(e) => setCurriculumVersion(e.target.value as SubjectCurriculumVersion)}
              className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-semibold text-cyprus-900"
            >
              <option value="JHS MATATAG">JHS MATATAG (Grades 7–10)</option>
              <option value="SSHS">Strengthened SHS — Grade 11</option>
              <option value="Old SHS">Old K-12 SHS Curriculum — Grade 12</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-sub-track" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Track / Strand (Optional)
              </label>
              <input
                id="modal-sub-track"
                type="text"
                value={trackStrand}
                onChange={(e) => setTrackStrand(e.target.value)}
                placeholder="STEM, TVL-ICT, HUMSS"
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-medium text-cyprus-900"
              />
            </div>

            <div>
              <label htmlFor="modal-sub-mins" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Minutes / Week
              </label>
              <input
                id="modal-sub-mins"
                type="number"
                step={30}
                value={minutesPerWeek}
                onChange={(e) => setMinutesPerWeek(Number(e.target.value))}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-mono font-medium text-cyprus-900"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <input
              id="modal-sub-lab"
              type="checkbox"
              checked={requiresLab}
              onChange={(e) => setRequiresLab(e.target.checked)}
              className="w-4 h-4 text-crimson-600 rounded-sm focus-visible:ring-crimson-600"
            />
            <label htmlFor="modal-sub-lab" className="text-xs font-semibold text-cyprus-900 cursor-pointer">
              Requires Specialized Laboratory / TVL Workshop
            </label>
          </div>

          <div className="pt-3 border-t border-sand-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-sand-300 text-xs font-semibold text-sand-700 hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isSaving ?"Saving..." :"Save Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 5. Time Slot Modal
interface TimeSlotFormModalProps {
  isOpen: boolean;
  initialData: TimeSlot | null;
  isOverrideMode?: boolean;
  scopeLabel?: string;
  onClose: () => void;
  onSave: (data: {
    slot_number: number;
    slot_label: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    slot_type:"Academic" |"Flag Ceremony" |"Recess" |"Lunch" |"Homeroom";
    sort_order: number;
  }) => Promise<void>;
  isSaving: boolean;
}

const computeMinutesDiff = (start: string, end: string): number | null => {
  if (!start || !end) return null;
  const [sh, sm] = start.slice(0, 5).split(":").map(Number);
  const [eh, em] = end.slice(0, 5).split(":").map(Number);
  if (sh === undefined || sm === undefined || eh === undefined || em === undefined) return null;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : null;
};

const TimeSlotFormModal: React.FC<TimeSlotFormModalProps> = ({
  initialData,
  isOverrideMode = false,
  scopeLabel,
  onClose,
  onSave,
  isSaving,
}) => {
  const [slotNumber, setSlotNumber] = useState<number>(initialData?.slot_number || 1);
  const [slotLabel, setSlotLabel] = useState(initialData?.slot_label ||"");
  const [startTime, setStartTime] = useState(initialData?.start_time.slice(0, 5) ||"07:30");
  const [endTime, setEndTime] = useState(initialData?.end_time.slice(0, 5) ||"08:30");
  const [durationMinutes, setDurationMinutes] = useState<number>(initialData?.duration_minutes || 60);
  const [slotType, setSlotType] = useState<"Academic" |"Flag Ceremony" |"Recess" |"Lunch" |"Homeroom">(
    initialData?.slot_type ||"Academic"
  );
  const [sortOrder, setSortOrder] = useState<number>(initialData?.sort_order || 1);

  const handleTimeChange = (nextStart: string, nextEnd: string) => {
    setStartTime(nextStart);
    setEndTime(nextEnd);
    const diff = computeMinutesDiff(nextStart, nextEnd);
    if (diff !== null) {
      setDurationMinutes(diff);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      slot_number: slotNumber,
      slot_label: slotLabel.trim(),
      start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
      end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
      duration_minutes: durationMinutes,
      slot_type: slotType,
      sort_order: sortOrder,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-sand-300 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-sand-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-cyprus-900 font-display">
              {isOverrideMode
                ? `Customize Time Range (${scopeLabel || "Override"})`
                : initialData
                ? "Edit Time Period"
                : "Add Daily Time Period"}
            </h3>
            {isOverrideMode && (
              <p className="text-[11px] text-sand-600 mt-0.5">
                Adjusts start/end time & minutes only for this schedule scope.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-sand-500 hover:text-sand-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="modal-slot-num" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Period #
              </label>
              <input
                id="modal-slot-num"
                type="number"
                min={0}
                value={slotNumber}
                onChange={(e) => setSlotNumber(Number(e.target.value))}
                disabled={isOverrideMode}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-mono font-medium text-cyprus-900 disabled:bg-sand-100 disabled:text-sand-600"
                required
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="modal-slot-label" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Period Label
              </label>
              <input
                id="modal-slot-label"
                type="text"
                value={slotLabel}
                onChange={(e) => setSlotLabel(e.target.value)}
                placeholder="Period 1, Morning Recess"
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-medium text-cyprus-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-slot-start" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Start Time
              </label>
              <input
                id="modal-slot-start"
                type="time"
                value={startTime}
                onChange={(e) => handleTimeChange(e.target.value, endTime)}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-mono text-cyprus-900"
                required
              />
            </div>
            <div>
              <label htmlFor="modal-slot-end" className="block text-xs font-semibold text-cyprus-900 mb-1">
                End Time
              </label>
              <input
                id="modal-slot-end"
                type="time"
                value={endTime}
                onChange={(e) => handleTimeChange(startTime, e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-mono text-cyprus-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-slot-type" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Period Type
              </label>
              <select
                id="modal-slot-type"
                value={slotType}
                onChange={(e) => setSlotType(e.target.value as"Academic" |"Flag Ceremony" |"Recess" |"Lunch" |"Homeroom")}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-semibold text-cyprus-900"
              >
                <option value="Academic">Academic Class</option>
                <option value="Recess">Recess</option>
                <option value="Lunch">Lunch Break</option>
                <option value="Flag Ceremony">Flag Ceremony</option>
                <option value="Homeroom">Homeroom / Club Activity</option>
              </select>
            </div>

            <div>
              <label htmlFor="modal-slot-duration" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Duration (Mins)
              </label>
              <input
                id="modal-slot-duration"
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-mono text-cyprus-900"
                required
              />
            </div>
          </div>

          {!isOverrideMode && (
            <div>
              <label htmlFor="modal-slot-sort" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Sequence Order
              </label>
              <input
                id="modal-slot-sort"
                type="number"
                min={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-24 py-1.5 px-3 rounded-lg border border-sand-300 bg-white text-xs font-mono font-medium text-cyprus-900"
              />
            </div>
          )}

          <div className="pt-3 border-t border-sand-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-sand-300 text-xs font-semibold text-sand-700 hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : isOverrideMode ? "Save Custom Time" : "Save Time Period"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 6. Room Modal
interface RoomFormModalProps {
  isOpen: boolean;
  initialData: Room | null;
  onClose: () => void;
  onSave: (data: {
    room_number: string;
    room_name: string;
    room_type:"Standard Classroom" |"Science Laboratory" |"Computer Laboratory" |"TVL Workshop" |"Covered Court";
    capacity: number;
    is_specialized: boolean;
  }) => Promise<void>;
  isSaving: boolean;
}

const RoomFormModal: React.FC<RoomFormModalProps> = ({
  initialData,
  onClose,
  onSave,
  isSaving,
}) => {
  const [roomNumber, setRoomNumber] = useState(initialData?.room_number ||"");
  const [roomName, setRoomName] = useState(initialData?.room_name ||"");
  const [roomType, setRoomType] = useState<"Standard Classroom" |"Science Laboratory" |"Computer Laboratory" |"TVL Workshop" |"Covered Court">(
    initialData?.room_type ||"Standard Classroom"
  );
  const [capacity, setCapacity] = useState<number>(initialData?.capacity || 45);
  const [isSpecialized, setIsSpecialized] = useState<boolean>(initialData?.is_specialized || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      room_number: roomNumber.trim(),
      room_name: roomName.trim(),
      room_type: roomType,
      capacity,
      is_specialized: isSpecialized || roomType !=="Standard Classroom",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-sand-300 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-sand-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-cyprus-900 font-display">
            {initialData ?"Edit Room / Facility" :"Add Room / Facility"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-sand-500 hover:text-sand-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="modal-room-num" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Room #
              </label>
              <input
                id="modal-room-num"
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="R-101"
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-mono font-bold text-cyprus-900"
                required
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="modal-room-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Facility Name
              </label>
              <input
                id="modal-room-name"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Grade 7 Rizal Classroom"
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-medium text-cyprus-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-room-type" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Facility Type
              </label>
              <select
                id="modal-room-type"
                value={roomType}
                onChange={(e) => {
                  const val = e.target.value as"Standard Classroom" |"Science Laboratory" |"Computer Laboratory" |"TVL Workshop" |"Covered Court";
                  setRoomType(val);
                  if (val !=="Standard Classroom") setIsSpecialized(true);
                }}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-semibold text-cyprus-900"
              >
                <option value="Standard Classroom">Standard Classroom</option>
                <option value="Science Laboratory">Science Laboratory</option>
                <option value="Computer Laboratory">Computer Laboratory</option>
                <option value="TVL Workshop">TVL Workshop</option>
                <option value="Covered Court">Covered Court</option>
              </select>
            </div>

            <div>
              <label htmlFor="modal-room-cap" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Capacity (Students)
              </label>
              <input
                id="modal-room-cap"
                type="number"
                min={10}
                max={200}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-xs font-mono text-cyprus-900"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <input
              id="modal-room-special"
              type="checkbox"
              checked={isSpecialized}
              onChange={(e) => setIsSpecialized(e.target.checked)}
              className="w-4 h-4 text-crimson-600 rounded-sm focus-visible:ring-crimson-600"
            />
            <label htmlFor="modal-room-special" className="text-xs font-semibold text-cyprus-900 cursor-pointer">
              Mark as Specialized Facility (Enforces zero double-booking in scheduler)
            </label>
          </div>

          <div className="pt-3 border-t border-sand-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-sand-300 text-xs font-semibold text-sand-700 hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isSaving ?"Saving..." :"Save Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
