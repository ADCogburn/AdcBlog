// The weekly link-health job. See .github/workflows/link-health.yml.
//
//   npx tsx scripts/links-check.ts [--digest <file>] [--pr-body <file>]
//
// Edits the working tree (the Ledger, dead links in Posts, `removedAt` on
// Archives) and writes the digest and PR body for the workflow to publish.
// Under GitHub Actions it sets the `changed` and `digest` step outputs.

import { appendFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { needsDigest, renderDigest, renderPullRequestBody, runLinkHealth } from '../src/links/health';
import { createNetwork } from '../src/links/network';

const { values } = parseArgs({ options: { digest: { type: 'string' }, 'pr-body': { type: 'string' } } });

const access = process.env.IA_ACCESS_KEY;
const secret = process.env.IA_SECRET_KEY;
const today = new Date().toISOString().slice(0, 10);

const { changed, findings } = await runLinkHealth({
	root: new URL('../', import.meta.url),
	today,
	network: createNetwork({ archiveKeys: access && secret ? { access, secret } : undefined }),
});
const digest = needsDigest(findings);

if (values.digest && digest) writeFileSync(values.digest, renderDigest(findings, today));
if (values['pr-body'] && changed) writeFileSync(values['pr-body'], renderPullRequestBody(findings, today));
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\ndigest=${digest}\n`);

console.log(renderDigest(findings, today));
console.log(`changed=${changed} digest=${digest}`);
