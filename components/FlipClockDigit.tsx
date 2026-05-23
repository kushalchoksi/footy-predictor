"use client";

import { useDrag } from "@use-gesture/react";
import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** Pixel height of the digit. Width auto-scales to ~0.7x height. */
  size?: number;
  /** Vertical px per +/-1 step while dragging. */
  stepPx?: number;
  /** aria-label for the digit. */
  label?: string;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export default function FlipClockDigit({
  value,
  onChange,
  min = 0,
  max = 9,
  disabled = false,
  size = 44,
  stepPx = 18,
  label,
}: Props) {
  const bump = (delta: number) => {
    if (disabled) return;
    const next = clamp(value + delta, min, max);
    if (next !== value) onChange(next);
  };

  const accum = useRef(0);
  const bind = useDrag(
    ({ delta: [, dy], last }) => {
      if (disabled) return;
      accum.current += dy;
      while (accum.current <= -stepPx) {
        accum.current += stepPx;
        bump(1);
      }
      while (accum.current >= stepPx) {
        accum.current -= stepPx;
        bump(-1);
      }
      if (last) accum.current = 0;
    },
    { filterTaps: true, pointer: { keys: false } },
  );

  // Brief flash on value change for the "flip" feel.
  const [pulseKey, setPulseKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      setPulseKey((k) => k + 1);
      prev.current = value;
    }
  }, [value]);

  return (
    <button
      type="button"
      {...bind()}
      onClick={() => bump(1)}
      onWheel={(e) => {
        if (disabled) return;
        if (e.deltaY < 0) bump(1);
        else if (e.deltaY > 0) bump(-1);
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "ArrowUp") { e.preventDefault(); bump(1); }
        else if (e.key === "ArrowDown") { e.preventDefault(); bump(-1); }
      }}
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      aria-label={label ?? `digit ${value}`}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      role="spinbutton"
      className={
        "relative inline-flex items-center justify-center overflow-hidden rounded-md border border-black/50 font-mono font-semibold text-zinc-100 select-none transition-shadow " +
        "bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.4)] " +
        (disabled
          ? "opacity-40 cursor-not-allowed"
          : "cursor-ns-resize hover:from-zinc-600 hover:to-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:ring-offset-1 focus:ring-offset-zinc-950")
      }
      style={{
        width: Math.round(size * 0.72),
        height: size,
        fontSize: Math.round(size * 0.62),
        touchAction: "none",
        lineHeight: 1,
      }}
    >
      <span
        key={pulseKey}
        className="block animate-flipclock"
        aria-hidden="true"
      >
        {value}
      </span>
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/60" aria-hidden="true" />
    </button>
  );
}
