import type { IntentFingerprint } from "./types.js";

export type DurableApproval = {
  fingerprint: IntentFingerprint;
  approvedAt: string;
  /** ISO expiry; omit = until revoked / policy hash changes. */
  expiresAt?: string;
  /** Policy hash at approval time — drift invalidates the ticket. */
  policyHash?: string;
  note?: string;
};

export type ApprovalStore = {
  has(fingerprint: string, opts?: { now?: string; policyHash?: string }): boolean;
  grant(approval: DurableApproval): DurableApproval;
  revoke(fingerprint: string): boolean;
  list(limit?: number): DurableApproval[];
};

function stillValid(
  row: DurableApproval,
  opts?: { now?: string; policyHash?: string },
): boolean {
  const now = opts?.now ?? new Date().toISOString();
  if (row.expiresAt && row.expiresAt < now) return false;
  if (
    opts?.policyHash &&
    row.policyHash &&
    row.policyHash !== opts.policyHash
  ) {
    return false;
  }
  return true;
}

/** In-memory durable approvals — capability tickets, not chat moderation. */
export function createMemoryApprovalStore(max = 2000): ApprovalStore {
  const byFp = new Map<string, DurableApproval>();
  return {
    has(fingerprint, opts) {
      const row = byFp.get(fingerprint);
      if (!row) return false;
      if (!stillValid(row, opts)) {
        byFp.delete(fingerprint);
        return false;
      }
      return true;
    },
    grant(approval) {
      byFp.set(approval.fingerprint, approval);
      if (byFp.size > max) {
        const first = byFp.keys().next().value;
        if (first) byFp.delete(first);
      }
      return approval;
    },
    revoke(fingerprint) {
      return byFp.delete(fingerprint);
    },
    list(limit = 40) {
      return [...byFp.values()]
        .sort((a, b) => (a.approvedAt < b.approvedAt ? 1 : -1))
        .slice(0, Math.max(1, Math.min(limit, max)));
    },
  };
}

export function grantApproval(
  store: ApprovalStore,
  fingerprint: string,
  opts?: {
    now?: string;
    expiresAt?: string;
    policyHash?: string;
    note?: string;
  },
): DurableApproval {
  return store.grant({
    fingerprint,
    approvedAt: opts?.now ?? new Date().toISOString(),
    expiresAt: opts?.expiresAt,
    policyHash: opts?.policyHash,
    note: opts?.note,
  });
}
