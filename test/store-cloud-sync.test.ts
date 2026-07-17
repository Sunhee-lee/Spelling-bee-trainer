import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppState } from "@/types";
import { VocabStore, type SyncStatus } from "@/store/store";
import { SupabaseRepository } from "@/storage/supabaseRepository";

/**
 * Regression tests for the signed-in data-loss bug: adding/editing words while
 * logged in must survive a page refresh, even if the cloud write is slow or
 * fails. The mock cloud mimics the real repo's debounce — save() buffers, and
 * the write only reaches "the cloud" on flushNow() (or fails when failMode).
 */

type CloudRef = { value: AppState | null };

class MockCloudRepo extends SupabaseRepository {
  private buffered: AppState | null = null;
  failMode = false;

  constructor(private readonly cloudRef: CloudRef, userId = "user-1") {
    super({} as unknown as SupabaseClient, userId);
  }

  async load(): Promise<AppState | null> {
    return this.cloudRef.value ? structuredClone(this.cloudRef.value) : null;
  }

  // Debounced: the change is NOT yet persisted to the cloud.
  async save(state: AppState): Promise<void> {
    this.buffered = structuredClone(state);
  }

  // The debounce firing (or a forced failure).
  async flushNow(): Promise<void> {
    if (!this.buffered) return;
    const state = this.buffered;
    this.buffered = null;
    if (this.failMode) {
      this.onSyncSettled?.(new Error("forced cloud failure"));
      return;
    }
    this.cloudRef.value = structuredClone(state);
    this.onSyncSettled?.(null);
  }
}

function wordsOf(state: AppState, bookIdx = 0): string[] {
  return state.books[bookIdx].words.map((w) => w.word);
}

/** A brand-new store + repo over the SAME cloud + same localStorage ("refresh"). */
async function boot(cloud: CloudRef) {
  const repo = new MockCloudRepo(cloud);
  const store = new VocabStore(repo);
  await store.hydrate();
  return { store, repo };
}

