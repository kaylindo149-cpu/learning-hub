import { NextResponse } from "next/server";
import {
  readServerCapturedLinks,
  removeServerCapturedLinks
} from "@/lib/serverCapturedLinks";

export const runtime = "nodejs";

export async function GET() {
  const links = await readServerCapturedLinks();

  return NextResponse.json({ links });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === "string")
    : [];
  const links = await removeServerCapturedLinks(ids);

  return NextResponse.json({ links });
}
