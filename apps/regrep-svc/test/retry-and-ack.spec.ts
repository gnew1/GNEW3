import { prisma } from "../src/infra/prisma"; 
 
describe("reintentos + ack", () => { 
  it("marca sent→acknowledged al recibir ack", async () => { 
    const def = await prisma.reportDefinition.create({ data: { 
key:"test", version:"v", title:"t", authority:"X", jurisdiction:"ES", 
schedule:"* * * * *", transport:"https", format:"json", config:{} }}); 
const run = await prisma.reportRun.create({ data: { defId: def.id, 
periodStart: new Date(), periodEnd: new Date(), status:"sent" }}); 
await prisma.reportArtifact.create({ data: { runId: run.id, 
kind:"ack", path:"/tmp/ack", mime:"application/json", size:2, 
sha256:"ab"}}); 
await prisma.reportRun.update({ where: { id: run.id }, data: { 
status:"acknowledged", ackId:"ACK123", ackAt: new Date() }}); 
const out = await prisma.reportRun.findUnique({ where: { id: 
run.id }}); 
expect(out?.status).toBe("acknowledged"); 
}); 
}); 
