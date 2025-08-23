import { PrismaClient } from "@prisma/client"; 
export function postgresConnector() { 
const prisma = new PrismaClient(); 
return { 
async apply(input: { system: string; resourceType: string; 
resourceId: string; action: 
"delete"|"anonymize"|"compact"|"s3_lifecycle" }) { 
      const [schema, table] = parseTable(input.resourceType); // ej. 
"public.User" 
      if (input.action === "delete") { 
        const res: any = await prisma.$executeRawUnsafe(`DELETE FROM 
${schema}."${table}" WHERE id = $1`, input.resourceId); 
        return { action: "delete", result: { affected: Number(res ?? 
0) } }; 
      } 
      if (input.action === "anonymize") { 
        // columnas a anonimizar definidas por convención (suffix 
_pii) o DataMap (futuro) 
        const res: any = await prisma.$executeRawUnsafe(`UPDATE 
${schema}."${table}" SET email=NULL, phone=NULL, name=NULL WHERE id = 
$1`, input.resourceId); 
        return { action: "anonymize", result: { affected: Number(res 
?? 0) } }; 
      } 
      if (input.action === "compact") { 
        // compactar para eventos: mover crudo a agregados (stub) 
        return { action: "compact", result: { ok: true } }; 
      } 
      return { action: "skip", result: { reason: "not_applicable" } }; 
    } 
  }; 
} 
function parseTable(rt: string) { 
  const parts = rt.split("."); 
  return parts.length === 2 ? [parts[0], parts[1]] : ["public", rt]; 
} 
 
