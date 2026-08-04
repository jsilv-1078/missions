import { NextRequest, NextResponse } from "next/server";
import { adminAuthorized } from "@/lib/admin";
import { createNewsStory, deleteNewsStory, listNewsStories, updateNewsStory } from "@/lib/db";
import type { NewArticleInput } from "@/lib/types";

function validUrl(value: unknown) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validation(body: Partial<NewArticleInput>) {
  const required: Array<keyof NewArticleInput> = ["articleUrl","source","headline","summary","imageUrl","player","sport","category","publishedAt"];
  const missing = required.filter((field) => !String(body[field] ?? "").trim());
  if (missing.length) return "Missing fields: " + missing.join(", ");
  if (!validUrl(body.articleUrl) || !validUrl(body.imageUrl)) return "Article and image URLs must be valid HTTP URLs";
  if (Number.isNaN(new Date(String(body.publishedAt)).getTime())) return "Published date is invalid";
  return null;
}

function cleanInput(body: Partial<NewArticleInput>): NewArticleInput {
  const relatedCardId = String(body.relatedCardId ?? "").trim();
  return {
    articleUrl:String(body.articleUrl).trim(),source:String(body.source).trim(),
    headline:String(body.headline).trim(),summary:String(body.summary).trim(),
    imageUrl:String(body.imageUrl).trim(),player:String(body.player).trim(),
    sport:String(body.sport).trim(),category:String(body.category).trim(),
    publishedAt:new Date(String(body.publishedAt)).toISOString(),
    relatedCardId:relatedCardId || undefined,
  };
}

function databaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const duplicate = message.includes("duplicate key") || message.includes("unique constraint");
  return NextResponse.json(
    {error:duplicate ? "Another article already uses this article URL." : "The article could not be saved."},
    {status:duplicate ? 409 : 500},
  );
}

export async function GET(request: NextRequest) {
  const auth = adminAuthorized(request);
  if (!auth.ok) return NextResponse.json({error:auth.message},{status:auth.status});
  return NextResponse.json({stories:await listNewsStories()},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request: NextRequest) {
  const auth = adminAuthorized(request);
  if (!auth.ok) return NextResponse.json({error:auth.message},{status:auth.status});
  const body = await request.json() as Partial<NewArticleInput>;
  const error = validation(body);
  if (error) return NextResponse.json({error},{status:400});
  try {
    const story = await createNewsStory(cleanInput(body));
    return NextResponse.json({story},{status:201});
  } catch (saveError) {
    return databaseError(saveError);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = adminAuthorized(request);
  if (!auth.ok) return NextResponse.json({error:auth.message},{status:auth.status});
  const body = await request.json() as Partial<NewArticleInput> & { id?:string };
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({error:"Missing story id"},{status:400});
  const error = validation(body);
  if (error) return NextResponse.json({error},{status:400});
  try {
    const story = await updateNewsStory(id,cleanInput(body));
    if (!story) return NextResponse.json({error:"Article not found"},{status:404});
    return NextResponse.json({story});
  } catch (saveError) {
    return databaseError(saveError);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = adminAuthorized(request);
  if (!auth.ok) return NextResponse.json({error:auth.message},{status:auth.status});
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({error:"Missing story id"},{status:400});
  const deleted = await deleteNewsStory(id);
  if (!deleted) return NextResponse.json({error:"Article not found"},{status:404});
  return NextResponse.json({deleted:true});
}
