import { getCollection } from 'astro:content';
import { isPublished } from './published';

/**
 * Every Post that belongs in this build, newest first. The only way pages, the
 * feed and the sitemap (via the post routes) should list Posts, so Drafts and
 * Embargoes are enforced in one place.
 */
export async function getPublishedPosts() {
	const context = { now: new Date(), dev: import.meta.env.DEV };
	const posts = await getCollection('blog', (post) => isPublished(post.data, context));
	return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function postUrl(post: { id: string }): string {
	return `/blog/${post.id}/`;
}
