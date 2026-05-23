import type { Scenario, Outcome, OutcomeKind } from "@/types";

const VALID_KINDS: OutcomeKind[] = ["H", "D", "A"];

export function encodeScenario(s: Scenario): string {
  const parts: string[] = [];
  if (s.cluster.length > 0) {
    parts.push("c=" + [...s.cluster].sort((a, b) => a - b).join(","));
  }
  const ids = Object.keys(s.outcomes).map(Number).sort((a, b) => a - b);
  if (ids.length > 0) {
    const list = ids.map((id) => `${id}:${encodeOutcome(s.outcomes[id])}`).join(",");
    parts.push("o=" + list);
  }
  return parts.join("&");
}

export function decodeScenario(raw: string): Scenario {
  const out: Scenario = { cluster: [], outcomes: {} };
  if (!raw) return out;
  const cleaned = raw.startsWith("#") ? raw.slice(1) : raw;
  for (const segment of cleaned.split("&")) {
    if (segment.startsWith("c=")) {
      out.cluster = segment.slice(2).split(",").map(Number).filter((n) => Number.isFinite(n));
    } else if (segment.startsWith("o=")) {
      for (const entry of segment.slice(2).split(",")) {
        const [idStr, code] = entry.split(":");
        const id = Number(idStr);
        if (!Number.isFinite(id) || !code) continue;
        const outcome = decodeOutcome(code);
        if (outcome) out.outcomes[id] = outcome;
      }
    }
  }
  return out;
}

function encodeOutcome(o: Outcome): string {
  const prefix = o.locked ? "L" : "";
  const scoreSuffix =
    o.homeScore !== undefined && o.awayScore !== undefined
      ? `-${o.homeScore}-${o.awayScore}`
      : "";
  return prefix + o.kind + scoreSuffix;
}

function decodeOutcome(code: string): Outcome | null {
  let locked = false;
  let body = code;
  if (body.startsWith("L")) {
    locked = true;
    body = body.slice(1);
  }

  // Separate kind (first char) from optional score suffix (-N-M).
  const dashIdx = body.indexOf("-");
  const kindStr = dashIdx === -1 ? body : body.slice(0, dashIdx);
  const scorePart = dashIdx === -1 ? "" : body.slice(dashIdx + 1);

  if (!VALID_KINDS.includes(kindStr as OutcomeKind)) return null;

  const outcome: Outcome = { kind: kindStr as OutcomeKind, locked };

  if (scorePart) {
    // scorePart is "N-M"; split on the single dash.
    const parts = scorePart.split("-");
    if (parts.length === 2) {
      const hs = Number(parts[0]);
      const as_ = Number(parts[1]);
      if (Number.isInteger(hs) && hs >= 0 && Number.isInteger(as_) && as_ >= 0) {
        outcome.homeScore = hs;
        outcome.awayScore = as_;
      }
      // If parse fails, omit scores (malformed suffix treated as absent).
    }
    // If parts.length !== 2, malformed — omit scores.
  }

  return outcome;
}
