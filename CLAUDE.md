# CLAUDE.md

Guidance for Claude Code (and other AI agents) working in this repository.

## What this is

Travel Companion AI — a road-trip planner that "knows" the travelers (profiles
with diets, interests, ages, quirks) and plans car trips around them: route
legs, rest breaks, meal stops, overnight stays. A companion chat adjusts the
itinerary live on request. All travel is by car — never suggest flights/trains
in prompts or copy.

## Deployment state — read this first

The repo has **two deployment modes**, switched by `wrangler.jsonc`:

| Mode | Config | What deploys |
|---|---|---|
| **Mockup (current)** | `wrangler.jsonc` → `assets.directory: ./site` | Static demo `site/index.html` only. No build, no API key. Live at https://humsafar.dhanjit.me |
| **Real app (parked)** | `wrangler.opennext.jsonc` | Full Next.js app on Workers via OpenNext. Requires the `ANTHROPIC_API_KEY` secret on the Worker. |

To go live with the real app: copy `wrangler.opennext.jsonc` over
`wrangler.jsonc`, push to `main`, add the secret. Do **not** switch modes
unless the user asks.

Cloudflare Workers Builds deploys `main` with the default command
(`npx wrangler deploy`). In real-app mode, `build.command` in the config runs
the OpenNext build automatically — keep that intact.

## Commands

```bash
npm run dev        # Next.js dev server (real app) — needs ANTHROPIC_API_KEY in .env.local
npm run build      # Next.js production build + typecheck
npm run preview    # Serve per wrangler.jsonc in the local Workers runtime (workerd)
npm run deploy     # wrangler deploy (needs wrangler auth; CI does this on push to main)
```

There is no test suite yet. Verification = `npm run build` passes plus
exercising the affected flow (see Verification below).

## Architecture

```
app/page.tsx               UI shell: three panes (travelers+trip / itinerary / chat),
                           state + localStorage persistence ("travel-companion-ai-v1")
components/                TravelersPanel, TripForm, ItineraryView, ChatPanel
app/api/plan/route.ts      POST — one-shot itinerary generation (structured outputs)
app/api/chat/route.ts      POST — streaming agentic loop with update_itinerary tool
lib/itinerary-schema.ts    THE shared JSON schema (see invariant below)
lib/prompts.ts             System prompts; traveler context injection
lib/types.ts               TS types mirroring the schema
site/index.html            Self-contained static mockup (simulated planning/chat)
```

### Invariants

1. **One schema, three consumers.** `ITINERARY_SCHEMA` in
   `lib/itinerary-schema.ts` is used by (a) `/api/plan`'s
   `output_config.format`, (b) `/api/chat`'s strict `update_itinerary` tool,
   and (c) mirrors `lib/types.ts` which the UI renders. Change the itinerary
   shape in all three together, and keep `additionalProperties: false` +
   every property in `required` (strict tool use requires it).
2. **Chat wire protocol** is newline-delimited JSON events:
   `{type:"text"|"itinerary"|"error"|"done", ...}`. `app/page.tsx` parses it
   line-by-line; keep server and client in sync.
3. **Claude API usage** (per current API rules for `claude-opus-4-8`):
   model `claude-opus-4-8`, `thinking: {type:"adaptive"}`, **no**
   `temperature`/`top_p`/`top_k`, **no** assistant prefill. Streaming for the
   chat route; check `stop_reason` (`refusal`, `pause_turn`, `max_tokens`,
   `tool_use`) before reading content. Use the SDK's typed errors
   (`Anthropic.RateLimitError` etc.), not string matching.
4. **The mockup is standalone.** `site/index.html` has zero dependencies and
   makes zero network calls (simulated responses only). Keep it that way —
   it must work with no key and no backend.

## Environment

| Where | How the key is provided |
|---|---|
| `next dev` | `.env.local` → `ANTHROPIC_API_KEY=...` |
| Local workerd (`npm run preview`, real-app mode) | `.dev.vars` (gitignored) |
| Production Worker | Cloudflare secret: Worker → Settings → Variables and Secrets |

Never commit keys. `.env*` and `.dev.vars*` are gitignored (`.env.example` is
the allowed exception).

## Verification expectations

- `npm run build` must pass (includes TypeScript).
- UI changes: run the app and exercise the affected flow (Playwright with the
  system Chromium works headless; see repo history for examples).
- Worker/deploy changes: `npx wrangler deploy --dry-run` and/or
  `npm run preview` + curl the routes.
- API-route changes without a key available: verify the plumbing with a dummy
  key in `.dev.vars` — a clean "Invalid ANTHROPIC_API_KEY" from the route
  proves the path end-to-end.

## Git workflow

Feature branch → PR into `main` → squash/linear merge. No direct pushes to
`main` and no force pushes to `main`. `main` is what Cloudflare deploys —
anything merged there goes live at humsafar.dhanjit.me within minutes.
See CONTRIBUTING.md.
