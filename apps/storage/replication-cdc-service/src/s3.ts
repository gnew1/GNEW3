
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { cfg } from "./config.js";

export type RegionKey = "primary" | "secondary";
export const clients: Record<RegionKey, S3Client> = {
  primary: new S3Client({
    endpoint: cfg.primary.endpoint,
    region: cfg.primary.region,
    credentials: { accessKeyId: cfg.primary.accessKeyId, secretAccessKey: cfg.primary.secretAccessKey },
    forcePathStyle: cfg.primary.forcePathStyle
  }),
  secondary: new S3Client({
    endpoint: cfg.secondary.endpoint,
    region: cfg.secondary.region,
    credentials: { accessKeyId: cfg.secondary.accessKeyId, secretAccessKey: cfg.secondary.secretAccessKey },
    forcePathStyle: cfg.secondary.forcePathStyle
  })
};
export function bucket(r: RegionKey) { return r === "primary" ? cfg.primary.bucket : cfg.secondary.bucket; }

export async function copyPut(src: RegionKey, dst: RegionKey, key: string, contentType?: string) {
  // stream src -> dst
  const srcObj = await clients[src].send(new GetObjectCommand({ Bucket: bucket(src), Key: key }));
  const body = srcObj.Body as any;
  const out = await clients[dst].send(new PutObjectCommand({ Bucket: bucket(dst), Key: key, Body: body, ContentType: contentType ?? (srcObj.ContentType ?? "application/octet-stream") }));
  return { etag: out.ETag?.replaceAll('"', "") ?? null };
}
export async function head(r: RegionKey, key: string) {
  const h = await clients[r].send(new HeadObjectCommand({ Bucket: bucket(r), Key: key }));
  return { etag: h.ETag?.replaceAll('"', "") ?? null, size: Number(h.ContentLength ?? 0), contentType: h.ContentType ?? "application/octet-stream" };
}
export async function del(r: RegionKey, key: string) {
  await clients[r].send(new DeleteObjectCommand({ Bucket: bucket(r), Key: key }));
}


