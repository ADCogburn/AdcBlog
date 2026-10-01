# X syndication fixtures

Raw responses from `cdn.syndication.twimg.com/tweet-result`, the unofficial
endpoint behind X's own embed widget, saved byte-for-byte as received. Capture
uses it only for the author's avatar, which oEmbed does not provide.

`jack-20.json` was recorded on 2026-10-01 from
`https://cdn.syndication.twimg.com/tweet-result?id=20&token=6dq1a2xwd93&lang=en`.
No authentication is required; the `token` is derived from the id, as X's widget
derives it.

## Observed on 2026-10-01

- `user.profile_image_url_https` ends in `_normal.jpg` (48px). Swapping the
  suffix for `_bigger` gives 73px (about 2.6 KB) and for `_200x200` gives 200px.
- The payload also carries `created_at` to the second, like counts and
  verification flags. Capture does not store them.
