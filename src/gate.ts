import { policyHash } from "./artifact.js";
import { trustAtLeast } from "./compile.js";
import { evaluateSecretAccess } from "./credentials.js";
import { intentFingerprint } from "./fingerprint.js";
import { signAllowToken } from "./proof.js";
import type {
  AgentIntent,
  AuditLog,
  CompiledPolicy,
  GateContext,
  GateDecision,
  IntentType,
  TrustTier,
} from "./types.js";

const WRITE_INTENTS: IntentType[] = [
  "git.push",
  "git.force_push",
  "git.open_pr",
  "git.merge",
  "mail.send",
  "chat.send",
  "outbound.publish",
];

const MIN_TIER: Partial<Record<IntentType, TrustTier>> = {
  "git.push": "write",
  "git.force_push": "write",
  "git.open_pr": "write",
  "git.merge": "write",
  "mail.send": "write",
  "chat.send": "write",
  "outbound.publish": "write",
  "secret.read": "sandbox",
  "run.start": "sandbox",
};

function connectorTier(
  policy: CompiledPolicy,
  connectorId: string | undefined,
): TrustTier | null {
  if (!connectorId) return null;
  const hit = policy.connectors.find((item) => item.id === connectorId);
  return hit?.tier ?? null;
}

function stopHits(policy: CompiledPolicy, intent: AgentIntent): string[] {
  const blob = [
    intent.type,
    intent.target ?? "",
    intent.connectorId ?? "",
    JSON.stringify(intent.meta ?? {}),
  ]
    .join(" ")
    .toLowerCase();

  const hits: string[] = [];
  for (const rule of policy.stopRules) {
    const key = rule.toLowerCase();
    if (
      (intent.type === "git.force_push" && /force[- ]?push|no force/i.test(rule)) ||
      (intent.type === "git.merge" && /\bno merge\b|do not merge|don't merge/i.test(rule)) ||
      (intent.type === "mail.send" && /\bno send\b|do not send|don't send|no outbound/i.test(rule)) ||
      (intent.type === "outbound.publish" && /no publish|do not publish/i.test(rule)) ||
      (key.length >= 4 && blob.includes(key.slice(0, 48)))
    ) {
      hits.push(rule);
    }
  }
  return hits;
}

function decide(
  policy: CompiledPolicy,
  intent: AgentIntent,
  context: GateContext,
  fingerprint: string,
): Omit<GateDecision, "at" | "fingerprint" | "policyHash" | "allowToken"> {
  const reasons: string[] = [];
  const rules: string[] = [];
  const hash = policy.policyHash ?? policyHash(policy);

  if (policy.killSwitch) {
    return {
      effect: "deny",
      intent,
      reasons: ["Emergency stop is on."],
      rules: ["fleet.kill_switch"],
    };
  }

  if (
    !policy.enabled &&
    !(context.practice === true && intent.type === "run.start")
  ) {
    return {
      effect: "deny",
      intent,
      reasons: ["Agent is off."],
      rules: ["agent.disabled"],
    };
  }

  if (intent.agentId !== policy.agentId) {
    return {
      effect: "deny",
      intent,
      reasons: ["Intent agentId does not match policy."],
      rules: ["agent.id_mismatch"],
    };
  }

  if (intent.environment !== policy.environment) {
    return {
      effect: "deny",
      intent,
      reasons: [
        `Intent environment ${intent.environment} ≠ policy ${policy.environment}.`,
      ],
      rules: ["env.mismatch"],
    };
  }

  if (intent.type === "secret.read") {
    const scopeRaw = String(intent.meta?.scope ?? "personal");
    const scope =
      scopeRaw === "org" || scopeRaw === "hire" ? scopeRaw : "personal";
    const secret = evaluateSecretAccess({
      environment: intent.environment,
      scope,
      connectorId: intent.connectorId ?? "",
    });
    rules.push(secret.rule);
    if (!secret.allow) {
      return { effect: "deny", intent, reasons: [secret.reason], rules };
    }
  }

  if (intent.type === "git.force_push") {
    return {
      effect: "deny",
      intent,
      reasons: ["Force-push to protected history is a hard stop."],
      rules: ["git.force_push_hard_stop"],
    };
  }

  if (context.practice && WRITE_INTENTS.includes(intent.type)) {
    return {
      effect: "deny",
      intent,
      reasons: ["Practice runs cannot perform live write intents."],
      rules: ["practice.no_write"],
    };
  }

  const need = MIN_TIER[intent.type];
  if (need && intent.connectorId) {
    const have = connectorTier(policy, intent.connectorId);
    if (!have) {
      return {
        effect: "deny",
        intent,
        reasons: [`Connector ${intent.connectorId} is not granted.`],
        rules: ["connector.missing"],
      };
    }
    if (!trustAtLeast(have, need)) {
      return {
        effect: "deny",
        intent,
        reasons: [
          `Connector ${intent.connectorId} tier ${have} is below required ${need}.`,
        ],
        rules: ["connector.tier"],
      };
    }
  }

  const durableOk =
    context.approvals?.has(fingerprint, {
      now: context.now,
      policyHash: hash,
    }) === true;

  if (intent.type === "git.merge") {
    if (!policy.autoMerge) {
      if (context.ownerApproved || durableOk) {
        reasons.push(
          durableOk && !context.ownerApproved
            ? "Durable approval ticket matches fingerprint."
            : "Owner approved merge.",
        );
        rules.push(
          durableOk && !context.ownerApproved
            ? "approval.durable"
            : "git.merge.owner_approved",
        );
        return { effect: "allow", intent, reasons, rules };
      }
      return {
        effect: "require_approval",
        intent,
        reasons: [
          "Auto merge is off — open the PR and notify the owner for review.",
        ],
        rules: ["git.merge.auto_off"],
      };
    }
    const mergeStops = stopHits(policy, intent);
    if (mergeStops.length > 0) {
      return {
        effect: "deny",
        intent,
        reasons: mergeStops.map((rule) => `Stop rule blocks merge: ${rule}`),
        rules: ["owner.stop_rule", "git.merge.stop"],
      };
    }
    reasons.push("Auto merge is on.");
    rules.push("git.merge.auto_on");
  } else {
    const stops = stopHits(policy, intent);
    if (stops.length > 0) {
      return {
        effect: "deny",
        intent,
        reasons: stops.map((rule) => `Stop rule: ${rule}`),
        rules: ["owner.stop_rule", ...stops.map((_, i) => `stop.${i}`)],
      };
    }
  }

  if (
    policy.reviewMode === "notify" &&
    WRITE_INTENTS.includes(intent.type) &&
    intent.type !== "git.merge"
  ) {
    if (!context.ownerApproved && !durableOk) {
      return {
        effect: "require_approval",
        intent,
        reasons: ["Review mode is notify — wait for owner approval."],
        rules: ["review.notify"],
      };
    }
    reasons.push(
      durableOk && !context.ownerApproved
        ? "Durable approval ticket matches fingerprint."
        : "Owner approved under notify mode.",
    );
    rules.push(
      durableOk && !context.ownerApproved
        ? "approval.durable"
        : "review.approved",
    );
  }

  if (intent.type === "run.start") {
    reasons.push("Run start allowed.");
    rules.push("run.start");
  } else if (reasons.length === 0) {
    reasons.push("Policy allows this intent.");
    rules.push("default.allow");
  }

  return { effect: "allow", intent, reasons, rules };
}

export function evaluateIntent(
  intent: AgentIntent,
  policy: CompiledPolicy,
  context: GateContext,
  audit?: AuditLog,
): GateDecision {
  const fingerprint = intentFingerprint(intent);
  const hash = policy.policyHash ?? policyHash(policy);
  const partial = decide(policy, intent, context, fingerprint);
  let decision: GateDecision = {
    ...partial,
    at: context.now || new Date().toISOString(),
    fingerprint,
    policyHash: hash,
  };

  if (decision.effect === "allow" && context.signingSecret) {
    decision = {
      ...decision,
      allowToken: signAllowToken(decision, policy, context.signingSecret, {
        expiresAt: context.allowTokenExpiresAt,
        fingerprint,
      }),
    };
  }

  audit?.append({
    at: decision.at,
    ownerId: policy.ownerId,
    agentId: policy.agentId,
    environment: policy.environment,
    intentType: intent.type,
    effect: decision.effect,
    reasons: decision.reasons,
    rules: decision.rules,
    target: intent.target,
    fingerprint,
  });

  return decision;
}
