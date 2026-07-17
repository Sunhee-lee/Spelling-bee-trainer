"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";

import { store } from "@/store/store";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

/**
 * A small fixed toast shown when a cloud sync fails, so a signed-in user is
 * never told their change was saved when it wasn't. Offers a retry. The change
 * itself is kept in the store's durable local buffer, so nothing is lost while
 * this is visible. Also flushes any pending cloud write on page hide.
 */
export function SyncStatusToast() {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribeSync((status) => {
      setFailed(!status.ok);
      if (status.ok) setRetrying(false);
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
      className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-2xl border-2 border-destructive/40 bg-card px-4 py-3 shadow-lg"
    >
      <CloudOff className="size-5 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{t("sync.failedTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("sync.failedDesc")}</p>
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
