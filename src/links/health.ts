// One run of the weekly link-health job: find cited URLs, Snapshot new ones,
// check liveness, rewrite dead links to their Snapshot, and mark removed
// Embeds. It edits files in the working tree and returns what it found. The
// workflow turns that into one pull request and one digest issue. It never
// commits, and nothing here can fail a build: every result is a Network fact.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { type LinkStatus, loadLedger, saveLedger } from './ledger';
import { extractProseLinks, rewriteProseLink } from './prose-links';

export type EmbedStatus = 'alive' | 'removed' | 'unembeddable' | 'unreachable';

export interface Network {
	checkLink(url: string): Promise<LinkStatus>;
	/** Request a Snapshot, returning its URL, or null if none could be made. */
	snapshot(url: string): Promise<string | null>;
	checkEmbed(url: string): Promise<EmbedStatus>;
}

export interface Findings {
	snapshotted: { url: string; snapshot: string | null }[];
	rewritten: { url: string; snapshot: string; posts: string[] }[];
	deadWithoutSnapshot: { url: string; posts: string[] }[];
	unreachable: { url: string; posts: string[] }[];
	removedEmbeds: { id: string; url: string }[];
	unembeddable: { id: string; url: string }[];
	unreachableEmbeds: { id: string; url: string }[];
}

export interface RunResult {
	/** Whether any file changed, i.e. whether there is a pull request to open. */
	changed: boolean;
	findings: Findings;
}

interface RunOptions {
	/** The repository root. */
	root: URL;
	/** Today as YYYY-MM-DD, recorded in the Ledger and in `removedAt`. */
	today: string;
	network: Network;
}

export async function runLinkHealth({ root, today, network }: RunOptions): Promise<RunResult> {
	const blogDir = new URL('src/content/blog/', root);
	const embedsDir = new URL('src/content/embeds/', root);
	const ledgerFile = new URL('data/link-ledger.json', root);

	const findings: Findings = {
		snapshotted: [],
		rewritten: [],
		deadWithoutSnapshot: [],
		unreachable: [],
		removedEmbeds: [],
		unembeddable: [],
		unreachableEmbeds: [],
	};
	let changed = false;

	// Every cited URL, and the Posts citing it.
	const posts = listFiles(blogDir, '.mdx');
	const sources = new Map(posts.map((post) => [post, readFileSync(new URL(post, blogDir), 'utf8')]));
	const citedIn = new Map<string, string[]>();
	for (const [post, source] of sources) {
		for (const url of extractProseLinks(source)) {
			citedIn.set(url, [...(citedIn.get(url) ?? []), post]);
		}
	}

	const ledger = new Map(loadLedger(ledgerFile).map((entry) => [entry.url, entry]));
	const urls = [...new Set([...ledger.keys(), ...citedIn.keys()])];

	for (const url of urls) {
		const status = await network.checkLink(url);
		let entry = ledger.get(url);

		if (!entry) {
			// Snapshot on first sight, while the page is most likely still up.
			const snapshot = status === 'alive' ? await network.snapshot(url) : null;
			entry = { url, firstSeen: today, snapshot, lastChecked: today, status };
			ledger.set(url, entry);
			findings.snapshotted.push({ url, snapshot });
			changed = true;
		} else {
			if (entry.status !== status) changed = true;
			entry.status = status;
			entry.lastChecked = today;
			if (!entry.snapshot && status === 'alive' && citedIn.has(url)) {
				entry.snapshot = await network.snapshot(url);
				if (entry.snapshot) changed = true;
			}
		}

		const citing = citedIn.get(url);
		if (!citing) continue;
		if (status === 'dead' && entry.snapshot) {
			for (const post of citing) {
				const source = sources.get(post)!;
				const rewritten = rewriteProseLink(source, url, entry.snapshot);
				sources.set(post, rewritten);
				writeFileSync(new URL(post, blogDir), rewritten);
			}
			findings.rewritten.push({ url, snapshot: entry.snapshot, posts: citing });
			changed = true;
		} else if (status === 'dead') {
			findings.deadWithoutSnapshot.push({ url, posts: citing });
		} else if (status === 'unreachable') {
			findings.unreachable.push({ url, posts: citing });
		}
	}

	for (const file of listFiles(embedsDir, '.json')) {
		const path = new URL(file, embedsDir);
		const archive = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
		if (archive.removedAt) continue;
		const id = String(archive.id);
		const url = String(archive.url);
		const status = await network.checkEmbed(url);

		if (status === 'removed') {
			writeFileSync(path, `${JSON.stringify(withRemovedAt(archive, today), null, '\t')}\n`);
			findings.removedEmbeds.push({ id, url });
			changed = true;
		} else if (status === 'unembeddable') {
			findings.unembeddable.push({ id, url });
		} else if (status === 'unreachable') {
			findings.unreachableEmbeds.push({ id, url });
		}
	}

	// Only persisted alongside a real change, so a quiet week opens no PR.
	if (changed) saveLedger(ledgerFile, [...ledger.values()]);

	return { changed, findings };
}

