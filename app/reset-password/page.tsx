"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/auth/AuthProvider";
import { AuthScreen } from "@/components/AuthScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const { updatePassword, configured } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
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
      title="Choose a new password"
      subtitle="Open this page from your reset email link"
      footer={
        <Link href="/login" className="font-semibold text-primary underline">
          Back to log in
        </Link>
      }
    >
      {done ? (
        <p className="text-center text-sm font-semibold text-success">
          Password updated. Taking you to the app…
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              At least 6 characters.
            </p>
          </div>
          {error && (
            <p className="text-sm font-semibold text-destructive">{error}</p>
          )}
          <Button type="submit" size="lg" disabled={busy || !configured}>
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
    </AuthScreen>
  );
}
