"use client";

import { useEffect, useMemo, useState } from "react";

/** Reactively track the user's reduced-motion preference. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

const COLORS = [
  "var(--bee)",
  "var(--grass)",
  "var(--sky)",
  "var(--berry)",
  "var(--grape)",
  "var(--primary)",
];

/**
 * A short, subtle celebration overlay shown once when the result screen first
 * appears. `strong` (perfect score or a new master) adds a small confetti
 * burst; `calm` shows only a few gentle sparkles. Purely decorative:
 * pointer-events are disabled so it never blocks buttons or navigation, and it
 * removes itself after ~1.5s. Under prefers-reduced-motion it renders nothing
 * (the CSS keeps only a simple fade on the card itself).
 */
export function Celebration({ intensity }: { intensity: "calm" | "strong" }) {
  const reduced = usePrefersReducedMotion();
  const [gone, setGone] = useState(false);

  const pieces = useMemo(() => {
    const count = intensity === "strong" ? 28 : 0;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      dx: (Math.random() - 0.5) * 90,
      delay: Math.random() * 200,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 6,
      round: Math.random() > 0.5,
    }));
  }, [intensity]);

  const sparkles = useMemo(() => {
    const count = intensity === "strong" ? 6 : 4;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: 8 + Math.random() * 84,
      top: Math.random() * 55,
      delay: Math.random() * 400,
    }));
  }, [intensity]);

  useEffect(() => {
    const timer = setTimeout(() => setGone(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (reduced || gone) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-20 h-72 overflow-hidden"
    >
      {pieces.map((p) => {
        const style: Record<string, string | number> = {
          left: `${p.left}%`,
          width: p.size,
          height: p.size,
          backgroundColor: p.color,
          borderRadius: p.round ? "9999px" : "2px",
          animationDelay: `${p.delay}ms`,
          "--sbt-dx": `${p.dx}px`,
        };
        return (
          <span
            key={`c${p.id}`}
            className="sbt-confetti-piece absolute top-0 block"
            style={style as React.CSSProperties}
          />
        );
      })}
      {sparkles.map((s) => (
        <span
          key={`s${s.id}`}
          className="sbt-sparkle absolute text-lg"
          style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}ms` }}
        >
          ✨
        </span>
      ))}
    </div>
  );
}
