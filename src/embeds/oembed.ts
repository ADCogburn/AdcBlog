// Parses X's oEmbed response into the structured fields of an Archive.
//
// This is the part that breaks when X changes its markup, so it is strict:
// anything that does not look like today's payload throws, and the Capture
// script refuses to write an Archive, instead of saving a silently wrong one.

export interface ParsedEmbed {
	id: string;
	url: string;
	authorName: string;
	authorHandle: string;
	/** ISO 8601 calendar date, e.g. `2006-03-21`. */
	date: string;
	text: string;
}

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

// Photo and video links. X serves pic.twitter.com today but documents
// pic.x.com, so both count. They point at a media page, not quoted text.
const MEDIA_LINK_TEXT = /^pic\.(?:twitter|x)\.com\//;

export function parseOembed(payload: Record<string, unknown>): ParsedEmbed {
	const url = requireString(payload, 'url');
	const authorName = requireString(payload, 'author_name');
	const authorUrl = requireString(payload, 'author_url');
	const html = requireString(payload, 'html');

	const id = url.match(/\/status\/(\d+)$/)?.[1];
	if (!id) throw new Error(`oEmbed url is not a social post URL: ${url}`);

	const authorHandle = authorUrl.match(/^https:\/\/(?:x|twitter)\.com\/(\w+)$/)?.[1];
	if (!authorHandle) throw new Error(`oEmbed author_url has no handle: ${authorUrl}`);

	// <blockquote><p>TEXT</p>&mdash; NAME (@HANDLE) <a href="…">DATE</a></blockquote>
	const match = html.match(/<p[^>]*>([\s\S]*)<\/p>[\s\S]*<a [^>]*>([^<]+)<\/a>\s*<\/blockquote>/);
	if (!match) throw new Error('oEmbed html does not match the expected blockquote markup');
	const [, body, displayDate] = match as unknown as [string, string, string];

	return { id, url, authorName, authorHandle, date: parseDisplayDate(displayDate), text: toText(body) };
}

function requireString(payload: Record<string, unknown>, key: string): string {
	const value = payload[key];
	if (typeof value !== 'string' || value === '') {
		throw new Error(`oEmbed payload is missing "${key}"`);
	}
	return value;
}

/**
 * "March 21, 2006" to "2006-03-21". Converted by hand rather than with
 * `new Date(text)`, whose handling of display text depends on the engine.
 */
function parseDisplayDate(text: string): string {
	const match = text.trim().match(/^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/);
	const month = match ? MONTHS.indexOf(match[1]!) + 1 : 0;
	if (!match || month === 0) {
		throw new Error(`oEmbed date is not in "Month D, YYYY" form: "${text}"`);
	}
	return `${match[3]}-${String(month).padStart(2, '0')}-${match[2]!.padStart(2, '0')}`;
}

/** The social post's text: links reduced to their visible text, media links dropped. */
function toText(body: string): string {
	const text = body
		.replace(/<a [^>]*>([^<]*)<\/a>/g, (_, linkText: string) =>
			MEDIA_LINK_TEXT.test(linkText) ? '' : linkText,
		)
		.replace(/<br\s*\/?>/g, '\n')
		.replace(/<[^>]+>/g, '');

	return decodeEntities(text)
		.split('\n')
		.map((line) => line.trim())
		.join('\n')
		.trim();
}

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
};

function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
		if (name[0] === '#') {
			const hex = name[1] === 'x' || name[1] === 'X';
			return String.fromCodePoint(Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10));
		}
		return NAMED_ENTITIES[name.toLowerCase()] ?? entity;
	});
}
