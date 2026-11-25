/**
 * rpmsCotService.ts
 * Supabase Data Layer for RPMS-PPST Portfolio & Classroom Observation Tool (COT)
 * School: Fermin Tayabas National High School (School ID: 302851)
 */

import { supabase } from "../lib/supabase";
import type {
  COTObservation,
  RPMSPortfolioItem,
} from "../types";

export interface CreateCOTObservationPayload {
  term_id: string;
  observer_id: string;
  teacher_id: string;
  subject_id?: string | null;
  section_id?: string | null;
  observation_date: string;
  observation_period: "Observation 1" | "Observation 2" | "Observation 3";
  indicator_ratings: Record<string, number>;
  post_conference_notes?: string;
  strengths?: string;
  areas_for_improvement?: string;
  status?: "Scheduled" | "Completed" | "Conferred";
}

export async function fetchCOTObservations(
  termId?: string,
  teacherId?: string
): Promise<COTObservation[]> {
  try {
    let query = supabase
      .from("cot_observations")
      .select(`
        *,
        teacher:profiles!cot_observations_teacher_id_fkey(id, full_name, email, department),
        observer:profiles!cot_observations_observer_id_fkey(id, full_name, email),
        subject:subjects_catalog!cot_observations_subject_id_fkey(id, subject_name, subject_code),
        section:sections!cot_observations_section_id_fkey(id, section_name, grade_level)
      `)
      .order("observation_date", { ascending: false });

    if (termId) query = query.eq("term_id", termId);
    if (teacherId) query = query.eq("teacher_id", teacherId);

    const { data, error } = await query;
    if (error) {
      console.error("fetchCOTObservations error:", error);
      return [];
    }

    return (data || []) as COTObservation[];
  } catch (err) {
    console.error("fetchCOTObservations exception:", err);
    return [];
  }
}

export async function createCOTObservation(
  payload: CreateCOTObservationPayload
): Promise<{ success: boolean; data?: COTObservation; error?: string }> {
  try {
    const ratings = Object.values(payload.indicator_ratings);
    const avg =
      ratings.length > 0
        ? Number(
            (
              ratings.reduce((sum, r) => sum + Number(r), 0) / ratings.length
            ).toFixed(2)
          )
        : 0.0;

    const { data, error } = await supabase
      .from("cot_observations")
      .insert({
        term_id: payload.term_id,
        observer_id: payload.observer_id,
        teacher_id: payload.teacher_id,
        subject_id: payload.subject_id || null,
        section_id: payload.section_id || null,
        observation_date: payload.observation_date,
        observation_period: payload.observation_period,
        indicator_ratings: payload.indicator_ratings,
        average_rating: avg,
        post_conference_notes: payload.post_conference_notes || null,
        strengths: payload.strengths || null,
        areas_for_improvement: payload.areas_for_improvement || null,
        status: payload.status || "Completed",
      })
      .select(`
        *,
        teacher:profiles!cot_observations_teacher_id_fkey(id, full_name, email, department),
        observer:profiles!cot_observations_observer_id_fkey(id, full_name, email),
        subject:subjects_catalog!cot_observations_subject_id_fkey(id, subject_name, subject_code),
        section:sections!cot_observations_section_id_fkey(id, section_name, grade_level)
      `)
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to schedule observation." };
    }

    return { success: true, data: data as COTObservation };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error saving observation.";
    return { success: false, error: msg };
  }
}

export async function fetchRPMSPortfolio(
  termId?: string,
  teacherId?: string
): Promise<RPMSPortfolioItem[]> {
  try {
    let query = supabase
      .from("rpms_portfolio_items")
      .select("*")
      .order("kra_number", { ascending: true })
      .order("objective_number", { ascending: true });

    if (termId) query = query.eq("term_id", termId);
    if (teacherId) query = query.eq("teacher_id", teacherId);

    const { data, error } = await query;
    if (error) {
      console.error("fetchRPMSPortfolio error:", error);
      return [];
    }

    return (data || []) as RPMSPortfolioItem[];
  } catch (err) {
    console.error("fetchRPMSPortfolio exception:", err);
    return [];
  }
}
