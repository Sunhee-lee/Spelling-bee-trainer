"use client";

import Link from "next/link";
import { Cloud, CloudOff, LogOut } from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Account / cloud-sync status and controls for the Settings page. */
export function AccountSection() {
  const { configured, loading, user, signOut } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account &amp; sync</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!configured ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CloudOff className="size-4" /> Cloud sync isn&rsquo;t configured on
            this build. Your data is saved on this device.
          </p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Checking sign-in…</p>
        ) : user ? (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold text-success">
              <Cloud className="size-4" /> Synced to the cloud
            </p>
            <p className="text-sm text-muted-foreground">
              Signed in as {user.email}. Your books, progress, and settings sync
              across your devices.
            </p>
            <Button variant="outline" onClick={() => void signOut()}>
              <LogOut /> Log out
            </Button>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CloudOff className="size-4" /> You&rsquo;re using the app offline
              on this device.
            </p>
            <p className="text-sm text-muted-foreground">
              Log in to back up and sync your progress across devices.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/signup">Create account</Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
