import { NextRequest, NextResponse } from "next/server";
import { syncPlayerIndexes } from "@/lib/cardhedge";
import { databaseHealth } from "@/lib/db";
import { PLAYER_INDEX_DAILY_MINIMUM } from "@/lib/player-index";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({error:"CRON_SECRET is not configured"},{status:503});
  if (request.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }

  const database = await databaseHealth();
  const playerIndexes = "playerIndexes" in database ? database.playerIndexes : null;
  const selection = "playerIndexSelection" in database ? database.playerIndexSelection : null;
  const featuredOn = selection?.featuredOn ? new Date(String(selection.featuredOn)).toISOString().slice(0,10) : null;
  const today = new Date().toISOString().slice(0,10);
  const fresh = featuredOn === today && Number(selection?.count ?? 0) >= PLAYER_INDEX_DAILY_MINIMUM;
  if (fresh) {
    return NextResponse.json({
      status:"skipped",message:"Today's dynamic Player Index lineup is already complete.",playerIndexes,selection,
    });
  }

  const startedAt = Date.now();
  const requestId = request.headers.get("x-vercel-id") ?? crypto.randomUUID();
  console.info(JSON.stringify({
    level:"info",message:"Daily Player Index selection started",requestId,route:"/api/cron/player-index-sync",
    existingCount:Number(playerIndexes?.count ?? 0),
  }));
  const result = await syncPlayerIndexes();
  const status = result.written >= PLAYER_INDEX_DAILY_MINIMUM ? "success" : "partial";
  console.info(JSON.stringify({
    level:status === "success" ? "info" : "warn",message:"Daily Player Index selection completed",requestId,
    route:"/api/cron/player-index-sync",durationMs:Date.now() - startedAt,status,...result,
  }));
  return NextResponse.json({status,...result});
}
