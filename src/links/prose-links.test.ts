import { describe, expect, it } from 'vitest';
import { extractProseLinks, rewriteProseLink } from './prose-links';

const mdx = (...lines: string[]) => lines.join('\n');

describe('extractProseLinks', () => {
	it('finds Markdown links, autolinks, bare URLs, reference definitions and hrefs', () => {
		const source = mdx(
			'See [the docs](https://docs.example.com/guide) and <https://angle.example.com>.',
			'Or just https://bare.example.com/path, which GFM links.',
			'',
			'[ref]: https://ref.example.com/def',
			'',
			'<a href="https://jsx.example.com/">custom</a>',
		);

		expect(extractProseLinks(source)).toEqual([
			'https://docs.example.com/guide',
			'https://angle.example.com',
			'https://bare.example.com/path',
			'https://ref.example.com/def',
			'https://jsx.example.com/',
		]);
	});

	it('ignores frontmatter', () => {
		const source = mdx('---', 'title: https://frontmatter.example.com', '---', '', 'Prose.');

		expect(extractProseLinks(source)).toEqual([]);
	});

	it('ignores URLs in fenced code blocks, backtick or tilde, of any fence length', () => {
		const source = mdx(
			'```ts',
			"fetch('https://api.example.com/v1');",
			'```',
			'',
			'~~~',
			'http://localhost:3000',
			'~~~',
			'',
			'````md',
			'```',
			'https://nested.example.com',
			'```',
			'````',
			'',
			'After https://after.example.com',
		);

		expect(extractProseLinks(source)).toEqual(['https://after.example.com']);
	});

	it('ignores URLs in inline code, including double-backtick spans', () => {
		const source = 'Run `curl https://registry.example.com` or ``a ` https://two.example.com`` then read https://real.example.com.';

		expect(extractProseLinks(source)).toEqual(['https://real.example.com']);
	});

	it('ignores MDX comments and ESM import lines', () => {
		const source = mdx(
			"import Thing from 'https://esm.example.com/thing.js';",
			'',
			'{/* https://comment.example.com */}',
			'Visible https://visible.example.com',
		);

		expect(extractProseLinks(source)).toEqual(['https://visible.example.com']);
	});

	it('trims trailing punctuation but keeps balanced parentheses', () => {
		const source = mdx(
			'Read https://a.example.com/x. Then (https://b.example.com/y) and',
			'[wiki](https://en.wikipedia.org/wiki/Fork_(software_development)), done!',
			'Also https://c.example.com/z?q=1&r=2;',
		);

		expect(extractProseLinks(source)).toEqual([
			'https://a.example.com/x',
			'https://b.example.com/y',
			'https://en.wikipedia.org/wiki/Fork_(software_development)',
			'https://c.example.com/z?q=1&r=2',
		]);
	});

	it('stops at a Markdown link title', () => {
		expect(extractProseLinks('[x](https://t.example.com "Title")')).toEqual(['https://t.example.com']);
	});

	it('returns each URL once, in order of first appearance', () => {
		const source = 'https://one.example.com https://two.example.com https://one.example.com';

		expect(extractProseLinks(source)).toEqual(['https://one.example.com', 'https://two.example.com']);
	});

	it('skips links that are already Snapshots', () => {
		const source = '[old](https://web.archive.org/web/20260101000000/https://gone.example.com)';

		expect(extractProseLinks(source)).toEqual([]);
	});
});

describe('rewriteProseLink', () => {
	const snapshot = 'https://web.archive.org/web/20260101000000/https://gone.example.com/page';

	it('replaces the cited URL with its Snapshot, keeping the original legible inside it', () => {
		const source = 'See [docs](https://gone.example.com/page) and https://gone.example.com/page.';

		expect(rewriteProseLink(source, 'https://gone.example.com/page', snapshot)).toBe(
			`See [docs](${snapshot}) and ${snapshot}.`,
		);
	});

	it('leaves code, frontmatter and longer URLs that merely start the same alone', () => {
		const source = mdx(
			'---',
			'canonical: https://gone.example.com/page',
			'---',
			'',
			'`https://gone.example.com/page` and https://gone.example.com/page-two',
			'```',
			'https://gone.example.com/page',
			'```',
		);

		expect(rewriteProseLink(source, 'https://gone.example.com/page', snapshot)).toBe(source);
	});

	it('is idempotent: a Snapshot is never rewritten again', () => {
		const once = rewriteProseLink('[docs](https://gone.example.com/page)', 'https://gone.example.com/page', snapshot);

		expect(rewriteProseLink(once, 'https://gone.example.com/page', snapshot)).toBe(once);
	});
});
