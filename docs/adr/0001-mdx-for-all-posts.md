# All posts are authored in MDX

Astro 7 replaced the remark/rehype Markdown pipeline with Sätteri, a Rust processor
with its own AST and plugin API, so remark plugins no longer run. That removed the
cheap path to rewriting bare URLs into embeds inside plain `.md`. We author every
Post in `.mdx` instead, because MDX's stricter parsing is the only mechanism
available that turns a malformed Post into a build failure rather than a silently
wrong page — which is the property we care about most.

## Considered options

- **Plain `.md` with a Sätteri mdast plugin.** Feasible: plugins are authored in
  TypeScript, visitors may return a Promise, and mdast visitors can emit raw HTML.
  Rejected because it means owning a plugin against a plugin API only a few months
  old, whose diagnostics (`ctx.report()`) do not surface to the caller and whose
  plugin instances are reused across compiles unless returned from a factory. It
  also gives up loud parse failure entirely — Markdown never fails to parse.
- **Plain `.md` with the legacy `unified()` processor.** Rejected outright: it is
  the deprecated path, costs the build-speed improvement, and buys nothing the
  Sätteri plugin option does not.

## Consequences

- A stray `{` or unclosed `<` in prose fails the build. This is intended, and it
  will occasionally fire on legitimate prose such as a generic type written outside
  a code fence.
- Changing format later means touching every Post, so this is effectively permanent
  once there is a body of writing.
- We do not use astro-embed's auto-embed integration, which would have been the
  main reason to prefer MDX. See ADR-0002 — explicit tags were chosen for the same
  fail-loudly reason, and they work in MDX regardless.
