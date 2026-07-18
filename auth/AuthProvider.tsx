"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import type { AppState } from "@/types";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { store } from "@/store/store";
import { LocalStorageRepository } from "@/storage/localStorageRepository";
import { SupabaseRepository } from "@/storage/supabaseRepository";
import {
  clearLessonCloud,
  configureLessonCloud,
  reconcileLessonProgress,
} from "@/lib/lessonSync";
import { SyncStatusToast } from "@/components/SyncStatusToast";

type Result = { error?: string };

interface AuthContextValue {
  /** Whether Supabase env vars are present. When false the app is offline-only. */
  configured: boolean;
  loading: boolean;
  user: User | null;
  signUp: (email: string, password: string) => Promise<Result>;
  signIn: (email: string, password: string) => Promise<Result>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<Result>;
  updatePassword: (password: string) => Promise<Result>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const NOT_CONFIGURED: Result = {
  error: "Cloud sync is not configured on this build.",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  // Tracks which user id the store is currently wired to (avoids re-switching).
  const wiredUserId = useRef<string | null>(null);

  // Track the Supabase session.
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  // Switch the storage backend when the signed-in user changes.
  useEffect(() => {
    if (!supabase) return;
    const userId = session?.user?.id ?? null;

    if (userId) {
      if (wiredUserId.current === userId) return;
      wiredUserId.current = userId;
      void handleLogin(supabase, userId);
    } else if (wiredUserId.current !== null) {
      wiredUserId.current = null;
      clearLessonCloud();
      void store.setRepository(new LocalStorageRepository());
    }
  }, [session, supabase]);

  async function handleLogin(
    client: NonNullable<ReturnType<typeof getSupabase>>,
    userId: string
  ) {
    const repo = new SupabaseRepository(client, userId);
    const local = new LocalStorageRepository();
    const localHasData = local.hasData();

    let cloud: AppState | null = null;
    try {
      cloud = await repo.load();
    } catch {
      cloud = null;
    }

    // Always move the store onto the cloud so signed-in changes sync
    // automatically from here on.
    await store.setRepository(repo);
    configureLessonCloud(client, userId);

    // First login on an EMPTY cloud with local data → upload it automatically.
    // There's nothing in the cloud to overwrite, so no prompt is needed; this
    // is what makes cloud sync "just work" without a manual step.
    if (localHasData && cloud === null) {
      const localState = await local.load();
      if (localState) await store.replaceAll(localState);
    }

    await reconcileLessonProgress();
  }

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (email, password) => {
      if (!supabase) return NOT_CONFIGURED;
      const { error } = await supabase.auth.signUp({ email, password });
      return error ? { error: error.message } : {};
    },
    [supabase]
  );

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (email, password) => {
      if (!supabase) return NOT_CONFIGURED;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return error ? { error: error.message } : {};
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  const requestPasswordReset = useCallback<
    AuthContextValue["requestPasswordReset"]
  >(
    async (email) => {
      if (!supabase) return NOT_CONFIGURED;
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      return error ? { error: error.message } : {};
    },
    [supabase]
  );

  const updatePassword = useCallback<AuthContextValue["updatePassword"]>(
    async (password) => {
      if (!supabase) return NOT_CONFIGURED;
      const { error } = await supabase.auth.updateUser({ password });
      return error ? { error: error.message } : {};
    },
    [supabase]
  );

  return (
    <AuthContext.Provider
      value={{
        configured: isSupabaseConfigured,
        loading,
        user: session?.user ?? null,
        signUp,
        signIn,
        signOut,
        requestPasswordReset,
        updatePassword,
      }}
    >
      {children}
      <SyncStatusToast />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
