/**
 * Subtle honeycomb branding.
 *
 * Two large brand-yellow hexagons anchored partially off the right edge (one
 * top, one bottom), drawn as inline SVG (no external assets) at 3–4% opacity
 * behind all content. It's fixed, non-interactive, and clipped to the viewport,
 * so it never adds scroll, affects layout, or touches text readability — it
 * just gives every page a faint, premium branded feel.
 *
 * Rendered once in the root layout and reused across all pages for consistency.
 */

// A flat-top regular hexagon in a 100×100 viewBox.
const HEX_POINTS = "98,50 74,91.57 26,91.57 2,50 26,8.43 74,8.43";

export function HoneycombBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute -right-12 -top-16 size-72 text-bee opacity-[0.04] sm:-right-20 sm:-top-24 sm:size-96"
      >
        <polygon points={HEX_POINTS} fill="currentColor" />
      </svg>
      <svg
        viewBox="0 0 100 100"
        className="absolute -bottom-28 -right-10 size-80 text-bee opacity-[0.03] sm:size-[28rem]"
      >
        <polygon points={HEX_POINTS} fill="currentColor" />
      </svg>
    </div>
  );
}
