"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/auth/AuthProvider";
import { AuthScreen } from "@/components/AuthScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { signIn, user, configured } = useAuth();
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
    setBusy(true);
    setError(null);
    const result = await signIn(email, password);
    setBusy(false);
    if (result.error) setError(result.error);
    else router.replace("/");
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Log in to sync your progress"
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-primary underline">
            Create an account
          </Link>
        </>
      }
    >
      {!configured && (
        <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          Cloud sync is not configured on this build. You can still use the app
          offline.
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-primary underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={busy || !configured}>
          {busy ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <Button asChild variant="ghost" size="sm">
        <Link href="/">Continue offline</Link>
      </Button>
    </AuthScreen>
  );
}
