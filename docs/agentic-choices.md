# Agentic choices — guided, context-aware decisions

> Status: **living design doc, v0.1** — the shared source of truth for this
> feature. Developed by Dhanjit with Ganeshan. Sections marked _Decided_ are
> settled; _Open_ items need a call before they're built. Edit in place.

## The idea in one line

Instead of a blank "ask me anything" box, the companion **offers the next
decision** as a small set of choices, and each choice you tap narrows toward a
concrete change to the plan — like a decision tree, except **the tree is
generated on the fly, not hardcoded.**

## Why

Two problems with a free-text-only companion:

1. **Blank-page problem.** Most people don't know what to ask a trip planner.
   "Make day 2 more relaxed" is obvious in hindsight; "shall we do temples or
   the coast on day 3?" is the kind of question the _companion_ should raise.
2. **The good question depends on the moment.** The right options for a slot
   aren't fixed. They change with the travelers' interests, their mood right
   then, the time of day, the weather in that window, what's nearby and open,
   and what the group has already done that day.

So the choices themselves are a planning decision. Presenting "Temples /
Forts / Markets" vs "Pool day / Short drive / Nap" is the model reasoning
about these specific people at this specific point in the trip — **the option
set is agentic, not a static menu.**

## Two things that must be true

- **Choices narrow.** A pick either drills to a more specific question or
  commits a change. Depth is dynamic — stop asking once the choice is concrete
  enough to become a real stop.
  Example chain the user gave:
  `Visit somewhere` → `Somewhere with a good view` → `A cafe with a good view`
  → (commit: a clifftop-cafe afternoon).
- **You can drill in at a moment, not just at the whole trip.** "Shape day 3"
  is the trip-level entry. "What's good here?" anchored to a specific day /
  time / stop is the moment-level entry — the companion answers _for that slot_,
  using the context of that slot.

## The context that shapes an option set

This is the input to "what choices do I show?". The richer it is, the less
generic the options.

| Signal | Source | Example effect on options |
|---|---|---|
| Traveler interests | profiles | Aai → temple options surface; Priya → photo/viewpoint options |
| Diet / constraints | profiles | every food option pre-filtered to pure-veg, no-nuts |
| Mood / energy _now_ | asked, or inferred from the day so far | kids fading → "pool / nap" leads, "third fort" drops |
| Where in the trip | day + time + last stop + next drive | late afternoon → short, near-base options; not a 2h drive |
| Weather in that window | forecast API | monsoon shower → covered/indoor options lead |
| Nearby & open now | location + hours | only surface places actually reachable and open |
| Pace / budget | trip brief | "packed" → more stops offered; tight budget → free/cheap first |
| Already done today | current itinerary | two forts done → stop offering forts (variety) |
| External factors | calendars, closures | Sunday market closed, festival road shut, sunset time |

In the **real app** the model receives this context and _generates_ the
question + options. In the **mockup** the branches are hardcoded but each
question shows a short "why these" line, so the context-driven nature is
visible even though it's simulated.

## Interaction model

```
                       ┌─ trip-level:  "Shape day 3"  (chip / free text)
   entry points ───────┤
                       └─ moment-level: "Shape this day →" on a day card
                                        (later: "what next here?" on a stop)
                                   │
                                   ▼
        ┌──────────── companion asks a question ────────────┐
        │   why these:  🌧️ wet afternoon · Aai wants a temple │
        │   [ Temples ] [ Forts ] [ Markets ] [ A good view ] │
        └───────────────────────┬───────────────────────────┘
                                 │ pick
                 ┌───────────────┴───────────────┐
             leads to another          concrete enough →
             (narrower) question        commit change to itinerary
                 │                                 │
                 └────────► … ◄────────────────────┘
                                 │
                         picked trail stays
                       visible in the chat log
```

- The picked path stays on screen as a trail (chosen chip highlighted, siblings
  dimmed, choice echoed as a user message) so the reasoning is legible after.
- Committing a change reuses the existing itinerary update path — no new
  apply mechanism, the plan just re-renders with the changed day flashed.

## Architecture for the real app

The chat route (`app/api/chat/route.ts`) today streams newline-delimited JSON
events and exposes one tool, `update_itinerary`. This feature adds one tool and
one event; nothing else changes.

**_Decided_ — the shape:**

- New tool `suggest_options` (strict, alongside `update_itinerary`). The model
  calls it when the best next move is to offer a choice rather than act. Input
  schema:

  ```jsonc
  {
    "anchor":   "trip" | "day:3" | "stop:3.2",   // what we're deciding about
    "question": "What kind of day should day 3 be?",
    "why":      "Wet late afternoon; Aai wants a temple, Priya wants light.",
    "options": [
      { "id": "temples", "label": "Temples & Old Goa", "hint": "covered, Aai-friendly",
        "leads_to": "ask" | "apply" }   // ask → another suggest_options; apply → update_itinerary
    ]
  }
  ```

  > The block above is **illustrative pseudo-syntax**. The real schema must be
  > valid JSON Schema: `enum`s for the literal unions (`anchor`, `leads_to`),
  > `additionalProperties: false`, and **every** property listed in `required`
  > — the same strict-mode rules `ITINERARY_SCHEMA` follows (CLAUDE.md invariant 1).

