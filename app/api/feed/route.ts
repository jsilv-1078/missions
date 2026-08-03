import { NextRequest, NextResponse } from "next/server";
import { databaseConfigured, getFeedStories } from "@/lib/db";
import { cardHedgeConfigured } from "@/lib/cardhedge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requested = Number(request.nextUrl.searchParams.get("limit") ?? 30);
  const limit = Math.min(60,Math.max(1,Number.isFinite(requested) ? requested : 30));
  const stories = await getFeedStories(limit);
  return NextResponse.json({
    stories,
    meta:{
      databaseConfigured:databaseConfigured(),
      cardHedgeConfigured:cardHedgeConfigured(),
      marketShare:0.7,
      newsShare:0.3,
      generatedAt:new Date().toISOString(),
    },
  },{headers:{"Cache-Control":"private, max-age=30, stale-while-revalidate=120"}});
}
