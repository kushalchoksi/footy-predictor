"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import type { Competition } from "@/types";

interface Props {
  competitions: Competition[];
  active: Competition | null;
  treatment?: string;
}

/**
 * Backmost takeover layer (z-1): base page colour, the full-bleed backdrop image
 * (country/region flag), a legibility scrim, and an accent-tinted vignette.
 *
 * Backdrop images are lazy-mounted on first hover (so the default page never
 * downloads a dozen full-bleed images) and then kept mounted, so switching
 * between competitions is an instant crossfade.
 */
export default function TakeoverBackdrop({ competitions, active, treatment = "stadium" }: Props) {
  const mounted = useRef<Set<string>>(new Set());
  if (active) mounted.current.add(active.code);
  const mountedList = competitions.filter((c) => mounted.current.has(c.code));

  return (
    <div
      aria-hidden
      data-treatment={treatment}
      style={{ "--accent": active?.accent ?? "#888888" } as CSSProperties}
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
    >
      {/* Default (no hover) state: just the normal page colour. */}
      <div className="absolute inset-0 bg-bg" />

      {/* Backdrop image — country/region flag. */}
      {mountedList.map((c) => (
        <Image
          key={c.code}
          src={c.flagUrl}
          alt=""
          fill
          sizes="100vw"
          className={"tk-backdrop object-cover" + (active?.code === c.code ? " is-on" : "")}
        />
      ))}

      {/* Legibility + drama. */}
      <div
        className={
          "tk-scrim absolute inset-0 transition-opacity duration-500 " +
          (active ? "opacity-100" : "opacity-0")
        }
      />
      <div
        className={
          "tk-vignette absolute inset-0 transition-opacity duration-500 " +
          (active ? "opacity-100" : "opacity-0")
        }
      />
    </div>
  );
}
