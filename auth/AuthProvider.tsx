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
  overwriteLocalLessonsFromCloud,
  reconcileLessonProgress,
} from "@/lib/lessonSync";
import { CloudMigrationDialog } from "@/components/CloudMigrationDialog";
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
  const [migration, setMigration] = useState<{
    localState: AppState;
    repo: SupabaseRepository;
    client: NonNullable<ReturnType<typeof getSupabase>>;
  } | null>(null);
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

    if (localHasData && cloud === null) {
      const localState = await local.load();
      if (localState) {
        setMigration({ localState, repo, client });
        return;
      }
    }
    await store.setRepository(repo);
    // Steady-state login: cloud is the source of truth; union-merge so nothing
    // is lost, then keep both in sync.
    configureLessonCloud(client, userId);
    await reconcileLessonProgress();
  }

  const uploadLocal = useCallback(async () => {
    if (!migration) return;
    await store.setRepository(migration.repo);
    await store.replaceAll(migration.localState);
    // First-login migration: push this device's local lesson progress up (the
    // cloud is empty, so reconcile uploads it all — same UX as word upload).
    configureLessonCloud(migration.client, migration.repo.userId);
    await reconcileLessonProgress();
    setMigration(null);
  }, [migration]);

  const startFresh = useCallback(async () => {
    if (!migration) return;
    await store.setRepository(migration.repo);
    // Start fresh: discard this device's local lesson progress in favour of the
    // (empty) cloud, matching the word "start fresh" choice.
    configureLessonCloud(migration.client, migration.repo.userId);
    await overwriteLocalLessonsFromCloud();
    setMigration(null);
  }, [migration]);

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
      <CloudMigrationDialog
        open={migration !== null}
        onUpload={uploadLocal}
        onStartFresh={startFresh}
      />
      <SyncStatusToast />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
