import { withPolicyArtifact } from "./artifact.js";
const TIER_RANK = {
    sandbox: 0,
    draft: 1,
    write: 2,
};
export function trustAtLeast(have, need) {
    return TIER_RANK[have] >= TIER_RANK[need];
}
/** Split free-text stops into keyword rules. */
export function parseStopRules(raw) {
    if (!raw?.trim())
        return [];
    return raw
        .split(/[\n;•]+|(?<=[.!?])\s+/)
        .map((part) => part.trim().replace(/^[-–—]\s*/, ""))
        .filter((part) => part.length >= 3)
        .map((part) => part.slice(0, 200))
        .slice(0, 40);
}
export function compilePolicy(source) {
    const fromText = parseStopRules(source.stops);
    const explicit = (source.stopRules ?? [])
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 40);
    const stopRules = [...new Set([...explicit, ...fromText])];
    const raw = {
        agentId: source.agentId.trim(),
        ownerId: source.ownerId.trim(),
        environment: source.environment ?? "personal_private",
        enabled: source.enabled !== false,
        killSwitch: source.killSwitch === true,
        reviewMode: source.reviewMode === "notify" ? "notify" : "autonomous",
        autoMerge: source.autoMerge === true,
        connectors: (source.connectors ?? [])
            .filter((item) => item?.id?.trim())
            .map((item) => ({
            id: item.id.trim(),
            tier: item.tier === "sandbox" || item.tier === "draft" || item.tier === "write"
                ? item.tier
                : "sandbox",
        }))
            .slice(0, 32),
        stopRules,
        window: source.window,
        version: source.version,
        previousHash: source.previousHash,
        compiledAt: source.compiledAt,
    };
    return withPolicyArtifact(raw, {
        version: source.version ?? 1,
        compiledAt: source.compiledAt,
        previousHash: source.previousHash,
    });
}
//# sourceMappingURL=compile.js.map