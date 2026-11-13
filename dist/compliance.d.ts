import type { ActionEvidence, AuditLog, CompiledPolicy, DecisionEffect, GateDecision, ViolationEvent } from "./types.js";
/**
 * Gate before + audit after.
 * If the prior decision was deny / require_approval but the action occurred → violation.
 * Competitors usually only gate "before"; this closes the prompt-vs-fact gap.
 */
export declare function evaluatePostAction(input: {
    policy: CompiledPolicy;
    /** Decision from the pre-action gate (or reconstruct expected effect). */
    prior: Pick<GateDecision, "effect" | "intent" | "rules" | "fingerprint">;
    evidence: ActionEvidence;
    audit?: AuditLog;
}): {
    ok: boolean;
    violation: ViolationEvent | null;
};
/** Heuristic: did a log/diff look like a merge / outbound happened? */
export declare function inferActionOccurred(intentType: string, text: string): boolean;
export declare function expectedEffectLabel(effect: DecisionEffect): string;
//# sourceMappingURL=compliance.d.ts.map