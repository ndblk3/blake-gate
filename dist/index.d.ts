export type { ActionEvidence, AgentEnvironment, AgentIntent, AllowToken, ApprovalChannel, ApprovalRequest, AuditEvent, AuditLog, CompiledPolicy, ConnectorGrant, DecisionEffect, GateContext, GateDecision, HostKind, IntentFingerprint, IntentType, PolicyDiff, PolicyFieldChange, PolicySource, ReviewMode, TrustTier, ViolationEvent, } from "./types.js";
export { HOST_CONTRACT_VERSION } from "./types.js";
export type { SecretDecision, SecretRequest, SecretScope, } from "./credentials.js";
export type { DurableApproval, ApprovalStore } from "./approvals.js";
export type { ApprovalDelivery } from "./approval-request.js";
export type { HireIsolationCase, HireIsolationResult } from "./hire-isolation.js";
export type { MaterializedPolicy } from "./workspace.js";
export { compilePolicy, parseStopRules, trustAtLeast } from "./compile.js";
export { evaluateIntent } from "./gate.js";
export { createMemoryAuditLog } from "./audit.js";
export { evaluateSecretAccess } from "./credentials.js";
export { materializePolicyWorkspace } from "./workspace.js";
export { intentFingerprint } from "./fingerprint.js";
export { createMemoryApprovalStore, grantApproval, } from "./approvals.js";
export { canonicalizePolicy, diffPolicies, policyHash, withPolicyArtifact, } from "./artifact.js";
export { assertAllowToken, signAllowToken, verifyAllowToken, } from "./proof.js";
export { evaluatePostAction, inferActionOccurred, } from "./compliance.js";
export { buildApprovalRequest, deliverApprovalRequest, webhookApprovalAdapter, } from "./approval-request.js";
export { HIRE_ISOLATION_CASES, assertHireIsolation, runHireIsolationSuite, } from "./hire-isolation.js";
/** Throw if decision is not allow. require_approval and deny both throw. */
export declare function assertAllowed(decision: {
    effect: string;
    reasons: string[];
}, label?: string): void;
//# sourceMappingURL=index.d.ts.map