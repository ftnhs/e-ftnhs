import { createClient } from "@supabase/supabase-js";
import type { Profile } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.warn("[e-FTNHS] VITE_SUPABASE_URL is missing. Please configure .env.local.");
}

// Fallback anon key for local pre-configuration rendering without crashing
const effectiveAnonKey =
  supabaseAnonKey && supabaseAnonKey !== "paste_your_supabase_anon_key_here"
    ? supabaseAnonKey
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

export const supabase = createClient(
  supabaseUrl || "https://ndwwoxsgcegdqiyoipvj.supabase.co",
  effectiveAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  }
);

/**
 * Resolves an identifier (username or email) to an email address
 * using the shared database function `resolve_login_email` (shared with SMART Web Version).
 */
export async function resolveEmailFromIdentifier(identifier: string): Promise<string | null> {
  const trimmed = identifier.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.includes("@")) return trimmed;

  try {
    const { data, error } = await supabase.rpc("resolve_login_email", {
      p_identifier: trimmed,
    });
    if (error || !data) {
      console.warn("[e-FTNHS] resolve_login_email lookup result:", error || "Not found");
      return null;
    }
    return data as string;
  } catch (err) {
    console.error("[e-FTNHS] Error resolving login email:", err);
    return null;
  }
}

/**
 * Signs in using username or email + password (shared with SMART Web Version)
 */
export async function signInWithIdentifierAndPassword(identifier: string, password: string) {
  const email = await resolveEmailFromIdentifier(identifier);
  if (!email) {
    throw new Error("No account found matching that username or email address.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Initiates Google OAuth sign-in (legacy / optional)
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Signs out current user and clears local session cache
 */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * Fetches user profile by auth ID
 */
export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("[e-FTNHS] Error fetching profile:", error);
    return null;
  }
  return data as Profile;
}
