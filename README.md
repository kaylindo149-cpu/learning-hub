# Kaylin's Learning Hub

A beginner-friendly personal learning hub built with Next.js, TypeScript, and Tailwind CSS.

## What it does right now

- Shows a soft editorial homepage for saved learning links.
- Includes starter knowledge cards with thumbnails, categories, summaries, sources, and dates.
- Includes simple search and category filters.
- Captures links, sends them through a Gemini-powered processor, and saves generated cards locally in the browser.

## AI setup

Create `.env.local` from `.env.example`, then add your Gemini API key:

```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

## Slack link capture

The app can capture links from a Slack channel through Slack Events.

1. Create or open your Slack app at `api.slack.com/apps`.
2. Add `SLACK_SIGNING_SECRET` to `.env.local` from **Basic Information → App Credentials → Signing Secret**.
3. Add the bot event subscription `message.channels`. Slack requires the `channels:history` scope for public channel messages.
4. Invite the Slack app/bot to `#learning-hub`.
5. In **Event Subscriptions**, set the Request URL to:

```bash
https://your-public-app-url.com/api/slack/events
```

For local testing, expose the Next.js dev server with a tunnel, then use the tunnel URL plus `/api/slack/events`.

Optional but recommended:

```bash
SLACK_LEARNING_HUB_CHANNEL_ID=C012ABCDEF
SLACK_LEARNING_HUB_CATEGORY=Learn Later
```

When a Slack message in that channel contains one or more `http` or `https` links, the app stores them in a small local server queue. The Learning Hub page checks that queue every few seconds, imports the links into Captured Links, and then the existing AI flow turns them into saved cards.

To choose a manual tag/category from Slack, include it in the message:

```text
[AI] https://example.com/article
tag: Digital Culture https://example.com/article
category: Learning Science https://example.com/article
```

If you do not include a tag/category, the app uses `SLACK_LEARNING_HUB_CATEGORY`, or `Learn Later` when that variable is not set. The Slack tag should match a tag you created in **manage tags** so it appears in the app filters.

On Vercel, use Upstash Redis or Vercel KV for the Slack queue:

```bash
UPSTASH_REDIS_REST_URL=your-upstash-rest-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
```

## Deploy to Vercel

1. Commit and push the latest code to GitHub:

```bash
git add .
git commit -m "Add category management"
git push origin main
```

2. In Vercel, import the GitHub repo `learning-hub`, or open the existing project if it is already connected.
3. Set these environment variables in **Project Settings → Environment Variables**:

```bash
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_LEARNING_HUB_CHANNEL_ID=your-slack-channel-id
SLACK_LEARNING_HUB_CATEGORY=Learn Later
UPSTASH_REDIS_REST_URL=your-upstash-rest-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
```

Only `GEMINI_API_KEY` is required for normal link summarizing. Slack variables are needed only if you use Slack capture.

4. Deploy. If the project is connected to GitHub, every push to `main` will trigger a Vercel production deployment.

## How to run it later

Install the project packages, then start the local website:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.
