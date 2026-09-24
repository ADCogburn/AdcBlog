import { describe, expect, it } from 'vitest';
import { postIdFromEntry } from './slug';

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
