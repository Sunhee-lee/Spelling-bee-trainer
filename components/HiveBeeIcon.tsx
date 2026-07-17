import { cn } from "@/lib/utils";

/**
 * Empty-state illustration: the mascot bee (동글이) in front of a small
 * honeycomb whose upper cells are filled with honey. On-brand replacement for
 * the old sprout — the "empty hive that fills up as you add words" metaphor.
 * Flat inline SVG (no external assets, no OS-font emoji) so it renders
 * identically on every device. Decorative, so aria-hidden.
 */
export function HiveBeeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 116"
      className={cn("shrink-0", className)}
      role="img"
      aria-hidden
    >
      {/* Honeycomb backdrop — flat-top hexagons; upper cells filled with honey. */}
      <g transform="translate(0 3)" stroke="#E0A92E" strokeWidth="3" strokeLinejoin="round">
        <path d="M53.20,24.22L66.80,24.22L73.60,36.00L66.80,47.78L53.20,47.78L46.40,36.00Z" fill="#FFFDF6" />
        <path d="M53.20,-1.76L66.80,-1.76L73.60,10.02L66.80,21.80L53.20,21.80L46.40,10.02Z" fill="#FBBF24" />
        <path d="M53.20,50.20L66.80,50.20L73.60,61.98L66.80,73.76L53.20,73.76L46.40,61.98Z" fill="#FFFDF6" />
        <path d="M75.70,11.23L89.30,11.23L96.10,23.01L89.30,34.79L75.70,34.79L68.90,23.01Z" fill="#FBBF24" />
        <path d="M75.70,37.21L89.30,37.21L96.10,48.99L89.30,60.77L75.70,60.77L68.90,48.99Z" fill="#FFFDF6" />
        <path d="M30.70,11.23L44.30,11.23L51.10,23.01L44.30,34.79L30.70,34.79L23.90,23.01Z" fill="#FBBF24" />
        <path d="M30.70,37.21L44.30,37.21L51.10,48.99L44.30,60.77L30.70,60.77L23.90,48.99Z" fill="#FFFDF6" />
      </g>

      {/* Mascot bee (동글이), sitting in front of the hive. */}
      <g transform="translate(60 74) scale(1.4) translate(-32 -34)">
        <path d="M27 18 25 9" stroke="#1C1512" strokeWidth="2" strokeLinecap="round" />
        <path d="M37 18 39 9" stroke="#1C1512" strokeWidth="2" strokeLinecap="round" />
        <circle cx="25" cy="8" r="2.4" fill="#1C1512" />
        <circle cx="39" cy="8" r="2.4" fill="#1C1512" />
        <ellipse cx="15" cy="30" rx="6" ry="9" fill="#CDE8F5" opacity="0.9" transform="rotate(-22 15 30)" />
        <ellipse cx="49" cy="30" rx="6" ry="9" fill="#CDE8F5" opacity="0.9" transform="rotate(22 49 30)" />
        <circle cx="32" cy="36" r="18" fill="#F5C042" />
        <path d="M14 42h36M17 50h30" stroke="#3A2E12" strokeWidth="4.6" strokeLinecap="round" />
        <circle cx="26" cy="31" r="2.6" fill="#1C1512" />
        <circle cx="38" cy="31" r="2.6" fill="#1C1512" />
        <path d="M27 36c2 2.6 8 2.6 10 0" stroke="#1C1512" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="20" cy="36" r="2.4" fill="#F4A6B0" />
        <circle cx="44" cy="36" r="2.4" fill="#F4A6B0" />
      </g>
    </svg>
  );
}
