"use client";

import { useState } from "react";
import Link from "next/link";
import { Cloud, CloudOff, CloudUpload, LogOut } from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";
import { store } from "@/store/store";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

/** Account / cloud-sync status and controls for the Settings page. */
export function AccountSection() {
  const { configured, loading, user, signOut } = useAuth();
  const { t } = useTranslation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<
    "ok" | "empty" | "error" | null
  >(null);

  async function handleUpload() {
    setUploading(true);
    setUploadResult(null);
    const result = await store.uploadDeviceDataToCloud();
    setUploading(false);
    setUploadOpen(false);
    // "offline" shouldn't happen here (button is signed-in only) — treat as error.
    setUploadResult(result === "offline" ? "error" : result);
  }

  const resultMessage =
    uploadResult === "ok"
      ? { text: t("account.uploadDone"), tone: "text-success" }
      : uploadResult === "empty"
        ? { text: t("account.uploadEmpty"), tone: "text-muted-foreground" }
        : uploadResult === "error"
          ? { text: t("account.uploadError"), tone: "text-destructive" }
          : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("account.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!configured ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CloudOff className="size-4" /> {t("account.notConfigured")}
          </p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">{t("account.checking")}</p>
        ) : user ? (
          <>
            <p className="flex items-center gap-2 text-sm font-bold text-success">
              <Cloud className="size-4" /> {t("account.syncedTitle")}
            </p>
            {user.email && (
              <p className="text-sm font-semibold">{user.email}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {t("account.syncedDesc")}
            </p>

            {/* Push this device's local data to the cloud on demand. */}
            <Button
              variant="outline"
              disabled={uploading}
              onClick={() => {
                setUploadResult(null);
                setUploadOpen(true);
              }}
            >
              <CloudUpload /> {uploading ? t("account.uploading") : t("account.uploadDevice")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t("account.uploadDeviceDesc")}
            </p>
            {resultMessage && (
              <p className={`text-xs font-semibold ${resultMessage.tone}`}>
                {resultMessage.text}
              </p>
            )}

            <Button variant="outline" onClick={() => void signOut()}>
              <LogOut /> {t("account.logout")}
            </Button>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm font-bold">
              <CloudOff className="size-4" /> {t("common.offlineMode")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("account.offlineDesc")}
            </p>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <Button asChild className="h-14 text-base sm:flex-1">
                <Link href="/login">{t("account.login")}</Link>
              </Button>
              <Button asChild variant="outline" className="h-14 text-base sm:flex-1">
                <Link href="/signup">{t("account.createAccount")}</Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <AlertDialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("account.uploadDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("account.uploadDialogBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={uploading}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={uploading}
              onClick={(e) => {
                e.preventDefault(); // keep the dialog open until the upload settles
                void handleUpload();
              }}
            >
              {uploading ? t("account.uploading") : t("account.uploadAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
