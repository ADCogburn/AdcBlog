import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { type EmbedStatus, type Network, needsDigest, renderDigest, runLinkHealth } from './health';
import type { LedgerEntry, LinkStatus } from './ledger';

const LIVE = 'https://docs.example.com/guide';
const DOOMED = 'https://gone.example.com/page';
const CODE_ONLY = 'https://api.example.com/v1';
const snapshotOf = (url: string) => `https://web.archive.org/web/20260101000000/${url}`;

const post = [
	'---',
	'title: Cites things',
	'description: A Post citing a live link, a doomed one and one only in code.',
	'pubDate: 2026-01-01',
	'---',
	'',
	`See [the docs](${LIVE}) and [this page](${DOOMED}).`,
	'',
	'```ts',
	`fetch('${CODE_ONLY}');`,
	'```',
	'',
].join('\n');

const archive = {
	id: '20',
	url: 'https://x.com/jack/status/20',
	authorName: 'jack',
	authorHandle: 'jack',
	date: '2006-03-21',
	text: 'just setting up my twttr',
	capturedAt: '2026-01-01T00:00:00.000Z',
	raw: { type: 'rich' },
};

/** A Network whose answers the test controls, recording every URL it was asked about. */
function fakeNetwork(links: Record<string, LinkStatus>, embed: EmbedStatus = 'alive') {
	const asked: string[] = [];
	const network: Network = {
		async checkLink(url) {
			asked.push(url);
			return links[url] ?? 'alive';
		},
		async snapshot(url) {
			return snapshotOf(url);
		},
		async checkEmbed() {
			return embed;
		},
	};
	return { network, asked };
}

let root: URL;
const file = (path: string) => new URL(path, root);
const read = (path: string) => readFileSync(file(path), 'utf8');
const ledger = () => JSON.parse(read('data/link-ledger.json')) as LedgerEntry[];

beforeEach(() => {
	root = pathToFileURL(`${mkdtempSync(join(tmpdir(), 'adcblog-links-'))}/`);
	mkdirSync(file('src/content/blog/'), { recursive: true });
	mkdirSync(file('src/content/embeds/'), { recursive: true });
	mkdirSync(file('data/'), { recursive: true });
	writeFileSync(file('src/content/blog/cites.mdx'), post);
	writeFileSync(file('src/content/embeds/20.json'), `${JSON.stringify(archive, null, '\t')}\n`);
	writeFileSync(file('data/link-ledger.json'), '[]\n');
});

describe('runLinkHealth', () => {
	it('adds newly cited prose links to the Ledger with a Snapshot, and never touches code URLs', async () => {
		const { network, asked } = fakeNetwork({});

		const result = await runLinkHealth({ root, today: '2026-01-05', network });

		expect(result.changed).toBe(true);
		expect(asked).not.toContain(CODE_ONLY);
		expect(ledger()).toEqual([
			{ url: LIVE, firstSeen: '2026-01-05', snapshot: snapshotOf(LIVE), lastChecked: '2026-01-05', status: 'alive' },
			{ url: DOOMED, firstSeen: '2026-01-05', snapshot: snapshotOf(DOOMED), lastChecked: '2026-01-05', status: 'alive' },
		].sort((a, b) => a.url.localeCompare(b.url)));
		expect(needsDigest(result.findings)).toBe(false);
	});

	it('rewrites a link that has died to its Snapshot, and reports it in the digest', async () => {
		await runLinkHealth({ root, today: '2026-01-05', network: fakeNetwork({}).network });

		const result = await runLinkHealth({
			root,
			today: '2026-01-12',
			network: fakeNetwork({ [DOOMED]: 'dead' }).network,
		});

		expect(result.changed).toBe(true);
		expect(read('src/content/blog/cites.mdx')).toBe(
			post.replace(`(${DOOMED})`, `(${snapshotOf(DOOMED)})`),
		);
		expect(ledger().find((entry) => entry.url === DOOMED)).toMatchObject({
			status: 'dead',
			lastChecked: '2026-01-12',
		});
		expect(needsDigest(result.findings)).toBe(true);
		expect(renderDigest(result.findings, '2026-01-12')).toContain(`${DOOMED} → ${snapshotOf(DOOMED)}`);
	});

	it('reports, but cannot rewrite, a link that was already dead when first cited', async () => {
		const result = await runLinkHealth({
			root,
			today: '2026-01-05',
			network: fakeNetwork({ [DOOMED]: 'dead' }).network,
		});

		expect(read('src/content/blog/cites.mdx')).toBe(post);
		expect(result.findings.deadWithoutSnapshot).toEqual([{ url: DOOMED, posts: ['cites.mdx'] }]);
		expect(renderDigest(result.findings, '2026-01-05')).toContain('Dead, no Snapshot');
	});

	it('never rewrites a link that is merely unreachable', async () => {
		await runLinkHealth({ root, today: '2026-01-05', network: fakeNetwork({}).network });

		const result = await runLinkHealth({
			root,
			today: '2026-01-12',
			network: fakeNetwork({ [DOOMED]: 'unreachable' }).network,
		});

		expect(read('src/content/blog/cites.mdx')).toBe(post);
		expect(result.findings.unreachable).toEqual([{ url: DOOMED, posts: ['cites.mdx'] }]);
	});

	it('marks a removed Embed with removedAt as a one-line change after capturedAt', async () => {
		const before = read('src/content/embeds/20.json');

		const result = await runLinkHealth({
			root,
			today: '2026-01-12',
			network: fakeNetwork({}, 'removed').network,
		});

		const after = read('src/content/embeds/20.json');
		expect(result.findings.removedEmbeds).toEqual([{ id: '20', url: archive.url }]);
		expect(after).toBe(
			before.replace('"capturedAt": "2026-01-01T00:00:00.000Z",\n', '"capturedAt": "2026-01-01T00:00:00.000Z",\n\t"removedAt": "2026-01-12",\n'),
		);
	});

	it('does not mark an Embed removed on a 403, only reports it', async () => {
		const before = read('src/content/embeds/20.json');

		const result = await runLinkHealth({
			root,
			today: '2026-01-12',
			network: fakeNetwork({}, 'unembeddable').network,
		});

		expect(read('src/content/embeds/20.json')).toBe(before);
		expect(result.findings.unembeddable).toHaveLength(1);
	});

	it('changes nothing in a quiet week, so no pull request is opened', async () => {
		await runLinkHealth({ root, today: '2026-01-05', network: fakeNetwork({}).network });
		const ledgerBefore = read('data/link-ledger.json');

		const result = await runLinkHealth({ root, today: '2026-01-12', network: fakeNetwork({}).network });

		expect(result.changed).toBe(false);
		expect(read('data/link-ledger.json')).toBe(ledgerBefore);
	});
});
