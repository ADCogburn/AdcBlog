import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { archiveSchema } from '../content/schemas';
import {
	avatarDataUri,
	avatarImageUrl,
	buildArchive,
	canonicalTweetUrl,
	oembedRequestUrl,
	serializeArchive,
	syndicationRequestUrl,
	tweetTag,
	withAvatar,
} from './capture';

const sources = JSON.parse(
	readFileSync(new URL('../../test/fixtures/oembed/x/sources.json', import.meta.url), 'utf8'),
);
const jack = JSON.parse(
	readFileSync(new URL('../../test/fixtures/oembed/x/jack-20.json', import.meta.url), 'utf8'),
);
const jackSyndication = JSON.parse(
	readFileSync(new URL('../../test/fixtures/syndication/x/jack-20.json', import.meta.url), 'utf8'),
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

	it('stores an avatar before raw, and leaves it out when there is none', () => {
		const avatar = 'data:image/jpeg;base64,AAAA';

		expect(Object.keys(buildArchive(jack, capturedAt, avatar)).slice(-2)).toEqual(['avatar', 'raw']);
		expect(buildArchive(jack, capturedAt)).not.toHaveProperty('avatar');
	});

	it('refuses an avatar that is not an inline image', () => {
		expect(() => buildArchive(jack, capturedAt, 'https://pbs.twimg.com/a.jpg')).toThrow();
	});
});

describe('withAvatar', () => {
	it('adds the avatar just before raw, changing nothing else', () => {
		const archive = JSON.parse(serializeArchive(buildArchive(jack, new Date('2026-09-24T12:00:00Z'))));
		archive.removedAt = '2027-01-01';
		const avatar = 'data:image/jpeg;base64,AAAA';

		const updated = withAvatar(archive, avatar);

		expect(Object.keys(updated)).toEqual([...Object.keys(archive).filter((k) => k !== 'raw'), 'avatar', 'raw']);
		expect(updated).toEqual({ ...archive, avatar });
	});

	it('refuses an avatar that is not an inline image', () => {
		const archive = JSON.parse(serializeArchive(buildArchive(jack, new Date())));
		expect(() => withAvatar(archive, 'nope')).toThrow();
	});
});

describe('syndicationRequestUrl', () => {
	it('matches the request the syndication fixture was recorded with', () => {
		expect(syndicationRequestUrl('20')).toBe(
			'https://cdn.syndication.twimg.com/tweet-result?id=20&token=6dq1a2xwd93&lang=en',
		);
	});
});

describe('avatarImageUrl', () => {
	it('is the author profile image at 73px, from the syndication payload', () => {
		expect(avatarImageUrl(jackSyndication)).toBe(
			'https://pbs.twimg.com/profile_images/1661201415899951105/azNjKOSH_bigger.jpg',
		);
	});

	it('throws when the payload has no profile image', () => {
		expect(() => avatarImageUrl({ user: {} })).toThrow();
		expect(() => avatarImageUrl({})).toThrow();
	});
});

describe('avatarDataUri', () => {
	it('inlines image bytes as a base64 data URI', () => {
		expect(avatarDataUri(new Uint8Array([1, 2, 3]), 'image/jpeg')).toBe('data:image/jpeg;base64,AQID');
	});

	it('refuses a response that is not an image', () => {
		expect(() => avatarDataUri(new Uint8Array([1]), 'text/html; charset=utf-8')).toThrow();
	});
});

describe('tweetTag', () => {
	it('is the tag to paste into a Post', () => {
		expect(tweetTag('20')).toBe('<Tweet id="20" />');
	});
});
