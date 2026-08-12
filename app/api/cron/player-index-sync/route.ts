import { NextRequest, NextResponse } from "next/server";
import { syncPlayerIndexes } from "@/lib/cardhedge";
import { databaseHealth } from "@/lib/db";
import { PLAYER_INDEX_PILOTS } from "@/lib/player-index";

export const maxDuration = 90;
export const dynamic = "force-dynamic";

const MAX_INDEX_AGE_MS = 20 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({error:"CRON_SECRET is not configured"},{status:503});
  if (request.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }

  const database = await databaseHealth();
  const playerIndexes = "playerIndexes" in database ? database.playerIndexes : null;
  const latest = playerIndexes?.latest ? Date.parse(String(playerIndexes.latest)) : 0;
  const fresh = Number(playerIndexes?.count ?? 0) >= PLAYER_INDEX_PILOTS.length
    && Number.isFinite(latest)
    && Date.now() - latest < MAX_INDEX_AGE_MS;
  if (fresh) {
    return NextResponse.json({
      status:"skipped",message:"Player Index is already complete and fresh.",playerIndexes,
    });
  }

  const startedAt = Date.now();
  const requestId = request.headers.get("x-vercel-id") ?? crypto.randomUUID();
  console.info(JSON.stringify({
    level:"info",message:"Player Index retry started",requestId,route:"/api/cron/player-index-sync",
    existingCount:Number(playerIndexes?.count ?? 0),
  }));
  const result = await syncPlayerIndexes();
  const status = result.written === result.requested && result.errors.length === 0 ? "success" : "partial";
  console.info(JSON.stringify({
    level:status === "success" ? "info" : "warn",message:"Player Index retry completed",requestId,
    route:"/api/cron/player-index-sync",durationMs:Date.now() - startedAt,status,...result,
  }));
  return NextResponse.json({status,...result});
}
