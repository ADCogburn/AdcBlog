// Cited URLs in a Post's prose, for the Ledger.
//
// A CS blog's code is full of URLs that were never citations: example
// endpoints, localhost, registry paths. Snapshotting those would fill the
// digest with "dead links" that were never live, so everything that is not
// prose is excluded: frontmatter, fenced code, inline code, ESM lines and MDX
// comments. Extraction and rewriting share one segmentation, so they can never
// disagree about what counts as prose.

interface Segment {
	text: string;
	prose: boolean;
}

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const ESM_LINE = /^(?:import|export)\s/;
// An inline code span (a backtick run closed by a run of the same length) or
// an MDX comment.
const INLINE_NON_PROSE = /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)|\{\/\*[\s\S]*?\*\/\}/g;
const URL_CANDIDATE = /https?:\/\/[^\s<>"'`{}|\\^]+/g;
const TRAILING_PUNCTUATION = /[.,;:!?*_~'"]+$/;
const SNAPSHOT_HOST = 'web.archive.org';

function segment(mdx: string): Segment[] {
	const lines = mdx.split(/(?<=\n)/);
	const blocks: Segment[] = [];
	const push = (text: string, prose: boolean) => {
		const last = blocks.at(-1);
		if (last && last.prose === prose) last.text += text;
		else blocks.push({ text, prose });
	};

	let i = 0;
	if (lines[0]?.trimEnd() === '---') {
		const end = lines.findIndex((line, n) => n > 0 && line.trimEnd() === '---');
		if (end > 0) {
			push(lines.slice(0, end + 1).join(''), false);
			i = end + 1;
		}
	}

	while (i < lines.length) {
		const line = lines[i]!;
		const fence = line.match(FENCE_OPEN)?.[1];
		if (fence) {
			const closer = new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}\\s*$`);
			let end = i + 1;
			while (end < lines.length && !closer.test(lines[end]!)) end++;
			push(lines.slice(i, end + 1).join(''), false);
			i = end + 1;
		} else {
			push(line, !ESM_LINE.test(line));
			i++;
		}
	}

	return blocks.flatMap((block) => (block.prose ? splitInline(block.text) : [block]));
}

function splitInline(text: string): Segment[] {
	const segments: Segment[] = [];
	let last = 0;
	for (const match of text.matchAll(INLINE_NON_PROSE)) {
		segments.push({ text: text.slice(last, match.index), prose: true });
		segments.push({ text: match[0], prose: false });
		last = match.index + match[0].length;
	}
	segments.push({ text: text.slice(last), prose: true });
	return segments;
}

/** A URL candidate with trailing punctuation and unbalanced closing brackets removed. */
function trimUrl(candidate: string): string {
	let url = candidate;
	for (;;) {
		const before = url;
		url = url.replace(TRAILING_PUNCTUATION, '');
		for (const [open, close] of [
			['(', ')'],
			['[', ']'],
		] as const) {
			if (url.endsWith(close) && count(url, close) > count(url, open)) url = url.slice(0, -1);
		}
		if (url === before) return url;
	}
}

function count(text: string, char: string): number {
	return text.split(char).length - 1;
}

function isSnapshot(url: string): boolean {
	try {
		return new URL(url).hostname === SNAPSHOT_HOST;
	} catch {
		return false;
	}
}

/** Cited http(s) URLs in prose, each once, in order of first appearance. */
export function extractProseLinks(mdx: string): string[] {
	const urls = new Set<string>();
	for (const { text, prose } of segment(mdx)) {
		if (!prose) continue;
		for (const [candidate] of text.matchAll(URL_CANDIDATE)) {
			const url = trimUrl(candidate);
			if (!isSnapshot(url)) urls.add(url);
		}
	}
	return [...urls];
}

/**
 * Replace every prose citation of `url` with `snapshot`. A longer URL that
 * merely starts with `url`, and the original embedded inside an existing
 * Snapshot, are left alone, so rewriting twice changes nothing.
 */
export function rewriteProseLink(mdx: string, url: string, snapshot: string): string {
	return segment(mdx)
		.map(({ text, prose }) => {
			if (!prose) return text;
			return text.replace(URL_CANDIDATE, (candidate) => {
				const trimmed = trimUrl(candidate);
				return trimmed === url ? snapshot + candidate.slice(trimmed.length) : candidate;
			});
		})
		.join('');
}
