# Contributing Guidelines

## Branch and merge discipline

Applies to the `main` branch (manual discipline — mirror of the ruleset used
across dhanjit's repos):

1. **Use pull requests.** Create a feature branch, open a PR into `main`.
   No direct commits to `main` except trivial fixes.
2. **Keep history linear.** Squash or rebase merges only — no merge commits
   where avoidable. No force pushes to `main`.
3. **`main` is production.** Cloudflare Workers Builds deploys every push to
   `main` to https://humsafar.dhanjit.me. Don't merge anything you haven't
   verified (see CLAUDE.md → Verification expectations).

## Commit messages

- Imperative subject line, ≤ 72 chars; body explains the *why* when it isn't
  obvious.
- One logical change per commit where practical.

## Before opening a PR

- `npm run build` passes.
- If you touched the Worker/deploy config: `npx wrangler deploy --dry-run`
  succeeds.
- If you touched the static site (`site/index.html` landing or
  `site/demo/index.html` interactive demo): open it in a browser — it must work
  with no backend and no API key, in both light and dark themes.
