import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { appendServerCapturedLinks } from "@/lib/serverCapturedLinks";
import {
  extractCategoryFromSlackText,
  extractUrlsFromSlackText
} from "@/lib/slackLinks";
import type { CapturedLink } from "@/lib/capturedLinks";

export const runtime = "nodejs";

type SlackEventPayload = {
  type?: string;
  challenge?: string;
  event_id?: string;
  event?: {
    type?: string;
    subtype?: string;
    channel?: string;
    text?: string;
    ts?: string;
    event_ts?: string;
  };
};

function verifySlackRequest(headers: Headers, rawBody: string) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    return false;
  }

  const timestamp = headers.get("x-slack-request-timestamp");
  const slackSignature = headers.get("x-slack-signature");

  if (!timestamp || !slackSignature) {
    return false;
  }

  const timestampSeconds = Number(timestamp);

  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > 60 * 5
  ) {
    return false;
  }

  const baseString = `v0:${timestamp}:${rawBody}`;
  const signature = `v0=${createHmac("sha256", signingSecret)
    .update(baseString)
    .digest("hex")}`;
  const signatureBuffer = Buffer.from(signature);
  const slackSignatureBuffer = Buffer.from(slackSignature);

  return (
    signatureBuffer.length === slackSignatureBuffer.length &&
    timingSafeEqual(signatureBuffer, slackSignatureBuffer)
  );
}

function getCaptureDate(eventTs?: string) {
  if (!eventTs) {
    return new Date().toISOString();
  }

  const timestamp = Number(eventTs);

  if (!Number.isFinite(timestamp)) {
    return new Date().toISOString();
  }

  return new Date(timestamp * 1000).toISOString();
}

function getSlackEventCategory(text?: string) {
  const selectedCategory = text ? extractCategoryFromSlackText(text) : undefined;

  return selectedCategory ?? "";
}

function createCapturedLinksFromSlackEvent(
  payload: SlackEventPayload,
  urls: string[]
): CapturedLink[] {
  const event = payload.event;
  const capturedAt = getCaptureDate(event?.ts ?? event?.event_ts);
  const category = getSlackEventCategory(event?.text);
  const eventId = payload.event_id ?? event?.ts ?? `${Date.now()}`;

  return urls.map((url, index) => ({
    id: `slack-${eventId}-${index}`,
    url,
    category,
    status: "Pending",
    capturedAt
  }));
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifySlackRequest(request.headers, rawBody)) {
    return NextResponse.json({ error: "Invalid Slack signature." }, { status: 401 });
  }

  let payload: SlackEventPayload;

  try {
    payload = JSON.parse(rawBody) as SlackEventPayload;
  } catch {
    return NextResponse.json({ error: "Invalid Slack payload." }, { status: 400 });
  }

  if (payload.type === "url_verification") {
    return new NextResponse(payload.challenge ?? "", {
      headers: { "content-type": "text/plain" }
    });
  }

  if (payload.type !== "event_callback") {
    return NextResponse.json({ ok: true });
  }

  const event = payload.event;
  const expectedChannelId = process.env.SLACK_LEARNING_HUB_CHANNEL_ID?.trim();

  if (
    !event ||
    event.type !== "message" ||
    event.subtype ||
    !event.text ||
    (expectedChannelId && event.channel !== expectedChannelId)
  ) {
    return NextResponse.json({ ok: true });
  }

  const urls = extractUrlsFromSlackText(event.text);

  if (urls.length > 0) {
    await appendServerCapturedLinks(createCapturedLinksFromSlackEvent(payload, urls));
  }

  return NextResponse.json({ ok: true, captured: urls.length });
}
