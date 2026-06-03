"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";
import type { Competition } from "@/types";
import TrophyImage from "@/components/TrophyImage";

interface Props {
  competitions: Competition[];
  active: Competition | null;
  treatment?: string;
}

/**
 * Middle takeover layer (z-2): the trophy hero, anchored in the bottom-left
 * corner — in front of the flag but BEHIND the cards, so it reads as a
 * background element. Crossfades between competitions like the backdrop.
 */
export default function TrophyLayer({ competitions, active, treatment = "stadium" }: Props) {
  const mounted = useRef<Set<string>>(new Set());
  if (active) mounted.current.add(active.code);
  const mountedList = competitions.filter((c) => mounted.current.has(c.code));

  return (
    <div
      aria-hidden
      data-treatment={treatment}
      style={{ "--accent": active?.accent ?? "#888888" } as CSSProperties}
      className="tk-trophy-layer pointer-events-none fixed inset-0 z-[2] overflow-hidden"
    >
      <div className={"tk-pedestal" + (active ? " is-on" : "")} />
      {mountedList.map((c) => (
        <div key={c.code} className={"tk-trophy" + (active?.code === c.code ? " is-on" : "")}>
          <TrophyImage competition={c} />
        </div>
      ))}
    </div>
  );
}
