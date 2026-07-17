"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

/** The (non-standard but widely supported) install prompt event. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** True when the app is already running as an installed / standalone PWA. */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes this legacy flag when launched from the home screen.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * "Install app" button for the header. Appears only when the browser signals
 * the app is installable (the `beforeinstallprompt` event fires) and hides
 * itself once installed — or immediately when already running standalone, or
 * on browsers that don't support installation (e.g. iOS Safari, where no
 * event fires so the button never renders).
 */
export function InstallButton() {
  const { t } = useTranslation();
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    const onBeforeInstall = (event: Event) => {
      // Keep the browser from showing its own mini-infobar; we drive the prompt.
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent) return null;

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    // The prompt event is single-use; drop it so the button hides after a
    // choice. If the user dismisses, the browser re-fires the event later.
    setInstallEvent(null);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={install}
      className="h-11 gap-1.5"
    >
      <Download /> {t("common.installApp")}
    </Button>
  );
}
