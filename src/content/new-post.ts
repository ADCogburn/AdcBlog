import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { slugify } from './slug';

/** Today on the writer's machine, as YYYY-MM-DD. */
export function localDate(now: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * A new Post's file contents. Starts as a Draft with today's date and no tags,
 * rather than whatever an old Post that was copied happened to have.
 */
export function newPostSource(title: string, today: string): string {
	return [
		'---',
		// JSON strings are valid YAML double-quoted scalars, so colons, quotes
		// and '#' in a title survive.
		`title: ${JSON.stringify(title)}`,
		'description: ""',
		`pubDate: ${today}`,
		'tags: []',
		'draft: true',
		'---',
		'',
		'',
	].join('\n');
}

/**
 * Where a Post titled `title` goes inside `blogDir`. Refuses to reuse an
 * existing filename: it is a live permalink, and overwriting would destroy a
 * Post, while silently suffixing "-2" would publish a URL nobody chose.
 */
export function newPostPath(title: string, blogDir: URL): URL {
	const file = new URL(`${slugify(title)}.mdx`, blogDir);
	if (existsSync(file)) {
		throw new Error(`A Post already exists at ${fileURLToPath(file)}. Choose a different title.`);
	}
	return file;
}
