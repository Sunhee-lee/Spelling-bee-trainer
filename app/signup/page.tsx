"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/auth/AuthProvider";
import { AuthScreen } from "@/components/AuthScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const { signUp, user, configured } = useAuth();
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
      setError("Password must be at least 6 characters.");
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
      title="Create your account"
      subtitle="Sign up to sync across your devices"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary underline">
            Log in
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">At least 6 characters.</p>
        </div>
        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={busy || !configured}>
          {busy ? "Creating account…" : "Sign up"}
        </Button>
      </form>
      <Button asChild variant="ghost" size="sm">
        <Link href="/">Continue offline</Link>
      </Button>
    </AuthScreen>
  );
}
