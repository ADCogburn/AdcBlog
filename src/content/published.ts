interface PublicationFields {
	draft: boolean;
	pubDate: Date;
}

interface PublicationContext {
	now: Date;
	dev: boolean;
}

/**
 * Whether a Post belongs in the output. Production excludes Drafts and
 * embargoed Posts (dated in the future); dev shows everything so both can be
 * previewed. See CONTEXT.md for Draft vs Embargo.
 */
export function isPublished(post: PublicationFields, context: PublicationContext): boolean {
	if (context.dev) return true;
	return !post.draft && post.pubDate <= context.now;
}
