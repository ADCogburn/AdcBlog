// REFERENCE ONLY — not part of the build. Copied verbatim (below this header)
// from withastro/astro@astro@7.3.5, examples/blog/src/content.config.ts, to show
// the current content-collections API shape. Rewritten as src/content.config.ts
// in Phase 2 (#4); delete this file then. Note the glob below also admits `.md`,
// which ADR-0001 rules out — the rewrite should match `**/*.mdx` only.

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
		}),
});

export const collections = { blog };
