"use client";

import { useState } from "react";
import { CloudUpload, Sparkles } from "lucide-react";

import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CloudMigrationDialogProps {
  open: boolean;
  onUpload: () => Promise<void>;
  onStartFresh: () => Promise<void>;
}

/**
 * Shown once, on first login, when this device has local learning data but the
 * cloud account is empty. The user chooses whether to upload it. Cloud data is
 * never overwritten without this confirmation.
 */
export function CloudMigrationDialog({
  open,
  onUpload,
  onStartFresh,
}: CloudMigrationDialogProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("migration.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("migration.body")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-col sm:items-stretch sm:gap-2">
          <Button disabled={busy} onClick={() => run(onUpload)}>
            <CloudUpload /> {t("migration.upload")}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run(onStartFresh)}
          >
            <Sparkles /> {t("migration.startFresh")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