/** Sign-in baseline: seeded books synced to the cloud, buffer clean. */
async function signedInWithSeed() {
  const cloud: CloudRef = { value: null };
  const { store, repo } = await boot(cloud);
  await repo.flushNow(); // push the seeded books to the cloud
  return { cloud, store, repo, basicId: store.getSnapshot().books[0].id };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("signed-in persistence survives refresh", () => {
  it("A: add a word, refresh before the cloud flush → word kept", async () => {
    const { cloud, store, basicId } = await signedInWithSeed();

    store.addWord(basicId, "hello", "안녕");
    expect(wordsOf(store.getSnapshot())).toContain("hello"); // shown immediately

    // Refresh before the debounced cloud write fired.
    const after = await boot(cloud);
    expect(wordsOf(after.store.getSnapshot())).toContain("hello");
  });

  it("B: bulk import several words, refresh → all kept", async () => {
    const { cloud, store, basicId } = await signedInWithSeed();

    store.bulkImport(
      basicId,
      [
        { word: "apple", meaning: "사과" },
        { word: "banana", meaning: "바나나" },
        { word: "cherry", meaning: "체리" },
      ],
      "skip"
    );
    const after = await boot(cloud);
    expect(wordsOf(after.store.getSnapshot()).sort()).toEqual([
      "apple",
      "banana",
      "cherry",
    ]);
  });

  it("C: edit a word, refresh → edit kept", async () => {
    const { cloud, store, basicId } = await signedInWithSeed();
    store.addWord(basicId, "recieve", "받다");
    const wordId = store.getSnapshot().books[0].words[0].id;

    store.updateWord(basicId, wordId, { word: "receive", meaning: "받다" });
    const after = await boot(cloud);
    expect(wordsOf(after.store.getSnapshot())).toContain("receive");
    expect(wordsOf(after.store.getSnapshot())).not.toContain("recieve");
  });

  it("D: delete a word, refresh → deletion kept", async () => {
    const { cloud, store, basicId } = await signedInWithSeed();
    store.addWord(basicId, "keep", "유지");
    store.addWord(basicId, "remove", "삭제");
    const removeId = store
      .getSnapshot()
      .books[0].words.find((w) => w.word === "remove")!.id;

    store.deleteWord(basicId, removeId);
    const after = await boot(cloud);
    const list = wordsOf(after.store.getSnapshot());
    expect(list).toContain("keep");
    expect(list).not.toContain("remove");
  });

  it("E: add to the locked Supplemental List, refresh → word kept, still locked", async () => {
    const { cloud, store } = await signedInWithSeed();
    const supp = store.getSnapshot().books[1];
    expect(supp.locked).toBe(true);

    store.addWord(supp.id, "future", "미래");
    const after = await boot(cloud);
    const supp2 = after.store.getSnapshot().books[1];
    expect(supp2.words.map((w) => w.word)).toContain("future");
    expect(supp2.locked).toBe(true); // practice stays locked
  });

  it("creating a new book survives refresh", async () => {
    const { cloud, store } = await signedInWithSeed();
    store.addBook("My List");
    const after = await boot(cloud);
    expect(after.store.getSnapshot().books.map((b) => b.name)).toContain(
      "My List"
    );
  });
});

describe("failure handling & no-clobber guarantees", () => {
  it("F: cloud save failure → error surfaced, screen kept, no data loss on reload", async () => {
    const { cloud, store, repo, basicId } = await signedInWithSeed();

    const statuses: SyncStatus[] = [];
    store.subscribeSync((s) => statuses.push(s));

    repo.failMode = true;
    store.addWord(basicId, "ghost", "유령"); // optimistic UI update
    await repo.flushNow(); // sync attempt → fails

    expect(statuses.some((s) => !s.ok)).toBe(true); // user is told
    expect(wordsOf(store.getSnapshot())).toContain("ghost"); // not rolled back off-screen
    expect(cloud.value?.books[0].words.length ?? 0).toBe(0); // cloud NOT updated

    // Reload with a healthy backend → durable buffer restores it (no loss).
    const after = await boot(cloud);
    expect(wordsOf(after.store.getSnapshot())).toContain("ghost");
  });

  it("empty cloud never clobbers unsynced local data on reload", async () => {
    const cloud: CloudRef = { value: null }; // cloud stays empty (never flushed)
    const { store } = await boot(cloud);
    const basicId = store.getSnapshot().books[0].id;

    store.addWord(basicId, "keepme", "지켜"); // buffered only; no flush
    expect(cloud.value).toBeNull();

    const after = await boot(cloud); // cloud still empty
    expect(wordsOf(after.store.getSnapshot())).toContain("keepme");
  });

  it("a confirmed cloud write clears the durable buffer", async () => {
    const { cloud, store, repo, basicId } = await signedInWithSeed();
    store.addWord(basicId, "synced", "동기화");
    await repo.flushNow(); // success → buffer cleared

    expect(window.localStorage.getItem("spelling-bee-trainer/pending")).toBeNull();
    expect(cloud.value?.books[0].words.map((w) => w.word)).toContain("synced");
  });
});

describe("SupabaseRepository surfaces write errors (no silent success)", () => {
  function stateWithWord(): AppState {
    return {
      version: 2,
      books: [
        {
          id: "b1",
          name: "Basic 100",
          words: [
            {
              id: "w1",
              number: 1,
              word: "hello",
              meaning: "안녕",
              mastered: false,
              consecutiveCorrect: 0,
              level: 0,
              nextReviewTest: 0,
            },
          ],
          currentTest: 1,
          locked: false,
          unlockAfterBookId: null,
          builtIn: true,
          createdAt: 0,
        },
      ],
      settings: {
        questionsPerTest: 20,
        masterReviewRate: 0.1,
        shuffleQuestions: true,
        language: "ko",
      },
      streak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null },
    };
  }

  function mockSupabase(failTable?: string): SupabaseClient {
    const api = {
      from(table: string) {
        const fail = failTable === table;
        const result = fail
          ? { data: null, error: { message: `${table} failed` } }
          : { data: [], error: null };
        return {
          upsert: async () => result,
          select: () => ({
            eq: async () => result,
          }),
          delete: () => ({
            in: async () => result,
          }),
        };
      },
    };
    return api as unknown as SupabaseClient;
  }

  it("reports the error when the words upsert fails", async () => {
    const repo = new SupabaseRepository(mockSupabase("words"), "u1");
    const settled: unknown[] = [];
    repo.onSyncSettled = (e) => settled.push(e);
    await repo.save(stateWithWord());
    await repo.flushNow();
    expect(settled).toHaveLength(1);
    expect(settled[0]).not.toBeNull(); // a real error, not silent success
  });

  it("reports success (null) when every write succeeds", async () => {
    const repo = new SupabaseRepository(mockSupabase(), "u1");
    const settled: unknown[] = [];
    repo.onSyncSettled = (e) => settled.push(e);
    await repo.save(stateWithWord());
    await repo.flushNow();
    expect(settled).toEqual([null]);
  });
});
