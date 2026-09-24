import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

const astroCli = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));

// Vitest copies its import.meta.env into process.env (DEV=1, MODE=test,
// NODE_ENV=test, ...). A build that inherits them runs with
// import.meta.env.DEV true and publishes Drafts, so builds get a clean env.
const vitestEnv = /^(NODE_ENV|MODE|DEV|PROD|SSR|BASE_URL|TEST|VITEST.*)$/;
const buildEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !vitestEnv.test(key)));

function build(fixture: string) {
	const root = fileURLToPath(new URL(`./fixtures/build/${fixture}/`, import.meta.url));
	const result = spawnSync(process.execPath, [astroCli, 'build', '--root', root], {
		encoding: 'utf8',
		env: buildEnv,
	});
	return { exitCode: result.status, output: result.stdout + result.stderr, dist: join(root, 'dist') };
}

describe('astro build', () => {
	it('fails on a Post missing its description, naming the file and field', () => {
		const { exitCode, output } = build('missing-description');

		expect(exitCode).not.toBe(0);
		expect(output).toContain('no-description.mdx');
		expect(output).toMatch(/description.*Required/);
	}, 60_000);

	it('fails on a Post whose filename is not a clean slug, naming the file', () => {
		const { exitCode, output } = build('bad-filename');

		expect(exitCode).not.toBe(0);
		expect(output).toContain('My Post.mdx');
		expect(output).toContain('not a valid slug');
	}, 60_000);
});

describe('a production build of the site', () => {
	let dist: string;
	const read = (path: string) => readFileSync(join(dist, path), 'utf8');

	beforeAll(() => {
		const result = build('site');
		expect(result.exitCode, result.output).toBe(0);
		dist = result.dist;
	}, 60_000);

	it('publishes a finished Post at /blog/<slug>/, in the index, feed and sitemap', () => {
		expect(existsSync(join(dist, 'blog/visible-post/index.html'))).toBe(true);
		expect(read('index.html')).toContain('/blog/visible-post/');
		expect(read('rss.xml')).toContain('/blog/visible-post/');
		expect(read('sitemap-0.xml')).toContain('/blog/visible-post/');
	});

	it.each(['secret-draft', 'future-embargo'])('leaves %s out of every output', (slug) => {
		expect(existsSync(join(dist, `blog/${slug}`))).toBe(false);
		for (const output of ['index.html', 'rss.xml', 'sitemap-0.xml']) {
			expect(read(output), output).not.toContain(slug);
		}
	});

	it('puts only the description and link in the feed, never the Post body', () => {
		const feed = read('rss.xml');

		expect(feed).toContain('A finished Post dated in the past.');
		expect(feed).not.toContain('This Post is published.');
	});
});
