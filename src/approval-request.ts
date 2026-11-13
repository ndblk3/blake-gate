import { intentFingerprint } from "./fingerprint.js";
import { policyHash } from "./artifact.js";
import type {
  ApprovalChannel,
  ApprovalRequest,
  CompiledPolicy,
  GateDecision,
} from "./types.js";

function newRequestId(): string {
  return `apr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Protocol object for human approval — delivery is a thin host adapter
 * (webhook / email / Slack). Core stays a runtime; approval is part of
 * the contract, not the UI.
 */
export function buildApprovalRequest(input: {
  decision: GateDecision;
  policy: CompiledPolicy;
  channels?: ApprovalChannel[];
  callbackUrl?: string;
  now?: string;
}): ApprovalRequest {
  const { decision, policy } = input;
  const fingerprint =
    decision.fingerprint ?? intentFingerprint(decision.intent);
  return {
    id: newRequestId(),
    fingerprint,
    intent: decision.intent,
    effect: decision.effect,
    reasons: [...decision.reasons],
    rules: [...decision.rules],
    policyHash: policy.policyHash ?? policyHash(policy),
    agentId: policy.agentId,
    ownerId: policy.ownerId,
    createdAt: input.now ?? decision.at ?? new Date().toISOString(),
    channels: input.channels ?? [],
    callbackUrl: input.callbackUrl,
  };
}

export type ApprovalDelivery = {
  /** Host implements webhook / email / Slack — package stays channel-agnostic. */
  deliver(request: ApprovalRequest): Promise<void> | void;
};

/** Fan-out to thin adapters; failures are collected, not swallowed. */
export async function deliverApprovalRequest(
  request: ApprovalRequest,
  adapters: ApprovalDelivery[],
): Promise<{ delivered: number; errors: string[] }> {
  const errors: string[] = [];
  let delivered = 0;
  for (const adapter of adapters) {
    try {
      await adapter.deliver(request);
      delivered += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return { delivered, errors };
}

/** Example webhook adapter — hosts pass their own fetch if needed. */
export function webhookApprovalAdapter(url: string): ApprovalDelivery {
  return {
    async deliver(request) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        throw new Error(`webhook ${res.status}`);
      }
    },
  };
}
