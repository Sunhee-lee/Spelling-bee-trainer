"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";
import { useTranslation } from "@/lib/i18n";
import { AuthScreen } from "@/components/AuthScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const { requestPasswordReset, configured } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await requestPasswordReset(email);
    setBusy(false);
    if (result.error) setError(result.error);
    else setSent(true);
  }

  return (
    <AuthScreen
      title={t("auth.forgotTitle")}
      subtitle={t("auth.forgotSubtitle")}
      footer={
        <Link href="/login" className="font-semibold text-primary underline">
          {t("auth.backToLogin")}
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="size-12 text-success" />
          <p className="font-semibold">{t("auth.checkEmail")}</p>
          <p className="text-sm text-muted-foreground">
            {t("auth.checkEmailDesc", { email })}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm font-semibold text-destructive">{error}</p>
          )}
          <Button type="submit" size="lg" disabled={busy || !configured}>
            {busy ? t("auth.sending") : t("auth.sendResetLink")}
          </Button>
        </form>
      )}
    </AuthScreen>
  );
}
