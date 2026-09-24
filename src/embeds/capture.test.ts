import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { archiveSchema } from '../content/schemas';
import { buildArchive, canonicalTweetUrl, oembedRequestUrl, serializeArchive, tweetTag } from './capture';

const sources = JSON.parse(
	readFileSync(new URL('../../test/fixtures/oembed/x/sources.json', import.meta.url), 'utf8'),
);
const jack = JSON.parse(
	readFileSync(new URL('../../test/fixtures/oembed/x/jack-20.json', import.meta.url), 'utf8'),
);

describe('canonicalTweetUrl', () => {
	it.each([
		'https://x.com/jack/status/20',
		'https://twitter.com/jack/status/20',
		'https://mobile.twitter.com/jack/status/20/',
		'https://www.x.com/jack/status/20?s=20&t=abc',
		'https://twitter.com/jack/statuses/20',
	])('normalises %s', (input) => {
		expect(canonicalTweetUrl(input)).toBe('https://x.com/jack/status/20');
	});

	it.each(['not a url', 'https://x.com/jack', 'https://example.com/jack/status/20'])(
		'rejects %s',
		(input) => {
			expect(() => canonicalTweetUrl(input)).toThrow();
		},
	);
});

describe('oembedRequestUrl', () => {
	it('matches the request each fixture was recorded with', () => {
		for (const fixture of sources.fixtures) {
			expect(oembedRequestUrl(fixture.sourceUrl)).toBe(fixture.requestUrl);
		}
	});
});

describe('buildArchive', () => {
	const capturedAt = new Date('2026-09-24T12:00:00Z');

	it('stores the structured fields and the raw payload, and passes the embeds schema', () => {
		const archive = buildArchive(jack, capturedAt);

		expect(archive).toMatchObject({ id: '20', date: '2006-03-21', capturedAt: '2026-09-24T12:00:00.000Z' });
		expect(archive.raw).toEqual(jack);
		expect(archiveSchema.safeParse(JSON.parse(serializeArchive(archive))).success).toBe(true);
	});

	it('refuses a payload it cannot parse', () => {
		expect(() => buildArchive({ ...jack, html: '' }, capturedAt)).toThrow();
	});
});

describe('tweetTag', () => {
	it('is the tag to paste into a Post', () => {
		expect(tweetTag('20')).toBe('<Tweet id="20" />');
	});
});
