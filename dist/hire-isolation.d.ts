import { type SecretScope } from "./credentials.js";
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
export declare const HIRE_ISOLATION_CASES: HireIsolationCase[];
export type HireIsolationResult = {
    ok: boolean;
    passed: string[];
    failed: Array<{
        id: string;
        expected: boolean;
        got: boolean;
        rule: string;
    }>;
};
export declare function runHireIsolationSuite(): HireIsolationResult;
export declare function assertHireIsolation(): void;
//# sourceMappingURL=hire-isolation.d.ts.map