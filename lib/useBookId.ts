"use client";

import { usePathname } from "next/navigation";

/**
 * The book id for the current book route.
 *
 * The book pages live at the static `/book/*` routes (no dynamic segment, so
 * they're CDN-served with no serverless function), and next.config rewrites the
 * public `/books/:id/...` URLs onto them. The browser URL keeps the original
 * `/books/:id/...` path, so the id is read from there.
 */
export function useBookId(): string {
  const pathname = usePathname();
  const parts = pathname.split("/");
  return parts[1] === "books" ? parts[2] ?? "" : "";
}
