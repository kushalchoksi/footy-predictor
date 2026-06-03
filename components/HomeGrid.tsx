"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Competition } from "@/types";
import CompetitionCard, { type CardState } from "@/components/CompetitionCard";
import TakeoverBackdrop from "@/components/TakeoverBackdrop";
import TrophyLayer from "@/components/TrophyLayer";

interface Props {
  competitions: Competition[];
  /** Codes of competitions whose season has fully finished. */
  completeCodes?: string[];
}

// Default takeover treatment. Hook for future alternates ("ultimate" gold
// ray-burst, "wash") which would key off the [data-treatment] attribute on the
// scene layers without touching this markup.
const TREATMENT = "stadium";

/**
 * Home grid + the FIFA-style hover takeover. Owns the active competition: cards
 * set it on hover/focus and clear it on leave/blur (the clear is debounced so
 * sliding between adjacent cards doesn't flicker the scene). The active comp
 * drives three layers — backdrop (z-1) and trophy (z-2), both fixed and behind
 * the content (z-3) so the trophy reads as a background hero.
 */
export default function HomeGrid({ competitions, completeCodes = [] }: Props) {
  const complete = useMemo(() => new Set(completeCodes), [completeCodes]);
  const leagues = useMemo(() => competitions.filter((c) => c.format === "league"), [competitions]);
  const tournaments = useMemo(
    () => competitions.filter((c) => c.format === "tournament"),
    [competitions],
  );

  const [activeCode, setActiveCode] = useState<string | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setActive = useCallback((code: string) => {
    if (clearTimer.current) {
      clearTimeout(clearTimer.current);
      clearTimer.current = null;
    }
    setActiveCode(code);
  }, []);

  const clearActive = useCallback(() => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setActiveCode(null), 80);
  }, []);

  // Cancel a pending clear if the grid unmounts (e.g. clicking a card navigates
  // away within the 80ms debounce window).
  useEffect(() => () => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
  }, []);

  const active = useMemo(
    () => competitions.find((c) => c.code === activeCode) ?? null,
    [competitions, activeCode],
  );
  const takeover = active != null;

  const stateOf = (code: string): CardState =>
    activeCode == null ? "idle" : code === activeCode ? "active" : "dim";

  const labelCls =
    "mb-3 text-[10px] font-semibold uppercase tracking-wider transition-colors duration-500 " +
    (takeover ? "text-white/70" : "text-faint");

  const renderCard = (c: Competition) => (
    <CompetitionCard
      key={c.code}
      competition={c}
      complete={complete.has(c.code)}
      state={stateOf(c.code)}
      onActivate={setActive}
      onDeactivate={clearActive}
    />
  );

  return (
    <div className="relative isolate min-h-screen">
      <TakeoverBackdrop competitions={competitions} active={active} treatment={TREATMENT} />
      <TrophyLayer competitions={competitions} active={active} treatment={TREATMENT} />

      <main className="relative z-[3] mx-auto max-w-5xl space-y-6 p-6">
        <header className="space-y-1">
          <h1
            className={
              "text-2xl font-bold transition-colors duration-500 " +
              (takeover ? "text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.5)]" : "text-fg")
            }
          >
            Footy Scenarios
          </h1>
          <p
            className={
              "text-sm transition-colors duration-500 " + (takeover ? "text-white/80" : "text-muted")
            }
          >
            Pick a competition to simulate.
          </p>
        </header>

        <div className="space-y-10">
          <section>
            <h2 className={labelCls}>Leagues</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {leagues.map(renderCard)}
            </div>
          </section>

          {tournaments.length > 0 && (
            <section>
              <h2 className={labelCls}>Tournaments</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tournaments.map(renderCard)}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
