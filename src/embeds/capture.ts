// The network-free half of Capture: turning a social post URL into an oEmbed
// request, and an oEmbed response into the Archive file that gets committed.
// scripts/embed-tweet.ts does the fetching and writing around it.

import { archiveSchema } from '../content/schemas';
import { parseOembed } from './oembed';

const OEMBED_ENDPOINT = 'https://publish.x.com/oembed';
const SYNDICATION_ENDPOINT = 'https://cdn.syndication.twimg.com/tweet-result';

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
 * The request for a social post on X's syndication endpoint, the unofficial
 * source behind X's own embed widget. oEmbed has no author avatar, so Capture
 * asks this for one, best-effort. The token is the one X's widget computes.
 */
export function syndicationRequestUrl(id: string): string {
	const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
	return `${SYNDICATION_ENDPOINT}?${new URLSearchParams({ id, token, lang: 'en' })}`;
}

/** The author's profile image in a syndication payload, at X's 73px `_bigger` size. */
export function avatarImageUrl(payload: Record<string, unknown>): string {
	const user = payload.user as Record<string, unknown> | undefined;
	const url = user?.profile_image_url_https;
	if (typeof url !== 'string' || !/_normal\.\w+$/.test(url)) {
		throw new Error('Syndication payload has no profile image');
	}
	return url.replace(/_normal(\.\w+)$/, '_bigger$1');
}

/** Image bytes as the `data:` URI an Archive stores, so it renders with no request to X. */
export function avatarDataUri(bytes: Uint8Array, contentType: string): string {
	const type = contentType.split(';')[0]!.trim();
	if (!type.startsWith('image/')) throw new Error(`Avatar is not an image: ${contentType}`);
	return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
}

/**
 * The Archive to commit for an oEmbed response. Structured fields first so a
 * later `removedAt` is one readable line in a diff; `raw` last, exactly as
 * received. Validated against the embeds schema so a bad Archive is never written.
 */
export function buildArchive(payload: Record<string, unknown>, capturedAt: Date, avatar?: string) {
	const archive = {
		...parseOembed(payload),
		capturedAt: capturedAt.toISOString(),
		...(avatar && { avatar }),
		raw: payload,
	};
	archiveSchema.parse(archive);
	return archive;
}

/**
 * A committed Archive with an avatar added just before `raw`, every other key
 * and value untouched, for backfilling Archives captured without one.
 */
export function withAvatar(archive: Record<string, unknown>, avatar: string): Record<string, unknown> {
	const { raw, ...fields } = archive;
	const updated = { ...fields, avatar, raw };
	archiveSchema.parse(updated);
	return updated;
}

export function serializeArchive(archive: ReturnType<typeof buildArchive> | Record<string, unknown>): string {
	return `${JSON.stringify(archive, null, '\t')}\n`;
}

export function tweetTag(id: string): string {
	return `<Tweet id="${id}" />`;
}
