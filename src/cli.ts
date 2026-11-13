#!/usr/bin/env node
/**
 * CLI for foreign hosts / CI / other stacks.
 *
 *   blake-policy compile --in source.json --out policy.json
 *   blake-policy evaluate --policy policy.json --intent intent.json
 *   blake-policy materialize --policy policy.json --dir ./workspace
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compilePolicy } from "./compile.js";
import { evaluateIntent } from "./gate.js";
import { createMemoryAuditLog } from "./audit.js";
import { materializePolicyWorkspace } from "./workspace.js";
import type { AgentIntent, CompiledPolicy, PolicySource } from "./types.js";

function usage(): never {
  console.error(`blake-policy — policy gate for autonomous agents

Commands:
  compile      --in <source.json> --out <policy.json>
  evaluate     --policy <policy.json> --intent <intent.json> [--practice] [--approved]
  materialize  --policy <policy.json> --dir <workspace>

Exit codes for evaluate: 0 allow · 2 require_approval · 1 deny/error
`);
  process.exit(1);
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i < 0) return undefined;
  return process.argv[i + 1];
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd || cmd === "-h" || cmd === "--help") usage();

  if (cmd === "compile") {
    const input = arg("--in");
    const out = arg("--out");
    if (!input || !out) usage();
    const source = await readJson<PolicySource>(input);
    const policy = compilePolicy(source);
    await writeFile(out, `${JSON.stringify(policy, null, 2)}\n`, "utf8");
    console.log(`wrote ${out}`);
    return;
  }

  if (cmd === "evaluate") {
    const policyPath = arg("--policy");
    const intentPath = arg("--intent");
    if (!policyPath || !intentPath) usage();
    const policy = await readJson<CompiledPolicy>(policyPath);
    const intent = await readJson<AgentIntent>(intentPath);
    const audit = createMemoryAuditLog();
    const decision = evaluateIntent(
      intent,
      policy,
      {
        now: new Date().toISOString(),
        practice: process.argv.includes("--practice"),
        ownerApproved: process.argv.includes("--approved"),
      },
      audit,
    );
    console.log(JSON.stringify(decision, null, 2));
    if (decision.effect === "allow") process.exit(0);
    if (decision.effect === "require_approval") process.exit(2);
    process.exit(1);
  }

  if (cmd === "materialize") {
    const policyPath = arg("--policy");
    const dir = arg("--dir");
    if (!policyPath || !dir) usage();
    const policy = await readJson<CompiledPolicy>(policyPath);
    const abs = path.resolve(dir);
    const result = await materializePolicyWorkspace(abs, policy);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  usage();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
