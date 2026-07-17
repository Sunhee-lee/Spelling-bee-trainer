"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";

import { useTranslation } from "@/lib/i18n";

/**
 * Optional "listen" button for a word. The app ships no text-to-speech of its
 * own; this is a progressive enhancement that uses the browser's built-in
 * `speechSynthesis` when present, and renders nothing when it isn't (older
 * browsers / SSR). It's a real <button>, so the Learn page's global keyboard
 * handler ignores it, and it stops click propagation so tapping it never flips
 * the card.
 */
export function PronunciationButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  if (!supported) return null;

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech is a nice-to-have; ignore any failure.
    }
  };

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={t("learn.pronounce")}
      className="inline-flex size-11 items-center justify-center rounded-full border-2 border-border bg-card text-foreground shadow-sm outline-none transition-colors hover:bg-accent focus-visible:ring-4 focus-visible:ring-ring/40"
    >
      <Volume2 className="size-5" aria-hidden />
    </button>
  );
}
