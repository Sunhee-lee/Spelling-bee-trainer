"use client";

import { useEffect, useSyncExternalStore } from "react";

import type { AppState, Book } from "@/types";
import { store } from "@/store/store";

/**
 * Subscribe to the full app state and ensure the store is hydrated from
 * LocalStorage after mount. Returns the state plus a `hydrated` flag so the UI
 * can render a stable skeleton on the server / first paint and swap to real
 * data once persisted state is loaded (avoids hydration mismatches).
 */
export function useAppState(): { state: AppState; hydrated: boolean } {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  const hydrated = useSyncExternalStore(
    store.subscribe,
    store.isHydrated,
    () => false
  );

  useEffect(() => {
    store.hydrate();
  }, []);

  return { state, hydrated };
}

/** Subscribe to a single book by id (undefined until hydrated or if missing). */
export function useBook(bookId: string): {
  book: Book | undefined;
  hydrated: boolean;
} {
  const { state, hydrated } = useAppState();
  return { book: state.books.find((b) => b.id === bookId), hydrated };
}

/** The action surface. Methods are stable (bound to the singleton). */
export function useActions() {
  return store;
}
