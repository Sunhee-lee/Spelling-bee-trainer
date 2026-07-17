// Minimal in-memory localStorage + window shim so the store's persistence code
// (which reads window.localStorage) runs under the Node test environment.

class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
  key(i: number): string | null {
    return Array.from(this.map.keys())[i] ?? null;
  }
}

const storage = new MemoryStorage();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;
g.localStorage = storage;
g.window = {
  localStorage: storage,
  addEventListener: () => {},
  removeEventListener: () => {},
};
