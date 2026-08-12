import { NextRequest, NextResponse } from "next/server";
import { syncMarketData } from "@/lib/cardhedge";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({error:"CRON_SECRET is not configured"},{status:503});
  if (request.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }
  const startedAt = Date.now();
  const requestId = request.headers.get("x-vercel-id") ?? crypto.randomUUID();
  console.info(JSON.stringify({
    level:"info",message:"Automatic daily market sync started",requestId,route:"/api/cron/market-sync",
  }));
  try {
    const result = await syncMarketData();
    console.info(JSON.stringify({
      level:"info",message:"Automatic daily market sync completed",requestId,route:"/api/cron/market-sync",
      durationMs:Date.now() - startedAt,status:result.status,seen:result.seen,written:result.written,
    }));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Market sync failed";
    console.error(JSON.stringify({
      level:"error",message:"Automatic daily market sync failed",requestId,route:"/api/cron/market-sync",
      durationMs:Date.now() - startedAt,error:message,
    }));
    return NextResponse.json({error:message},{status:502});
  }
}
