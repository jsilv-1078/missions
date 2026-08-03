import { NextResponse } from "next/server";
import { databaseHealth } from "@/lib/db";
import { cardHedgeConfigured } from "@/lib/cardhedge";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = await databaseHealth();
  return NextResponse.json({
    ok:database.connected,
    database,
    cardHedge:{configured:cardHedgeConfigured()},
    admin:{configured:Boolean(process.env.ADMIN_TOKEN)},
    cron:{configured:Boolean(process.env.CRON_SECRET)},
    checkedAt:new Date().toISOString(),
  },{status:database.connected ? 200 : 503});
}
