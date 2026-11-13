import type { AllowToken, CompiledPolicy, GateDecision } from "./types.js";
/**
 * Proof-carrying allow: runner/CI must verify this token before merge/send.
 * Without a valid allow-token, the tool must refuse — even if the model "decides".
 */
export declare function signAllowToken(decision: GateDecision, policy: CompiledPolicy, secret: string, opts?: {
    expiresAt?: string;
    fingerprint?: string;
}): AllowToken;
export declare function verifyAllowToken(token: AllowToken, policy: CompiledPolicy, secret: string, opts?: {
    now?: string;
    fingerprint?: string;
}): {
    ok: boolean;
    reason: string;
};
/** Fail closed before a tool runs. */
export declare function assertAllowToken(token: AllowToken | null | undefined, policy: CompiledPolicy, secret: string, opts?: {
    now?: string;
    fingerprint?: string;
    label?: string;
}): AllowToken;
//# sourceMappingURL=proof.d.ts.map