import { cn } from "@/lib/utils";

/**
 * Decorative dotted git-graph: a main lane with a branch that arcs out and
 * merges back, over a scatter of dim pixels. Purely visual (echoes HydraDB's
 * pixel tree). Not interactive.
 */
export function GitGraphMotif({ className }: { className?: string }) {
  const mainNodes = [40, 110, 180, 250, 320, 380];
  const branchNodes = [180, 250];
  const scatter = Array.from({ length: 64 }, (_, i) => ({
    x: (i * 53) % 400,
    y: (i * 31) % 220,
    o: 0.04 + ((i * 7) % 10) / 90,
  }));

  return (
    <svg
      viewBox="0 0 400 220"
      fill="none"
      role="img"
      aria-label="Branching git graph"
      className={cn("h-auto w-full", className)}
    >
      {scatter.map((d, i) => (
        <rect
          key={i}
          x={d.x}
          y={d.y}
          width={2}
          height={2}
          fill="#ff4d2e"
          opacity={d.o}
        />
      ))}

      {/* main lane */}
      <line x1={20} y1={150} x2={400} y2={150} stroke="#3f3f46" strokeWidth={1.5} />
      {/* branch out + back */}
      <path
        d="M150 150 C 175 150, 175 80, 210 80 L 290 80 C 325 80, 325 150, 350 150"
        stroke="#ff4d2e"
        strokeWidth={1.5}
        opacity={0.85}
      />

      {mainNodes.map((x) => (
        <g key={`m${x}`}>
          <circle cx={x} cy={150} r={5} fill="#09090b" stroke="#71717a" strokeWidth={1.5} />
        </g>
      ))}
      {branchNodes.map((x) => (
        <circle key={`b${x}`} cx={x} cy={80} r={5} fill="#ff4d2e" />
      ))}
      {/* merge node highlight */}
      <circle cx={350} cy={150} r={6} fill="#09090b" stroke="#ff4d2e" strokeWidth={2} />
    </svg>
  );
}
