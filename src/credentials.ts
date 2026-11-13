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

export function evaluateSecretAccess(request: SecretRequest): SecretDecision {
  if (request.environment === "hire_sandbox") {
    if (request.scope === "personal" || request.scope === "org") {
      return {
        allow: false,
        reason:
          "Hire sandbox cannot read personal or org secrets — use brokered hire credentials only.",
        rule: "credential.hire_isolation",
      };
    }
    return {
      allow: true,
      reason: "Hire-scoped brokered credential.",
      rule: "credential.hire_ok",
    };
  }

  if (request.environment === "org_private" && request.scope === "personal") {
    return {
      allow: false,
      reason: "Org private runtime cannot read personal-private secrets.",
      rule: "credential.org_isolation",
    };
  }

  if (request.environment === "personal_private" && request.scope === "hire") {
    return {
      allow: false,
      reason: "Personal runtime does not use hire-sandbox credentials.",
      rule: "credential.personal_no_hire",
    };
  }

  return {
    allow: true,
    reason: "Environment matches secret scope.",
    rule: "credential.ok",
  };
}
