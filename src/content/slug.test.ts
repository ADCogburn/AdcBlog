import { describe, expect, it } from 'vitest';
import { postIdFromEntry, SLUG_PATTERN, slugify } from './slug';

describe('slugify', () => {
	it.each([
		['Some Title', 'some-title'],
		['Hello, World!', 'hello-world'],
		["Don't Panic: A Guide", 'dont-panic-a-guide'],
		['Don’t use curly quotes', 'dont-use-curly-quotes'],
		['C++ & Rust -- a comparison', 'c-rust-a-comparison'],
		['Café Déjà Vu', 'cafe-deja-vu'],
		['Straße über Ångström', 'strasse-uber-angstrom'],
		['Łódź and Øresund', 'lodz-and-oresund'],
		['  --Leading and trailing--  ', 'leading-and-trailing'],
		['Why? Why not!?', 'why-why-not'],
		['Rust 2024 🦀 edition', 'rust-2024-edition'],
		['UTF‑8 vs UTF‑16', 'utf-8-vs-utf-16'],
	])('%j becomes %j', (title, slug) => {
		expect(slugify(title)).toBe(slug);
	});

	it.each(['日本語', '!!!', '   ', '🦀'])('refuses %j, which has nothing to slug', (title) => {
		expect(() => slugify(title)).toThrow(/Cannot make a slug/);
	});

	it('always produces a slug the blog collection accepts as a filename', () => {
		for (const title of ['A', 'a--b', 'x_y', 'Ωmega 3', '1. Intro']) {
			const slug = slugify(title);
			expect(slug).toMatch(SLUG_PATTERN);
			expect(postIdFromEntry(`${slug}.mdx`)).toBe(slug);
		}
	});
});

describe('postIdFromEntry', () => {
	it('uses the filename, without its extension, as the slug', () => {
		expect(postIdFromEntry('hello-world.mdx')).toBe('hello-world');
	});

	it('keeps directories as path segments', () => {
		expect(postIdFromEntry('series/part-1.mdx')).toBe('series/part-1');
	});

	it.each(['Hello-World.mdx', 'hello world.mdx', 'hello--world.mdx', '-hello.mdx', 'héllo.mdx'])(
		'rejects %s, which is not a clean slug',
		(entry) => {
			expect(() => postIdFromEntry(entry)).toThrow(/not a valid slug/);
		},
	);
});
