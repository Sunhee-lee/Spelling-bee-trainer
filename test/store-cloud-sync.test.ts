import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppState } from "@/types";
import { VocabStore, type SyncStatus } from "@/store/store";
import { SupabaseRepository } from "@/storage/supabaseRepository";
import { LocalStorageRepository } from "@/storage/localStorageRepository";

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
  /** Report writes as succeeding but silently drop them (e.g. RLS SELECT gap). */
  swallowWrites = false;

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
  async flushNow(): Promise<boolean> {
    if (!this.buffered) return true;
    const state = this.buffered;
    this.buffered = null;
    if (this.failMode) {
      this.onSyncSettled?.(new Error("forced cloud failure"));
      return false;
    }
    if (!this.swallowWrites) this.cloudRef.value = structuredClone(state);
    this.onSyncSettled?.(null);
    return true; // reports success even if the write was swallowed
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

describe("book rename persistence (signed in)", () => {
  it("G: rename a book, refresh before cloud flush → new name kept", async () => {
    const { cloud, store } = await signedInWithSeed();
    const id = store.getSnapshot().books[0].id;

    store.renameBook(id, "Level 1 Words");
    expect(store.getSnapshot().books[0].name).toBe("Level 1 Words"); // immediate

    const after = await boot(cloud); // refresh before the debounced write fired
    expect(after.store.getSnapshot().books[0].name).toBe("Level 1 Words");
  });

  it("H: rename + cloud failure → error surfaced, restored from buffer on reload", async () => {
    const { cloud, store, repo } = await signedInWithSeed();
    const id = store.getSnapshot().books[0].id;

    const statuses: SyncStatus[] = [];
    store.subscribeSync((s) => statuses.push(s));

    repo.failMode = true;
    store.renameBook(id, "Renamed Offline");
    await repo.flushNow(); // fails

    expect(statuses.some((s) => !s.ok)).toBe(true); // toast trigger
    expect(cloud.value?.books[0].name).toBe("Basic 100"); // cloud NOT changed
    expect(
      window.localStorage.getItem("spelling-bee-trainer/pending")
    ).not.toBeNull(); // rename held in buffer

    const after = await boot(cloud); // reload → cloud can't clobber the rename
    expect(after.store.getSnapshot().books[0].name).toBe("Renamed Offline");
  });

  it("I: rename → retry succeeds → cloud updated and buffer cleared", async () => {
    const { cloud, store, repo } = await signedInWithSeed();
    const id = store.getSnapshot().books[0].id;

    repo.failMode = true;
    store.renameBook(id, "Retry Name");
    await repo.flushNow(); // fail
    expect(
      window.localStorage.getItem("spelling-bee-trainer/pending")
    ).not.toBeNull();

    repo.failMode = false;
    store.retrySync();
    await repo.flushNow(); // success

    expect(cloud.value?.books[0].name).toBe("Retry Name");
    expect(
      window.localStorage.getItem("spelling-bee-trainer/pending")
    ).toBeNull(); // cleared only after a confirmed write
  });

  it("J: rename + add + edit words together → all persist after refresh", async () => {
    const { cloud, store } = await signedInWithSeed();
    const id = store.getSnapshot().books[0].id;

    store.renameBook(id, "Combined");
    store.addWord(id, "alpha", "알파");
    const wid = store.getSnapshot().books[0].words[0].id;
    store.updateWord(id, wid, { word: "alphabet", meaning: "알파벳" });

    const after = await boot(cloud);
    const book = after.store.getSnapshot().books[0];
    expect(book.name).toBe("Combined");
    expect(book.words.map((w) => w.word)).toContain("alphabet");
  });

  it("two devices editing the same book stay consistent (last write wins, no dupes)", async () => {
    const cloud: CloudRef = { value: null };
    const a = await boot(cloud);
    await a.repo.flushNow(); // device A seeds the cloud
    const id = a.store.getSnapshot().books[0].id;

    a.store.renameBook(id, "From A");
    await a.repo.flushNow();
    expect(cloud.value?.books[0].name).toBe("From A");

    // Device B (separate local storage) loads → sees A's change, no conflict.
    window.localStorage.clear();
    const b = await boot(cloud);
    expect(b.store.getSnapshot().books[0].name).toBe("From A");

    b.store.renameBook(id, "From B");
    await b.repo.flushNow();
    expect(cloud.value?.books[0].name).toBe("From B");
    expect(cloud.value?.books.length).toBe(2); // upsert-by-id → no duplicate rows
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

  it("reports the error when the vocabulary_books upsert fails (rename path)", async () => {
    const repo = new SupabaseRepository(mockSupabase("vocabulary_books"), "u1");
    const settled: unknown[] = [];
    repo.onSyncSettled = (e) => settled.push(e);
    await repo.save(stateWithWord());
    await repo.flushNow();
    expect(settled).toHaveLength(1);
    expect(settled[0]).not.toBeNull(); // book upsert failure is not silent
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

describe("uploadDeviceDataToCloud (manual upload of this device's data)", () => {
  const STATE_KEY = "spelling-bee-trainer/state";

  it("pushes this device's local data to the cloud", async () => {
    const cloud: CloudRef = { value: null };
    const { store, repo } = await boot(cloud);
    await repo.flushNow(); // baseline seed synced (0 words)

    // Rich data sitting only in this device's LocalStorage (offline work).
    const local = structuredClone(store.getSnapshot());
    local.books[0].words.push({
      id: "wx",
      number: 1,
      word: "hello",
      meaning: "안녕",
      mastered: false,
      consecutiveCorrect: 0,
      level: 0,
      nextReviewTest: 0,
    });
    window.localStorage.setItem(STATE_KEY, JSON.stringify(local));

    const result = await store.uploadDeviceDataToCloud();
    expect(result).toBe("ok");
    expect(wordsOf(cloud.value!)).toContain("hello"); // reached the cloud
    expect(wordsOf(store.getSnapshot())).toContain("hello"); // and the live state
  });

  it("uploads data created while signed in (live state), even if the local key is empty", async () => {
    // Data created signed-in lives in the live state / pending buffer, NOT the
    // offline LocalStorage 'state' key. The upload must still find it.
    const { cloud, store, basicId } = await signedInWithSeed();
    store.addWord(basicId, "cloudword", "구름"); // in live state + pending buffer
    window.localStorage.removeItem(STATE_KEY); // the offline copy is empty

    const result = await store.uploadDeviceDataToCloud();
    expect(result).toBe("ok");
    expect(wordsOf(cloud.value!)).toContain("cloudword");
  });

  it("returns 'notPersisted' when the write 'succeeds' but the cloud stays empty", async () => {
    const { store, repo, basicId } = await signedInWithSeed();
    store.addWord(basicId, "ghostword", "유령");
    repo.swallowWrites = true; // e.g. an RLS SELECT gap: write ok, read-back empty
    expect(await store.uploadDeviceDataToCloud()).toBe("notPersisted");
  });

  it("returns 'empty' when this device has no words to upload", async () => {
    const cloud: CloudRef = { value: null };
    const { store } = await boot(cloud);
    // Local key holds only the seeded (word-less) books.
    window.localStorage.setItem(STATE_KEY, JSON.stringify(store.getSnapshot()));
    expect(await store.uploadDeviceDataToCloud()).toBe("empty");
  });

  it("returns 'error' when the cloud write fails (data stays buffered)", async () => {
    const cloud: CloudRef = { value: null };
    const { store, repo } = await boot(cloud);
    await repo.flushNow();

    const local = structuredClone(store.getSnapshot());
    local.books[0].words.push({
      id: "wy",
      number: 1,
      word: "world",
      meaning: "세계",
      mastered: false,
      consecutiveCorrect: 0,
      level: 0,
      nextReviewTest: 0,
    });
    window.localStorage.setItem(STATE_KEY, JSON.stringify(local));

    repo.failMode = true;
    expect(await store.uploadDeviceDataToCloud()).toBe("error");
    expect(cloud.value && wordsOf(cloud.value).includes("world")).toBeFalsy();
  });

  it("is a no-op ('offline') when signed out (LocalStorage repo)", async () => {
    const store = new VocabStore(new LocalStorageRepository());
    await store.hydrate();
    expect(await store.uploadDeviceDataToCloud()).toBe("offline");
  });
});
