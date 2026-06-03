"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import type { Competition } from "@/types";
import CompetitionEmblem from "@/components/CompetitionEmblem";

export type CardState = "idle" | "active" | "dim";

interface Props {
  competition: Competition;
  complete?: boolean;
  /** Driven by the home grid's hover takeover. */
  state?: CardState;
  onActivate?: (code: string) => void;
  onDeactivate?: () => void;
}

/**
 * A competition tile. Still a Next <Link> — clicking navigates to the
 * competition; hover/keyboard-focus drives the full-page takeover scene via
 * onActivate/onDeactivate. The `state` prop lets the grid lift the active card
 * (accent glow) and dim the rest.
 */
export default function CompetitionCard({
  competition,
  complete = false,
  state = "idle",
  onActivate,
  onDeactivate,
}: Props) {
  const activate = () => onActivate?.(competition.code);
  const stateClass = state === "active" ? "card--active" : state === "dim" ? "card--dim" : "";

  return (
    <Link
      href={`/competition/${competition.code}`}
      onMouseEnter={activate}
      onMouseLeave={onDeactivate}
      onFocus={activate}
      onBlur={onDeactivate}
      style={{ "--accent": competition.accent } as CSSProperties}
      className={
        "group relative flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 " +
        "transition duration-500 ease-out hover:border-border-strong hover:bg-surface-2 " +
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] " +
        stateClass
      }
    >
      <div className="flex items-center gap-3">
        {/* Decorative: the visible name beside it is the accessible label. */}
        <CompetitionEmblem src={competition.emblem} alt="" size={40} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-fg">{competition.name}</div>
          <div className="truncate text-xs text-muted">{competition.country}</div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-faint">{competition.season.label}</span>
        {complete && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            Complete
          </span>
        )}
      </div>
    </Link>
  );
}
