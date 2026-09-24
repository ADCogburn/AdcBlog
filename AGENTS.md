## Agent skills

### Issue tracker

Issues live in GitHub Issues (ADCogburn/AdcBlog), managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Development

- `npm run check` typechecks, `npm test` runs Vitest, `npm run build` builds.
- Start the dev server in background mode: `npx astro dev --background`. Manage it with `npx astro dev stop`, `npx astro dev status` and `npx astro dev logs`.
- `site` comes from the `SITE_URL` environment variable, defaulting to the `workers.dev` URL (see `astro.config.mjs`).
- `reference/` holds upstream files kept for API shape only. They are not built or typechecked.
- Astro docs: https://docs.astro.build
