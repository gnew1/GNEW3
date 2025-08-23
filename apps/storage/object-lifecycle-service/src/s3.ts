
import { S3Client, HeadObjectCommand, PutObjectLegalHoldCommand, PutObjectRetentionCommand } from "@aws-sdk/client-s3";
import { cfg } from "./config.js";

export const s3 = new S3Client({
  endpoint: cfg.s3.endpoint,
  region: cfg.s3.region,
  credentials: { accessKeyId: cfg.s3.accessKeyId, secretAccessKey: cfg.s3.secretAccessKey },
  forcePathStyle: cfg.s3.forcePathStyle
});

export async function headObject(bucket: string, key: string) {
  const out = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  return {
    exists: true,
    lastModified: out.LastModified ?? null,
    contentLength: Number(out.ContentLength ?? 0),
    contentType: out.ContentType ?? "application/octet-stream",
    objectLockMode: out.ObjectLockMode as ("GOVERNANCE"|"COMPLIANCE"|undefined),
    objectLockRetainUntilDate: out.ObjectLockRetainUntilDate ?? null,
    legalHoldStatus: out.ObjectLockLegalHoldStatus as ("ON"|"OFF"|undefined),
    etag: out.ETag?.replaceAll('"', "") ?? null
  };
}

export async function applyLegalHold(bucket: string, key: string, on: boolean) {
  await s3.send(new PutObjectLegalHoldCommand({
    Bucket: bucket, Key: key,
    LegalHold: { Status: on ? "ON" : "OFF" }
  }));
}

export async function applyRetention(bucket: string, key: string, retainUntil: Date, mode: "GOVERNANCE"|"COMPLIANCE") {
  await s3.send(new PutObjectRetentionCommand({
    Bucket: bucket, Key: key,
    Retention: { Mode: mode, RetainUntilDate: retainUntil }
  }));
}


