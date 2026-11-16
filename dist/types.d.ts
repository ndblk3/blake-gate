/** Where the agent is running. Personal and hire never share secrets. */
export type AgentEnvironment = "personal_private" | "org_private" | "hire_sandbox";
/** Staged trust for a connector — practice → drafts → write. */
export type TrustTier = "sandbox" | "draft" | "write";
export type ReviewMode = "notify" | "autonomous";
/**
 * How spawn / replicate are treated.
 * Default is `deny` — uncontrolled replication rate stays 0 unless the owner
 * explicitly authorizes the mode on the policy artifact.
 */
export type ReplicationMode = "deny" | "require_approval" | "allow";
/** Actions an agent may request. Gate decides; model does not. */
export type IntentType = "run.start" | "secret.read" | "git.push" | "git.force_push" | "git.open_pr" | "git.merge" | "mail.send" | "chat.send" | "outbound.publish" | "agent.spawn" | "agent.replicate";
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
    /**
     * Create a new agent / child worker.
     * Default `deny` — never spawn outside policy.
     */
    agentSpawn: ReplicationMode;
    /**
     * Copy / self-replicate an agent population.
     * Default `deny` — uncontrolled replication = 0.
     */
    agentReplicate: ReplicationMode;
    /** Optional schedule window — ISO times; empty = always. */
    window?: {
        /** HH:mm local to timezone */
        start?: string;
        end?: string;
        timezone?: string;
        daysOfWeek?: string[];
    };
    /** Content hash of the enforceable fields — policy as artifact. */
    policyHash?: string;
    /** Monotonic host version for this agent policy. */
    version?: number;
    compiledAt?: string;
    /** Previous artifact hash (diff / audit trail). */
    previousHash?: string;
};
export type IntentFingerprint = string;
export type GateContext = {
    now: string;
    /** Owner already approved this intent id / fingerprint. */
    ownerApproved?: boolean;
    /** Practice / sandbox run — write intents denied unless tier allows. */
    practice?: boolean;
    /**
     * Durable approval store — same fingerprint + matching policyHash
     * upgrades require_approval → allow (capability ticket).
     */
    approvals?: {
        has(fingerprint: string, opts?: {
            now?: string;
            policyHash?: string;
        }): boolean;
    };
    /** When set, allow decisions are signed into `allowToken`. */
    signingSecret?: string;
    /** Optional allow-token TTL (ISO). */
    allowTokenExpiresAt?: string;
};
export type DecisionEffect = "allow" | "deny" | "require_approval";
export type AllowToken = {
    effect: "allow";
    fingerprint: IntentFingerprint;
    policyHash: string;
    rules: string[];
    at: string;
    expiresAt?: string;
    /** HMAC-SHA256 hex over canonical payload. */
    signature: string;
};
export type GateDecision = {
    effect: DecisionEffect;
    intent: AgentIntent;
    reasons: string[];
    /** Rule ids that fired, for audit / UI. */
    rules: string[];
    at: string;
    /** Capability-ticket id (type+target+repo+branch). */
    fingerprint: IntentFingerprint;
    policyHash?: string;
    /** Present when effect=allow and signingSecret was provided. */
    allowToken?: AllowToken;
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
    fingerprint?: IntentFingerprint;
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
    /** Default deny. */
    agentSpawn?: ReplicationMode;
    /** Default deny — zero uncontrolled replication. */
    agentReplicate?: ReplicationMode;
    window?: CompiledPolicy["window"];
    version?: number;
    previousHash?: string;
    compiledAt?: string;
};
export type PolicyFieldChange = {
    path: string;
    before: unknown;
    after: unknown;
};
export type PolicyDiff = {
    beforeHash: string;
    afterHash: string;
    changes: PolicyFieldChange[];
};
export type ActionEvidence = {
    intentType: IntentType;
    target?: string;
    /** Did the side-effect actually happen (merge, send, push)? */
    occurred: boolean;
    summary?: string;
    at?: string;
};
export type ViolationEvent = {
    id: string;
    at: string;
    ownerId: string;
    agentId: string;
    environment: AgentEnvironment;
    intentType: IntentType;
    fingerprint: IntentFingerprint;
    policyHash: string;
    expectedEffect: DecisionEffect;
    evidence: ActionEvidence;
    summary: string;
    rules: string[];
};
export type ApprovalChannel = "webhook" | "email" | "slack" | "in_app" | "telegram" | "whatsapp";
export type ApprovalRequest = {
    id: string;
    fingerprint: IntentFingerprint;
    intent: AgentIntent;
    effect: DecisionEffect;
    reasons: string[];
    rules: string[];
    policyHash: string;
    agentId: string;
    ownerId: string;
    createdAt: string;
    channels: ApprovalChannel[];
    callbackUrl?: string;
};
/** Cross-host same contract — one package, many runners. */
export type HostKind = "cursor_cli" | "claude_code" | "custom_worker" | "github_actions" | "blake";
export declare const HOST_CONTRACT_VERSION: "1";
//# sourceMappingURL=types.d.ts.map