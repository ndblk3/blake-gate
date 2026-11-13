import type { CompiledPolicy } from "./types.js";
export type MaterializedPolicy = {
    dir: string;
    policyPath: string;
    readmePath: string;
    gateScriptPath: string;
    historyPath: string;
};
/**
 * Drop a machine-readable policy + local gate script into a workspace.
 * Any runner (Cursor, Claude Code, custom worker, GitHub Actions) can call
 * the script before dangerous actions — same contract, cross-host.
 */
export declare function materializePolicyWorkspace(workspaceDir: string, policy: CompiledPolicy): Promise<MaterializedPolicy>;
//# sourceMappingURL=workspace.d.ts.map