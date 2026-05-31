"use client";

import { useState } from "react";
import type { Scenario } from "@/types";
import { encodeScenario } from "@/lib/urlState";

interface Props {
  scenario: Scenario;
  onSave: (name: string) => void;
}

export default function ShareBar({ scenario, onSave }: Props) {
  const [copied, setCopied] = useState(false);
  const [saveName, setSaveName] = useState("");

  async function copyLink() {
    const encoded = encodeScenario(scenario);
    const url = encoded ? `${window.location.origin}${window.location.pathname}#${encoded}` : window.location.origin + window.location.pathname;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleSave() {
    if (!saveName.trim()) return;
    onSave(saveName.trim());
    setSaveName("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-border p-3">
      <button
        type="button"
        onClick={copyLink}
        className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-500"
      >
        {copied ? "Copied!" : "Copy share link"}
      </button>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Name this scenario"
          className="rounded border border-border bg-surface-2 px-2 py-1 text-sm text-fg placeholder-faint"
        />
        <button
          type="button"
          onClick={handleSave}
          className="rounded bg-surface-3 px-3 py-1 text-sm text-fg hover:bg-surface-2"
        >
          Save
        </button>
      </div>
    </div>
  );
}
