// The Ledger: every external URL cited in prose, with its Snapshot and last
// known liveness. Job state for the weekly link-health job only. Nothing in
// the build reads it (ADR-0002), which is why it lives in data/, not src/.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * - `alive`: answered successfully.
 * - `dead`: definitively gone (HTTP 404/410, or the host no longer resolves).
 *   Only this status leads to a rewrite.
 * - `unreachable`: anything else (timeouts, 5xx, bot blocking). Reported,
 *   never acted on, because a flaky server is not Link rot.
 */
export type LinkStatus = 'alive' | 'dead' | 'unreachable';

export interface LedgerEntry {
	url: string;
	/** YYYY-MM-DD. */
	firstSeen: string;
	/** The Wayback Machine copy requested when the URL entered the Ledger, if one was made. */
	snapshot: string | null;
	/** YYYY-MM-DD. */
	lastChecked: string;
	status: LinkStatus;
}

export function loadLedger(file: URL): LedgerEntry[] {
	if (!existsSync(file)) return [];
	return JSON.parse(readFileSync(file, 'utf8')) as LedgerEntry[];
}

/** Sorted by URL with one key per line, so each weekly change is a small diff. */
export function saveLedger(file: URL, entries: LedgerEntry[]): void {
	const sorted = [...entries].sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
	writeFileSync(file, `${JSON.stringify(sorted, null, '\t')}\n`);
}
