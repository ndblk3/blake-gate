/** Where the agent is running. Personal and hire never share secrets. */
export type AgentEnvironment = "personal_private" | "org_private" | "hire_sandbox";
/** Staged trust for a connector — practice → drafts → write. */
export type TrustTier = "sandbox" | "draft" | "write";
export type ReviewMode = "notify" | "autonomous";
/** Actions an agent may request. Gate decides; model does not. */
export type IntentType = "run.start" | "secret.read" | "git.push" | "git.force_push" | "git.open_pr" | "git.merge" | "mail.send" | "chat.send" | "outbound.publish";
export type AgentIntent = {
    type: IntentType;
    agentId: string;
    environment: AgentEnvironment;
    /** Connector the intent needs, when applicable. */
    connectorId?: string;
    /** Repo, mailbox, channel, URL, branch, … */
    target?: string;
    meta?: Record<string, string | number | boolean | null>;
};
export type ConnectorGrant = {
    id: string;
    tier: TrustTier;
};
export type CompiledPolicy = {
    agentId: string;
    ownerId: string;
    environment: AgentEnvironment;
    enabled: boolean;
    killSwitch: boolean;
    reviewMode: ReviewMode;
    /** GitHub / ship: merge without owner when true. */
    autoMerge: boolean;
    connectors: ConnectorGrant[];
    /** Free-text hard stops from the owner (matched as keywords). */
    stopRules: string[];
    /** Optional schedule window — ISO times; empty = always. */
    window?: {
        /** HH:mm local to timezone */
        start?: string;
        end?: string;
        timezone?: string;
        daysOfWeek?: string[];
    };
};
export type GateContext = {
    now: string;
    /** Owner already approved this intent id / fingerprint. */
    ownerApproved?: boolean;
    /** Practice / sandbox run — write intents denied unless tier allows. */
    practice?: boolean;
};
export type DecisionEffect = "allow" | "deny" | "require_approval";
export type GateDecision = {
    effect: DecisionEffect;
    intent: AgentIntent;
    reasons: string[];
    /** Rule ids that fired, for audit / UI. */
    rules: string[];
    at: string;
};
export type AuditEvent = {
    id: string;
    at: string;
    ownerId: string;
    agentId: string;
    environment: AgentEnvironment;
    intentType: IntentType;
    effect: DecisionEffect;
    reasons: string[];
    rules: string[];
    target?: string;
};
export type AuditLog = {
    append(event: Omit<AuditEvent, "id" | "at"> & {
        at?: string;
    }): AuditEvent;
    list(limit?: number): AuditEvent[];
};
/** Inputs used to compile a policy from a host product (Blake, etc.). */
export type PolicySource = {
    agentId: string;
    ownerId: string;
    environment?: AgentEnvironment;
    enabled?: boolean;
    killSwitch?: boolean;
    reviewMode?: ReviewMode;
    autoMerge?: boolean;
    connectors?: ConnectorGrant[];
    /** Raw owner stop text — split into rules. */
    stops?: string;
    stopRules?: string[];
    window?: CompiledPolicy["window"];
};
//# sourceMappingURL=types.d.ts.map