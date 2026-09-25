// The network-free half of Capture: turning a social post URL into an oEmbed
// request, and an oEmbed response into the Archive file that gets committed.
// scripts/embed-tweet.ts does the fetching and writing around it.

import { archiveSchema } from '../content/schemas';
import { parseOembed } from './oembed';

const OEMBED_ENDPOINT = 'https://publish.x.com/oembed';

/**
 * The canonical `https://x.com/<handle>/status/<id>` form of a social post
 * URL, accepting twitter.com, mobile and www hosts and ignoring query strings.
 * Throws on anything that is not a single social post.
 */
export function canonicalTweetUrl(input: string): string {
	let url: URL;
	try {
		url = new URL(input);
	} catch {
		throw new Error(`Not a URL: ${input}`);
	}
	const host = url.hostname.replace(/^(?:www|mobile)\./, '');
	const path = url.pathname.match(/^\/(\w+)\/status(?:es)?\/(\d+)\/?$/);
	if (!['x.com', 'twitter.com'].includes(host) || !path) {
		throw new Error(`Not a social post URL on x.com: ${input}`);
	}
	return `https://x.com/${path[1]}/status/${path[2]}`;
}

/** The oEmbed request for a social post, in the form the Phase 0 fixtures were recorded with. */
export function oembedRequestUrl(tweetUrl: string): string {
	const params = new URLSearchParams({ url: tweetUrl, omit_script: '1', dnt: 'true' });
	return `${OEMBED_ENDPOINT}?${params}`;
}

/**
 * The Archive to commit for an oEmbed response. Structured fields first so a
 * later `removedAt` is one readable line in a diff; `raw` last, exactly as
 * received. Validated against the embeds schema so a bad Archive is never written.
 */
export function buildArchive(payload: Record<string, unknown>, capturedAt: Date) {
	const archive = {
		...parseOembed(payload),
		capturedAt: capturedAt.toISOString(),
		raw: payload,
	};
	archiveSchema.parse(archive);
	return archive;
}

export function serializeArchive(archive: ReturnType<typeof buildArchive>): string {
	return `${JSON.stringify(archive, null, '\t')}\n`;
}

export function tweetTag(id: string): string {
	return `<Tweet id="${id}" />`;
}
