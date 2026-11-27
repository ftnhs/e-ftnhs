import React, { useState, useEffect, useCallback } from"react";
import { useAuth } from"../context/AuthContext";
import {
  fetchTimetableData,
  copyTeacherLoadsFromTerm,
  clearTermLoadsAndSchedule,
  computeLoadPlottedStats,
  setScheduleGridLock,
  type TimetableDataState,
} from "../services/timetableService";
import { schoolReferenceService } from"../services/schoolReferenceService";
import { PageHeader } from"../components/common/PageHeader";
import { TimetableGrid } from"../components/timetable/TimetableGrid";
import { FacultyLoadingTable } from"../components/timetable/FacultyLoadingTable";
import { DepEdSF7PrintView } from"../components/timetable/DepEdSF7PrintView";
import { ClassProgramPrintView } from"../components/timetable/ClassProgramPrintView";
import { AssignSlotModal } from "../components/timetable/AssignSlotModal";
import { AssignLoadModal } from "../components/timetable/AssignLoadModal";
import { AutoPopulateGridModal } from "../components/timetable/AutoPopulateGridModal";
import { ClearGridModal } from "../components/timetable/ClearGridModal";
import type { AcademicTerm, ScheduleEntry, TeacherSubjectLoad, DayOfWeek, Room } from "../types";
import {
  Calendar,
  Layers,
  FileSpreadsheet,
  Users,
  RefreshCw,
  PlusCircle,
} from"lucide-react";

