// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// The canonical origin, used for feed and sitemap URLs. Overridable so that a
// move to a custom domain is a repository variable change, not a code change.
// `||` rather than `??` so an unset-but-declared variable (empty string) still
// falls back.
const site = process.env.SITE_URL || 'https://adcblog.andrew-d-cogburn.workers.dev';

// https://astro.build/config
export default defineConfig({
	site,
	integrations: [mdx(), sitemap()],
	markdown: {
		shikiConfig: {
			themes: { light: 'github-light', dark: 'github-dark' },
			// No inline default: every token carries --shiki-light and
			// --shiki-dark, and prose.css picks one with light-dark() so code
			// blocks follow the same color-scheme switch as the page.
			defaultColor: false,
		},
	},
});
