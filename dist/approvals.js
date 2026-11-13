function stillValid(row, opts) {
    const now = opts?.now ?? new Date().toISOString();
    if (row.expiresAt && row.expiresAt < now)
        return false;
    if (opts?.policyHash &&
        row.policyHash &&
        row.policyHash !== opts.policyHash) {
        return false;
    }
    return true;
}
/** In-memory durable approvals — capability tickets, not chat moderation. */
export function createMemoryApprovalStore(max = 2000) {
    const byFp = new Map();
    return {
        has(fingerprint, opts) {
            const row = byFp.get(fingerprint);
            if (!row)
                return false;
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
                if (first)
                    byFp.delete(first);
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
export function grantApproval(store, fingerprint, opts) {
    return store.grant({
        fingerprint,
        approvedAt: opts?.now ?? new Date().toISOString(),
        expiresAt: opts?.expiresAt,
        policyHash: opts?.policyHash,
        note: opts?.note,
    });
}
//# sourceMappingURL=approvals.js.map