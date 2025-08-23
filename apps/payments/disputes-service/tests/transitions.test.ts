
import { db } from "../src/db.js";
import { nextDeadline } from "../src/sla.js";
import { nanoid } from "nanoid";

// Helpers directos a DB para probar flujo básico
function getDispute(id: string) {
  return db.prepare("SELECT * FROM disputes WHERE id=?").get(id) as any;
}

test("open → represent → won (release adjustment)", () => {
  const id = nanoid();
  const now = Date.now();
  db.prepare(`INSERT INTO disputes(id,paymentId,currency,amountMinor,feeMinor,reasonCode,status,openedAt,updatedAt,respondBy)
              VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .run(id, "pay_1", "EUR", 10000, 0, "13.1", "chargeback", now, now, nextDeadline("chargeback", now));
  db.prepare("INSERT INTO holds(id,disputeId,currency,amountMinor,createdAt) VALUES(?,?,?,?,?)")
    .run(nanoid(), id, "EUR", 10000, now);

  // represent
  const respond = nextDeadline("representment", now);
  db.prepare("UPDATE disputes SET status='representment', updatedAt=?, respondBy=? WHERE id=?").run(now, respond, id);
  expect(getDispute(id).status).toBe("representment");

  // close won (release)
  const hold = db.prepare("SELECT * FROM holds WHERE disputeId=? AND releasedAt IS NULL").get(id) as any;
  db.prepare("UPDATE holds SET releasedAt=? WHERE id=?").run(Date.now(), hold.id);
  db.prepare("INSERT INTO adjustments(id,disputeId,currency,kind,amountMinor,createdAt) VALUES(?,?,?,?,?,?)")
    .run(nanoid(), id, "EUR", "release", 10000, Date.now());
  db.prepare("UPDATE disputes SET status='won', updatedAt=?, respondBy=? WHERE id=?").run(Date.now(), Date.now(), id);

  const adj = db.prepare("SELECT * FROM adjustments WHERE disputeId=?").get(id) as any;
  expect(adj.kind).toBe("release");
});


