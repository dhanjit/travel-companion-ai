# AGENTS.md

All agent guidance for this repository lives in [CLAUDE.md](./CLAUDE.md) —
project overview, deployment modes, commands, architecture invariants,
environment setup, verification expectations, and git workflow.

Read that file before making changes. The two things agents get wrong most
often:

1. `wrangler.jsonc` currently deploys the **static mockup** (`site/`), not the
   Next.js app. Don't "fix" that — it's intentional. The real app's config is
   parked in `wrangler.opennext.jsonc`.
2. The itinerary JSON schema (`lib/itinerary-schema.ts`), the TS types
   (`lib/types.ts`), and the UI renderer must change together.

The next feature (guided, context-aware choices) has a design doc:
[docs/agentic-choices.md](./docs/agentic-choices.md) — read it before working
on the decision-tree flow or the chat route.
