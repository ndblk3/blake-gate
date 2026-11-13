import { trustAtLeast } from "./compile.js";
import { evaluateSecretAccess } from "./credentials.js";
const WRITE_INTENTS = [
    "git.push",
    "git.force_push",
    "git.open_pr",
    "git.merge",
    "mail.send",
    "chat.send",
    "outbound.publish",
];
const MIN_TIER = {
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
function connectorTier(policy, connectorId) {
    if (!connectorId)
        return null;
    const hit = policy.connectors.find((item) => item.id === connectorId);
    return hit?.tier ?? null;
}
function stopHits(policy, intent) {
    const blob = [
        intent.type,
        intent.target ?? "",
        intent.connectorId ?? "",
        JSON.stringify(intent.meta ?? {}),
    ]
        .join(" ")
        .toLowerCase();
    const hits = [];
    for (const rule of policy.stopRules) {
        const key = rule.toLowerCase();
        // Keyword / phrase match against intent surface.
        if ((intent.type === "git.force_push" && /force[- ]?push|no force/i.test(rule)) ||
            (intent.type === "git.merge" && /\bno merge\b|do not merge|don't merge/i.test(rule)) ||
            (intent.type === "mail.send" && /\bno send\b|do not send|don't send|no outbound/i.test(rule)) ||
            (intent.type === "outbound.publish" && /no publish|do not publish/i.test(rule)) ||
            (key.length >= 4 && blob.includes(key.slice(0, 48)))) {
            hits.push(rule);
        }
    }
    return hits;
}
function decide(policy, intent, context) {
    const reasons = [];
    const rules = [];
    if (policy.killSwitch) {
        return {
            effect: "deny",
            intent,
            reasons: ["Emergency stop is on."],
            rules: ["fleet.kill_switch"],
        };
    }
    // Practice may start while the agent is still Draft / off for live schedule.
    if (!policy.enabled &&
        !(context.practice === true && intent.type === "run.start")) {
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
        const scope = scopeRaw === "org" || scopeRaw === "hire" ? scopeRaw : "personal";
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
    // Merge: autoMerge off → owner review (not a hard deny from “no merge” stops).
    if (intent.type === "git.merge") {
        if (!policy.autoMerge) {
            if (context.ownerApproved) {
                reasons.push("Owner approved merge.");
                rules.push("git.merge.owner_approved");
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
    }
    else {
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
    if (policy.reviewMode === "notify" &&
        WRITE_INTENTS.includes(intent.type) &&
        intent.type !== "git.merge") {
        if (!context.ownerApproved) {
            return {
                effect: "require_approval",
                intent,
                reasons: ["Review mode is notify — wait for owner approval."],
                rules: ["review.notify"],
            };
        }
        reasons.push("Owner approved under notify mode.");
        rules.push("review.approved");
    }
    if (intent.type === "run.start") {
        reasons.push("Run start allowed.");
        rules.push("run.start");
    }
    else if (reasons.length === 0) {
        reasons.push("Policy allows this intent.");
        rules.push("default.allow");
    }
    return { effect: "allow", intent, reasons, rules };
}
export function evaluateIntent(intent, policy, context, audit) {
    const partial = decide(policy, intent, context);
    const decision = {
        ...partial,
        at: context.now || new Date().toISOString(),
    };
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
    });
    return decision;
}
//# sourceMappingURL=gate.js.map