import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { localDate, newPostPath, newPostSource } from './new-post';

describe('newPostSource', () => {
	it('starts a Draft dated today with empty description and tags', () => {
		expect(newPostSource('Some Title', '2026-09-24')).toBe(
			[
				'---',
				'title: "Some Title"',
				'description: ""',
				'pubDate: 2026-09-24',
				'tags: []',
				'draft: true',
				'---',
				'',
				'',
			].join('\n'),
		);
	});

	it('quotes a title containing YAML syntax', () => {
		expect(newPostSource('Rust: "fast" # really', '2026-09-24')).toContain(
			'title: "Rust: \\"fast\\" # really"',
		);
	});
});

describe('localDate', () => {
	it("uses the writer's local calendar day", () => {
		expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
	});
});

describe('newPostPath', () => {
	const blogDir = pathToFileURL(`${mkdtempSync(join(tmpdir(), 'adcblog-'))}/`);

	it('names the file after the slugified title', () => {
		expect(newPostPath('Some Title', blogDir).href).toBe(new URL('some-title.mdx', blogDir).href);
	});

	it('refuses a title whose slug collides with an existing Post', () => {
		writeFileSync(new URL('taken.mdx', blogDir), '');

		expect(() => newPostPath('Taken!', blogDir)).toThrow(/already exists/);
	});
});
