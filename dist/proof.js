import { createHmac, timingSafeEqual } from "node:crypto";
import { policyHash } from "./artifact.js";
import { intentFingerprint } from "./fingerprint.js";
function canonicalPayload(input) {
    return JSON.stringify({
        effect: input.effect,
        fingerprint: input.fingerprint,
        policyHash: input.policyHash,
        rules: [...input.rules].sort(),
        at: input.at,
        expiresAt: input.expiresAt ?? null,
    });
}
function sign(payload, secret) {
    return createHmac("sha256", secret).update(payload).digest("hex");
}
function safeEqualHex(a, b) {
    try {
        const ba = Buffer.from(a, "hex");
        const bb = Buffer.from(b, "hex");
        if (ba.length !== bb.length)
            return false;
        return timingSafeEqual(ba, bb);
    }
    catch {
        return false;
    }
}
/**
 * Proof-carrying allow: runner/CI must verify this token before merge/send.
 * Without a valid allow-token, the tool must refuse — even if the model "decides".
 */
export function signAllowToken(decision, policy, secret, opts) {
    if (decision.effect !== "allow") {
        throw new Error("Only allow decisions can be signed as allow-tokens.");
    }
    if (!secret.trim()) {
        throw new Error("Signing secret is required for proof-carrying allow.");
    }
    const fingerprint = opts?.fingerprint ?? decision.fingerprint ?? intentFingerprint(decision.intent);
    const hash = policy.policyHash ?? policyHash(policy);
    const at = decision.at;
    const expiresAt = opts?.expiresAt;
    const payload = canonicalPayload({
        effect: "allow",
        fingerprint,
        policyHash: hash,
        rules: decision.rules,
        at,
        expiresAt,
    });
    return {
        effect: "allow",
        fingerprint,
        policyHash: hash,
        rules: [...decision.rules],
        at,
        expiresAt,
        signature: sign(payload, secret),
    };
}
export function verifyAllowToken(token, policy, secret, opts) {
    if (token.effect !== "allow") {
        return { ok: false, reason: "Token effect is not allow." };
    }
    if (!secret.trim()) {
        return { ok: false, reason: "Signing secret missing." };
    }
    const hash = policy.policyHash ?? policyHash(policy);
    if (token.policyHash !== hash) {
        return { ok: false, reason: "policyHash drift — re-evaluate intent." };
    }
    if (opts?.fingerprint && token.fingerprint !== opts.fingerprint) {
        return { ok: false, reason: "Fingerprint mismatch." };
    }
    const now = opts?.now ?? new Date().toISOString();
    if (token.expiresAt && token.expiresAt < now) {
        return { ok: false, reason: "Allow-token expired." };
    }
    const payload = canonicalPayload({
        effect: "allow",
        fingerprint: token.fingerprint,
        policyHash: token.policyHash,
        rules: token.rules,
        at: token.at,
        expiresAt: token.expiresAt,
    });
    const expected = sign(payload, secret);
    if (!safeEqualHex(expected, token.signature)) {
        return { ok: false, reason: "Invalid signature." };
    }
    return { ok: true, reason: "Allow-token verified." };
}
/** Fail closed before a tool runs. */
export function assertAllowToken(token, policy, secret, opts) {
    if (!token) {
        const err = new Error(`blake-gate blocked ${opts?.label ?? "tool"}: missing allow-token`);
        err.code = "BLAKE_POLICY_NO_TOKEN";
        throw err;
    }
    const check = verifyAllowToken(token, policy, secret, opts);
    if (!check.ok) {
        const err = new Error(`blake-gate blocked ${opts?.label ?? "tool"}: ${check.reason}`);
        err.code = "BLAKE_POLICY_BAD_TOKEN";
        throw err;
    }
    return token;
}
//# sourceMappingURL=proof.js.map