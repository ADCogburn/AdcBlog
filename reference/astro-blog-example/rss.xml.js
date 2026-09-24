// REFERENCE ONLY — not part of the build. Copied verbatim (below this header)
// from withastro/astro@astro@7.3.5, examples/blog/src/pages/rss.xml.js, to show
// the current @astrojs/rss API shape. Rewritten as src/pages/rss.xml.js in
// Phase 3 (#5); delete this file then.

import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	const posts = await getCollection('blog');
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/blog/${post.id}/`,
		})),
	});
}
