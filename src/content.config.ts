import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { archiveSchema, postSchema } from './content/schemas';
import { postIdFromEntry } from './content/slug';

// .mdx only: ADR-0001 authors every Post in MDX so its stricter parsing
// catches mistakes at build time. A stray .md file is simply not a Post.
const blog = defineCollection({
	loader: glob({
		pattern: '**/*.mdx',
		base: './src/content/blog',
		generateId: ({ entry }) => postIdFromEntry(entry),
	}),
	schema: postSchema,
});

const embeds = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/content/embeds' }),
	schema: archiveSchema,
});

export const collections = { blog, embeds };
