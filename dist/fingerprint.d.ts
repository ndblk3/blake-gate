import type { AgentIntent } from "./types.js";
/**
 * Stable capability-ticket id for an intent.
 * Same type + target + repo + branch → same fingerprint (durable approval).
 * Drift any field → new ticket → ask again.
 */
export declare function intentFingerprint(intent: AgentIntent): string;
//# sourceMappingURL=fingerprint.d.ts.map