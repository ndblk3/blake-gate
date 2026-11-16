#!/usr/bin/env node
/**
 * CLI for foreign hosts / CI / other stacks.
 *
 *   blake-gate compile --in source.json --out policy.json
 *   blake-gate evaluate --policy policy.json --intent intent.json
 *   blake-gate materialize --policy policy.json --dir ./workspace
 *   blake-gate fingerprint --intent intent.json
 *   blake-gate diff --before a.json --after b.json
 *   blake-gate hire-check
 *   blake-gate verify-token --policy policy.json --token token.json --secret …
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { diffPolicies } from "./artifact.js";
import { compilePolicy } from "./compile.js";
import { evaluateIntent } from "./gate.js";
import { createMemoryAuditLog } from "./audit.js";
import { intentFingerprint } from "./fingerprint.js";
import { assertHireIsolation, runHireIsolationSuite } from "./hire-isolation.js";
import { verifyAllowToken } from "./proof.js";
import { materializePolicyWorkspace } from "./workspace.js";
import type {
  AgentIntent,
  AllowToken,
  CompiledPolicy,
  PolicySource,
} from "./types.js";

function usage(): never {
  console.error(`blake-gate — policy gate for autonomous agents

Commands:
  compile       --in <source.json> --out <policy.json>
  evaluate      --policy <policy.json> --intent <intent.json> [--practice] [--approved]
  materialize   --policy <policy.json> --dir <workspace>
  fingerprint   --intent <intent.json>
  diff          --before <policy.json> --after <policy.json>
  hire-check    (Blake Hire Isolation suite)
  verify-token  --policy <policy.json> --token <token.json> --secret <hmac>

Exit codes for evaluate: 0 allow · 2 require_approval · 1 deny/error
Host contract: Cursor CLI · Claude Code · custom workers · GitHub Actions
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
    console.log(`wrote ${out} · ${policy.policyHash}`);
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
        signingSecret: arg("--secret"),
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

  if (cmd === "fingerprint") {
    const intentPath = arg("--intent");
    if (!intentPath) usage();
    const intent = await readJson<AgentIntent>(intentPath);
    console.log(intentFingerprint(intent));
    return;
  }

  if (cmd === "diff") {
    const beforePath = arg("--before");
    const afterPath = arg("--after");
    if (!beforePath || !afterPath) usage();
    const before = await readJson<CompiledPolicy>(beforePath);
    const after = await readJson<CompiledPolicy>(afterPath);
    console.log(JSON.stringify(diffPolicies(before, after), null, 2));
    return;
  }

  if (cmd === "hire-check") {
    const result = runHireIsolationSuite();
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) {
      assertHireIsolation();
    }
    return;
  }

  if (cmd === "verify-token") {
    const policyPath = arg("--policy");
    const tokenPath = arg("--token");
    const secret = arg("--secret");
    if (!policyPath || !tokenPath || !secret) usage();
    const policy = await readJson<CompiledPolicy>(policyPath);
    const token = await readJson<AllowToken>(tokenPath);
    const check = verifyAllowToken(token, policy, secret);
    console.log(JSON.stringify(check, null, 2));
    process.exit(check.ok ? 0 : 1);
  }

  usage();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
