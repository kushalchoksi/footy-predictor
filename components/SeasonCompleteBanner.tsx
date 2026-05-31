interface Props {
  seasonLabel: string;
}

/**
 * Shown when every fixture has finished. The page stays fully interactive — there
 * is simply nothing left to pick, so this clarifies that the table is final.
 */
export default function SeasonCompleteBanner({ seasonLabel }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 border-b border-emerald-300 bg-emerald-50 px-4 py-2 text-xs text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-200">
      <span aria-hidden>🏆</span>
      <span>
        <span className="font-semibold">{seasonLabel} is complete</span> — showing the final table.
      </span>
    </div>
  );
}
