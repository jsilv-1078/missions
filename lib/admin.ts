import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export function adminAuthorized(request: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return { ok:false, status:503, message:"ADMIN_TOKEN is not configured" };
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : request.headers.get("x-admin-token") ?? "";
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  const ok = left.length === right.length && timingSafeEqual(left,right);
  return { ok, status:ok ? 200 : 401, message:ok ? "Authorized" : "Invalid admin token" };
}
