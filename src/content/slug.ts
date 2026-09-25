// A Post's filename is its permalink (`/blog/<slug>/`), so it has to already be
// a clean slug: lowercase ASCII letters and digits, separated by single hyphens.
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Latin letters that NFKD does not decompose into a base letter plus accent.
const LATIN_LETTERS: Record<string, string> = {
	ß: 'ss',
	æ: 'ae',
	ø: 'o',
	œ: 'oe',
	đ: 'd',
	ł: 'l',
	þ: 'th',
};

/**
 * A Post title as a slug that satisfies SLUG_PATTERN. Accents are folded
 * ("Café" → "cafe"), apostrophes vanish ("Don't" → "dont") and every other
 * run of non-alphanumerics becomes one hyphen. Throws when nothing usable is
 * left, e.g. a title entirely in a non-Latin script, so the writer picks a
 * slug instead of getting an empty or meaningless one.
 */
export function slugify(title: string): string {
	const slug = title
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[ßæøœđłþ]/g, (letter) => LATIN_LETTERS[letter]!)
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	if (!SLUG_PATTERN.test(slug)) {
		throw new Error(`Cannot make a slug from "${title}". Use a title with some Latin letters or digits.`);
	}
	return slug;
}

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
