// Capture: fetch a social post's oEmbed once and commit it as an Archive.
//
//   npm run embed:tweet -- https://x.com/<handle>/status/<id>
//
// Runs on the writer's machine at authoring time, never in a build (ADR-0002).
// Exits non-zero on any failure, because the writer is looking at the post and
// can act on it. The avatar is the exception: it comes from an unofficial
// endpoint, so failing to get one only warns, and the card shows a monogram.
// Run it again on an Archive with no avatar to add one.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
} from '../src/embeds/capture';

const EMBEDS_DIR = new URL('../src/content/embeds/', import.meta.url);

async function main(args: string[]) {
	if (args.length !== 1) {
		throw new Error('Usage: npm run embed:tweet -- <social post URL>');
	}
	const url = canonicalTweetUrl(args[0]!);
	const id = url.split('/').pop()!;
	const file = new URL(`${id}.json`, EMBEDS_DIR);

	if (existsSync(file)) {
		const existing = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
		console.log(`Already archived: ${fileURLToPath(file)}`);
		if (!existing.avatar) {
			const avatar = await captureAvatar(id);
			if (avatar) {
				writeFileSync(file, serializeArchive(withAvatar(existing, avatar)));
				console.log('Added the avatar. Commit the change.');
			}
		}
		console.log(tweetTag(id));
		return;
	}

	const response = await fetch(oembedRequestUrl(url));
	// X answers 404 (HTML) for a missing social post and 403 for one it will
	// not embed, so check the status before trying to parse JSON.
	if (!response.ok) {
		const reason = response.status === 404 ? 'not found' : response.status === 403 ? 'not embeddable' : 'failed';
		throw new Error(`oEmbed request ${reason}: HTTP ${response.status} for ${url}`);
	}
	const payload = (await response.json()) as Record<string, unknown>;
	const archive = buildArchive(payload, new Date(), await captureAvatar(id));

	writeFileSync(file, serializeArchive(archive));
	console.log(`Archived @${archive.authorHandle}, ${archive.date}: ${fileURLToPath(file)}`);
	console.log('Commit it with the Post, and paste:');
	console.log(tweetTag(id));
}

/** The author's avatar as a data URI, or undefined (with a warning) if X will not give one. */
async function captureAvatar(id: string): Promise<string | undefined> {
	try {
		const tweet = await fetch(syndicationRequestUrl(id));
		if (!tweet.ok) throw new Error(`syndication request failed: HTTP ${tweet.status}`);
		const image = await fetch(avatarImageUrl((await tweet.json()) as Record<string, unknown>));
		if (!image.ok) throw new Error(`avatar request failed: HTTP ${image.status}`);
		return avatarDataUri(new Uint8Array(await image.arrayBuffer()), image.headers.get('content-type') ?? '');
	} catch (error) {
		console.warn(`No avatar (${error instanceof Error ? error.message : error}); the card will show a monogram.`);
		return undefined;
	}
}

main(process.argv.slice(2)).catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
