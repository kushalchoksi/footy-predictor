"use client";

interface Props {
  fetchedAt: string;
  fixturesLeft: number;
  onResetPicks: () => void;
  onSimulateAll: () => void;
}

export default function TopBar({ fetchedAt, fixturesLeft, onResetPicks, onSimulateAll }: Props) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur">
      <div className="flex items-baseline gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Footy Scenarios — EPL</h1>
        <span className="font-mono text-[11px] text-faint">
          updated {new Date(fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-xs text-muted">
          {fixturesLeft} fixture{fixturesLeft === 1 ? "" : "s"} left to pick
        </span>
        <button
          type="button"
          onClick={onResetPicks}
          className="rounded-md border border-border px-3 py-1 text-xs text-muted hover:border-border-strong hover:text-fg"
        >
          Reset picks
        </button>
        <button
          type="button"
          onClick={onSimulateAll}
          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500"

        >
          Simulate all
        </button>
      </div>
    </header>
  );
}
