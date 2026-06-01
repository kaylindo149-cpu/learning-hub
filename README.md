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

## How to run it later

Install the project packages, then start the local website:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.
