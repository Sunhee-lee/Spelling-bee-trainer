"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/lib/i18n";

/**
 * "Back to exit" for the installed PWA home screen.
 *
 * A web app can't force-quit itself, so this uses the standard Android pattern:
 * on the home screen the device Back button is trapped by a history guard;
 * pressing it once shows a hint, and pressing it again within 2s lets the back
 * proceed — which, at the PWA's launch entry, closes the app.
 *
 * Only active in standalone (installed) display mode; in a normal browser tab
 * Back keeps its default behaviour. Mount once, on the home page.
 */
export function ExitOnBack() {
  const { t } = useTranslation();
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches === true ||
      // iOS Safari legacy flag.
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) return;

    let lastBack = 0;
    let hintTimer: ReturnType<typeof setTimeout> | undefined;

    // Trap entry so the first Back press lands here instead of leaving.
    window.history.pushState(null, "", window.location.href);

    const onPop = () => {
      const now = Date.now();
      if (now - lastBack < 2000) {
        // Second Back within the window → allow exit.
        setShowHint(false);
        try {
          window.close();
        } catch {
          // Ignore — most PWAs can't self-close; the history back below exits.
        }
        window.history.back();
        return;
      }
      lastBack = now;
      // Re-arm the guard (stay on home) and prompt.
      window.history.pushState(null, "", window.location.href);
      setShowHint(true);
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => setShowHint(false), 2000);
    };

    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      clearTimeout(hintTimer);
    };
  }, []);

  if (!showHint) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-full bg-foreground/90 px-4 py-2 text-sm font-semibold text-background shadow-lg"
    >
      {t("home.exitHint")}
    </div>
  );
}
