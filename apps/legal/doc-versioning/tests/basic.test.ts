
import "../src/db.js";
import { db } from "../src/db.js";
import { sha256Hex } from "../src/crypto.js";

test("create doc + version and compute hash", () => {
  const id = "doc_test_1";
  db.prepare("INSERT INTO documents(id,title,type,createdAt) VALUES(?,?,?,?)").run(id, "Términos", "policy", Date.now());
  const bytes = Buffer.from("hola mundo");
  const hash = sha256Hex(bytes);
  db.prepare("INSERT INTO versions(id,docId,version,mime,size,sha256Hex,content,createdAt) VALUES(?,?,?,?,?,?,?,?)")
    .run("v1", id, 1, "text/plain", bytes.byteLength, hash, bytes.toString("base64"), Date.now());
  const row = db.prepare("SELECT sha256Hex FROM versions WHERE id='v1'").get() as any;
  expect(row.sha256Hex).toBe(hash);
});


