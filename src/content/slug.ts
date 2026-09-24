// A Post's filename is its permalink (`/blog/<slug>/`), so it has to already be
// a clean slug: lowercase ASCII letters and digits, separated by single hyphens.
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The id — and so the permalink slug — of a Post, taken verbatim from its path
 * within the blog collection. Throws on a filename that is not a clean slug,
 * which fails the build: a URL is a repo fact, so it is checked, not repaired.
 * Frontmatter cannot override it.
 */
export function postIdFromEntry(entry: string): string {
	const id = entry.replace(/\.mdx$/, '');
	for (const segment of id.split('/')) {
		if (!SLUG_PATTERN.test(segment)) {
			throw new Error(
				`Post filename "${entry}" is not a valid slug. Use lowercase letters, digits and single hyphens, e.g. "my-post.mdx".`,
			);
		}
	}
	return id;
}
