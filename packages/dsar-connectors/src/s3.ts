import { S3Client, ListObjectsV2Command, DeleteObjectsCommand, 
GetObjectCommand } from "@aws-sdk/client-s3"; 
import fs from "fs/promises"; 
import path from "path"; 
import crypto from "crypto"; 
import { DataSourceConnector, DSARContext, ExportResult, ErasureResult 
} from "./types"; 
 
export function s3Connector(bucket: string, prefixTpl: string): 
DataSourceConnector { 
  const s3 = new S3Client({ region: process.env.AWS_REGION }); 
  return { 
    id: `s3:${bucket}`, 
    kind: "both", 
    async describe() { return { label: `S3 ${bucket}` }; }, 
    async exportData(ctx: DSARContext): Promise<ExportResult> { 
      const prefix = prefixTpl.replace("{subjectId}", ctx.subjectId); 
      const list = await s3.send(new ListObjectsV2Command({ Bucket: 
bucket, Prefix: prefix })); 
      const outDir = `/mnt/data/dsar/${ctx.subjectId}/s3/${bucket}`; 
      await fs.mkdir(outDir, { recursive: true }); 
      const files = []; 
      for (const obj of list.Contents ?? []) { 
        const Key = obj.Key!; 
        const get = await s3.send(new GetObjectCommand({ Bucket: 
bucket, Key })); 
        const buf = Buffer.from(await 
get.Body!.transformToByteArray()); 
        const rel = path.join(outDir, Key.replaceAll("/", "_")); 
        await fs.writeFile(rel, buf); 
        files.push({ path: rel, sha256: 
crypto.createHash("sha256").update(buf).digest("hex") }); 
      } 
      return { label: `s3:${bucket}`, files }; 
    }, 
    async eraseData(ctx: DSARContext): Promise<ErasureResult> { 
      const prefix = prefixTpl.replace("{subjectId}", ctx.subjectId); 
      const list = await s3.send(new ListObjectsV2Command({ Bucket: 
bucket, Prefix: prefix })); 
      const Objects = (list.Contents ?? []).map(o=>({ Key: o.Key! })); 
      if (Objects.length === 0) return { label: `s3:${bucket}`, 
affected: 0 }; 
await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: 
{ Objects }})); 
return { label: `s3:${bucket}`, affected: Objects.length, 
details: { mode: "delete" } }; 
} 
}; 
} 
Orquestador & Certificado 
