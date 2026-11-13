import type { CompiledPolicy, PolicySource, TrustTier } from "./types.js";
export declare function trustAtLeast(have: TrustTier, need: TrustTier): boolean;
/** Split free-text stops into keyword rules. */
export declare function parseStopRules(raw: string | undefined | null): string[];
export declare function compilePolicy(source: PolicySource): CompiledPolicy;
//# sourceMappingURL=compile.d.ts.map