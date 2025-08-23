import { prisma } from "../src/infra/prisma"; 
import { createIncident, assessIncident, buildSchedule } from 
"../src/services/incidents"; 
import { sendTask } from "../src/services/tasks"; 
 
describe("N139 — Cronograma, registros y checklist", () => { 
  it("genera cronograma GDPR (72h) y registra notificación/ack", async 
() => { 
    const inc = await createIncident({ 
      discoveredAt: new Date().toISOString(), 
      summary: "Exposición de bucket S3 con emails", 
      jurisdictions: ["EU"], 
      initialCategories: [{ dataCategory: "email", approximateCount: 
12000, encryptedAtRest: false }] 
    }); 
    await assessIncident(inc.id, { severity: "S2", riskScore: 0.8, 
dataSubjects: 12000 }); 
    const sch = await buildSchedule(inc.id); 
    expect(sch.count).toBeGreaterThan(0); 
 
    const tasks = await prisma.notificationTask.findMany({ where: { 
incidentId: inc.id }}); 
    expect(tasks.some(t => t.kind === "authority")).toBeTruthy(); 
 
    // Simula envío 
    const sent = await sendTask(tasks[0].id); 
    expect(["sent","acknowledged","failed"]).toContain(sent.status); 
 
    const timeline = await prisma.timelineEntry.findMany({ where: { 
incidentId: inc.id }, orderBy: { at: "asc" }}); 
    expect(timeline.some(t => 
t.type.includes("notified"))).toBeTruthy(); 
    expect(timeline.every(t => t.eventHash.length === 
64)).toBeTruthy(); 
  }, 30000); 
}); 
 
