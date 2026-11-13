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
    has(fingerprint: string, opts?: {
        now?: string;
        policyHash?: string;
    }): boolean;
    grant(approval: DurableApproval): DurableApproval;
    revoke(fingerprint: string): boolean;
    list(limit?: number): DurableApproval[];
};
/** In-memory durable approvals — capability tickets, not chat moderation. */
export declare function createMemoryApprovalStore(max?: number): ApprovalStore;
export declare function grantApproval(store: ApprovalStore, fingerprint: string, opts?: {
    now?: string;
    expiresAt?: string;
    policyHash?: string;
    note?: string;
}): DurableApproval;
//# sourceMappingURL=approvals.d.ts.map