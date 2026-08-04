import { NextRequest, NextResponse } from "next/server";
import { adminAuthorized } from "@/lib/admin";
import { syncMarketData } from "@/lib/cardhedge";
import { getLatestSyncRun } from "@/lib/db";

export const maxDuration = 180;

export async function GET(request: NextRequest) {
  const auth = adminAuthorized(request);
  if (!auth.ok) return NextResponse.json({error:auth.message},{status:auth.status});
  return NextResponse.json(
    { run:await getLatestSyncRun("cardhedge") },
    { headers:{ "Cache-Control":"no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const auth = adminAuthorized(request);
  if (!auth.ok) return NextResponse.json({error:auth.message},{status:auth.status});
  const startedAt = Date.now();
  const requestId = request.headers.get("x-vercel-id") ?? crypto.randomUUID();
  console.info(JSON.stringify({ level:"info",message:"Card Hedge sync request started",requestId,route:"/api/admin/sync" }));
  try {
    const result = await syncMarketData();
    console.info(JSON.stringify({
      level:"info",message:"Card Hedge sync request completed",requestId,route:"/api/admin/sync",
      durationMs:Date.now() - startedAt,status:result.status,seen:result.seen,written:result.written,
    }));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Market sync failed";
    console.error(JSON.stringify({
      level:"error",message:"Card Hedge sync request failed",requestId,route:"/api/admin/sync",
      durationMs:Date.now() - startedAt,error:message,
    }));
    return NextResponse.json({error:message},{status:502});
  }
}
