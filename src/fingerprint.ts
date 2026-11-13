import { createHash } from "node:crypto";
import type { AgentIntent } from "./types.js";

/**
 * Stable capability-ticket id for an intent.
 * Same type + target + repo + branch → same fingerprint (durable approval).
 * Drift any field → new ticket → ask again.
 */
export function intentFingerprint(intent: AgentIntent): string {
  const repo = String(intent.meta?.repo ?? intent.meta?.repoFullName ?? "");
  const branch = String(intent.meta?.branch ?? "");
  const parts = [
    intent.type,
    intent.agentId,
    intent.environment,
    intent.connectorId ?? "",
    intent.target ?? "",
    repo,
    branch,
  ].map((part) => part.trim().toLowerCase());
  const digest = createHash("sha256").update(parts.join("|")).digest("hex");
  return `ifp_${digest.slice(0, 24)}`;
}
