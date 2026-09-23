# Repo facts fail the build; network facts file tickets

The build fails only on things knowable from the repository alone — MDX validity,
frontmatter shape, the presence of an Embed's Archive. Nothing that requires
reaching a third party may fail a build. Whether a social post still exists or a
cited URL still resolves is discovered by a scheduled job, which opens issues and
pull requests instead. This is what lets the build be strict without ever leaving
the blog unpublishable because someone else deleted something.

## Consequences

- **Embeds are captured at authoring time, not build time.** A script fetches the
  provider payload on the writer's machine and writes an Archive, which is committed
  alongside the Post. Builds read the Archive off disk.
- **Production builds make zero network calls.** They are reproducible, work
  offline, and are immune to provider outages, rate limits, and endpoint changes.
  This removes the single largest source of long-run fragility for embedded content.
- **A Post referencing a missing Archive fails the build.** That is a repo fact,
  and it is the error you get for forgetting to commit the Archive.
- **A dead Embed or dead link never blocks a deploy.** The weekly job marks the
  Embed as removed, or rewrites a dead link to its Snapshot, as a pull request for
  review. Posts keep rendering from their Archive in the meantime.
- **Do not add a link checker, embed validator, or liveness probe to the build.**
  It is the obvious-looking improvement and it would make an unrelated third party
  able to block publishing. That is the specific failure this decision exists to
  prevent.

## Considered options

- **Fetch embeds during the build, fail on failure.** Rejected: one deleted post
  in 2028 would block every subsequent deploy until an old Post was edited.
- **Fetch during the build, degrade silently on failure.** This is what
  astro-embed does today — `Tweet.astro` renders nothing when the fetch fails, with
  no warning and a successful build. Rejected because a Post's argument can depend
  on the quoted material, and a silent gap is worse than a loud failure.
- **Commit archives from CI.** Rejected: ephemeral runners have no "first build",
  so this requires a bot with write access committing to the branch it deploys from.
