/**
 * Generate a unique id. Uses the platform crypto UUID when available and
 * falls back to a timestamp+random string for older environments.
 */
export function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
