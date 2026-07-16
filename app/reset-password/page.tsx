"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/auth/AuthProvider";
import { useTranslation } from "@/lib/i18n";
import { AuthScreen } from "@/components/AuthScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const { updatePassword, configured } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    setBusy(true);
    setError(null);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace("/"), 1200);
  }

  return (
    <AuthScreen
      title={t("auth.resetTitle")}
      subtitle={t("auth.resetSubtitle")}
      footer={
        <Link href="/login" className="font-semibold text-primary underline">
          {t("auth.backToLogin")}
        </Link>
      }
    >
      {done ? (
        <p className="text-center text-sm font-semibold text-success">
          {t("auth.passwordUpdated")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t("auth.newPassword")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("auth.passwordHint")}
            </p>
          </div>
          {error && (
            <p className="text-sm font-semibold text-destructive">{error}</p>
          )}
          <Button type="submit" size="lg" disabled={busy || !configured}>
            {busy ? t("auth.updating") : t("auth.updatePassword")}
          </Button>
        </form>
      )}
    </AuthScreen>
  );
}
