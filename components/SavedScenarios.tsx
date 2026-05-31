"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export interface SavedScenario {
  name: string;
  hash: string;
  savedAt: string;
}

const STORAGE_KEY = "footy-scenarios:saved";

export function loadSaved(): SavedScenario[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSaved(items: SavedScenario[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface Props {
  refreshKey: number;
}

export default function SavedScenarios({ refreshKey }: Props) {
  const [items, setItems] = useState<SavedScenario[]>([]);

  useEffect(() => {
    setItems(loadSaved());
  }, [refreshKey]);

  function open(hash: string) {
    window.location.hash = hash;
  }

  function remove(name: string) {
    const next = items.filter((i) => i.name !== name);
    persistSaved(next);
    setItems(next);
  }

  if (items.length === 0) {
    return <p className="text-xs text-muted">No saved scenarios yet.</p>;
  }

  return (
    <ul className="space-y-1">
      {items.map((s) => (
        <li key={s.name} className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm">
          <button
            type="button"
            onClick={() => open(s.hash)}
            className="flex-1 text-left text-fg hover:text-emerald-600 dark:hover:text-emerald-300"
          >
            {s.name}
            <span className="ml-2 text-xs text-faint">{new Date(s.savedAt).toLocaleDateString()}</span>
          </button>
          <button
            type="button"
            onClick={() => remove(s.name)}
            className="flex items-center justify-center rounded p-0.5 text-faint hover:text-rose-500 dark:hover:text-rose-400"
            aria-label={`Delete ${s.name}`}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
