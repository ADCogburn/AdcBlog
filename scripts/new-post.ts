// Create a new Post with schema-valid frontmatter already filled in.
//
//   npm run new -- "Post title"
//
// Prints the path and stops. It does not open an editor: $EDITOR is usually
// unset on Windows, and hardcoding `code` breaks wherever it is not on PATH.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { localDate, newPostPath, newPostSource } from '../src/content/new-post';

const BLOG_DIR = new URL('../src/content/blog/', import.meta.url);

try {
	const title = process.argv.slice(2).join(' ').trim();
	if (!title) throw new Error('Usage: npm run new -- "Post title"');

	const file = newPostPath(title, BLOG_DIR);
	writeFileSync(file, newPostSource(title, localDate(new Date())), { flag: 'wx' });
	console.log(fileURLToPath(file));
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
