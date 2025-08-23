import { PrismaClient } from "@prisma/client"; 
import crypto from "crypto"; 
import { DataSourceConnector, DSARContext, ExportResult, ErasureResult 
} from "./types"; 
 
export function prismaConnector(table: string, subjectColumn: string, 
anonymizeColumns: string[] = []): DataSourceConnector { 
  const prisma = new PrismaClient(); 
  return { 
    id: `postgres:${table}`, 
    kind: "both", 
    async describe() { return { label: `Postgres table ${table}` }; }, 
    async exportData(ctx: DSARContext): Promise<ExportResult> { 
      const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM 
${table} WHERE ${subjectColumn} = $1`, ctx.subjectId); 
      const content = JSON.stringify(rows, null, 2); 
      const path = `/mnt/data/dsar/${ctx.subjectId}/${table}.json`; 
      const fs = await import("fs/promises"); 
      await fs.mkdir(`/mnt/data/dsar/${ctx.subjectId}`, { recursive: 
true }); 
      await fs.writeFile(path, content, "utf8"); 
      const sha256 = 
crypto.createHash("sha256").update(content).digest("hex"); 
      return { label: table, files: [{ path, sha256 }]}; 
    }, 
    async eraseData(ctx: DSARContext): Promise<ErasureResult> { 
      // Estrategia: anonimización si columns >0; si no, borrado duro 
      if (anonymizeColumns.length > 0) { 
        const sets = anonymizeColumns.map(c => `${c} = NULL`).join(", 
"); 
        const res: any = await prisma.$executeRawUnsafe( 
          `UPDATE ${table} SET ${sets} WHERE ${subjectColumn} = $1`, 
ctx.subjectId 
        ); 
        return { label: table, affected: Number(res ?? 0), details: { 
mode: "anonymize" } }; 
      } else { 
        const res: any = await prisma.$executeRawUnsafe( 
          `DELETE FROM ${table} WHERE ${subjectColumn} = $1`, 
ctx.subjectId 
        ); 
        return { label: table, affected: Number(res ?? 0), details: { 
mode: "delete" } }; 
      } 
    } 
  }; 
} 
 
Conector S3 (archivos adjuntos) 