/** `removedAt` placed right after `capturedAt`, so the change is one line in a diff. */
function withRemovedAt(archive: Record<string, unknown>, today: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(archive)) {
		result[key] = value;
		if (key === 'capturedAt') result.removedAt = today;
	}
	result.removedAt ??= today;
	return result;
}

function listFiles(dir: URL, extension: string): string[] {
	try {
		return readdirSync(dir, { recursive: true, encoding: 'utf8' })
			.map((file) => file.replaceAll('\\', '/'))
			.filter((file) => file.endsWith(extension))
			.sort();
	} catch {
		return [];
	}
}

/** Whether anything needs a human to read the digest. New Snapshots alone do not. */
export function needsDigest(findings: Findings): boolean {
	const { snapshotted: _, ...problems } = findings;
	return Object.values(problems).some((list) => list.length > 0);
}

export function renderDigest(findings: Findings, today: string): string {
	const sections: string[] = [`Link health, ${today}. Everything the weekly job found, in one place.`];
	const section = (title: string, lines: string[], note?: string) => {
		if (lines.length === 0) return;
		sections.push([`## ${title} (${lines.length})`, ...(note ? [note] : []), '', ...lines].join('\n'));
	};
	const posts = (list: string[]) => list.map((post) => `\`${post}\``).join(', ');

	section(
		'Rewritten to Snapshot',
		findings.rewritten.map(({ url, snapshot, posts: p }) => `- ${url} → ${snapshot} (${posts(p)})`),
		'Dead links replaced with their Wayback Machine Snapshot in the link-health pull request.',
	);
	section(
		'Dead, no Snapshot',
		findings.deadWithoutSnapshot.map(({ url, posts: p }) => `- ${url} (${posts(p)})`),
		'Needs a manual fix: find a replacement or remove the link.',
	);
	section(
		'Embeds removed',
		findings.removedEmbeds.map(({ id, url }) => `- \`${id}\` ${url}`),
		'Marked with `removedAt` in the pull request. Posts keep rendering from the Archive, with a Removal notice.',
	);
	section(
		'Embeds not embeddable',
		findings.unembeddable.map(({ id, url }) => `- \`${id}\` ${url}`),
		'X answered 403: the account may be protected or suspended. Not marked removed; check by hand.',
	);
	section(
		'Unreachable',
		[
			...findings.unreachable.map(({ url, posts: p }) => `- ${url} (${posts(p)})`),
			...findings.unreachableEmbeds.map(({ id, url }) => `- Embed \`${id}\` ${url}`),
		],
		'Timed out, errored or blocked the checker. Not acted on; persistent entries are worth a look.',
	);

	return `${sections.join('\n\n')}\n`;
}

export function renderPullRequestBody(findings: Findings, today: string): string {
	const lines = [
		`Automated link-health changes from ${today}. Review, then merge to apply.`,
		'',
		`- Links rewritten to Snapshots: ${findings.rewritten.length}`,
		`- Embeds marked removed: ${findings.removedEmbeds.length}`,
		`- New Ledger entries: ${findings.snapshotted.length}`,
		'',
		'Details are in the link-health digest issue. This PR is regenerated from the default branch on every run.',
	];
	return `${lines.join('\n')}\n`;
}
