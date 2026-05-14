import { NextResponse } from "next/server";
import { getStandings } from "@/lib/footballData";

export async function GET() {
  try {
    const standings = await getStandings();
    return NextResponse.json({ standings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
