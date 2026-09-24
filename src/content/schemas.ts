import { z } from 'astro/zod';

export const postSchema = z.object({
	title: z.string(),
	description: z.string(),
	pubDate: z.coerce.date(),
	updatedDate: z.coerce.date().optional(),
	tags: z.array(z.string()).default([]),
	draft: z.boolean().default(false),
});

export const archiveSchema = z.object({
	id: z.string(),
	url: z.url(),
	authorName: z.string(),
	authorHandle: z.string(),
	date: z.coerce.date(),
	text: z.string(),
	capturedAt: z.coerce.date(),
	removedAt: z.coerce.date().optional(),
	// The provider's response exactly as received, kept so the Archive can be
	// re-parsed if the parser changes. A record, not z.unknown(), because
	// Zod 4 treats an unknown-typed key as optional.
	raw: z.record(z.string(), z.unknown()),
});
