# X oEmbed fixtures

Raw responses from X's oEmbed endpoint for real social posts, saved byte-for-byte
as received. They are test inputs for the oEmbed parser, not Archives — do not
move them into the embeds collection.

Do not reformat, pretty-print or re-encode these files. The `html` field is one
string, and its exact escaping and whitespace (such as the spaces around `<br>` in
the OnePlus social post) are what the parser must handle. `.gitattributes` stops
git from rewriting their line endings.

`sources.json` lists each fixture's social post, the exact request URL, the date it
was recorded and the cases it covers. The request URLs are kept verbatim rather than
derived, because the byte-exact request is what reproduces the fixture. To refresh
one, request its `requestUrl`, save the body unchanged, and update `recordedAt`.

## Observed on 2026-09-24

- `publish.twitter.com/oembed` answers `301` to `publish.x.com/oembed`. No
  authentication is required.
- Media renders as `pic.twitter.com/…`, including for a social post from
  2026-09-20 (the Complex fixture). X's oEmbed docs show `pic.x.com/…` in their
  sample response, but requesting that same sample post live returns
  `pic.twitter.com`. Either may appear, so the parser should accept both. The link
  is a `t.co` redirect to the social post's photo page, not an image file.
- Encoding inside `html` is mixed:
  - Emoji are JSON-escaped as UTF-16 surrogate pairs (`\uD83D\uDC47`).
  - Other non-ASCII, such as the curly quote `’`, is raw UTF-8.
  - `<` and `>` are escaped as `\u003C` and `\u003E`, and `/` as `\/`.
- In the post text itself, the only HTML entity seen is `&#39;`. `&amp;` appears
  only inside hashtag `href`s, and `&mdash;` only in the byline. Line breaks are
  `<br>` tags inside the `<p>`.
- For the Capture script:
  - A social post that does not exist returns `404` with an HTML page, not JSON.
  - An old `@Support` post returned `403` instead, so "not found" and "not allowed"
    are distinct failures.
  - Check the status code before parsing.
