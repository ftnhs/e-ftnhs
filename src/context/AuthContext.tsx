import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import {
  supabase,
  signInWithIdentifierAndPassword,
  signOutUser,
  fetchUserProfile,
} from "../lib/supabase";
import type { Profile } from "../types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isPending: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  isSchoolHead: boolean;
  isNonTeaching: boolean;
  isTeaching: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync profile data from Supabase
  const syncProfile = useCallback(async (userId: string) => {
    try {
      const p = await fetchUserProfile(userId);
      setProfile(p);
    } catch (err) {
      console.error("[e-FTNHS] Error syncing profile:", err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await syncProfile(user.id);
    }
  }, [user, syncProfile]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!currentSession?.user) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        // Verify token authenticity with Supabase Auth server when online
        if (typeof navigator === "undefined" || navigator.onLine) {
          const {
            data: { user: verifiedUser },
            error: userErr,
          } = await supabase.auth.getUser();

          if (!mounted) return;

          if (userErr || !verifiedUser) {
            await supabase.auth.signOut({ scope: "local" });
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsLoading(false);
            return;
          }

          setSession(currentSession);
          setUser(verifiedUser);
          await syncProfile(verifiedUser.id);
        } else {
          // Offline PWA resilience: retain cached session while offline
          setSession(currentSession);
          setUser(currentSession.user);
          await syncProfile(currentSession.user.id);
        }
      } catch (err) {
        console.error("[e-FTNHS] Error initializing auth:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT" || !newSession?.user) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setSession(newSession);
      setUser(newSession.user);
      syncProfile(newSession.user.id).finally(() => {
        if (mounted) setIsLoading(false);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncProfile]);

  const handleLogin = async (identifier: string, password: string) => {
    await signInWithIdentifierAndPassword(identifier, password);
  };

  const handleLogout = async () => {
    await signOutUser();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const isPending = profile?.status === "Pending";
  const isApproved = profile?.status === "Approved";
  const isAdmin = profile?.role === "Super Admin";
  const isSchoolHead = profile?.role === "School Head";
  const isNonTeaching = profile?.role === "Non-Teaching";
  const isTeaching = profile?.role === "Teacher" || profile?.is_teaching === true || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isPending,
        isApproved,
        isAdmin,
        isSchoolHead,
        isNonTeaching,
        isTeaching,
        login: handleLogin,
        logout: handleLogout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
