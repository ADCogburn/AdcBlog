import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getPublishedPosts, postUrl } from '../content/posts';

// Description and link only, never full content: a full-content feed would mean
// serialising rendered MDX (Embeds included) into XML, and keeping two
// renderings of every Post in sync forever.
export async function GET(context: APIContext) {
	const posts = await getPublishedPosts();
	const self = new URL('/rss.xml', context.site);
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site!,
		// A self link is what the W3C feed validator asks for beyond the RSS 2.0 minimum.
		xmlns: { atom: 'http://www.w3.org/2005/Atom' },
		customData: `<language>en-us</language><atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: postUrl(post),
		})),
	});
}
