"use client";

import { useMemo } from "react";

interface Props {
  history: number[];
  projection: number[];
  color: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function Sparkline({ history, projection, color, width = 220, height = 36, className }: Props) {
  const all = [...history, ...projection];
  if (all.length < 2) {
    return <div className={"flex h-[36px] items-center justify-center text-[9px] text-zinc-600 " + (className ?? "")}>—</div>;
  }
  const { historyD, projectionD } = useMemo(() => {
    const maxY = Math.max(1, ...all);
    const totalLen = history.length + Math.max(0, projection.length - 1);
    const xStep = totalLen > 1 ? width / (totalLen - 1) : width;

    const yFor = (v: number) => height - (v / maxY) * height;

    const histPts = history.map((v, i) => `${i * xStep},${yFor(v)}`);
    const histD = histPts.length > 0 ? "M" + histPts.join(" L") : "";

    // Projection x starts where history left off (projection[0] === lastHistoryAcc).
    const projOffset = Math.max(0, history.length - 1);
    const projPts = projection.map((v, i) => `${(projOffset + i) * xStep},${yFor(v)}`);
    const projD = projPts.length > 0 ? "M" + projPts.join(" L") : "";

    return { historyD: histD, projectionD: projD };
  }, [history, projection, all, width, height]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      {historyD && <path d={historyD} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />}
      {projectionD && (
        <path d={projectionD} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3 3" strokeLinejoin="round" strokeLinecap="round" />
      )}
    </svg>
  );
}
