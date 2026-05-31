"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Props {
  fetchedAt: string;
  fixturesLeft: number;
  competitionName: string;
  /** When true, hide the picks counter and disable the pick actions (e.g. before the season is halfway). */
  actionsDisabled?: boolean;
  onResetPicks: () => void;
  onSimulateAll: () => void;
}

export default function TopBar({ fetchedAt, fixturesLeft, competitionName, actionsDisabled = false, onResetPicks, onSimulateAll }: Props) {
  // The "updated" time is the viewer's local time, which depends on their locale
  // and timezone — formatting it during SSR mismatches the client and breaks
  // hydration. Compute it only after mount so server and first client render agree.
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  useEffect(() => {
    setUpdatedAt(new Date(fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, [fetchedAt]);

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur">
      <div className="flex items-baseline gap-3">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-fg transition hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          Footy Scenarios
        </Link>
        <span className="text-faint">/</span>
        <h1 className="text-lg font-semibold tracking-tight text-muted">{competitionName}</h1>
        <span className="font-mono text-[11px] text-faint" suppressHydrationWarning>
          updated {updatedAt ?? "—"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {!actionsDisabled && (
          <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-xs text-muted">
            {fixturesLeft} fixture{fixturesLeft === 1 ? "" : "s"} left to pick
          </span>
        )}
        <button
          type="button"
          onClick={onResetPicks}
          disabled={actionsDisabled}
          className="rounded-md border border-border px-3 py-1 text-xs text-muted hover:border-border-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted"
        >
          Reset picks
        </button>
        <button
          type="button"
          onClick={onSimulateAll}
          disabled={actionsDisabled}
          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-emerald-600"
        >
          Simulate all
        </button>
      </div>
    </header>
  );
}
