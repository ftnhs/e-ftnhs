/**
 * memoService.ts
 * Supabase Data Layer for School Memos Broadcast Center
 * School: Fermin Tayabas National High School (School ID: 302851)
 */

import { supabase } from "../lib/supabase";
import type { SchoolMemo, MemoAcknowledgment, MemoPriority, MemoStatus } from "../types";

export interface CreateMemoPayload {
  author_id: string;
  memo_number: string;
  title: string;
  priority: MemoPriority;
  target_audience: string;
  content: string;
  status?: MemoStatus;
  attachment?: File | null;
}

export async function fetchMemos(currentUserId?: string): Promise<SchoolMemo[]> {
  try {
    const { data: memos, error: mError } = await supabase
      .from("memos")
      .select(`
        *,
        author:profiles!memos_author_id_fkey(id, full_name, email),
        acknowledgments:memo_acknowledgments(id, teacher_id, acknowledged_at)
      `)
      .order("published_at", { ascending: false });

    if (mError) {
      console.error("fetchMemos error:", mError);
      return [];
    }

    return (memos || []).map((m) => {
      const acks = (m.acknowledgments || []) as MemoAcknowledgment[];
      const isAcked = currentUserId ? acks.some((a) => a.teacher_id === currentUserId) : false;
      return {
        ...m,
        acknowledgment_count: acks.length,
        is_acknowledged: isAcked,
      };
    }) as SchoolMemo[];
  } catch (err) {
    console.error("fetchMemos exception:", err);
    return [];
  }
}

export async function fetchMemoDetails(memoId: string): Promise<SchoolMemo | null> {
  try {
    const { data, error } = await supabase
      .from("memos")
      .select(`
        *,
        author:profiles!memos_author_id_fkey(id, full_name, email),
        acknowledgments:memo_acknowledgments(
          id,
          memo_id,
          teacher_id,
          acknowledged_at,
          teacher:profiles!memo_acknowledgments_teacher_id_fkey(id, full_name, email, department)
        )
      `)
      .eq("id", memoId)
      .single();

    if (error || !data) {
      console.error("fetchMemoDetails error:", error);
      return null;
    }

    return data as SchoolMemo;
  } catch (err) {
    console.error("fetchMemoDetails exception:", err);
    return null;
  }
}

export async function createMemo(
  payload: CreateMemoPayload
): Promise<{ success: boolean; data?: SchoolMemo; error?: string }> {
  try {
    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;
    let attachmentSize = 0;

    // 1. Upload attachment if present
    if (payload.attachment) {
      const file = payload.attachment;
      const sanitizedName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filePath = `memos/${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from("memo-attachments")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        return { success: false, error: `Failed to upload attachment: ${uploadError.message}` };
      }

      const { data: publicUrlData } = supabase.storage
        .from("memo-attachments")
        .getPublicUrl(filePath);

      attachmentUrl = publicUrlData.publicUrl;
      attachmentName = file.name;
      attachmentSize = file.size;
    }

    // 2. Insert memo record
    const { data, error } = await supabase
      .from("memos")
      .insert({
        author_id: payload.author_id,
        memo_number: payload.memo_number,
        title: payload.title,
        priority: payload.priority,
        target_audience: payload.target_audience,
        content: payload.content,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        attachment_size: attachmentSize,
        status: payload.status || "Published",
      })
      .select(`
        *,
        author:profiles!memos_author_id_fkey(id, full_name, email)
      `)
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to create memo." };
    }

    return { success: true, data: data as SchoolMemo };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error creating memo.";
    return { success: false, error: msg };
  }
}

export async function acknowledgeMemo(
  memoId: string,
  teacherId: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from("memo_acknowledgments").insert({
      memo_id: memoId,
      teacher_id: teacherId,
    });

    if (error) {
      console.error("acknowledgeMemo error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("acknowledgeMemo exception:", err);
    return false;
  }
}

export async function deleteMemo(memoId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("memos").delete().eq("id", memoId);
    if (error) {
      console.error("deleteMemo error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("deleteMemo exception:", err);
    return false;
  }
}
