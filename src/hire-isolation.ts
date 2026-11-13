import {
  evaluateSecretAccess,
  type SecretScope,
} from "./credentials.js";
import type { AgentEnvironment } from "./types.js";

export type HireIsolationCase = {
  id: string;
  environment: AgentEnvironment;
  scope: SecretScope;
  expectAllow: boolean;
  rule: string;
};

/**
 * Blake Hire Isolation — testable compliance matrix, not a UI feature.
 * Partners can run `assertHireIsolation()` in CI.
 */
export const HIRE_ISOLATION_CASES: HireIsolationCase[] = [
  {
    id: "hire_blocks_personal",
    environment: "hire_sandbox",
    scope: "personal",
    expectAllow: false,
    rule: "credential.hire_isolation",
  },
  {
    id: "hire_blocks_org",
    environment: "hire_sandbox",
    scope: "org",
    expectAllow: false,
    rule: "credential.hire_isolation",
  },
  {
    id: "hire_allows_hire",
    environment: "hire_sandbox",
    scope: "hire",
    expectAllow: true,
    rule: "credential.hire_ok",
  },
  {
    id: "org_blocks_personal",
    environment: "org_private",
    scope: "personal",
    expectAllow: false,
    rule: "credential.org_isolation",
  },
  {
    id: "org_allows_org",
    environment: "org_private",
    scope: "org",
    expectAllow: true,
    rule: "credential.ok",
  },
  {
    id: "personal_blocks_hire",
    environment: "personal_private",
    scope: "hire",
    expectAllow: false,
    rule: "credential.personal_no_hire",
  },
  {
    id: "personal_allows_personal",
    environment: "personal_private",
    scope: "personal",
    expectAllow: true,
    rule: "credential.ok",
  },
];

export type HireIsolationResult = {
  ok: boolean;
  passed: string[];
  failed: Array<{ id: string; expected: boolean; got: boolean; rule: string }>;
};

export function runHireIsolationSuite(): HireIsolationResult {
  const passed: string[] = [];
  const failed: HireIsolationResult["failed"] = [];
  for (const c of HIRE_ISOLATION_CASES) {
    const d = evaluateSecretAccess({
      environment: c.environment,
      scope: c.scope,
      connectorId: "test",
    });
    if (d.allow === c.expectAllow && d.rule === c.rule) {
      passed.push(c.id);
    } else {
      failed.push({
        id: c.id,
        expected: c.expectAllow,
        got: d.allow,
        rule: d.rule,
      });
    }
  }
  return { ok: failed.length === 0, passed, failed };
}

export function assertHireIsolation(): void {
  const result = runHireIsolationSuite();
  if (!result.ok) {
    const detail = result.failed
      .map((f) => `${f.id}: expected allow=${f.expected} got=${f.got} (${f.rule})`)
      .join("; ");
    throw new Error(`Blake Hire Isolation failed: ${detail}`);
  }
}
