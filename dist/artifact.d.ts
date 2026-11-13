import type { CompiledPolicy, PolicyDiff } from "./types.js";
/** Canonical JSON for hashing — stable key order on top-level fields. */
export declare function canonicalizePolicy(policy: CompiledPolicy): string;
export declare function policyHash(policy: CompiledPolicy): string;
/** Attach versioning fields — host compiles; agent/CI reads the artifact. */
export declare function withPolicyArtifact(policy: CompiledPolicy, opts?: {
    version?: number;
    compiledAt?: string;
    previousHash?: string;
}): CompiledPolicy;
/** What changed for this agent between two compiled policies. */
export declare function diffPolicies(before: CompiledPolicy, after: CompiledPolicy): PolicyDiff;
//# sourceMappingURL=artifact.d.ts.map