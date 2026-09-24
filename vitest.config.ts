/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig runs tests through Astro's Vite pipeline, so `astro:*` virtual
// modules and the project's integrations resolve the same way they do in a build.
export default getViteConfig({
	test: {
		passWithNoTests: true,
	},
});
