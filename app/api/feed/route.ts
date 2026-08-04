import { NextRequest, NextResponse } from "next/server";
import { databaseConfigured, getFeedStories } from "@/lib/db";
import { cardHedgeConfigured } from "@/lib/cardhedge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requested = Number(request.nextUrl.searchParams.get("limit") ?? 30);
  const requestedOffset = Number(request.nextUrl.searchParams.get("offset") ?? 0);
  const limit = Math.min(30,Math.max(1,Number.isFinite(requested) ? requested : 12));
  const offset = Math.min(1000,Math.max(0,Number.isFinite(requestedOffset) ? requestedOffset : 0));
  const stories = await getFeedStories(limit,offset);
  return NextResponse.json({
    stories,
    meta:{
      databaseConfigured:databaseConfigured(),
      cardHedgeConfigured:cardHedgeConfigured(),
      marketShare:0.7,
      newsShare:0.3,
      offset,
      nextOffset:offset + stories.length,
      hasMore:stories.length === limit,
      generatedAt:new Date().toISOString(),
    },
  },{headers:{"Cache-Control":"private, max-age=30, stale-while-revalidate=120"}});
}
