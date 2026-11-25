import { supabase } from "../lib/supabase";
import type { Profile, UserRole, UserStatus } from "../types";

export interface CreateUserInput {
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
  department?: string | null;
  designation?: string | null;
  status?: UserStatus;
}

export interface UpdateUserInput {
  email?: string;
  full_name?: string;
  role?: UserRole;
  department?: string | null;
  designation?: string | null;
  status?: UserStatus;
  password?: string;
}

export interface UserFilters {
  role?: string;
  status?: string;
  search?: string;
  department?: string;
}

/**
 * Admin Service: Manages Super Admin user CRUD operations,
 * role delegation, and directory synchronization.
 */
export const adminService = {
  /**
   * Fetches all user profiles from Supabase with optional filters.
   */
  async fetchUsers(filters?: UserFilters): Promise<Profile[]> {
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });

    if (filters?.role && filters.role !== "ALL") {
      query = query.eq("role", filters.role);
    }
    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }
    if (filters?.department && filters.department !== "ALL") {
      query = query.ilike("department", `%${filters.department}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[adminService.fetchUsers] Error:", error);
      throw error;
    }

    let results = (data || []) as Profile[];

    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim().toLowerCase();
      results = results.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.designation?.toLowerCase().includes(term) ||
          u.department?.toLowerCase().includes(term)
      );
    }

    return results;
  },

  /**
   * Creates a new user profile and sets up auth credentials.
   * Invokes the secure database RPC `admin_create_user`.
   */
  async createUser(input: CreateUserInput): Promise<string> {
    const { data, error } = await supabase.rpc("admin_create_user", {
      p_email: input.email.trim().toLowerCase(),
      p_password: input.password || "FTNHS@2026",
      p_full_name: input.full_name.trim(),
      p_role: input.role,
      p_department: input.department?.trim() || null,
      p_designation: input.designation?.trim() || null,
      p_status: input.status || "Approved",
    });

    if (error) {
      console.warn("[adminService.createUser] RPC error, attempting direct insert fallback:", error);
      // Fallback direct insert if RPC permission issues arise
      const newId = crypto.randomUUID();
      const { error: insertErr } = await supabase.from("profiles").insert({
        id: newId,
        email: input.email.trim().toLowerCase(),
        full_name: input.full_name.trim(),
        role: input.role,
        department: input.department?.trim() || null,
        designation: input.designation?.trim() || null,
        status: input.status || "Approved",
        active: input.status === "Approved",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertErr) {
        throw new Error(insertErr.message || "Failed to create user profile.");
      }
      return newId;
    }

    return data as string;
  },

  /**
   * Updates an existing user's profile details and optional password.
   */
  async updateUser(userId: string, updates: UpdateUserInput): Promise<void> {
    const profileUpdates: Partial<Profile> & { updated_at: string; active?: boolean } = {
      updated_at: new Date().toISOString(),
    };

    if (updates.email !== undefined) profileUpdates.email = updates.email.trim().toLowerCase();
    if (updates.full_name !== undefined) profileUpdates.full_name = updates.full_name.trim();
    if (updates.role !== undefined) profileUpdates.role = updates.role;
    if (updates.department !== undefined) profileUpdates.department = updates.department?.trim() || null;
    if (updates.designation !== undefined) profileUpdates.designation = updates.designation?.trim() || null;
    if (updates.status !== undefined) {
      profileUpdates.status = updates.status;
      profileUpdates.active = updates.status === "Approved";
    }

    const { error } = await supabase.from("profiles").update(profileUpdates).eq("id", userId);

    if (error) {
      console.error("[adminService.updateUser] Error:", error);
      throw error;
    }

    // If password update requested, re-invoke admin_create_user to update hashed credentials
    if (updates.password && updates.password.length >= 6 && updates.email && updates.full_name && updates.role) {
      try {
        await supabase.rpc("admin_create_user", {
          p_email: updates.email,
          p_password: updates.password,
          p_full_name: updates.full_name,
          p_role: updates.role,
          p_department: updates.department || null,
          p_designation: updates.designation || null,
          p_status: updates.status || "Approved",
        });
      } catch (pwdErr) {
        console.warn("[adminService.updateUser] Password update via RPC error:", pwdErr);
      }
    }
  },

  /**
   * Approves or rejects a user registration.
   */
  async setUserStatus(userId: string, status: UserStatus, role?: UserRole): Promise<void> {
    const payload: { status: UserStatus; active: boolean; updated_at: string; role?: UserRole } = {
      status,
      active: status === "Approved",
      updated_at: new Date().toISOString(),
    };
    if (role) {
      payload.role = role;
    }

    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
    if (error) {
      console.error("[adminService.setUserStatus] Error:", error);
      throw error;
    }
  },

  /**
   * Deletes a user profile and credentials via RPC or direct cascade.
   */
  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.rpc("admin_delete_user", {
      p_user_id: userId,
    });

    if (error) {
      console.warn("[adminService.deleteUser] RPC error, attempting direct delete:", error);
      const { error: delErr } = await supabase.from("profiles").delete().eq("id", userId);
      if (delErr) {
        throw new Error(delErr.message || "Failed to delete user profile.");
      }
    }
  },
};
