
import { S3Client, HeadBucketCommand, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { cfg } from "./config.js";

export type RegionKey = "primary" | "secondary";

export const clients: Record<RegionKey, S3Client | null> = {
  primary: new S3Client({
    endpoint: cfg.primary.endpoint,
    region: cfg.primary.region,
    credentials: { accessKeyId: cfg.primary.accessKeyId, secretAccessKey: cfg.primary.secretAccessKey },
    forcePathStyle: cfg.primary.forcePathStyle
  }),
  secondary: cfg.secondary ? new S3Client({
    endpoint: cfg.secondary.endpoint,
    region: cfg.secondary.region,
    credentials: { accessKeyId: cfg.secondary.accessKeyId!, secretAccessKey: cfg.secondary.secretAccessKey! },
    forcePathStyle: cfg.secondary.forcePathStyle
  }) : null
};

export function bucket(region: RegionKey) {
  return region === "primary" ? cfg.primary.bucket : (cfg.secondary?.bucket ?? "");
}

export async function health(region: RegionKey): Promise<boolean> {
  const c = clients[region];
  if (!c) return false;
  try {
    await c.send(new HeadBucketCommand({ Bucket: bucket(region) }));
    return true;
  } catch {
    return false;
  }
}

export async function putStream(region: RegionKey, key: string, stream: any, contentType?: string) {
  const c = clients[region];
  if (!c) throw new Error("region_client_not_available");
  const out = await c.send(new PutObjectCommand({ Bucket: bucket(region), Key: key, Body: stream, ContentType: contentType }));
  return { etag: out.ETag?.replaceAll('"', "") ?? null };
}

export async function headObject(region: RegionKey, key: string) {
  const c = clients[region];
  if (!c) throw new Error("region_client_not_available");
  const out = await c.send(new HeadObjectCommand({ Bucket: bucket(region), Key: key }));
  return {
    etag: out.ETag?.replaceAll('"', "") ?? null,
    contentLength: Number(out.ContentLength ?? 0),
    contentType: out.ContentType ?? "application/octet-stream",
    lastModified: out.LastModified?.toISOString() ?? null
  };
}

export async function getObject(region: RegionKey, key: string) {
  const c = clients[region];
  if (!c) throw new Error("region_client_not_available");
  const out = await c.send(new GetObjectCommand({ Bucket: bucket(region), Key: key }));
  const body = out.Body as any; // Readable stream
  return {
    body,
    contentType: out.ContentType ?? "application/octet-stream",
    contentLength: Number(out.ContentLength ?? 0),
    etag: out.ETag?.replaceAll('"', "") ?? null
  };
}

export async function presign(region: RegionKey, op: "get"|"put", key: string, expiresSec: number, contentType?: string) {
  const c = clients[region];
  if (!c) throw new Error("region_client_not_available");
  if (op === "get") {
    const cmd = new GetObjectCommand({ Bucket: bucket(region), Key: key });
    return await getSignedUrl(c, cmd, { expiresIn: expiresSec });
  } else {
    const cmd = new PutObjectCommand({ Bucket: bucket(region), Key: key, ContentType: contentType });
    return await getSignedUrl(c, cmd, { expiresIn: expiresSec });
  }
}


