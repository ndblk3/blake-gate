import type { AgentEnvironment } from "./types.js";
/**
 * Dual-env credential isolation.
 * Hire sandbox must never receive personal-private secret material.
 */
export type SecretScope = "personal" | "org" | "hire";
export type SecretRequest = {
    environment: AgentEnvironment;
    scope: SecretScope;
    connectorId: string;
};
export type SecretDecision = {
    allow: boolean;
    reason: string;
    rule: string;
};
export declare function evaluateSecretAccess(request: SecretRequest): SecretDecision;
//# sourceMappingURL=credentials.d.ts.map