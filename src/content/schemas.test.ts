import { describe, expect, it } from 'vitest';
import { archiveSchema, postSchema } from './schemas';

const validPost = {
	title: 'Hello',
	description: 'A first Post.',
	pubDate: '2026-09-24',
};

describe('postSchema', () => {
	it('parses valid frontmatter', () => {
		const post = postSchema.parse(validPost);

		expect(post.title).toBe('Hello');
		expect(post.description).toBe('A first Post.');
		expect(post.pubDate).toEqual(new Date('2026-09-24T00:00:00Z'));
	});

	it('rejects a Post with no description', () => {
		const { description: _, ...withoutDescription } = validPost;

		const result = postSchema.safeParse(withoutDescription);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.path).toEqual(['description']);
	});

	it('rejects a pubDate that is not a date', () => {
		const result = postSchema.safeParse({ ...validPost, pubDate: 'last tuesday' });

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.path).toEqual(['pubDate']);
	});

	it('defaults tags to an empty list', () => {
		expect(postSchema.parse(validPost).tags).toEqual([]);
	});

	it('treats a Post as not a Draft unless marked', () => {
		expect(postSchema.parse(validPost).draft).toBe(false);
	});
});

const validArchive = {
	id: '20',
	url: 'https://x.com/jack/status/20',
	authorName: 'jack',
	authorHandle: 'jack',
	date: '2006-03-21',
	text: 'just setting up my twttr',
	capturedAt: '2026-09-24T12:00:00Z',
	raw: { type: 'rich', html: '<blockquote>...</blockquote>' },
};

describe('archiveSchema', () => {
	it('parses an Archive, keeping the provider payload as-is', () => {
		const archive = archiveSchema.parse(validArchive);

		expect(archive.date).toEqual(new Date('2006-03-21T00:00:00Z'));
		expect(archive.capturedAt).toEqual(new Date('2026-09-24T12:00:00Z'));
		expect(archive.removedAt).toBeUndefined();
		expect(archive.raw).toEqual({ type: 'rich', html: '<blockquote>...</blockquote>' });
	});

	it('records when an Embed was found removed', () => {
		const archive = archiveSchema.parse({ ...validArchive, removedAt: '2027-01-01' });

		expect(archive.removedAt).toEqual(new Date('2027-01-01T00:00:00Z'));
	});

	it('rejects an Archive with no provider payload', () => {
		const { raw: _, ...withoutRaw } = validArchive;

		expect(archiveSchema.safeParse(withoutRaw).success).toBe(false);
	});
});
