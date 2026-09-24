// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// The canonical origin, used for feed and sitemap URLs. Overridable so that a
// move to a custom domain is a CI secret change, not a code change. `||` rather
// than `??` so an unset-but-declared secret (empty string) still falls back.
const site = process.env.SITE_URL || 'https://adcblog.adcogburn.workers.dev';

// https://astro.build/config
export default defineConfig({
	site,
	integrations: [mdx(), sitemap()],
});
