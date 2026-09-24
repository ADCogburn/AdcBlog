import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const astroCli = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));

function build(fixture: string) {
	const root = fileURLToPath(new URL(`./fixtures/build/${fixture}/`, import.meta.url));
	const result = spawnSync(process.execPath, [astroCli, 'build', '--root', root], {
		encoding: 'utf8',
	});
	return { exitCode: result.status, output: result.stdout + result.stderr };
}

describe('astro build', () => {
	it('fails on a Post missing its description, naming the file and field', () => {
		const { exitCode, output } = build('missing-description');

		expect(exitCode).not.toBe(0);
		expect(output).toContain('no-description.mdx');
		expect(output).toMatch(/description.*Required/);
	}, 60_000);
});
