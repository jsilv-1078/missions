import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { FeedStory, MarketStory, NewArticleInput, NewsStory } from "./types";

type SqlClient = NeonQueryFunction<false, false>;
let sqlClient: SqlClient | null = null;
let schemaReady: Promise<void> | null = null;

function connectionString() {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.NEON_DATABASE_URL;
}

export function databaseConfigured() {
  return Boolean(connectionString());
}

export function getSql() {
  const url = connectionString();
  if (!url) throw new Error("Neon is not configured. Expected DATABASE_URL.");
  if (!sqlClient) sqlClient = neon(url);
  return sqlClient;
}

export function ensureSchema() {
  if (!schemaReady) schemaReady = initializeSchema().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function initializeSchema() {
  const sql = getSql();
  await sql.query([
    "CREATE TABLE IF NOT EXISTS market_stories (",
    "id TEXT PRIMARY KEY, card_id TEXT NOT NULL UNIQUE, story_kind TEXT NOT NULL,",
    "player TEXT NOT NULL, sport TEXT NOT NULL, headline TEXT NOT NULL, summary TEXT NOT NULL,",
    "card_title TEXT NOT NULL, image_url TEXT NOT NULL, grade TEXT NOT NULL,",
    "current_value NUMERIC(14,2) NOT NULL, change_7d NUMERIC(10,2) NOT NULL DEFAULT 0,",
    "change_30d NUMERIC(10,2) NOT NULL DEFAULT 0, sales_7d INTEGER NOT NULL DEFAULT 0,",
    "sales_30d INTEGER NOT NULL DEFAULT 0, confidence_grade TEXT NOT NULL DEFAULT 'N/A',",
    "freshness_days INTEGER NOT NULL DEFAULT 0, chart JSONB NOT NULL DEFAULT '[]'::jsonb,",
    "comps JSONB NOT NULL DEFAULT '[]'::jsonb, source_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),",
    "demo BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),",
    "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  ].join(" "));
  await sql.query([
    "CREATE TABLE IF NOT EXISTS news_stories (",
    "id TEXT PRIMARY KEY, article_url TEXT NOT NULL UNIQUE, source TEXT NOT NULL,",
    "headline TEXT NOT NULL, summary TEXT NOT NULL, image_url TEXT NOT NULL, player TEXT NOT NULL,",
    "sport TEXT NOT NULL, category TEXT NOT NULL, published_at TIMESTAMPTZ NOT NULL,",
    "related_card_id TEXT, status TEXT NOT NULL DEFAULT 'published', demo BOOLEAN NOT NULL DEFAULT FALSE,",
    "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  ].join(" "));
  await sql.query([
    "CREATE TABLE IF NOT EXISTS player_aliases (",
    "id BIGSERIAL PRIMARY KEY, canonical_name TEXT NOT NULL, cardhedge_name TEXT NOT NULL,",
    "news_provider_id TEXT, sport TEXT NOT NULL, team TEXT, UNIQUE(cardhedge_name, sport))",
  ].join(" "));
  await sql.query([
    "CREATE TABLE IF NOT EXISTS sync_runs (",
    "id BIGSERIAL PRIMARY KEY, source TEXT NOT NULL, status TEXT NOT NULL,",
    "records_seen INTEGER NOT NULL DEFAULT 0, records_written INTEGER NOT NULL DEFAULT 0,",
    "message TEXT, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), finished_at TIMESTAMPTZ)",
  ].join(" "));
  await sql.query("CREATE INDEX IF NOT EXISTS market_stories_updated_idx ON market_stories(updated_at DESC)");
  await sql.query("CREATE INDEX IF NOT EXISTS news_stories_published_idx ON news_stories(published_at DESC)");
  await sql.query("DELETE FROM market_stories WHERE demo=TRUE");
  await sql.query("DELETE FROM news_stories WHERE demo=TRUE");
  await sql.query(
    "UPDATE news_stories SET image_url=$1,updated_at=NOW() WHERE article_url=$2 AND image_url=$3",
    [
      "https://www.sportscollectorsdaily.com/wp-content/uploads/2026/07/IMG_20260730_134718262_HDR-1536x1152.jpg",
      "https://www.sportscollectorsdaily.com/thats-a-wrap-observations-as-the-nationals-annual-run-ends/",
      "https://www.sportscollectorsdaily.com/wp-content/uploads/2026/08/crowds-outside-stephens-convention-center-national-sports-collectors-convention.jpeg",
    ],
  );
  await sql.query([
    "DELETE FROM market_stories WHERE",
    "ABS(change_7d) > 200 OR ABS(change_30d) > 300 OR",
    "current_value < 0.5 OR current_value > 1000000 OR",
    "UPPER(confidence_grade) NOT IN ('A','B') OR freshness_days > 30",
  ].join(" "));
}

export async function upsertMarketStory(story: MarketStory, initialize = true) {
  if (initialize) await ensureSchema();
  await getSql().query([
    "INSERT INTO market_stories (id,card_id,story_kind,player,sport,headline,summary,card_title,image_url,grade,",
    "current_value,change_7d,change_30d,sales_7d,sales_30d,confidence_grade,freshness_days,chart,comps,source_updated_at,demo,updated_at)",
    "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19::jsonb,$20,$21,NOW())",
    "ON CONFLICT (card_id) DO UPDATE SET id=EXCLUDED.id,story_kind=EXCLUDED.story_kind,player=EXCLUDED.player,",
    "sport=EXCLUDED.sport,headline=EXCLUDED.headline,summary=EXCLUDED.summary,card_title=EXCLUDED.card_title,",
    "image_url=EXCLUDED.image_url,grade=EXCLUDED.grade,current_value=EXCLUDED.current_value,change_7d=EXCLUDED.change_7d,",
    "change_30d=EXCLUDED.change_30d,sales_7d=EXCLUDED.sales_7d,sales_30d=EXCLUDED.sales_30d,",
    "confidence_grade=EXCLUDED.confidence_grade,freshness_days=EXCLUDED.freshness_days,chart=EXCLUDED.chart,",
    "comps=EXCLUDED.comps,source_updated_at=EXCLUDED.source_updated_at,demo=EXCLUDED.demo,updated_at=NOW()",
  ].join(" "), [
    story.id, story.cardId, story.storyKind, story.player, story.sport, story.headline, story.summary,
    story.cardTitle, story.imageUrl, story.grade, story.currentValue, story.change7d, story.change30d,
    story.sales7d, story.sales30d, story.confidenceGrade, story.freshnessDays, JSON.stringify(story.chart),
    JSON.stringify(story.comps), story.updatedAt, story.demo,
  ]);
}

export async function deleteMarketStoriesExcept(cardIds: string[]) {
  await ensureSchema();
  if (!cardIds.length) return 0;
  const placeholders = cardIds.map((_,index) => "$" + (index + 1)).join(",");
  const deleted = await getSql().query(
    "DELETE FROM market_stories WHERE demo=FALSE AND card_id NOT IN (" + placeholders + ") RETURNING id",
    cardIds,
  );
  return deleted.length;
}

async function upsertNewsStory(story: NewsStory, initialize = true) {
  if (initialize) await ensureSchema();
  await getSql().query([
    "INSERT INTO news_stories (id,article_url,source,headline,summary,image_url,player,sport,category,published_at,related_card_id,status,demo,updated_at)",
    "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published',$12,NOW())",
    "ON CONFLICT (article_url) DO UPDATE SET source=EXCLUDED.source,headline=EXCLUDED.headline,summary=EXCLUDED.summary,",
    "image_url=EXCLUDED.image_url,player=EXCLUDED.player,sport=EXCLUDED.sport,category=EXCLUDED.category,",
    "published_at=EXCLUDED.published_at,related_card_id=EXCLUDED.related_card_id,status='published',demo=EXCLUDED.demo,updated_at=NOW()",
  ].join(" "), [
    story.id, story.articleUrl, story.source, story.headline, story.summary, story.imageUrl,
    story.player, story.sport, story.category, story.publishedAt, story.relatedCardId ?? null, story.demo,
  ]);
}

function marketRow(row: Record<string, unknown>): MarketStory {
  return {
    id:String(row.id), type:"market", storyKind:row.story_kind as MarketStory["storyKind"],
    player:String(row.player), sport:String(row.sport), headline:String(row.headline), summary:String(row.summary),
    cardId:String(row.card_id), cardTitle:String(row.card_title), imageUrl:String(row.image_url), grade:String(row.grade),
    currentValue:Number(row.current_value), change7d:Number(row.change_7d), change30d:Number(row.change_30d),
    sales7d:Number(row.sales_7d), sales30d:Number(row.sales_30d), confidenceGrade:String(row.confidence_grade),
    freshnessDays:Number(row.freshness_days), chart:Array.isArray(row.chart) ? row.chart.map(Number) : [],
    comps:Array.isArray(row.comps) ? row.comps as MarketStory["comps"] : [],
    updatedAt:new Date(String(row.updated_at)).toISOString(), demo:Boolean(row.demo),
  };
}

function newsRow(row: Record<string, unknown>): NewsStory {
  return {
    id:String(row.id), type:"news", player:String(row.player), sport:String(row.sport), category:String(row.category),
    headline:String(row.headline), summary:String(row.summary), imageUrl:String(row.image_url), source:String(row.source),
    articleUrl:String(row.article_url), publishedAt:new Date(String(row.published_at)).toISOString(),
    relatedCardId:row.related_card_id ? String(row.related_card_id) : undefined,
    updatedAt:new Date(String(row.updated_at)).toISOString(), demo:Boolean(row.demo),
  };
}

function interleave(markets: MarketStory[], news: NewsStory[]) {
  const output: FeedStory[] = [];
  let marketIndex = 0;
  let newsIndex = 0;
  while (marketIndex < markets.length || newsIndex < news.length) {
    for (let count = 0; count < 2 && marketIndex < markets.length; count += 1) output.push(markets[marketIndex++]);
    if (newsIndex < news.length) output.push(news[newsIndex++]);
  }
  return output;
}

export async function getFeedStories(limit = 30, offset = 0): Promise<FeedStory[]> {
  if (!databaseConfigured()) return [];
  try {
    await ensureSchema();
    const fetchLimit = Math.min(120,Math.max(1,offset + limit));
    const [markets, news] = await Promise.all([
      getSql().query("SELECT * FROM market_stories ORDER BY updated_at DESC LIMIT $1", [fetchLimit]),
      getSql().query("SELECT * FROM news_stories WHERE status='published' ORDER BY published_at DESC LIMIT $1", [fetchLimit]),
    ]);
    return interleave(markets.map(marketRow), news.map(newsRow)).slice(offset,offset + limit);
  } catch (error) {
    console.error("Pulse database read failed", error);
    return [];
  }
}

export async function createNewsStory(input: NewArticleInput) {
  await ensureSchema();
  const story: NewsStory = {
    id:"news-" + crypto.randomUUID(), type:"news", ...input,
    publishedAt:new Date(input.publishedAt).toISOString(), updatedAt:new Date().toISOString(), demo:false,
  };
  await upsertNewsStory(story);
  return story;
}

export async function listNewsStories() {
  await ensureSchema();
  return (await getSql().query("SELECT * FROM news_stories ORDER BY published_at DESC LIMIT 100")).map(newsRow);
}

export async function deleteNewsStory(id: string) {
  await ensureSchema();
  await getSql().query("DELETE FROM news_stories WHERE id=$1", [id]);
}

export async function beginSync(source: string) {
  await ensureSchema();
  const rows = await getSql().query("INSERT INTO sync_runs(source,status) VALUES($1,'running') RETURNING id", [source]);
  return Number(rows[0].id);
}

export async function finishSync(id: number, status: string, seen: number, written: number, message: string) {
  await getSql().query(
    "UPDATE sync_runs SET status=$2,records_seen=$3,records_written=$4,message=$5,finished_at=NOW() WHERE id=$1",
    [id,status,seen,written,message],
  );
}

export async function databaseHealth() {
  if (!databaseConfigured()) return { configured:false, connected:false };
  try {
    await ensureSchema();
    const rows = await getSql().query("SELECT NOW() AS now");
    return { configured:true, connected:true, serverTime:rows[0].now };
  } catch (error) {
    return { configured:true, connected:false, error:error instanceof Error ? error.message : "Unknown database error" };
  }
}
