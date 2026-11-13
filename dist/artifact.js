import { createHash } from "node:crypto";
/** Canonical JSON for hashing — stable key order on top-level fields. */
export function canonicalizePolicy(policy) {
    const ordered = {
        agentId: policy.agentId,
        ownerId: policy.ownerId,
        environment: policy.environment,
        enabled: policy.enabled,
        killSwitch: policy.killSwitch,
        reviewMode: policy.reviewMode,
        autoMerge: policy.autoMerge,
        connectors: [...policy.connectors]
            .map((c) => ({ id: c.id, tier: c.tier }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        stopRules: [...policy.stopRules].sort(),
        window: policy.window ?? null,
    };
    return JSON.stringify(ordered);
}
export function policyHash(policy) {
    const digest = createHash("sha256")
        .update(canonicalizePolicy(policy))
        .digest("hex");
    return `pol_${digest.slice(0, 24)}`;
}
/** Attach versioning fields — host compiles; agent/CI reads the artifact. */
export function withPolicyArtifact(policy, opts) {
    const compiledAt = opts?.compiledAt ?? new Date().toISOString();
    const version = opts?.version ?? policy.version ?? 1;
    const base = {
        ...policy,
        version,
        compiledAt,
        previousHash: opts?.previousHash ?? policy.previousHash,
        policyHash: undefined,
    };
    return {
        ...base,
        policyHash: policyHash(base),
    };
}
function field(path, before, after) {
    const a = JSON.stringify(before ?? null);
    const b = JSON.stringify(after ?? null);
    if (a === b)
        return null;
    return { path, before, after };
}
/** What changed for this agent between two compiled policies. */
export function diffPolicies(before, after) {
    const changes = [];
    const push = (path, a, b) => {
        const row = field(path, a, b);
        if (row)
            changes.push(row);
    };
    push("environment", before.environment, after.environment);
    push("enabled", before.enabled, after.enabled);
    push("killSwitch", before.killSwitch, after.killSwitch);
    push("reviewMode", before.reviewMode, after.reviewMode);
    push("autoMerge", before.autoMerge, after.autoMerge);
    push("connectors", before.connectors, after.connectors);
    push("stopRules", before.stopRules, after.stopRules);
    push("window", before.window ?? null, after.window ?? null);
    return {
        beforeHash: before.policyHash ?? policyHash(before),
        afterHash: after.policyHash ?? policyHash(after),
        changes,
    };
}
//# sourceMappingURL=artifact.js.map