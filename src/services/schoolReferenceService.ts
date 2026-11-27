import { supabase } from "../lib/supabase";
import type {
  AcademicTerm,
  Section,
  Department,
  Subject,
  TimeSlot,
  TimeSlotOverride,
  TimeSlotScopeType,
  Room,
  SchoolSettings,
} from "../types";

export const schoolReferenceService = {
  // ==========================================
  // 1. ACADEMIC TERMS & SCHOOL YEARS
  // ==========================================
  async fetchAcademicTerms(): Promise<AcademicTerm[]> {
    const { data, error } = await supabase
      .from("academic_terms")
      .select("*")
      .order("school_year", { ascending: false })
      .order("term_number", { ascending: true });

    if (error) {
      console.error("Error fetching academic terms:", error);
      throw error;
    }
    return (data || []) as AcademicTerm[];
  },

  async createAcademicTerm(
    term: Omit<AcademicTerm, "id" | "created_at">
  ): Promise<AcademicTerm> {
    const { data, error } = await supabase
      .from("academic_terms")
      .insert({
        school_year: term.school_year.trim(),
        term_number: term.term_number,
        is_active: term.is_active || false,
        start_date: term.start_date || null,
        end_date: term.end_date || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating academic term:", error);
      throw error;
    }

    if (term.is_active && data?.id) {
      await this.setActiveAcademicTerm(data.id);
    }

    return data as AcademicTerm;
  },

  async updateAcademicTerm(
    id: string,
    updates: Partial<AcademicTerm>
  ): Promise<AcademicTerm> {
    const { data, error } = await supabase
      .from("academic_terms")
      .update({
        school_year: updates.school_year?.trim(),
        term_number: updates.term_number,
        start_date: updates.start_date || null,
        end_date: updates.end_date || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating academic term:", error);
      throw error;
    }

    if (updates.is_active) {
      await this.setActiveAcademicTerm(id);
    }

    return data as AcademicTerm;
  },

  async setActiveAcademicTerm(termId: string): Promise<void> {
    const { error: rpcError } = await supabase.rpc("set_active_academic_term", {
      p_term_id: termId,
    });

    if (rpcError) {
      // Fallback direct updates if RPC not accessible
      console.warn("RPC set_active_academic_term fallback:", rpcError);
      await supabase.from("academic_terms").update({ is_active: false }).neq("id", termId);
      const { error: updateError } = await supabase
        .from("academic_terms")
        .update({ is_active: true })
        .eq("id", termId);
      if (updateError) throw updateError;
    }
  },

  async deleteAcademicTerm(id: string): Promise<void> {
    const { error } = await supabase.from("academic_terms").delete().eq("id", id);
    if (error) {
      console.error("Error deleting academic term:", error);
      throw error;
    }
  },

  // ==========================================
  // 2. GRADE LEVELS & SECTIONS
  // ==========================================
  async fetchSections(termId?: string): Promise<Section[]> {
    let query = supabase.from("sections").select(`
      *,
      adviser:profiles!sections_adviser_id_fkey(id, full_name, email),
      room:rooms_catalog(id, room_number, room_name, room_type, capacity, is_specialized)
    `);

    if (termId) {
      query = query.eq("term_id", termId);
    }

    const { data, error } = await query
      .order("grade_level", { ascending: true })
      .order("section_name", { ascending: true });

    if (error) {
      console.error("Error fetching sections:", error);
      throw error;
    }
    return (data || []) as Section[];
  },

  async createSection(
    section: Omit<Section, "id" | "created_at" | "adviser" | "room">
  ): Promise<Section> {
    const { data, error } = await supabase
      .from("sections")
      .insert({
        term_id: section.term_id,
        grade_level: section.grade_level,
        section_name: section.section_name.trim(),
        track_strand: section.track_strand?.trim() || null,
        adviser_id: section.adviser_id || null,
        room_id: section.room_id || null,
      })
      .select(`
        *,
        adviser:profiles!sections_adviser_id_fkey(id, full_name, email),
        room:rooms_catalog(id, room_number, room_name, room_type, capacity, is_specialized)
      `)
      .single();

    if (error) {
      console.error("Error creating section:", error);
      throw error;
    }
    return data as Section;
  },

  async updateSection(id: string, updates: Partial<Section>): Promise<Section> {
    const updatePayload: Record<string, unknown> = {};
    if (updates.grade_level !== undefined) updatePayload.grade_level = updates.grade_level;
    if (updates.section_name !== undefined) updatePayload.section_name = updates.section_name.trim();
    if (updates.track_strand !== undefined) updatePayload.track_strand = updates.track_strand?.trim() || null;
    if (updates.adviser_id !== undefined) updatePayload.adviser_id = updates.adviser_id || null;
    if (updates.room_id !== undefined) updatePayload.room_id = updates.room_id || null;
    if (updates.term_id !== undefined) updatePayload.term_id = updates.term_id;

    const { data, error } = await supabase
      .from("sections")
      .update(updatePayload)
      .eq("id", id)
      .select(`
        *,
        adviser:profiles!sections_adviser_id_fkey(id, full_name, email),
        room:rooms_catalog(id, room_number, room_name, room_type, capacity, is_specialized)
      `)
      .single();

    if (error) {
      console.error("Error updating section:", error);
      throw error;
    }
    return data as Section;
  },

  async deleteSection(id: string): Promise<void> {
    const { error } = await supabase.from("sections").delete().eq("id", id);
    if (error) {
      console.error("Error deleting section:", error);
      throw error;
    }
  },

  // ==========================================
  // 3. DEPARTMENTS & UNITS
  // ==========================================
  async fetchDepartments(): Promise<Department[]> {
    const { data, error } = await supabase
      .from("departments")
      .select(`
        *,
        dept_head:profiles!departments_dept_head_id_fkey(id, full_name, email)
      `)
      .order("sort_order", { ascending: true })
      .order("dept_name", { ascending: true });

    if (error) {
      console.error("Error fetching departments:", error);
      throw error;
    }
    return (data || []) as Department[];
  },

  async createDepartment(
    dept: Omit<Department, "id" | "created_at" | "dept_head">
  ): Promise<Department> {
    const { data, error } = await supabase
      .from("departments")
      .insert({
        dept_code: dept.dept_code.trim().toUpperCase(),
        dept_name: dept.dept_name.trim(),
        dept_head_id: dept.dept_head_id || null,
        description: dept.description?.trim() || null,
        is_active: dept.is_active !== undefined ? dept.is_active : true,
        sort_order: dept.sort_order || 0,
      })
      .select(`
        *,
        dept_head:profiles!departments_dept_head_id_fkey(id, full_name, email)
      `)
      .single();

    if (error) {
      console.error("Error creating department:", error);
      throw error;
    }
    return data as Department;
  },

  async updateDepartment(
    id: string,
    updates: Partial<Department>
  ): Promise<Department> {
    const updatePayload: Record<string, unknown> = {};
    if (updates.dept_code !== undefined) updatePayload.dept_code = updates.dept_code.trim().toUpperCase();
    if (updates.dept_name !== undefined) updatePayload.dept_name = updates.dept_name.trim();
    if (updates.dept_head_id !== undefined) updatePayload.dept_head_id = updates.dept_head_id || null;
    if (updates.description !== undefined) updatePayload.description = updates.description?.trim() || null;
    if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active;
    if (updates.sort_order !== undefined) updatePayload.sort_order = updates.sort_order;

    const { data, error } = await supabase
      .from("departments")
      .update(updatePayload)
      .eq("id", id)
      .select(`
        *,
        dept_head:profiles!departments_dept_head_id_fkey(id, full_name, email)
      `)
      .single();

    if (error) {
      console.error("Error updating department:", error);
      throw error;
    }
    return data as Department;
  },

  async deleteDepartment(id: string): Promise<void> {
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) {
      console.error("Error deleting department:", error);
      throw error;
    }
  },

  // ==========================================
  // 4. SUBJECTS CATALOG
  // ==========================================
  async fetchSubjects(): Promise<Subject[]> {
    const { data, error } = await supabase
      .from("subjects_catalog")
      .select("*")
      .order("grade_level", { ascending: true })
      .order("subject_code", { ascending: true });

    if (error) {
      console.error("Error fetching subjects catalog:", error);
      throw error;
    }
    return (data || []) as Subject[];
  },

  async createSubject(
    subject: Omit<Subject, "id" | "created_at">
  ): Promise<Subject> {
    const { data, error } = await supabase
      .from("subjects_catalog")
      .insert({
        subject_code: subject.subject_code.trim().toUpperCase(),
        subject_name: subject.subject_name.trim(),
        grade_level: subject.grade_level,
        track_strand: subject.track_strand?.trim() || null,
        category: subject.category,
        curriculum_version:
          subject.curriculum_version ??
          (subject.grade_level === 11
            ? "SSHS"
            : subject.grade_level === 12
              ? "Old SHS"
              : "JHS MATATAG"),
        minutes_per_week: subject.minutes_per_week || 240,
        requires_lab: subject.requires_lab || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating subject:", error);
      throw error;
    }
    return data as Subject;
  },

  async updateSubject(id: string, updates: Partial<Subject>): Promise<Subject> {
    const updatePayload: Record<string, unknown> = {};
    if (updates.subject_code !== undefined) updatePayload.subject_code = updates.subject_code.trim().toUpperCase();
    if (updates.subject_name !== undefined) updatePayload.subject_name = updates.subject_name.trim();
    if (updates.grade_level !== undefined) updatePayload.grade_level = updates.grade_level;
    if (updates.track_strand !== undefined) updatePayload.track_strand = updates.track_strand?.trim() || null;
    if (updates.category !== undefined) updatePayload.category = updates.category;
    if (updates.curriculum_version !== undefined) updatePayload.curriculum_version = updates.curriculum_version;
    if (updates.minutes_per_week !== undefined) updatePayload.minutes_per_week = updates.minutes_per_week;
    if (updates.requires_lab !== undefined) updatePayload.requires_lab = updates.requires_lab;

    const { data, error } = await supabase
      .from("subjects_catalog")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating subject:", error);
      throw error;
    }
    return data as Subject;
  },

  async deleteSubject(id: string): Promise<void> {
    const { error } = await supabase.from("subjects_catalog").delete().eq("id", id);
    if (error) {
      console.error("Error deleting subject:", error);
      throw error;
    }
  },

  // ==========================================
  // 4B. BY-TERM SUBJECT OFFERINGS (term_subjects)
  // ==========================================
  isMissingTermSubjectsTableError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const e = error as { code?: string; message?: string };
    const code = e.code || "";
    const msg = (e.message || "").toLowerCase();
    return (
      code === "42P01" ||
      code === "PGRST205" ||
      msg.includes("term_subjects") && (msg.includes("does not exist") || msg.includes("schema cache"))
    );
  },

  async fetchTermSubjectIds(
    termId: string
  ): Promise<{ subjectIds: string[]; tableMissing: boolean }> {
    if (!termId) return { subjectIds: [], tableMissing: false };
    const { data, error } = await supabase
      .from("term_subjects")
      .select("subject_id")
      .eq("term_id", termId);

    if (error) {
      if (this.isMissingTermSubjectsTableError(error)) {
        return { subjectIds: [], tableMissing: true };
      }
      console.error("Error fetching term_subjects:", error);
      throw error;
    }

    return {
      subjectIds: ((data || []) as Array<{ subject_id: string }>).map((r) => r.subject_id),
      tableMissing: false,
    };
  },

  async addTermSubject(termId: string, subjectId: string): Promise<void> {
    if (!termId || !subjectId) return;
    const { error } = await supabase
      .from("term_subjects")
      .upsert({ term_id: termId, subject_id: subjectId }, { onConflict: "term_id,subject_id" });

    if (error && !this.isMissingTermSubjectsTableError(error)) {
      console.error("Error adding subject to term:", error);
      throw error;
    }
  },

  async removeTermSubject(termId: string, subjectId: string): Promise<void> {
    if (!termId || !subjectId) return;
    const { error } = await supabase
      .from("term_subjects")
      .delete()
      .eq("term_id", termId)
      .eq("subject_id", subjectId);

    if (error) {
      console.error("Error removing subject from term:", error);
      throw error;
    }
  },

  async setTermSubjects(termId: string, subjectIds: string[]): Promise<void> {
    if (!termId) return;
    const { subjectIds: existingIds, tableMissing } = await this.fetchTermSubjectIds(termId);
    if (tableMissing) {
      throw new Error(
        "The term_subjects table is missing in Supabase. Please run migration 032_term_subjects.sql first."
      );
    }

    const desiredSet = new Set(subjectIds);
    const existingSet = new Set(existingIds);

    const toInsert = Array.from(desiredSet)
      .filter((id) => !existingSet.has(id))
      .map((subject_id) => ({ term_id: termId, subject_id }));

    const toDelete = Array.from(existingSet).filter((id) => !desiredSet.has(id));

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from("term_subjects")
        .delete()
        .eq("term_id", termId)
        .in("subject_id", toDelete);
      if (delErr) throw delErr;
    }

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase
        .from("term_subjects")
        .upsert(toInsert, { onConflict: "term_id,subject_id" });
      if (insErr) throw insErr;
    }
  },

  async populateTermSubjects(params: {
    targetTermId: string;
    mode: "from-term" | "from-catalog" | "from-loads";
    sourceTermId?: string;
    includeJhs: boolean;
    includeShs: boolean;
    clearExisting?: boolean;
  }): Promise<{ insertedCount: number; skippedCount: number; clearedCount: number }> {
    const { targetTermId, mode, sourceTermId, includeJhs, includeShs, clearExisting = false } = params;
    if (!targetTermId) throw new Error("Target term is required.");
    if (!includeJhs && !includeShs) {
      throw new Error("Please select at least JHS or SHS subjects to populate.");
    }

    const allCatalog = await this.fetchSubjects();
    const levelAllowedIds = new Set(
      allCatalog
        .filter((s) => (s.grade_level <= 10 ? includeJhs : includeShs))
        .map((s) => s.id)
    );

    let candidateIds: string[] = [];

    if (mode === "from-catalog") {
      candidateIds = Array.from(levelAllowedIds);
    } else if (mode === "from-term") {
      if (!sourceTermId) throw new Error("Please select a source academic term.");
      if (sourceTermId === targetTermId) {
        throw new Error("Source and target academic terms must be different.");
      }

      const { subjectIds: srcTermSubjectIds, tableMissing } =
        await this.fetchTermSubjectIds(sourceTermId);
      if (tableMissing) {
        throw new Error(
          "The term_subjects table is missing in Supabase. Please run migration 032_term_subjects.sql first."
        );
      }

      if (srcTermSubjectIds.length > 0) {
        candidateIds = srcTermSubjectIds.filter((id) => levelAllowedIds.has(id));
      } else {
        // Fallback: infer from source term's loads & schedule entries if term_subjects wasn't populated yet
        const [loadsRes, schedRes] = await Promise.all([
          supabase.from("teacher_subject_loads").select("subject_id").eq("term_id", sourceTermId),
          supabase.from("schedule_entries").select("subject_id").eq("term_id", sourceTermId),
        ]);
        const inferred = new Set<string>();
        ((loadsRes.data || []) as Array<{ subject_id: string }>).forEach((r) =>
          inferred.add(r.subject_id)
        );
        ((schedRes.data || []) as Array<{ subject_id: string }>).forEach((r) =>
          inferred.add(r.subject_id)
        );
        candidateIds = Array.from(inferred).filter((id) => levelAllowedIds.has(id));
      }
    } else {
      // mode === "from-loads": infer from target term's existing loads, schedule entries, & section_subjects
      const [loadsRes, schedRes, secSubRes] = await Promise.all([
        supabase.from("teacher_subject_loads").select("subject_id").eq("term_id", targetTermId),
        supabase.from("schedule_entries").select("subject_id").eq("term_id", targetTermId),
        supabase.from("section_subjects").select("subject_id").eq("term_id", targetTermId),
      ]);
      const inferred = new Set<string>();
      ((loadsRes.data || []) as Array<{ subject_id: string }>).forEach((r) =>
        inferred.add(r.subject_id)
      );
      ((schedRes.data || []) as Array<{ subject_id: string }>).forEach((r) =>
        inferred.add(r.subject_id)
      );
      ((secSubRes.data || []) as Array<{ subject_id: string }>).forEach((r) =>
        inferred.add(r.subject_id)
      );
      candidateIds = Array.from(inferred).filter((id) => levelAllowedIds.has(id));
    }

    const { subjectIds: existingTargetIds, tableMissing } =
      await this.fetchTermSubjectIds(targetTermId);
    if (tableMissing) {
      throw new Error(
        "The term_subjects table is missing in Supabase. Please run migration 032_term_subjects.sql first."
      );
    }

    let clearedCount = 0;
    const existingSet = new Set(existingTargetIds);

    if (clearExisting && existingSet.size > 0) {
      const { error: delErr } = await supabase
        .from("term_subjects")
        .delete()
        .eq("term_id", targetTermId);
      if (delErr) throw delErr;
      clearedCount = existingSet.size;
      existingSet.clear();
    }

    const uniqueCandidates = Array.from(new Set(candidateIds));
    const toInsert = uniqueCandidates
      .filter((id) => !existingSet.has(id))
      .map((subject_id) => ({ term_id: targetTermId, subject_id }));
    const skippedCount = uniqueCandidates.length - toInsert.length;

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase
        .from("term_subjects")
        .upsert(toInsert, { onConflict: "term_id,subject_id" });
      if (insErr) throw insErr;
    }

    return {
      insertedCount: toInsert.length,
      skippedCount,
      clearedCount,
    };
  },

  // ==========================================
  // 5. BELL SCHEDULE & TIME SLOTS
  // ==========================================
  async fetchTimeSlots(): Promise<TimeSlot[]> {
    const { data, error } = await supabase
      .from("time_slots")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching time slots:", error);
      throw error;
    }
    return (data || []) as TimeSlot[];
  },

  async createTimeSlot(timeSlot: Omit<TimeSlot, "id">): Promise<TimeSlot> {
    const { data, error } = await supabase
      .from("time_slots")
      .insert({
        slot_number: timeSlot.slot_number,
        slot_label: timeSlot.slot_label.trim(),
        start_time: timeSlot.start_time,
        end_time: timeSlot.end_time,
        duration_minutes: timeSlot.duration_minutes,
        slot_type: timeSlot.slot_type,
        sort_order: timeSlot.sort_order,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating time slot:", error);
      throw error;
    }
    return data as TimeSlot;
  },

  async updateTimeSlot(id: string, updates: Partial<TimeSlot>): Promise<TimeSlot> {
    const updatePayload: Record<string, unknown> = {};
    if (updates.slot_number !== undefined) updatePayload.slot_number = updates.slot_number;
    if (updates.slot_label !== undefined) updatePayload.slot_label = updates.slot_label.trim();
    if (updates.start_time !== undefined) updatePayload.start_time = updates.start_time;
    if (updates.end_time !== undefined) updatePayload.end_time = updates.end_time;
    if (updates.duration_minutes !== undefined) updatePayload.duration_minutes = updates.duration_minutes;
    if (updates.slot_type !== undefined) updatePayload.slot_type = updates.slot_type;
    if (updates.sort_order !== undefined) updatePayload.sort_order = updates.sort_order;

    const { data, error } = await supabase
      .from("time_slots")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating time slot:", error);
      throw error;
    }
    return data as TimeSlot;
  },

  async deleteTimeSlot(id: string): Promise<void> {
    const { error } = await supabase.from("time_slots").delete().eq("id", id);
    if (error) {
      console.error("Error deleting time slot:", error);
      throw error;
    }
  },

  async fetchTimeSlotOverrides(): Promise<TimeSlotOverride[]> {
    const { data, error } = await supabase
      .from("time_slot_overrides")
      .select("*")
      .order("scope_type", { ascending: true });

    if (error) {
      console.error("Error fetching time slot overrides:", error);
      throw error;
    }
    return (data || []) as TimeSlotOverride[];
  },

  async upsertTimeSlotOverride(payload: {
    time_slot_id: string;
    scope_type: TimeSlotScopeType;
    section_id: string | null;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    slot_label?: string | null;
    slot_type?: TimeSlot["slot_type"] | null;
  }): Promise<TimeSlotOverride> {
    const normalizedSectionId =
      payload.scope_type === "SECTION" ? payload.section_id : null;

    let existingQuery = supabase
      .from("time_slot_overrides")
      .select("id")
      .eq("time_slot_id", payload.time_slot_id)
      .eq("scope_type", payload.scope_type);

    existingQuery = normalizedSectionId
      ? existingQuery.eq("section_id", normalizedSectionId)
      : existingQuery.is("section_id", null);

    const { data: existing, error: fetchError } = await existingQuery.maybeSingle();
    if (fetchError) {
      console.error("Error checking existing time slot override:", fetchError);
      throw fetchError;
    }

    const rowPayload = {
      start_time: payload.start_time,
      end_time: payload.end_time,
      duration_minutes: payload.duration_minutes,
      slot_label: payload.slot_label?.trim() || null,
      slot_type: payload.slot_type || null,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from("time_slot_overrides")
        .update(rowPayload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) {
        console.error("Error updating time slot override:", error);
        throw error;
      }
      return data as TimeSlotOverride;
    }

    const { data, error } = await supabase
      .from("time_slot_overrides")
      .insert([
        {
          time_slot_id: payload.time_slot_id,
          scope_type: payload.scope_type,
          section_id: normalizedSectionId,
          ...rowPayload,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating time slot override:", error);
      throw error;
    }
    return data as TimeSlotOverride;
  },

  async deleteTimeSlotOverride(id: string): Promise<void> {
    const { error } = await supabase
      .from("time_slot_overrides")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Error deleting time slot override:", error);
      throw error;
    }
  },

  async clearTimeSlotOverridesForScope(
    scopeType: TimeSlotScopeType,
    sectionId?: string | null
  ): Promise<void> {
    let query = supabase
      .from("time_slot_overrides")
      .delete()
      .eq("scope_type", scopeType);

    if (scopeType === "SECTION") {
      if (!sectionId) return;
      query = query.eq("section_id", sectionId);
    } else {
      query = query.is("section_id", null);
    }

    const { error } = await query;
    if (error) {
      console.error("Error clearing time slot overrides:", error);
      throw error;
    }
  },

  // ==========================================
  // 6. ROOMS & LABORATORIES
  // ==========================================
  async fetchRooms(): Promise<Room[]> {
    const { data, error } = await supabase
      .from("rooms_catalog")
      .select("*")
      .order("room_number", { ascending: true });

    if (error) {
      console.error("Error fetching rooms catalog:", error);
      throw error;
    }
    return (data || []) as Room[];
  },

  async createRoom(room: Omit<Room, "id" | "created_at">): Promise<Room> {
    const { data, error } = await supabase
      .from("rooms_catalog")
      .insert({
        room_number: room.room_number.trim(),
        room_name: room.room_name.trim(),
        room_type: room.room_type,
        capacity: room.capacity || 45,
        is_specialized: room.is_specialized || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating room:", error);
      throw error;
    }
    return data as Room;
  },

  async updateRoom(id: string, updates: Partial<Room>): Promise<Room> {
    const updatePayload: Record<string, unknown> = {};
    if (updates.room_number !== undefined) updatePayload.room_number = updates.room_number.trim();
    if (updates.room_name !== undefined) updatePayload.room_name = updates.room_name.trim();
    if (updates.room_type !== undefined) updatePayload.room_type = updates.room_type;
    if (updates.capacity !== undefined) updatePayload.capacity = updates.capacity;
    if (updates.is_specialized !== undefined) updatePayload.is_specialized = updates.is_specialized;

    const { data, error } = await supabase
      .from("rooms_catalog")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating room:", error);
      throw error;
    }
    return data as Room;
  },

  async deleteRoom(id: string): Promise<void> {
    const { error } = await supabase.from("rooms_catalog").delete().eq("id", id);
    if (error) {
      console.error("Error deleting room:", error);
      throw error;
    }
  },

  // ==========================================
  // 7. INSTITUTIONAL SCHOOL SETTINGS
  // ==========================================
  async fetchSchoolSettings(): Promise<SchoolSettings> {
    const { data, error } = await supabase
      .from("school_settings")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      console.warn("Error fetching school settings, returning default fallback:", error);
      return {
        id: "default-settings",
        school_name: "FERMIN TAYABAS NATIONAL HIGH SCHOOL",
        school_id: "302851",
        region: "REGION VII",
        division: "DIVISION OF BOHOL",
        district: "DISTRICT OF CALAPE",
        address: "Cabayugan, Calape, Bohol",
        principal_name: "Pee Jay Baslan, EdD",
        principal_designation: "School-in-Charge",
        psds_name: "MA. TERESITA I. ALAMPAYAN, PhD",
        psds_designation: "Public Schools District Supervisor",
        sds_name: "FAY C. LUAREZ EdD, PhD TM, CESO V",
        sds_designation: "Schools Division Superintendent",
        jhs_coordinator_name: "MAURINE D. CUARIO",
        jhs_coordinator_designation: "Teacher III / JHS Coordinator",
        shs_coordinator_name: "DELLIE T. VIGONTE",
        shs_coordinator_designation: "Teacher III / SHS Coordinator",
      };
    }
    return data as SchoolSettings;
  },

  async updateSchoolSettings(
    settings: Partial<SchoolSettings>
  ): Promise<SchoolSettings> {
    const { data: existing } = await supabase
      .from("school_settings")
      .select("id")
      .limit(1)
      .single();

    if (existing?.id) {
      const { data, error } = await supabase
        .from("school_settings")
        .update({
          school_name: settings.school_name,
          school_id: settings.school_id,
          region: settings.region,
          division: settings.division,
          district: settings.district,
          address: settings.address,
          principal_name: settings.principal_name,
          principal_designation: settings.principal_designation,
          psds_name: settings.psds_name,
          psds_designation: settings.psds_designation,
          sds_name: settings.sds_name,
          sds_designation: settings.sds_designation,
          jhs_coordinator_name: settings.jhs_coordinator_name,
          jhs_coordinator_designation: settings.jhs_coordinator_designation,
          shs_coordinator_name: settings.shs_coordinator_name,
          shs_coordinator_designation: settings.shs_coordinator_designation,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as SchoolSettings;
    } else {
      const { data, error } = await supabase
        .from("school_settings")
        .insert({
          school_name: settings.school_name || "FERMIN TAYABAS NATIONAL HIGH SCHOOL",
          school_id: settings.school_id || "302851",
          region: settings.region || "REGION VII",
          division: settings.division || "DIVISION OF BOHOL",
          district: settings.district || "DISTRICT OF CALAPE",
          address: settings.address || "Cabayugan, Calape, Bohol",
          principal_name: settings.principal_name || "Pee Jay Baslan, EdD",
          principal_designation: settings.principal_designation || "School-in-Charge",
          psds_name: settings.psds_name || "MA. TERESITA I. ALAMPAYAN, PhD",
          psds_designation: settings.psds_designation || "Public Schools District Supervisor",
          sds_name: settings.sds_name || "FAY C. LUAREZ EdD, PhD TM, CESO V",
          sds_designation: settings.sds_designation || "Schools Division Superintendent",
          jhs_coordinator_name: settings.jhs_coordinator_name || "MAURINE D. CUARIO",
          jhs_coordinator_designation: settings.jhs_coordinator_designation || "Teacher III / JHS Coordinator",
          shs_coordinator_name: settings.shs_coordinator_name || "DELLIE T. VIGONTE",
          shs_coordinator_designation: settings.shs_coordinator_designation || "Teacher III / SHS Coordinator",
        })
        .select()
        .single();

      if (error) throw error;
      return data as SchoolSettings;
    }
  },
};
