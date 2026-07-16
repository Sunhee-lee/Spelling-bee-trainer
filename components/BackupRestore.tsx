"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";

import { useActions } from "@/store/useVocabStore";
import { useTranslation, type TKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Feedback = { kind: "success" | "error"; key: TKey } | null;

/**
 * Full-data backup: export the entire app state as JSON and restore it later.
 * Restoring replaces all current data, so it is gated behind a confirmation.
 */
export function BackupRestore() {
  const actions = useActions();
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingJson, setPendingJson] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  function handleBackup() {
    const blob = new Blob([actions.serialize()], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spelling-bee-backup.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setFeedback({ kind: "success", key: "backup.downloaded" });
  }

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    // Reset the input so choosing the same file again still fires onChange.
    event.target.value = "";
    if (!file) return;
    try {
      setPendingJson(await file.text());
    } catch {
      setFeedback({ kind: "error", key: "backup.readFail" });
    }
  }

  function confirmRestore() {
    if (pendingJson === null) return;
    const ok = actions.importBackup(pendingJson);
    setPendingJson(null);
    setFeedback(
      ok
        ? { kind: "success", key: "backup.restored" }
        : { kind: "error", key: "backup.invalid" }
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleBackup}>
          <Download /> {t("backup.exportBackup")}
        </Button>
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload /> {t("backup.restore")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {feedback && (
        <p
          className={
            feedback.kind === "success"
              ? "text-sm font-semibold text-success"
              : "text-sm font-semibold text-destructive"
          }
        >
          {t(feedback.key)}
        </p>
      )}

      <AlertDialog
        open={pendingJson !== null}
        onOpenChange={(open) => {
          if (!open) setPendingJson(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("backup.restoreTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("backup.restoreDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>
              {t("backup.restoreAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
