import { describe, expect, it } from 'vitest';
import { isPublished } from './published';

const now = new Date('2026-09-24T12:00:00Z');
const production = { now, dev: false };
const dev = { now, dev: true };

const post = { draft: false, pubDate: new Date('2026-09-01') };
const draft = { ...post, draft: true };
const embargoed = { ...post, pubDate: new Date('2026-09-25') };

describe('isPublished', () => {
	it('publishes a finished Post dated in the past', () => {
		expect(isPublished(post, production)).toBe(true);
	});

	it('leaves a Draft out of production builds', () => {
		expect(isPublished(draft, production)).toBe(false);
	});

	it('holds an embargoed Post back from production builds until its date', () => {
		expect(isPublished(embargoed, production)).toBe(false);
	});

	it('shows Drafts and embargoed Posts in dev so they can be previewed', () => {
		expect(isPublished(draft, dev)).toBe(true);
		expect(isPublished(embargoed, dev)).toBe(true);
	});
});
