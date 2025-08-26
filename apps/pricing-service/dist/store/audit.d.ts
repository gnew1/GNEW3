export type AuditEvent = {
    ts: string;
    user: string;
    action: string;
    before?: any;
    after?: any;
};
export declare class AuditStore {
    private file?;
    private buf;
    constructor(filePath?: string);
    log(ev: Omit<AuditEvent, "ts"> | AuditEvent): void;
    tail(n?: number): AuditEvent[];
}
