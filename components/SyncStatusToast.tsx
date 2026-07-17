"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";

import { store } from "@/store/store";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

/** Pull a readable message out of a Supabase/PostgREST error (or anything). */
function describeError(error: unknown): string | null {
  if (error == null) return null;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const e = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };
    const body = e.message || e.details || e.hint;
    const parts = [e.code, body].filter(Boolean);
    if (parts.length) return parts.join(": ");
  }
  try {
    return String(error);
  } catch {
    return null;
  }
}

/**
 * A small fixed toast shown when a cloud sync fails, so a signed-in user is
 * never told their change was saved when it wasn't. Shows the underlying error
 * (to diagnose backend/RLS problems) and offers a retry. The change itself is
 * kept in the store's durable local buffer, so nothing is lost while this is
 * visible. Also flushes any pending cloud write on page hide.
 */
export function SyncStatusToast() {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribeSync((status) => {
      setFailed(!status.ok);
      if (status.ok) {
        setRetrying(false);
        setDetail(null);
      } else {
        setDetail(describeError(status.error));
      }
    });
    // Best-effort: push buffered changes to the cloud before the page unloads.
    const flush = () => store.flushPendingSync();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    return () => {
      unsubscribe();
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  if (!failed) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-2xl border-2 border-destructive/40 bg-card px-4 py-3 shadow-lg"
    >
      <CloudOff className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{t("sync.failedTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("sync.failedDesc")}</p>
        {detail && (
          <p className="mt-1 break-words font-mono text-[11px] leading-snug text-destructive">
            {detail}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={retrying}
        onClick={() => {
          setRetrying(true);
          store.retrySync();
        }}
      >
        <RefreshCw className={retrying ? "animate-spin" : ""} /> {t("sync.retry")}
      </Button>
    </div>
  );
}
