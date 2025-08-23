
import { AuditLogger, AuditEntry } from "../src/auditLogger";
import fs from "fs";
import path from "path";

const logPath = path.resolve(__dirname, "../../logs/audit.log");

beforeEach(() => {
  if (fs.existsSync(logPath)) {
    fs.unlinkSync(logPath);
  }
});

describe("AuditLogger", () => {
  it("registra una acción y la lee correctamente", () => {
    const entry: AuditEntry = {
      userId: "user1",
      action: "CREATE_PROPOSAL",
      timestamp: new Date().toISOString(),
      metadata: { proposalId: "p1" },
    };

    AuditLogger.log(entry);
    const logs = AuditLogger.readAll();

    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe("CREATE_PROPOSAL");
    expect(logs[0].metadata?.proposalId).toBe("p1");
  });

  it("retorna lista vacía si no hay log", () => {
    const logs = AuditLogger.readAll();
    expect(logs).toEqual([]);
  });
});


/apps/dao-voting/package.json (fragmento)

{
  "scripts": {
    "test:audit": "jest tests/auditLogger.test.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N350.

