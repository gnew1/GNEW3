
import fs from "fs";
import path from "path";

export type AuditEvent = {
  ts: string;
  user: string;
  action: string;
  before?: any;
  after?: any;
};

export class AuditStore {
  private readonly file?: string;
  private readonly buf: AuditEvent[] = [];

  constructor(filePath?: string) {
    if (filePath && filePath.trim().length > 0) {
      this.file = path.resolve(filePath);
      try {
        if (!fs.existsSync(this.file)) fs.writeFileSync(this.file, "", "utf-8");
      } catch {
        this.file = undefined;
      }
    }
  }

  // Accept callers without ts; we stamp it here
  log(ev: Omit<AuditEvent, "ts"> | AuditEvent) {
    const e = { ...(ev as any), ts: new Date().toISOString() } as AuditEvent;
    this.buf.push(e);
    if (this.file) {
      try {
        fs.appendFileSync(this.file, JSON.stringify(e) + "\n", "utf-8");
      } catch {
        // ignore file errors
      }
    }
  }

  tail(n = 100): AuditEvent[] {
    return this.buf.slice(-n);
  }
}


