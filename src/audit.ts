import type { AuditEvent, AuditLog } from "./types.js";

function newId(): string {
  return `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** In-memory audit log — host apps can wrap file/DB storage. */
export function createMemoryAuditLog(max = 500): AuditLog {
  const events: AuditEvent[] = [];
  return {
    append( partial) {
      const event: AuditEvent = {
        id: newId(),
        at: partial.at ?? new Date().toISOString(),
        ownerId: partial.ownerId,
        agentId: partial.agentId,
        environment: partial.environment,
        intentType: partial.intentType,
        effect: partial.effect,
        reasons: [...partial.reasons],
        rules: [...partial.rules],
        target: partial.target,
        fingerprint: partial.fingerprint,
      };
      events.unshift(event);
      if (events.length > max) events.length = max;
      return event;
    },
    list(limit = 40) {
      return events.slice(0, Math.max(1, Math.min(limit, max)));
    },
  };
}
