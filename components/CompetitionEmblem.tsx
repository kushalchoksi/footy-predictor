"use client";

import { useState } from "react";

interface Props {
  src: string;
  alt?: string;
  /** Outer tile size in px. The emblem sits inside with a little padding. */
  size?: number;
  className?: string;
}

/** Initials for the monogram fallback: first letters of the first and last words. */
function initialsFrom(text: string): string {
  const words = text.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * League/tournament emblems are a mix of local files and football-data.org marks
 * (pure-black line art, dark marks, colored logos, some already boxed in white).
 * Rendering each on a near-white "chip" keeps every one legible in both themes
 * without per-logo color inversion. If an image is missing or fails to load, we
 * fall back to an initials monogram so a broken image never shows.
 */
export default function CompetitionEmblem({ src, alt = "", size = 40, className }: Props) {
  const [failed, setFailed] = useState(false);

  const base =
    "inline-flex shrink-0 items-center justify-center rounded-md ring-1 ring-black/5 dark:ring-white/10 " +
    (className ?? "");

  if (failed || !src) {
    return (
      <span
        className={base + " bg-surface-2 font-mono font-bold uppercase tracking-tight text-muted select-none"}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
        role="img"
        aria-label={alt}
      >
        {initialsFrom(alt)}
      </span>
    );
  }

  return (
    <span className={base + " bg-white p-1"} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
