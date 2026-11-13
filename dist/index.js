export { HOST_CONTRACT_VERSION } from "./types.js";
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
export function assertAllowed(decision, label = "intent") {
    if (decision.effect === "allow")
        return;
    const why = decision.reasons.join(" ") || decision.effect;
    const err = new Error(`blake-policy blocked ${label}: ${why}`);
    err.code =
        decision.effect === "require_approval"
            ? "BLAKE_POLICY_APPROVAL"
            : "BLAKE_POLICY_DENY";
    throw err;
}
//# sourceMappingURL=index.js.map