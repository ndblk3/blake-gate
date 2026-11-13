export type { AgentEnvironment, AgentIntent, AuditEvent, AuditLog, CompiledPolicy, ConnectorGrant, DecisionEffect, GateContext, GateDecision, IntentType, PolicySource, ReviewMode, TrustTier, } from "./types.js";
export type { SecretDecision, SecretRequest, SecretScope, } from "./credentials.js";
export { compilePolicy, parseStopRules, trustAtLeast } from "./compile.js";
export { evaluateIntent } from "./gate.js";
export { createMemoryAuditLog } from "./audit.js";
export { evaluateSecretAccess } from "./credentials.js";
export { materializePolicyWorkspace, type MaterializedPolicy, } from "./workspace.js";
/** Throw if decision is not allow. require_approval and deny both throw. */
export declare function assertAllowed(decision: {
    effect: string;
    reasons: string[];
}, label?: string): void;
//# sourceMappingURL=index.d.ts.map