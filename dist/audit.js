function newId() {
    return `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
/** In-memory audit log — host apps can wrap file/DB storage. */
export function createMemoryAuditLog(max = 500) {
    const events = [];
    return {
        append(partial) {
            const event = {
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
            };
            events.unshift(event);
            if (events.length > max)
                events.length = max;
            return event;
        },
        list(limit = 40) {
            return events.slice(0, Math.max(1, Math.min(limit, max)));
        },
    };
}
//# sourceMappingURL=audit.js.map