- New wire event `{type:"options", node}` on the existing protocol. The client
  renders the option box (same UI as the mockup's `.msg-opts`).
- When the model calls `suggest_options`, the server emits `{type:"options"}`
  **and** must still push a synthetic `tool_result` (e.g. "options shown;
  awaiting the user's pick") and break out of the round loop — the Anthropic API
  rejects a `tool_use` turn that isn't answered by a `tool_result` (see the
  existing `update_itinerary` handling in `route.ts`).
- Picking an option sends the choice back as an ordinary user turn
  (`"chose: temples"`) — i.e. a **new POST**, which rebuilds `history` from the
  client's `messages` and resets the round counter. The model then decides the
  next node: another `suggest_options` (narrow further) or `update_itinerary`
  (commit). Note the two loops are separate: each pick is its own turn/request,
  while `MAX_TOOL_ROUNDS` only bounds the model's own multi-tool rounds _within_
  a single request (e.g. `suggest_options` then `update_itinerary` back-to-back).

**Why this shape:** applying a change already works via `update_itinerary` with
the complete plan; we don't fork the itinerary schema. Only the _offering_ of
choices is new, and it's a leaf tool the model opts into.

**_Open_ — signals & seams:**

- **Weather / hours / location are external I/O.** They need timeouts, retries,
  and graceful fallback (per repo infra rules — validate external calls). If
  a signal is unavailable, the option set should degrade to interest-only, not
  block. _Open: which providers, and do we fetch client-side (geolocation) or
  server-side?_
- **Provider seam.** The repo currently pins the Anthropic SDK + `claude-opus-4-8`
  directly (see `CLAUDE.md` invariant 3). Dhanjit's standing preference elsewhere
  is an OpenRouter seam with the model as an env var. The `suggest_options`
  contract is provider-agnostic either way — but decide before building whether
  this feature is the point where we introduce the router seam. _Open._
- **Proactive vs on-demand.** Should the companion ever _offer_ choices
  unprompted ("it's 4pm and raining near you — want options?"), or only when
  asked? Proactive is the more "companion"-like behavior but risks nagging.
  _Open._
- **Auto-narrow depth.** How specific before we commit? A cafe name, or just
  "a clifftop-cafe afternoon"? Probably: narrow until one more question would
  be picking between near-identical options, then commit. _Open._

## Mockup vs real app

| | Mockup (`site/index.html`) | Real app |
|---|---|---|
| Option sets | hardcoded `TREE` + leaf functions | model-generated via `suggest_options` |
| "Why these" line | static per node | generated from real context |
| Context signals | simulated (a wet-afternoon flavor) | live: profiles, weather, time, location |
| Applying a change | mutate the JS itinerary object | `update_itinerary` tool |
| Network | **none — stays standalone** | Claude API + signal providers |

The mockup demonstrates the _interaction and the intent_; it must stay
zero-dependency and zero-network (CLAUDE.md invariant 4). Don't wire real APIs
into the mockup — prototype those in the Next.js app.

## How the mockup demonstrates it today

In `site/index.html`:

- `TREE` — the node graph: `root` → (`visit` → `view`) / (`trek`) branches, plus
  direct leaves. Each node carries a `why` line rendered above the options.
- `askNode(id)` / `pick(box, btn, opt)` — render a question + option chips,
  handle a pick (drill to `next` or run a leaf's `apply`), keep the trail
  visible, manage focus.
- `day*()` leaf functions (`dayChill`, `dayDrive`, `dayTemples`, `dayForts`,
  `dayMarkets`, `dayWaterfall`, `dayIsland`, `dayCafeView`) — each rewrites day
  3 and returns the companion's explanation.
- `data-action="shape3"` button on the day-3 card — the moment-level entry:
  drilling in from the trip view itself.

The narrowing chain the user asked for is live:
`Visit things → Somewhere with a good view → Cafe with a good view`.

## Next steps

- [ ] Mockup: add the moment-level "what next here?" entry on an individual
      _stop_, not just the day card.
- [ ] Real app: implement `suggest_options` tool + `{type:"options"}` event;
      port the mockup's option-box UI into a React component.
- [ ] Decide the _Open_ items above (signals/providers, provider seam,
      proactive offers, auto-narrow depth) — Dhanjit + Ganeshan.
- [ ] A small eval set: given a context vector, does the generated option set
      respect diet/constraints and stay relevant? (rerun on any model/host swap.)
