/**
 * coordinatorshipService.ts
 * Supabase Data Layer for Coordinatorships & Ancillary Document Vault
 * School: Fermin Tayabas National High School (School ID: 302851)
 */

import { supabase } from "../lib/supabase";
import type {
  CoordinatorshipUnit,
  CoordinatorshipFile,
  FileCategory,
  FileVisibility,
} from "../types";

export interface UploadCoordinatorshipFilePayload {
  unit_id: string;
  uploader_id: string;
  title: string;
  description?: string;
  category: FileCategory;
  visibility: FileVisibility;
  file: File;
}

export async function fetchCoordinatorshipUnits(): Promise<CoordinatorshipUnit[]> {
  try {
    const { data: units, error: uError } = await supabase
      .from("coordinatorship_units")
      .select(`
        *,
        coordinator:profiles!coordinatorship_units_coordinator_id_fkey(id, full_name, email, department),
        files:coordinatorship_files(id)
      `)
      .order("unit_name", { ascending: true });

    if (uError) {
      console.error("fetchCoordinatorshipUnits error:", uError);
      return [];
    }

    return (units || []).map((u) => ({
      ...u,
      file_count: (u.files || []).length,
    })) as CoordinatorshipUnit[];
  } catch (err) {
    console.error("fetchCoordinatorshipUnits exception:", err);
    return [];
  }
}

export async function fetchUnitFiles(unitId: string): Promise<CoordinatorshipFile[]> {
  try {
    const { data, error } = await supabase
      .from("coordinatorship_files")
      .select(`
        *,
        uploader:profiles!coordinatorship_files_uploader_id_fkey(id, full_name, email)
      `)
      .eq("unit_id", unitId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchUnitFiles error:", error);
      return [];
    }

    return (data || []) as CoordinatorshipFile[];
  } catch (err) {
    console.error("fetchUnitFiles exception:", err);
    return [];
  }
}

export async function uploadCoordinatorshipFile(
  payload: UploadCoordinatorshipFilePayload
): Promise<{ success: boolean; data?: CoordinatorshipFile; error?: string }> {
  try {
    const { unit_id, uploader_id, title, description, category, visibility, file } = payload;

    // MIME type check: allow documents, spreadsheets, slides, PDFs, and images
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc|xlsx|xls|pptx|ppt|jpg|jpeg|png|webp)$/i)) {
      return {
        success: false,
        error: "Invalid file format. Please upload PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), or Image files.",
      };
    }

    // 25MB limit check
    if (file.size > 25 * 1024 * 1024) {
      return { success: false, error: "File exceeds maximum allowed size (25MB)." };
    }

    const sanitizedName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = `units/${unit_id}/${sanitizedName}`;

    // Upload to bucket
    const { error: uploadError } = await supabase.storage
      .from("coordinatorship-files")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabase.storage
      .from("coordinatorship-files")
      .getPublicUrl(filePath);

    // Insert database record
    const { data, error } = await supabase
      .from("coordinatorship_files")
      .insert({
        unit_id,
        uploader_id,
        file_name: file.name,
        file_url: publicUrlData.publicUrl,
        file_type: file.type || "application/octet-stream",
        file_size: file.size,
        title,
        description: description || null,
        category,
        visibility,
      })
      .select(`
        *,
        uploader:profiles!coordinatorship_files_uploader_id_fkey(id, full_name, email)
      `)
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to record file in database." };
    }

    return { success: true, data: data as CoordinatorshipFile };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error uploading file.";
    return { success: false, error: msg };
  }
}

export async function deleteCoordinatorshipFile(fileId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("coordinatorship_files")
      .delete()
      .eq("id", fileId);

    if (error) {
      console.error("deleteCoordinatorshipFile error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("deleteCoordinatorshipFile exception:", err);
    return false;
  }
}

export async function assignCoordinator(
  unitId: string,
  coordinatorId: string | null
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("coordinatorship_units")
      .update({ coordinator_id: coordinatorId })
      .eq("id", unitId);

    if (error) {
      console.error("assignCoordinator error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("assignCoordinator exception:", err);
    return false;
  }
}