export const ScheduleView: React.FC = () => {
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
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [slotPrefill, setSlotPrefill] = useState<{
    sectionId?: string;
    teacherId?: string;
    loadId?: string;
    day?: DayOfWeek;
    timeSlotId?: string;
    startTime?: string;
    endTime?: string;
  }>({});
  const [isLoadModalOpen, setIsLoadModalOpen] = useState<boolean>(false);
  const [preselectedLoadTeacherId, setPreselectedLoadTeacherId] = useState<string | undefined>(undefined);
  const [editingLoad, setEditingLoad] = useState<TeacherSubjectLoad | null>(null);
  const [isAutoPopulateModalOpen, setIsAutoPopulateModalOpen] = useState<boolean>(false);
  const [isClearGridModalOpen, setIsClearGridModalOpen] = useState<boolean>(false);
  const [clearGridDefaultSectionId, setClearGridDefaultSectionId] = useState<string | undefined>(undefined);
  const [isTogglingLock, setIsTogglingLock] = useState<boolean>(false);

  const currentTerm =
    terms.find((t) => t.id === (selectedTermId || data.activeTerm?.id)) || data.activeTerm;
  const isGridLocked = Boolean(currentTerm?.is_schedule_locked);

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
      console.error("[ScheduleView] Error loading data:", err);
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
        target_minutes_weekly:
          load.target_minutes_weekly && load.target_minutes_weekly > 0
            ? load.target_minutes_weekly
            : load.teaching_minutes_weekly > 0
              ? load.teaching_minutes_weekly
              : undefined,
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

  const handleSlotUpdated = (updatedEntry: ScheduleEntry) => {
    setData((prev) => {
      const nextEntries = prev.scheduleEntries.map((e) =>
        e.id === updatedEntry.id ? updatedEntry : e
      );
      return {
        ...prev,
        scheduleEntries: nextEntries,
        loads: syncLoadsWithEntries(prev, nextEntries),
      };
    });
  };

  const handleRoomCreated = (newRoom: Room) => {
    setData((prev) => {
      if (prev.rooms.some((r) => r.id === newRoom.id)) return prev;
      return {
        ...prev,
        rooms: [...prev.rooms, newRoom].sort((a, b) =>
          a.room_number.localeCompare(b.room_number)
        ),
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

  const handleLoadUpdated = (
    updatedLoad: TeacherSubjectLoad,
    updatedEntries?: ScheduleEntry[]
  ) => {
    setData((prev) => {
      const nextEntries =
        updatedEntries && updatedEntries.length > 0
          ? prev.scheduleEntries.map((existing) => {
              const synced = updatedEntries.find((u) => u.id === existing.id);
              return synced || existing;
            })
          : prev.scheduleEntries;

      return {
        ...prev,
        scheduleEntries: nextEntries,
        loads: prev.loads.map((l) => (l.id === updatedLoad.id ? updatedLoad : l)),
      };
    });
  };

  const handleLoadDeleted = (deletedLoadId: string) => {
    setData((prev) => {
      const removedLoad = prev.loads.find((l) => l.id === deletedLoadId);
      const nextEntries = prev.scheduleEntries.filter((e) => {
        if (e.load_id === deletedLoadId) return false;
        if (
          removedLoad &&
          e.term_id === removedLoad.term_id &&
          e.teacher_id === removedLoad.teacher_id &&
          e.subject_id === removedLoad.subject_id &&
          e.section_id === removedLoad.section_id
        ) {
          return false;
        }
        return true;
      });
      return {
        ...prev,
        loads: prev.loads.filter((l) => l.id !== deletedLoadId),
        scheduleEntries: nextEntries,
      };
    });
  };

  const handleCopyFromTerm = async (
    sourceTermId: string,
    options?: { clearExisting?: boolean; includeScheduleGrid?: boolean }
  ) => {
    const targetTermId = selectedTermId || data.activeTerm?.id;
    if (!targetTermId) {
      return {
        success: false,
        insertedCount: 0,
        skippedCount: 0,
        insertedScheduleCount: 0,
        skippedScheduleCount: 0,
        error: "No target term selected.",
      };
    }
    const res = await copyTeacherLoadsFromTerm(sourceTermId, targetTermId, options);
    if (res.success) {
      await loadData(targetTermId);
    }
    return res;
  };

  const handleClearCurrentTermLoads = async () => {
    const targetTermId = selectedTermId || data.activeTerm?.id;
    if (!targetTermId) {
      return {
        success: false,
        deletedLoadsCount: 0,
        deletedScheduleCount: 0,
        error: "No target term selected.",
      };
    }
    const res = await clearTermLoadsAndSchedule(targetTermId);
    if (res.success) {
      await loadData(targetTermId);
    }
    return res;
  };

  const handleOpenAssignSlot = (prefill?: {
    sectionId?: string;
    teacherId?: string;
    loadId?: string;
    day?: DayOfWeek;
    timeSlotId?: string;
    startTime?: string;
    endTime?: string;
  }) => {
    if (isGridLocked) return;
    setEditingEntry(null);
    setSlotPrefill(prefill || {});
    setIsSlotModalOpen(true);
  };

  const handleOpenEditSlot = (entry: ScheduleEntry) => {
    if (isGridLocked) return;
    setEditingEntry(entry);
    setSlotPrefill({});
    setIsSlotModalOpen(true);
  };

  const handleToggleGridLock = async (nextLocked: boolean) => {
    const targetTermId = selectedTermId || data.activeTerm?.id;
    if (!targetTermId || !isPrivileged) return;
    setIsTogglingLock(true);
    try {
      const res = await setScheduleGridLock(targetTermId, nextLocked);
      if (res.success && res.term) {
        setTerms((prev) => prev.map((t) => (t.id === res.term!.id ? res.term! : t)));
        setData((prev) => ({
          ...prev,
          activeTerm:
            prev.activeTerm?.id === res.term!.id ? res.term! : prev.activeTerm,
        }));
      }
    } finally {
      setIsTogglingLock(false);
    }
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
                  disabled: isGridLocked,
                }
              : undefined
          }
        />

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#FFFFFF] border border-[#E3DDD1] rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar">
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
              activeTerm={currentTerm}
              schoolSettings={data.schoolSettings}
              isPrivileged={isPrivileged}
              isGridLocked={isGridLocked}
              isTogglingLock={isTogglingLock}
              onOpenAssignSlot={handleOpenAssignSlot}
              onEditSlot={handleOpenEditSlot}
              onEntryDeleted={handleEntryDeleted}
              onOpenAutoPopulate={() => setIsAutoPopulateModalOpen(true)}
              onOpenClearGrid={(activeSecId) => {
                setClearGridDefaultSectionId(activeSecId);
                setIsClearGridModalOpen(true);
              }}
              onToggleGridLock={handleToggleGridLock}
              onEntriesChanged={(changedEntries) => {
                setData((prev) => {
                  const map = new Map(changedEntries.map((ce) => [ce.id, ce]));
                  const nextEntries = prev.scheduleEntries.map((e) => map.get(e.id) || e);
                  return {
                    ...prev,
                    scheduleEntries: nextEntries,
                    loads: syncLoadsWithEntries(prev, nextEntries),
                  };
                });
              }}
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
              onClearTermLoads={handleClearCurrentTermLoads}
              onScheduleLoad={(load) =>
                handleOpenAssignSlot({
                  sectionId: load.section_id,
                  teacherId: load.teacher_id,
                  loadId: load.id,
                })
              }
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
          onClose={() => {
            setIsSlotModalOpen(false);
            setEditingEntry(null);
          }}
          termId={selectedTermId || data.activeTerm?.id ||"f9e12395-85fc-4958-8829-5d5c991d4c3d"}
          loads={data.loads}
          subjects={data.subjects}
          rooms={data.rooms}
          sections={data.sections}
          timeSlots={data.timeSlots}
          timeSlotOverrides={data.timeSlotOverrides}
          existingEntries={data.scheduleEntries}
          editingEntry={editingEntry}
          preselectedSectionId={slotPrefill.sectionId}
          preselectedTeacherId={slotPrefill.teacherId}
          preselectedLoadId={slotPrefill.loadId}
          preselectedDay={slotPrefill.day}
          preselectedTimeSlotId={slotPrefill.timeSlotId}
          preselectedStartTime={slotPrefill.startTime}
          preselectedEndTime={slotPrefill.endTime}
          onSlotScheduled={handleSlotScheduled}
          onSlotUpdated={handleSlotUpdated}
          onRoomCreated={handleRoomCreated}
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
          rooms={data.rooms}
          existingEntries={data.scheduleEntries}
          timeSlots={data.timeSlots}
          timeSlotOverrides={data.timeSlotOverrides}
          preselectedTeacherId={preselectedLoadTeacherId}
          editingLoad={editingLoad}
          onLoadCreated={handleLoadCreated}
          onLoadUpdated={handleLoadUpdated}
          onRoomCreated={handleRoomCreated}
        />
      )}

      {isAutoPopulateModalOpen && (
        <AutoPopulateGridModal
          isOpen={isAutoPopulateModalOpen}
          onClose={() => setIsAutoPopulateModalOpen(false)}
          termId={selectedTermId || data.activeTerm?.id || "f9e12395-85fc-4958-8829-5d5c991d4c3d"}
          activeTerm={
            terms.find((t) => t.id === (selectedTermId || data.activeTerm?.id)) ||
            data.activeTerm
          }
          sections={data.sections}
          existingEntriesCount={data.scheduleEntries.length}
          onSuccess={(_result, newlyAddedEntries, appliedOptions) => {
            setData((prev) => {
              let baseEntries = prev.scheduleEntries;
              if (appliedOptions?.clearExisting) {
                baseEntries = appliedOptions.scopeSectionId
                  ? baseEntries.filter((e) => e.section_id !== appliedOptions.scopeSectionId)
                  : [];
              }
              const mergedEntries = [...baseEntries, ...newlyAddedEntries];
              return {
                ...prev,
                scheduleEntries: mergedEntries,
                loads: syncLoadsWithEntries(prev, mergedEntries),
              };
            });
            // Refresh in background to ensure all DB trigger minutes are synced
            loadData(selectedTermId || data.activeTerm?.id);
          }}
        />
      )}

      {isClearGridModalOpen && (
        <ClearGridModal
          isOpen={isClearGridModalOpen}
          onClose={() => setIsClearGridModalOpen(false)}
          termId={selectedTermId || data.activeTerm?.id || "f9e12395-85fc-4958-8829-5d5c991d4c3d"}
          activeTerm={
            terms.find((t) => t.id === (selectedTermId || data.activeTerm?.id)) ||
            data.activeTerm
          }
          sections={data.sections}
          scheduleEntries={data.scheduleEntries}
          defaultSelectedSectionId={clearGridDefaultSectionId}
          onCleared={(clearedSectionIds) => {
            setData((prev) => {
              const nextEntries =
                clearedSectionIds && clearedSectionIds.length > 0
                  ? prev.scheduleEntries.filter(
                      (e) => !clearedSectionIds.includes(e.section_id)
                    )
                  : [];
              return {
                ...prev,
                scheduleEntries: nextEntries,
                loads: syncLoadsWithEntries(prev, nextEntries),
              };
            });
            loadData(selectedTermId || data.activeTerm?.id);
          }}
        />
      )}
    </div>
  );
};
