# Travel Companion AI

An AI road-trip companion, powered by Claude. It **knows the traveling people** — their ages, diets, interests and quirks — and plans the whole drive around them: the route, the stops, lunch and dinner, and where to sleep each night. Then, whenever you want something changed, you just ask.

All travel is assumed to be **by car**.

## What it does

- **Traveler profiles** — add everyone going on the trip (age, role, dietary needs, interests, notes like "gets carsick"). The AI plans around these specific people, not a generic tourist.
- **Trip planning** — give it origin, destination and dates; it produces a day-by-day driving itinerary with departure times, driving legs, rest breaks every couple of hours, lunch and dinner stops that respect every dietary preference, sights matched to the group's interests, and an overnight stay suggestion for each travel day.
- **Companion chat** — during planning or on the road, ask for anything: "make day 2 more relaxed", "we're running 2 hours late, fix today", "find a vegetarian lunch instead". The assistant updates the itinerary live via a tool call and the plan re-renders instantly.

Everything (travelers, trip, itinerary, chat) is stored in your browser's localStorage — no database needed.

## Getting started

```bash
npm install
cp .env.example .env.local   # then paste your Anthropic API key
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (get one at https://platform.claude.com) |

## Hosting on Cloudflare Workers

The app is set up for Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare) (`wrangler.jsonc` + `open-next.config.ts`).

**One-time setup with git integration (recommended):**

1. Cloudflare dashboard → **Workers & Pages → Create → Import a repository** → pick this repo.
2. Build command: `npx opennextjs-cloudflare build` · Deploy command: `npx opennextjs-cloudflare deploy`
3. After the first deploy, open the Worker → **Settings → Variables and Secrets** → add secret `ANTHROPIC_API_KEY`.

Every push to `main` then deploys automatically.

**Or from a machine with wrangler auth:**

```bash
npm run deploy                                # build + deploy
npx wrangler secret put ANTHROPIC_API_KEY     # once
```

Local preview in the Workers runtime: put the key in `.dev.vars`, then `npm run preview`.

## How it works

- **`POST /api/plan`** — builds a system prompt from the traveler profiles and calls Claude (`claude-opus-4-8`, adaptive thinking) with a structured-output JSON schema, so the itinerary always matches the exact shape the UI renders.
- **`POST /api/chat`** — a streaming agentic loop. Claude gets the travelers, the trip brief and the current itinerary as context, plus one strict tool: `update_itinerary`. Text is streamed to the browser as newline-delimited JSON events; when Claude calls the tool, the complete updated itinerary is pushed to the client and swapped in.
- **UI** — Next.js App Router + Tailwind. Three panes: travelers & trip on the left, the itinerary timeline in the middle, the companion chat on the right.

## Stack

Next.js · React · TypeScript · Tailwind CSS · Anthropic TypeScript SDK
