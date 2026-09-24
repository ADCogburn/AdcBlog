// The real Network for the link-health job: HTTP liveness checks, Internet
// Archive Save Page Now, and X's oEmbed endpoint for Embeds.

import { oembedRequestUrl } from '../embeds/capture';
import type { EmbedStatus, Network } from './health';
import type { LinkStatus } from './ledger';

const USER_AGENT = 'AdcBlog-link-health/1.0 (+https://github.com/ADCogburn/AdcBlog)';
const TIMEOUT_MS = 20_000;
// The Wayback Machine's APIs routinely take longer than a page does.
const ARCHIVE_TIMEOUT_MS = 90_000;
const SNAPSHOT_URL = /^https?:\/\/web\.archive\.org\/web\/\d{14}\//;

interface Options {
	/** Internet Archive S3-style keys. With them, Save Page Now uses the authenticated API. */
	archiveKeys?: { access: string; secret: string };
}

export function createNetwork({ archiveKeys }: Options = {}): Network {
	return {
		checkLink,
		snapshot: (url) => snapshot(url, archiveKeys),
		checkEmbed,
	};
}

async function request(url: string, init: RequestInit = {}, timeout = TIMEOUT_MS): Promise<Response> {
	return fetch(url, {
		redirect: 'follow',
		...init,
		headers: { 'User-Agent': USER_AGENT, ...init.headers },
		signal: AbortSignal.timeout(timeout),
	});
}

async function checkLink(url: string): Promise<LinkStatus> {
	try {
		let response = await request(url, { method: 'HEAD' });
		// Plenty of servers mishandle HEAD, so anything but success gets a GET.
		if (!response.ok) response = await request(url);
		if (response.ok) return 'alive';
		if (response.status === 404 || response.status === 410) return 'dead';
		return 'unreachable';
	} catch (error) {
		// A host that no longer resolves is gone. Every other failure could be transient.
		return errorCode(error) === 'ENOTFOUND' ? 'dead' : 'unreachable';
	}
}

function errorCode(error: unknown): string | undefined {
	const cause = (error as { cause?: { code?: string } })?.cause;
	return cause?.code;
}

async function snapshot(url: string, keys: Options['archiveKeys']): Promise<string | null> {
	try {
		const saved = keys ? await saveAuthenticated(url, keys) : await saveAnonymous(url);
		if (saved) return saved;
	} catch {
		// Fall through to the most recent existing Snapshot.
	}
	return latestSnapshot(url);
}

/** Save Page Now 2: submit a job, then poll for its capture timestamp. */
async function saveAuthenticated(url: string, keys: { access: string; secret: string }): Promise<string | null> {
	const auth = { Accept: 'application/json', Authorization: `LOW ${keys.access}:${keys.secret}` };
	const submit = await request(
		'https://web.archive.org/save',
		{
			method: 'POST',
			headers: { ...auth, 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ url, skip_first_archive: '1' }),
		},
		ARCHIVE_TIMEOUT_MS,
	);
	const { job_id } = (await submit.json()) as { job_id?: string };
	if (!job_id) return null;

	for (let attempt = 0; attempt < 24; attempt++) {
		await new Promise((resolve) => setTimeout(resolve, 5_000));
		const poll = await request(`https://web.archive.org/save/status/${job_id}`, { headers: auth }, ARCHIVE_TIMEOUT_MS);
		const status = (await poll.json()) as {
			status?: string;
			timestamp?: string;
			original_url?: string;
		};
		if (status.status === 'success' && status.timestamp) {
			return `https://web.archive.org/web/${status.timestamp}/${status.original_url ?? url}`;
		}
		if (status.status === 'error') return null;
	}
	return null;
}

/**
 * Anonymous Save Page Now: a GET that ends on, or points at, the new capture.
 * Answered 429 when tested on 2026-09-24, so without keys the job usually
 * falls back to the latest existing capture.
 */
async function saveAnonymous(url: string): Promise<string | null> {
	const response = await fetch(`https://web.archive.org/save/${url}`, {
		headers: { 'User-Agent': USER_AGENT },
		redirect: 'follow',
		signal: AbortSignal.timeout(120_000),
	});
	const location = response.headers.get('content-location');
	const candidates = [response.url, location ? new URL(location, 'https://web.archive.org').href : ''];
	const found = candidates.find((candidate) => SNAPSHOT_URL.test(candidate));
	return found ? found.replace(/^http:/, 'https:') : null;
}

/**
 * The Wayback Machine's most recent successful capture, when saving a new one
 * failed. Uses the CDX index: the simpler availability API answered empty even
 * for example.com when tested on 2026-09-24.
 */
async function latestSnapshot(url: string): Promise<string | null> {
	try {
		const query = new URLSearchParams({
			url,
			output: 'json',
			filter: 'statuscode:200',
			fl: 'timestamp,original',
			limit: '-1',
		});
		const response = await request(`https://web.archive.org/cdx/search/cdx?${query}`, {}, ARCHIVE_TIMEOUT_MS);
		const rows = (await response.json()) as string[][];
		const [timestamp, original] = rows[1] ?? [];
		return timestamp && original ? `https://web.archive.org/web/${timestamp}/${original}` : null;
	} catch {
		return null;
	}
}

async function checkEmbed(url: string): Promise<EmbedStatus> {
	try {
		const response = await request(oembedRequestUrl(url));
		if (response.ok) return 'alive';
		// X answers 404 for a social post that no longer exists, and 403 for one
		// it will not embed (protected or suspended), which is not proof of Removal.
		if (response.status === 404) return 'removed';
		if (response.status === 403) return 'unembeddable';
		return 'unreachable';
	} catch {
		return 'unreachable';
	}
}
