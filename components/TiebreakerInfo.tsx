import type { TiebreakerChainId, TiebreakerRuleId } from "@/types";
import { CHAINS } from "@/lib/tiebreakers/chains";

const RULE_LABELS: Record<TiebreakerRuleId, string> = {
  points: "Points",
  goalDifference: "Goal difference",
  goalsFor: "Goals scored",
  goalsAway: "Goals scored away",
  wins: "Number of wins",
  headToHead: "Head-to-head points",
  headToHeadGD: "Head-to-head goal difference",
  headToHeadGoals: "Head-to-head goals",
  playoffFlag: "Play-off",
};

/**
 * Compact panel listing, in order, how level teams are separated in this
 * competition's group / league standings. Shown under the tournament title so the
 * projected order isn't a mystery.
 */
export default function TiebreakerInfo({ chainId }: { chainId: TiebreakerChainId }) {
  const rules = CHAINS[chainId]?.rules ?? [];
  if (rules.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
        Tiebreakers
      </div>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
        {rules.map((rule, i) => (
          <li key={rule} className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-faint">{i + 1}.</span>
            <span>{RULE_LABELS[rule]}</span>
            {i < rules.length - 1 && <span className="text-faint" aria-hidden>→</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
