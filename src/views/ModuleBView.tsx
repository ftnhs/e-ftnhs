import React, { useState, useEffect, useCallback } from"react";
import { useAuth } from"../context/AuthContext";
import {
  fetchTimetableData,
  copyTeacherLoadsFromTerm,
  computeLoadPlottedStats,
  type TimetableDataState,
} from"../services/timetableService";
import { schoolReferenceService } from"../services/schoolReferenceService";
import { PageHeader } from"../components/common/PageHeader";
import { TimetableGrid } from"../components/timetable/TimetableGrid";
import { FacultyLoadingTable } from"../components/timetable/FacultyLoadingTable";
import { DepEdSF7PrintView } from"../components/timetable/DepEdSF7PrintView";
import { ClassProgramPrintView } from"../components/timetable/ClassProgramPrintView";
import { AssignSlotModal } from"../components/timetable/AssignSlotModal";
import { AssignLoadModal } from"../components/timetable/AssignLoadModal";
import type { AcademicTerm, ScheduleEntry, TeacherSubjectLoad, DayOfWeek } from"../types";
import {
  Calendar,
  Layers,
  FileSpreadsheet,
  Users,
  RefreshCw,
  PlusCircle,
} from"lucide-react";

export const ModuleBView: React.FC = () => {
  const { isAdmin, isSchoolHead } = useAuth();
  const isPrivileged = isAdmin || isSchoolHead;

  const [activeTab, setActiveTab] = useState<"grid" |"loads" |"sf7" |"class_program">("grid");
  const [data, setData] = useState<TimetableDataState>({
    activeTerm: null,
    schoolSettings: null,
    subjects: [],
    rooms: [],
    sections: [],
    timeSlots: [],
    timeSlotOverrides: [],
    loads: [],
    scheduleEntries: [],
    teachers: [],
  });
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);
  const [slotPrefill, setSlotPrefill] = useState<{
    sectionId?: string;
    teacherId?: string;
    day?: DayOfWeek;
    timeSlotId?: string;
  }>({});
  const [isLoadModalOpen, setIsLoadModalOpen] = useState<boolean>(false);
  const [preselectedLoadTeacherId, setPreselectedLoadTeacherId] = useState<string | undefined>(undefined);
  const [editingLoad, setEditingLoad] = useState<TeacherSubjectLoad | null>(null);

  const loadData = useCallback(async (overrideTermId?: string) => {
    setIsLoading(true);
    try {
      const [allTerms, res] = await Promise.all([
        schoolReferenceService.fetchAcademicTerms(),
        fetchTimetableData(overrideTermId || undefined),
      ]);
      setTerms(allTerms);
      setData(res);
      if (!overrideTermId && res.activeTerm?.id) {
        setSelectedTermId(res.activeTerm.id);
      }
    } catch (err) {
      console.error("[ModuleBView] Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTermChange = (newTermId: string) => {
    setSelectedTermId(newTermId);
    loadData(newTermId);
  };

  // Handlers for instant UI updates (keeping teacher_subject_loads minutes synced with plotted schedule)
  const syncLoadsWithEntries = (
    prev: TimetableDataState,
    nextEntries: ScheduleEntry[]
  ): TeacherSubjectLoad[] => {
    return prev.loads.map((load) => {
      const stats = computeLoadPlottedStats(
        load.id,
        nextEntries,
        prev.timeSlots,
        prev.timeSlotOverrides,
        prev.sections
      );
      return {
        ...load,
        plotted_minutes_weekly: stats.plottedMinutes,
        plotted_slot_count: stats.slotCount,
        teaching_minutes_weekly: stats.plottedMinutes,
      };
    });
  };

  const handleSlotScheduled = (newEntry: ScheduleEntry) => {
    setData((prev) => {
      const nextEntries = [...prev.scheduleEntries, newEntry];
      return {
        ...prev,
        scheduleEntries: nextEntries,
        loads: syncLoadsWithEntries(prev, nextEntries),
      };
    });
  };

  const handleEntryDeleted = (deletedId: string) => {
    setData((prev) => {
      const nextEntries = prev.scheduleEntries.filter((e) => e.id !== deletedId);
      return {
        ...prev,
        scheduleEntries: nextEntries,
        loads: syncLoadsWithEntries(prev, nextEntries),
      };
    });
  };

  const handleLoadCreated = (newLoad: TeacherSubjectLoad) => {
    setData((prev) => ({
      ...prev,
      loads: [...prev.loads, newLoad],
    }));
  };

  const handleLoadUpdated = (updatedLoad: TeacherSubjectLoad) => {
    setData((prev) => ({
      ...prev,
      loads: prev.loads.map((l) => (l.id === updatedLoad.id ? updatedLoad : l)),
    }));
  };

  const handleLoadDeleted = (deletedLoadId: string) => {
    setData((prev) => ({
      ...prev,
      loads: prev.loads.filter((l) => l.id !== deletedLoadId),
      scheduleEntries: prev.scheduleEntries.filter((e) => e.load_id !== deletedLoadId),
    }));
  };

  const handleCopyFromTerm = async (sourceTermId: string) => {
    const targetTermId = selectedTermId || data.activeTerm?.id;
    if (!targetTermId) {
      return {
        success: false,
        insertedCount: 0,
        skippedCount: 0,
        error: "No target term selected.",
      };
    }
    const res = await copyTeacherLoadsFromTerm(sourceTermId, targetTermId);
    if (res.success) {
      await loadData(targetTermId);
    }
    return res;
  };

  const handleOpenAssignSlot = (prefill?: {
    sectionId?: string;
    teacherId?: string;
    day?: DayOfWeek;
    timeSlotId?: string;
  }) => {
    setSlotPrefill(prefill || {});
    setIsSlotModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 print:p-0 print:max-w-none print:space-y-2">
      <div className="print:hidden space-y-6">
        <PageHeader
          title="Schedule"
          onRefresh={() => loadData(selectedTermId || undefined)}
          isRefreshing={isLoading}
          extraActions={
            terms.length > 0 ? (
              <select
                id="timetable-term-select"
                value={selectedTermId || data.activeTerm?.id ||""}
                onChange={(e) => handleTermChange(e.target.value)}
                aria-label="Select Academic Term"
                className="px-3 py-2 rounded-lg border border-[#E3DDD1] bg-[#FFFFFF] text-xs font-medium text-[#1C2420] cursor-pointer"
              >
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    SY {t.school_year} • Term {t.term_number} {t.is_active ?"(Active)" :""}
                  </option>
                ))}
              </select>
            ) : undefined
          }
          primaryAction={
            isPrivileged
              ? {
                  label:"Schedule Slot",
                  icon: <PlusCircle className="w-4 h-4" />,
                  onClick: () => handleOpenAssignSlot(),
                }
              : undefined
          }
        />

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#FFFFFF] border border-[#E3DDD1] rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("grid")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab ==="grid"
                ?"bg-[#E6EFEA] text-[#0F3D2E]"
                :"text-[#5C6660] hover:text-[#1C2420]"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("loads")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab ==="loads"
                ?"bg-[#E6EFEA] text-[#0F3D2E]"
                :"text-[#5C6660] hover:text-[#1C2420]"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Faculty Loading</span>
            <span className="px-1.5 py-0.5 bg-[#FAF8F5] border border-[#E3DDD1] rounded-full text-[10px] text-[#1C2420]">
              {data.loads.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sf7")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab ==="sf7"
                ?"bg-[#E6EFEA] text-[#0F3D2E]"
                :"text-[#5C6660] hover:text-[#1C2420]"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>DepEd SF7 Export</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("class_program")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab ==="class_program"
                ?"bg-[#E6EFEA] text-[#0F3D2E]"
                :"text-[#5C6660] hover:text-[#1C2420]"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Class Program</span>
          </button>
        </div>
      </div>

      {/* 3. Tab Contents */}
      {isLoading ? (
        <div className="p-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-crimson-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-cyprus-900">
            Loading schedule matrix and loading solver...
          </p>
        </div>
      ) : (
        <>
          {activeTab ==="grid" && (
            <TimetableGrid
              timeSlots={data.timeSlots}
              timeSlotOverrides={data.timeSlotOverrides}
              sections={data.sections}
              teachers={data.teachers}
              rooms={data.rooms}
              scheduleEntries={data.scheduleEntries}
              activeTerm={data.activeTerm}
              schoolSettings={data.schoolSettings}
              isPrivileged={isPrivileged}
              onOpenAssignSlot={handleOpenAssignSlot}
              onEntryDeleted={handleEntryDeleted}
            />
          )}

          {activeTab ==="loads" && (
            <FacultyLoadingTable
              teachers={data.teachers}
              loads={data.loads}
              scheduleEntries={data.scheduleEntries}
              timeSlots={data.timeSlots}
              timeSlotOverrides={data.timeSlotOverrides}
              sections={data.sections}
              terms={terms}
              currentTerm={
                terms.find((t) => t.id === (selectedTermId || data.activeTerm?.id)) ||
                data.activeTerm
              }
              isPrivileged={isPrivileged}
              onOpenAssignLoad={(teacherId) => {
                setEditingLoad(null);
                setPreselectedLoadTeacherId(teacherId);
                setIsLoadModalOpen(true);
              }}
              onEditLoad={(load) => {
                setEditingLoad(load);
                setPreselectedLoadTeacherId(undefined);
                setIsLoadModalOpen(true);
              }}
              onLoadDeleted={handleLoadDeleted}
              onCopyFromTerm={handleCopyFromTerm}
            />
          )}

          {activeTab ==="sf7" && (
            <DepEdSF7PrintView
              teachers={data.teachers}
              sections={data.sections}
              timeSlots={data.timeSlots}
              timeSlotOverrides={data.timeSlotOverrides}
              scheduleEntries={data.scheduleEntries}
              loads={data.loads}
              activeTerm={data.activeTerm}
              schoolSettings={data.schoolSettings}
            />
          )}

          {activeTab ==="class_program" && (
            <ClassProgramPrintView
              sections={data.sections}
              timeSlots={data.timeSlots}
              timeSlotOverrides={data.timeSlotOverrides}
              scheduleEntries={data.scheduleEntries}
              activeTerm={data.activeTerm}
              schoolSettings={data.schoolSettings}
            />
          )}
        </>
      )}

      {/* 4. Modals */}
      {isSlotModalOpen && (
        <AssignSlotModal
          isOpen={isSlotModalOpen}
          onClose={() => setIsSlotModalOpen(false)}
          termId={selectedTermId || data.activeTerm?.id ||"f9e12395-85fc-4958-8829-5d5c991d4c3d"}
          loads={data.loads}
          subjects={data.subjects}
          rooms={data.rooms}
          sections={data.sections}
          timeSlots={data.timeSlots}
          timeSlotOverrides={data.timeSlotOverrides}
          existingEntries={data.scheduleEntries}
          preselectedSectionId={slotPrefill.sectionId}
          preselectedTeacherId={slotPrefill.teacherId}
          preselectedDay={slotPrefill.day}
          preselectedTimeSlotId={slotPrefill.timeSlotId}
          onSlotScheduled={handleSlotScheduled}
        />
      )}

      {isLoadModalOpen && (
        <AssignLoadModal
          isOpen={isLoadModalOpen}
          onClose={() => {
            setIsLoadModalOpen(false);
            setEditingLoad(null);
            setPreselectedLoadTeacherId(undefined);
          }}
          termId={selectedTermId || data.activeTerm?.id ||"f9e12395-85fc-4958-8829-5d5c991d4c3d"}
          teachers={data.teachers}
          subjects={data.subjects}
          sections={data.sections}
          preselectedTeacherId={preselectedLoadTeacherId}
          editingLoad={editingLoad}
          onLoadCreated={handleLoadCreated}
          onLoadUpdated={handleLoadUpdated}
        />
      )}
    </div>
  );
};
