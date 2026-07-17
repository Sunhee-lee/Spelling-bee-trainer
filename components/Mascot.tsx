"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * The app mascot — a round, friendly honey bee ("동글이") drawn as inline SVG
 * (no external assets). Used wherever the brand character appears (headers and
 * auth screens). Decorative, so it's aria-hidden; the surrounding heading
 * carries the accessible name.
 *
 * The same character drives the app/favicon/PWA icons (see scripts that render
 * this shape onto the cream background), so the brand mark is consistent
 * everywhere.
 */
export function Mascot({ className }: { className?: string }) {
  const clip = useId();
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role="img"
      aria-hidden
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="32" cy="36" r="18" />
        </clipPath>
      </defs>
      {/* antennae */}
      <path d="M27 18 25 9" stroke="#1C1512" strokeWidth="2" strokeLinecap="round" />
      <path d="M37 18 39 9" stroke="#1C1512" strokeWidth="2" strokeLinecap="round" />
      <circle cx="25" cy="8" r="2.4" fill="#1C1512" />
      <circle cx="39" cy="8" r="2.4" fill="#1C1512" />
      {/* wings */}
      <ellipse
        cx="15"
        cy="30"
        rx="6"
        ry="9"
        fill="#CDE8F5"
        opacity="0.85"
        transform="rotate(-22 15 30)"
      />
      <ellipse
        cx="49"
        cy="30"
        rx="6"
        ry="9"
        fill="#CDE8F5"
        opacity="0.85"
        transform="rotate(22 49 30)"
      />
      {/* round body */}
      <circle cx="32" cy="36" r="18" fill="#F5C042" />
      <g clipPath={`url(#${clip})`}>
        <rect x="13" y="42" width="38" height="5" fill="#3A2E12" />
        <rect x="13" y="50" width="38" height="5" fill="#3A2E12" />
      </g>
      {/* face */}
      <circle cx="26" cy="31" r="2.6" fill="#1C1512" />
      <circle cx="38" cy="31" r="2.6" fill="#1C1512" />
      <path
        d="M27 36c2 2.6 8 2.6 10 0"
        stroke="#1C1512"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="20" cy="36" r="2.4" fill="#F4A6B0" />
      <circle cx="44" cy="36" r="2.4" fill="#F4A6B0" />
    </svg>
  );
}
