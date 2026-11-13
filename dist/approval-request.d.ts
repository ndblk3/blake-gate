import type { ApprovalChannel, ApprovalRequest, CompiledPolicy, GateDecision } from "./types.js";
/**
 * Protocol object for human approval — delivery is a thin host adapter
 * (webhook / email / Slack). Core stays a runtime; approval is part of
 * the contract, not the UI.
 */
export declare function buildApprovalRequest(input: {
    decision: GateDecision;
    policy: CompiledPolicy;
    channels?: ApprovalChannel[];
    callbackUrl?: string;
    now?: string;
}): ApprovalRequest;
export type ApprovalDelivery = {
    /** Host implements webhook / email / Slack — package stays channel-agnostic. */
    deliver(request: ApprovalRequest): Promise<void> | void;
};
/** Fan-out to thin adapters; failures are collected, not swallowed. */
export declare function deliverApprovalRequest(request: ApprovalRequest, adapters: ApprovalDelivery[]): Promise<{
    delivered: number;
    errors: string[];
}>;
/** Example webhook adapter — hosts pass their own fetch if needed. */
export declare function webhookApprovalAdapter(url: string): ApprovalDelivery;
//# sourceMappingURL=approval-request.d.ts.map