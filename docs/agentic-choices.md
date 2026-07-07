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
question + options. In the **mockup** the branches are hardcoded, but the
companion's reply (`mood.say`, e.g. "the rain actually helps here — the covered
spots are calmer") plus each card's `note` and its "good right now" `rec` badge
make the context-driven reasoning visible even though it's simulated.

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
  renders image-bearing option cards (same UI as the mockup's `.cards`/`.node`
  visual tree → `.place` detail).
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

| | Mockup (`site/demo/index.html`) | Real app |
|---|---|---|
| Shape | companion-first: chat + a visual `mood → place` tree; itinerary in a drawer | same shape, model-driven |
| Option sets | hardcoded `MOODS` tree of place/activity cards | model-generated via `suggest_options` |
| Imagery | flat **SVG illustrations** per activity type (`ART`) | real photos of the place / dish / activity |
| Context (location, time, weather, who) | **ambient** — shown in the header, baked into the copy (not toggles) | live: profiles, clock, weather API, geolocation |
| Applying a choice | "Add to this evening" appends to the JS plan | `update_itinerary` tool |
| Network | **none — stays standalone** | Claude API + signal + image providers |

The mockup demonstrates the _interaction and the intent_; it must stay
zero-dependency and zero-network (CLAUDE.md invariant 4). Don't wire real APIs
into the mockup — prototype those in the Next.js app.

## How the mockup demonstrates it today

`site/demo/index.html` is **companion-first**: the trip is already underway
(day 3, 4:12 PM, in Assagao, light rain, four travelers). There is no planning
form — the companion just knows the state and answers "what next this evening?".

- **Ambient context** — location / time / weather / travelers sit in the header
  as plain facts (not toggles). The companion's copy reasons from them ("the
  rain actually helps here — the covered spots are calmer").
- **`MOODS`** — the decision tree: four moods (`eat` / `see` / `chill` /
  `adventure`), each with 2–3 **place cards**. A place carries an image
  (`art` key), a one-line `note` tuned to the state ("covered · 25 min",
  "kid course"), a `rec` flag ("good right now"), a `detail`, and a `special`
  (the specialty dish/feature, with its own image).
- **`ART`** — flat SVG illustrations keyed by type (`cafe`, `dish`, `temple`,
  `ropewalk`, `trek`, `kayak`, …), themed via CSS vars so they follow dark mode.
  These stand in for the real app's photos.
- **`renderTree()`** — draws the current level from `sel = {moodId, placeId}`:
  mood cards → place cards → a full place detail card (hero image + specialty +
  "Add to this evening"). Chosen steps stay as clickable breadcrumb `crumb`s.
- **`pickMood` / `pickPlace` / `addCurrent` / `goBack`** — each step posts to the
  companion chat (chat reflects the tree) and, on add, appends to the plan.
- **Itinerary drawer** — the full day (done stops ✓, a "now" marker, and added
  evening stops) lives behind the header's **"Today's plan"** button, not on the
  main surface.

The narrowing the user asked for is live and visual: pick a mood → see
image cards of real options → open one to its photo + specialty → add it.

## Next steps

- [x] Mockup: companion-first layout; itinerary demoted to a drawer.
- [x] Mockup: a visual `mood → place` tree with per-activity imagery + specialty.
- [x] Mockup: ambient context (location/time/weather/who) drives the copy.
- [ ] Real app: implement `suggest_options` tool + `{type:"options"}` event
      returning image-bearing option cards; port the tree UI into React.
- [ ] Wire real imagery (a place-photo/provider lookup per option) — external
      I/O, so it needs timeouts + fallback to an illustration.
- [ ] Decide the _Open_ items above (signals/providers, provider seam,
      proactive offers, auto-narrow depth) — Dhanjit + Ganeshan.
- [ ] A small eval set: given a context vector, does the generated option set
      respect diet/constraints and stay relevant? (rerun on any model/host swap.)
