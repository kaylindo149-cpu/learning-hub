import { NextResponse } from "next/server";
import {
  patchServerArchiveState,
  readServerArchiveState
} from "@/lib/serverArchiveState";

export const runtime = "nodejs";

export async function GET() {
  const archiveState = await readServerArchiveState();

  return NextResponse.json(archiveState);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const archiveState = await patchServerArchiveState(body);

  return NextResponse.json(archiveState);
}
