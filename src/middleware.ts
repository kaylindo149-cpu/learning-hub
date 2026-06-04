import { NextResponse, type NextRequest } from "next/server";
import {
  isValidLearningHubAuthToken,
  learningHubAuthCookieName
} from "@/lib/learningHubAuth";

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/slack/events" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname === "/favicon.ico"
  );
}

function isPageRequest(request: NextRequest) {
  return request.headers.get("accept")?.includes("text/html");
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(learningHubAuthCookieName)?.value;

  if (await isValidLearningHubAuthToken(token)) {
    return NextResponse.next();
  }

  if (!isPageRequest(request)) {
    return NextResponse.json({ error: "Password required." }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};
