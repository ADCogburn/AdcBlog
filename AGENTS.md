## Agent skills

### Issue tracker

Issues live in GitHub Issues (ADCogburn/AdcBlog), managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Development

- `npm run check` typechecks, `npm test` runs Vitest, `npm run build` builds.
- `npm run new -- "Post title"` creates `src/content/blog/<slug>.mdx` as a Draft dated today. The filename is the permalink.
- `npm run embed:tweet -- <url>` captures a social post into `src/content/embeds/<id>.json` and prints the `<Tweet id="…" />` tag. `Tweet` is available in every Post without an import.
- Start the dev server in background mode: `npx astro dev --background`. Manage it with `npx astro dev stop`, `npx astro dev status` and `npx astro dev logs`.
- `site` comes from the `SITE_URL` environment variable, defaulting to the `workers.dev` URL (see `astro.config.mjs`).
- Astro docs: https://docs.astro.build
