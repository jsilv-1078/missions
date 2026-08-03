import { NextRequest, NextResponse } from "next/server";
import { adminAuthorized } from "@/lib/admin";
import { createNewsStory, deleteNewsStory, listNewsStories } from "@/lib/db";
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

export async function GET(request: NextRequest) {
  const auth = adminAuthorized(request);
  if (!auth.ok) return NextResponse.json({error:auth.message},{status:auth.status});
  return NextResponse.json({stories:await listNewsStories()});
}

export async function POST(request: NextRequest) {
  const auth = adminAuthorized(request);
  if (!auth.ok) return NextResponse.json({error:auth.message},{status:auth.status});
  const body = await request.json() as Partial<NewArticleInput>;
  const error = validation(body);
  if (error) return NextResponse.json({error},{status:400});
  const story = await createNewsStory(body as NewArticleInput);
  return NextResponse.json({story},{status:201});
}

export async function DELETE(request: NextRequest) {
  const auth = adminAuthorized(request);
  if (!auth.ok) return NextResponse.json({error:auth.message},{status:auth.status});
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({error:"Missing story id"},{status:400});
  await deleteNewsStory(id);
  return NextResponse.json({deleted:true});
}
