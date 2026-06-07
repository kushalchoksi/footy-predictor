"use client";

import { useEffect, useRef, useState } from "react";
import type { SimStrategy } from "@/lib/simulate";
import type { SimScope } from "@/lib/tournament/simulate";

export interface SimulateRequest {
  strategy: SimStrategy;
  scope: SimScope;
  /** true → "Simulate all" (replace unlocked picks); false → "Simulate rest" (keep picks). */
  overwrite: boolean;
}

interface Props {
  disabled?: boolean;
  /** Enables the "Simulate rest" action — only meaningful once the user has some picks. */
  hasPicks: boolean;
  /** Tournaments expose the group-stage / whole-tournament scope; leagues don't. */
  showScope?: boolean;
  onSimulate: (req: SimulateRequest) => void;
}

/**
 * GitHub-style split button: the primary action runs "Simulate all" with the
 * currently-selected strategy/scope, and the caret opens a menu to change the
 * strategy (betting market vs random), the scope (tournaments only), and to run
 * "Simulate rest" — which fills only the fixtures/ties the user hasn't set.
 */
export default function SimulateMenu({ disabled = false, hasPicks, showScope = false, onSimulate }: Props) {
  const [open, setOpen] = useState(false);
  const [strategy, setStrategy] = useState<SimStrategy>("market");
  const [scope, setScope] = useState<SimScope>("all");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function run(overwrite: boolean) {
    onSimulate({ strategy, scope: showScope ? scope : "all", overwrite });
    setOpen(false);
  }

  const btn = "bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-500 " +
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-emerald-600";

  return (
    <div className="relative" ref={ref}>
      <div className="flex">
        <button
          type="button"
          onClick={() => run(true)}
          disabled={disabled}
          className={"rounded-l-md px-3 py-1 " + btn}
        >
          Simulate all
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Simulation options"
          className={"rounded-r-md border-l border-emerald-700/60 px-2 py-1 " + btn}
        >
          <span aria-hidden className={"inline-block transition-transform " + (open ? "rotate-180" : "")}>▾</span>
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-60 rounded-md border border-border bg-surface p-2 text-xs shadow-lg"
        >
          <SectionLabel>Strategy</SectionLabel>
          <RadioRow
            checked={strategy === "market"}
            onClick={() => setStrategy("market")}
            label="Betting market"
            hint="Favours stronger sides"
          />
          <RadioRow
            checked={strategy === "random"}
            onClick={() => setStrategy("random")}
            label="Random"
            hint="Pure chance, no bias"
          />

          {showScope && (
            <>
              <SectionLabel>Scope</SectionLabel>
              <RadioRow
                checked={scope === "all"}
                onClick={() => setScope("all")}
                label="Whole tournament"
                hint="Groups + knockout bracket"
              />
              <RadioRow
                checked={scope === "groups"}
                onClick={() => setScope("groups")}
                label="Group stage only"
                hint="Leave the bracket alone"
              />
            </>
          )}

          <div className="my-2 border-t border-border" />

          <button
            type="button"
            role="menuitem"
            onClick={() => run(true)}
            className={"mb-1.5 w-full rounded-md px-3 py-1.5 " + btn}
          >
            Simulate all
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => run(false)}
            disabled={!hasPicks}
            className="w-full rounded-md border border-border px-3 py-1.5 text-muted hover:border-border-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted"
          >
            Simulate rest
          </button>
          <p className="px-1 pt-1 text-[10px] text-faint">
            {hasPicks ? "Keeps your current picks" : "No picks to keep yet"}
          </p>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
      {children}
    </div>
  );
}

function RadioRow({
  checked, onClick, label, hint,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      onClick={onClick}
      className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-surface-2"
    >
      <span aria-hidden className={"leading-5 " + (checked ? "text-emerald-500" : "text-faint")}>
        {checked ? "◉" : "○"}
      </span>
      <span className="min-w-0">
        <span className={checked ? "block text-fg" : "block text-muted"}>{label}</span>
        <span className="block text-[10px] text-faint">{hint}</span>
      </span>
    </button>
  );
}
