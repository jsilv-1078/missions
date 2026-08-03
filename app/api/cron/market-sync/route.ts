import { NextRequest, NextResponse } from "next/server";
import { syncMarketData } from "@/lib/cardhedge";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({error:"CRON_SECRET is not configured"},{status:503});
  if (request.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }
  try {
    return NextResponse.json(await syncMarketData());
  } catch (error) {
    return NextResponse.json({error:error instanceof Error ? error.message : "Market sync failed"},{status:502});
  }
}
