import fs from "fs";
import path from "path";
export class AuditStore {
    file;
    buf = [];
    constructor(filePath) {
        if (filePath && filePath.trim().length > 0) {
            this.file = path.resolve(filePath);
            try {
                if (!fs.existsSync(this.file))
                    fs.writeFileSync(this.file, "", "utf-8");
            }
            catch {
                this.file = undefined;
            }
        }
    }
    // Accept callers without ts; we stamp it here
    log(ev) {
        const e = { ...ev, ts: new Date().toISOString() };
        this.buf.push(e);
        if (this.file) {
            try {
                fs.appendFileSync(this.file, JSON.stringify(e) + "\n", "utf-8");
            }
            catch {
                // ignore file errors
            }
        }
    }
    tail(n = 100) {
        return this.buf.slice(-n);
    }
}
