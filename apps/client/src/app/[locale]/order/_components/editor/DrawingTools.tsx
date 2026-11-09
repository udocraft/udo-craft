import { TOOL_ART as A } from "@/lib/canvas-colors";

export type DrawingTool = "pen" | "marker" | "neon" | "blur" | "arrow" | "eraser";

/**
 * Tool illustrations for the drawing tray: drawn upright, tip at the top, 48x132.
 * The tip (and a band on the body) takes the current ink colour, like a real marker cap.
 * Decorative: the button that wraps one supplies the accessible name.
 */
export function ToolArt({ tool, color }: { tool: DrawingTool; color: string }) {
  const id = `tool-${tool}`;
  const svg = (children: React.ReactNode) => (
    <svg viewBox="0 0 48 132" width="48" height="132" aria-hidden="true" focusable="false">
      <defs>
        {/* Left-to-right shading gives the barrels their roundness. */}
        <linearGradient id={`${id}-dark`} x1="0" x2="1">
          <stop offset="0" stopColor={A.bodyDarkEdge} />
          <stop offset="0.35" stopColor={A.bodyDark} />
          <stop offset="1" stopColor={A.bodyDarkEdge} />
        </linearGradient>
        <linearGradient id={`${id}-light`} x1="0" x2="1">
          <stop offset="0" stopColor={A.bodyLightEdge} />
          <stop offset="0.35" stopColor={A.bodyLight} />
          <stop offset="1" stopColor={A.bodyLightEdge} />
        </linearGradient>
        <linearGradient id={`${id}-metal`} x1="0" x2="1">
          <stop offset="0" stopColor={A.metalEdge} />
          <stop offset="0.4" stopColor={A.highlight} />
          <stop offset="1" stopColor={A.metalEdge} />
        </linearGradient>
        <linearGradient id={`${id}-wood`} x1="0" x2="1">
          <stop offset="0" stopColor={A.woodEdge} />
          <stop offset="0.4" stopColor={A.wood} />
          <stop offset="1" stopColor={A.woodEdge} />
        </linearGradient>
        <filter id={`${id}-glow`} x="-100%" y="-20%" width="300%" height="140%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <filter id={`${id}-soft`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      {children}
    </svg>
  );
  // A thin specular line down the barrel.
  const shine = <rect x="17" y="46" width="2" height="82" rx="1" fill={A.highlight} opacity="0.28" />;

  switch (tool) {
    case "pen":
      // Fineliner: wooden cone, graphite-thin ink point, dark barrel.
      return svg(
        <>
          <path d="M24 2 L27.5 14 H20.5 Z" fill={color} />
          <path d="M20.5 14 H27.5 L34 40 H14 Z" fill={`url(#${id}-wood)`} />
          <rect x="14" y="40" width="20" height="92" fill={`url(#${id}-dark)`} />
          <rect x="14" y="48" width="20" height="5" fill={color} />
          {shine}
        </>,
      );
    case "marker":
      // Chisel-tip marker: wide body, slanted felt tip.
      return svg(
        <>
          <path d="M17 6 L31 12 V26 H17 Z" fill={color} />
          <rect x="15" y="26" width="18" height="8" rx="1" fill={`url(#${id}-metal)`} />
          <path d="M15 34 H33 L38 50 V132 H10 V50 Z" fill={`url(#${id}-light)`} />
          <rect x="10" y="58" width="28" height="14" fill={color} />
          <rect x="14" y="52" width="2.5" height="76" rx="1.2" fill={A.highlight} opacity="0.7" />
        </>,
      );
    case "neon":
      // Glass tube with a lit core.
      return svg(
        <>
          <rect x="17" y="4" width="14" height="72" rx="7" fill={color} filter={`url(#${id}-glow)`} opacity="0.85" />
          <rect x="17" y="4" width="14" height="72" rx="7" fill={A.glass} stroke={color} strokeWidth="1.5" />
          <rect x="21.5" y="9" width="5" height="62" rx="2.5" fill={color} />
          <rect x="14" y="74" width="20" height="10" rx="2" fill={`url(#${id}-metal)`} />
          <rect x="12" y="84" width="24" height="48" fill={`url(#${id}-dark)`} />
          {shine}
        </>,
      );
    case "blur":
      // Spray can: nozzle, soft paint cloud, metal shoulder.
      return svg(
        <>
          <circle cx="24" cy="12" r="9" fill={color} filter={`url(#${id}-soft)`} opacity="0.75" />
          <rect x="20" y="16" width="8" height="12" rx="2" fill={`url(#${id}-dark)`} />
          <circle cx="24" cy="20" r="1.6" fill={color} />
          <path d="M12 44 Q12 30 24 28 Q36 30 36 44 Z" fill={`url(#${id}-metal)`} />
          <rect x="9" y="44" width="30" height="88" fill={`url(#${id}-light)`} />
          <rect x="9" y="60" width="30" height="22" fill={color} />
          <rect x="13" y="48" width="2.5" height="80" rx="1.2" fill={A.highlight} opacity="0.7" />
        </>,
      );
    case "arrow":
      // Arrow stamp: a flat ruler-like stick with the arrow it draws.
      return svg(
        <>
          <path d="M24 4 L34 18 H28 V34 H20 V18 H14 Z" fill={color} />
          <rect x="13" y="38" width="22" height="94" rx="2" fill={`url(#${id}-light)`} />
          {[48, 58, 68, 78, 88, 98, 108, 118].map((y, i) => (
            <rect key={y} x="13" y={y} width={i % 2 ? 6 : 10} height="1.5" fill={A.metalEdge} />
          ))}
        </>,
      );
    case "eraser":
      // Pencil-top eraser: rubber, metal ferrule, barrel. Never takes the ink colour.
      return svg(
        <>
          <path d="M14 22 Q14 6 24 6 Q34 6 34 22 V36 H14 Z" fill={A.eraser} stroke={A.eraserEdge} strokeWidth="1" />
          <rect x="13" y="36" width="22" height="14" fill={`url(#${id}-metal)`} />
          <rect x="13" y="40" width="22" height="1.5" fill={A.metalEdge} />
          <rect x="13" y="45" width="22" height="1.5" fill={A.metalEdge} />
          <rect x="14" y="50" width="20" height="82" fill={`url(#${id}-dark)`} />
          {shine}
        </>,
      );
  }
}
