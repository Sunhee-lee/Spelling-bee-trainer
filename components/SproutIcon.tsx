import { cn } from "@/lib/utils";

/**
 * A friendly sprout drawn as inline SVG (no external assets), matching the flat
 * "동글이" mascot style. Used in the empty-state card so the graphic looks
 * identical on every device — unlike the 🌱 emoji, which each OS renders with
 * its own font. Decorative, so it's aria-hidden.
 */
export function SproutIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role="img"
      aria-hidden
    >
      {/* soil */}
      <ellipse cx="32" cy="55" rx="15" ry="4" fill="#E4C48E" />
      {/* stem */}
      <path
        d="M32 55 C32 44 31 38 31 33"
        stroke="#5AA34C"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      {/* leaves */}
      <path d="M31 35 C22 37 13 33 11 22 C22 21 30 26 31 35 Z" fill="#7FC96B" />
      <path d="M31 31 C40 32 50 27 52 16 C41 16 32 21 31 31 Z" fill="#98D97F" />
      {/* veins */}
      <path
        d="M30 34 C24 31 18 27 14 24"
        stroke="#4F9A44"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M31 31 C39 28 45 24 49 20"
        stroke="#4F9A44"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
