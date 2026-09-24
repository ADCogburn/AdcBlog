# AdcBlog

A personal static blog about coding and computer science. Text-heavy posts with
heavy code-block use and occasional quoted social posts. Publishing is a git push;
everything that can be checked before publication is checked at build time.

## Language

### Writing

**Post**:
A single piece of writing, authored as one MDX file in the blog collection.
_Avoid_: Article, entry, page

**Draft**:
A Post excluded from every build output — no page, no index entry, no feed item,
no sitemap entry. Marked explicitly on the Post. Still shown by the dev server,
which is a preview rather than a build output.
_Avoid_: Unpublished, WIP, hidden

**Embargo**:
A finished Post dated in the future, which publishes itself once that date passes.
Distinct from a Draft: an embargoed Post is complete and merely waiting.
_Avoid_: Scheduled draft, pending

### Embeds

**Embed**:
A quoted social post reproduced inside a Post. Treated as evidence in an argument,
not as decoration — an Embed that fails to render damages the surrounding prose.
_Avoid_: Card, widget, tweet embed

**Archive**:
The committed record of an Embed's content — author, handle, date, text, and the
original provider payload. The Archive, not the live network, is what a build renders.
_Avoid_: Cache, snapshot (reserved for links), backup

**Capture**:
The act of fetching an Embed's content and writing its Archive. Happens once, at
authoring time, on the writer's machine — never during a build.
_Avoid_: Fetch, sync, hydrate

**Removal**:
The state of an Embed whose original has disappeared from its platform. A removed
Embed still renders from its Archive, annotated with the date it was found gone.
_Avoid_: Deleted, broken, 404

### Link health

**Ledger**:
The committed record of every external URL cited in prose, with when it was first
seen, its Snapshot, and its last known liveness.
_Avoid_: Index, database, manifest

**Snapshot**:
A third-party archival copy of a cited page, requested when the URL first enters
the Ledger. The replacement target when the original dies.
_Avoid_: Archive (reserved for Embeds), mirror

**Link rot**:
The decay of cited external URLs over time. Treated as inevitable and managed, not
prevented.
_Avoid_: Dead links, broken links

### Build

**Repo fact**:
Something knowable from the repository alone, with no network access — MDX validity,
frontmatter shape, the presence of an Archive. Repo facts fail the build.
_Avoid_: Local check, static check

**Network fact**:
Something knowable only by reaching a third party — whether a post still exists,
whether a URL still resolves. Network facts never fail a build; they produce issues
and pull requests.
_Avoid_: Remote check, runtime check, live check
