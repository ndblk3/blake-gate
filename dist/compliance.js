import { intentFingerprint } from "./fingerprint.js";
import { policyHash } from "./artifact.js";
function newViolationId() {
    return `vio_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
/**
 * Gate before + audit after.
 * If the prior decision was deny / require_approval but the action occurred → violation.
 * Competitors usually only gate "before"; this closes the prompt-vs-fact gap.
 */
export function evaluatePostAction(input) {
    const { policy, prior, evidence } = input;
    const expected = prior.effect;
    const occurred = evidence.occurred === true;
    if (!occurred) {
        return { ok: true, violation: null };
    }
    if (expected === "allow") {
        return { ok: true, violation: null };
    }
    const fingerprint = prior.fingerprint ?? intentFingerprint(prior.intent);
    const violation = {
        id: newViolationId(),
        at: evidence.at ?? new Date().toISOString(),
        ownerId: policy.ownerId,
        agentId: policy.agentId,
        environment: policy.environment,
        intentType: prior.intent.type,
        fingerprint,
        policyHash: policy.policyHash ?? policyHash(policy),
        expectedEffect: expected,
        evidence,
        summary: expected === "require_approval"
            ? `Action occurred while gate required approval (${prior.intent.type}).`
            : `Action occurred while gate denied (${prior.intent.type}).`,
        rules: ["compliance.post_action", ...prior.rules],
    };
    input.audit?.append({
        at: violation.at,
        ownerId: violation.ownerId,
        agentId: violation.agentId,
        environment: violation.environment,
        intentType: violation.intentType,
        effect: "deny",
        reasons: [violation.summary],
        rules: violation.rules,
        target: prior.intent.target,
    });
    return { ok: false, violation };
}
/** Heuristic: did a log/diff look like a merge / outbound happened? */
export function inferActionOccurred(intentType, text) {
    const t = text.toLowerCase();
    if (intentType === "git.merge") {
        return (/\bmerged (pull request|pr)\b/.test(t) ||
            /\bgh pr merge\b/.test(t) ||
            /\bgit merge\b.*\b(main|master)\b/.test(t) ||
            /merge pull request #\d+/.test(t));
    }
    if (intentType === "git.push" || intentType === "git.force_push") {
        return /\bpushed to\b|\bgit push\b|\bforce-pushed\b/.test(t);
    }
    if (intentType === "mail.send" ||
        intentType === "chat.send" ||
        intentType === "outbound.publish") {
        return /\bsent (email|message)\b|\bpublished\b|\bposted to\b/.test(t);
    }
    if (intentType === "agent.spawn") {
        return /\bspawned (agent|worker|child)\b|\bcreated (new )?agent\b|\bagent\.spawn\b/.test(t);
    }
    if (intentType === "agent.replicate") {
        return /\breplicated\b|\bself[- ]?replicat|\bagent\.replicate\b|\bpopulation (grew|scaled)\b/.test(t);
    }
    return false;
}
export function expectedEffectLabel(effect) {
    return effect;
}
//# sourceMappingURL=compliance.js.map