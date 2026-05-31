interface Props {
  played: number;
  total: number;
}

/**
 * Shown for leagues that are less than halfway through. Predictions stay disabled
 * until then because with most of the season unplayed the projected table is
 * dominated by noise rather than anything realistic.
 */
export default function PredictionLockedBanner({ played, total }: Props) {
  const halfway = Math.ceil(total / 2);
  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-200">
      <span aria-hidden>🔒</span>
      <span>
        <span className="font-semibold">Predictions open at the halfway point.</span>{" "}
        {played} of {total} matches played — {Math.max(0, halfway - played)} to go.
      </span>
    </div>
  );
}
