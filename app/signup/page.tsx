"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/auth/AuthProvider";
import { useTranslation } from "@/lib/i18n";
import { AuthScreen } from "@/components/AuthScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const { signUp, user, configured } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    setBusy(true);
    setError(null);
    const result = await signUp(email, password);
    setBusy(false);
    if (result.error) setError(result.error);
    // With email confirmation disabled, a session is created immediately and
    // the auth listener redirects via the effect above.
  }

  return (
    <AuthScreen
      title={t("auth.signupTitle")}
      subtitle={t("auth.signupSubtitle")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-primary underline">
            {t("auth.login")}
          </Link>
        </>
      }
    >
      {!configured && (
        <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          {t("auth.notConfigured")}
        </p>
      )}
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
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
        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={busy || !configured}>
          {busy ? t("auth.creatingAccount") : t("auth.signup")}
        </Button>
      </form>
      <Button asChild variant="ghost" size="sm">
        <Link href="/">{t("common.continueOffline")}</Link>
      </Button>
    </AuthScreen>
  );
}
