import fs from "fs";
import os from "os";
import path from "path";
import { AuditStore } from "../src/store/audit";

describe("AuditStore", () => {
  it("logs events and persists to file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-test-"));
    const file = path.join(dir, "audit.log");
    const store = new AuditStore(file);
    store.log({ user: "u1", action: "create" });
    store.log({ user: "u2", action: "update" });
    const tail = store.tail(1);
    expect(tail[0].user).toBe("u2");
    expect(tail[0].ts).toBeDefined();
    const lines = fs.readFileSync(file, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.user).toBe("u1");
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
