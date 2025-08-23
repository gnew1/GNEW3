import { prisma } from "../infra/prisma"; 
import { loadPolicies } from "./config"; 
 
export async function scheduleTasksForJurisdictions(inc: any) { 
  const pol = await loadPolicies(); 
  const dueBase = new Date(inc.discoveredAt); 
  const tasks: any[] = []; 
 
  for (const j of inc.jurisdictions) { 
    const jpol = pol.jurisdictions?.[j] ?? null; 
    if (!jpol) continue; 
 
    // authority deadline 
    if (jpol.authority_notify_hours) { 
      const due = new Date(dueBase.getTime() + 
jpol.authority_notify_hours * 3600_000); 
      // por cada autoridad de directorio → tarea 
      const dir: any[] = jpol.authority_directory ?? [{ key: 
`${j}-AGENCY`, name: `${j} Authority`, channel: 
jpol.authority_templates?.[0] ? 
pol.templates[jpol.authority_templates[0]]?.channel : "https", url: "" 
}]; 
      for (const a of dir) { 
        tasks.push(await prisma.notificationTask.create({ 
          data: { 
            incidentId: inc.id, kind: "authority", targetKey: a.key, 
channel: a.channel ?? "https", 
            templateKey: jpol.authority_templates?.[0] ?? 
"gdpr_authority", dueAt: due 
          } 
        })); 
      } 
    } 
 
    // subjects if high risk and categories signal risk 
    const high = inc.categories.some((c:any)=> c.highRisk === true) || 
inc.riskScore >= 0.7; 
    const mustNotifySubjects = 
      jpol.subjects_notify_if_risk === "any" ? true : 
      jpol.subjects_notify_if_risk === "high" ? high : false; 
 
    if (mustNotifySubjects) { 
      const due = new Date(dueBase.getTime() + Math.min(24, 
jpol.authority_notify_hours ?? 72) * 3600_000); // "sin dilación 
indebida" → heurística 24h 
      tasks.push(await prisma.notificationTask.create({ 
        data: { 
          incidentId: inc.id, kind: "data_subjects", targetKey: null, 
channel: "email", 
          templateKey: jpol.subject_templates?.[0] ?? "gdpr_subjects", 
dueAt: due 
        } 
      })); 
    } 
  } 
  return tasks; 
} 
 
