import { NextRequest, NextResponse } from "next/server";
import { adminAuthorized } from "@/lib/admin";
import { syncMarketData } from "@/lib/cardhedge";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = adminAuthorized(request);
  if (!auth.ok) return NextResponse.json({error:auth.message},{status:auth.status});
  try {
    return NextResponse.json(await syncMarketData());
  } catch (error) {
    return NextResponse.json({error:error instanceof Error ? error.message : "Market sync failed"},{status:502});
  }
}
