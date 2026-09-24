import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { archiveSchema } from '../content/schemas';
import { parseOembed } from './oembed';

// Real X oEmbed responses, byte-for-byte as received. See the fixtures' README.
function fixture(name: string): Record<string, unknown> {
	const path = new URL(`../../test/fixtures/oembed/x/${name}.json`, import.meta.url);
	return JSON.parse(readFileSync(path, 'utf8'));
}

describe('parseOembed', () => {
	it('parses a plain social post', () => {
		expect(parseOembed(fixture('jack-20'))).toEqual({
			id: '20',
			url: 'https://x.com/jack/status/20',
			authorName: 'jack',
			authorHandle: 'jack',
			date: '2006-03-21',
			text: 'just setting up my twttr',
		});
	});

	it('decodes entities, keeps hashtags as text and drops a pic.twitter.com media link', () => {
		expect(parseOembed(fixture('theellenshow-440322224407314432'))).toEqual({
			id: '440322224407314432',
			url: 'https://x.com/TheEllenShow/status/440322224407314432',
			authorName: 'The Ellen Show',
			authorHandle: 'TheEllenShow',
			date: '2014-03-03',
			text: "If only Bradley's arm was longer. Best photo ever. #oscars",
		});
	});

	it('keeps mentions, emoji, line breaks and ordinary links', () => {
		const parsed = parseOembed(fixture('emojipedia-1907441841177317670'));

		expect(parsed.date).toBe('2025-04-02');
		expect(parsed.text).toBe(
			'Today @unicode has resumed accepting public proposals for brand new emojis \u{1F973}\n' +
				'\n' +
				'Proposals will be accepted until July 31 2025, with successful proposals most likely being included in Emoji 18.0 recommendations in September 2026.\n' +
				'\n' +
				'Read more here \u{1F517}\u{1F447}https://t.co/sWZ8T31V1o',
		);
	});

	it('trims the stray spaces X leaves around <br>', () => {
		const parsed = parseOembed(fixture('oneplus_in-1874002928056602771'));

		expect(parsed.authorName).toBe('OnePlus India');
		expect(parsed.authorHandle).toBe('OnePlus_IN');
		expect(parsed.date).toBe('2024-12-31');
		expect(parsed.text).toBe(
			'2025 is almost here!\n' +
				'\n' +
				'Drop one emoji that captures your excitement for the new year and the all-new #OnePlus13Series for a chance to win #OnePlusBudsPro3!\n' +
				'\n' +
				'\u{1F680}',
		);
	});

	it('keeps raw UTF-8 punctuation, and a link while dropping the media link after it', () => {
		const parsed = parseOembed(fixture('emojipedia-1812879279509676133'));

		expect(parsed.date).toBe('2024-07-15');
		expect(parsed.text).toBe(
			'Emoji 16.0 is set to be approved in September. Ahead of #WorldEmojiDay 2024 (July 17), here’s every emoji in the final draft \u{1F447}https://t.co/S23SBWf9TX',
		);
	});

	it('parses a recent social post, which still uses pic.twitter.com', () => {
		const parsed = parseOembed(fixture('complex-2101466653175464354'));

		expect(parsed.id).toBe('2101466653175464354');
		expect(parsed.date).toBe('2026-09-20');
		expect(parsed.text).toBe(
			'NASA just released this new photo from the surface of Mars \u{1F52D}\n\n[\u{1F4F8}: via/ NASA]',
		);
	});

	it('drops a media link on the pic.x.com domain too', () => {
		const payload = fixture('complex-2101466653175464354');
		payload.html = String(payload.html).replaceAll('pic.twitter.com', 'pic.x.com');

		expect(parseOembed(payload).text).not.toContain('pic.');
	});

	it('produces fields the embeds schema accepts, with the exact date', () => {
		const parsed = parseOembed(fixture('jack-20'));
		const archive = archiveSchema.parse({
			...parsed,
			capturedAt: '2026-09-24T12:00:00Z',
			raw: fixture('jack-20'),
		});

		expect(archive.date).toEqual(new Date('2006-03-21T00:00:00Z'));
	});

	it('throws, rather than guessing, when the markup is not what X serves today', () => {
		const payload = fixture('jack-20');

		expect(() => parseOembed({ ...payload, html: '<div>changed</div>' })).toThrow(/oEmbed/);
		expect(() => parseOembed({ ...payload, url: 'https://x.com/jack' })).toThrow(/oEmbed/);
		expect(() =>
			parseOembed({ ...payload, html: String(payload.html).replace('March 21, 2006', '21/03/2006') }),
		).toThrow(/date/);
	});
});
