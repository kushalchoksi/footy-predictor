import { NextResponse } from "next/server";
import { getFixtures } from "@/lib/footballData";

export async function GET() {
  try {
    const fixtures = await getFixtures();
    return NextResponse.json({ fixtures });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
