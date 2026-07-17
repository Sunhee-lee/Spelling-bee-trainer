"use client";

import Link from "next/link";
import { Cloud, CloudOff, LogOut } from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Account / cloud-sync status and controls for the Settings page. */
export function AccountSection() {
  const { configured, loading, user, signOut } = useAuth();
  const { t } = useTranslation();

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
              <Button asChild className="h-13 flex-1">
                <Link href="/login">{t("account.login")}</Link>
              </Button>
              <Button asChild variant="outline" className="h-13 flex-1">
                <Link href="/signup">{t("account.createAccount")}</Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
