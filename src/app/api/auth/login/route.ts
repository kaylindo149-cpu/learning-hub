import { NextResponse } from "next/server";
import {
  createLearningHubAuthToken,
  getLearningHubPassword,
  learningHubAuthCookieName
} from "@/lib/learningHubAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  const expectedPassword = getLearningHubPassword();

  if (!expectedPassword) {
    return NextResponse.json({ ok: true });
  }

  if (password !== expectedPassword) {
    return NextResponse.json(
      { error: "That password is not right." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: learningHubAuthCookieName,
    value: await createLearningHubAuthToken(expectedPassword),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
