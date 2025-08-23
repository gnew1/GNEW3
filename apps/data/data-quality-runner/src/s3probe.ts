
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { cfg } from "./config.js";

export type S3Stats = { bucket: string; prefix: string; count: number; bytes: number; maxLastModified: number | null };

export const s3 = new S3Client({
  endpoint: cfg.s3.endpoint,
  region: cfg.s3.region,
  credentials: { accessKeyId: cfg.s3.accessKeyId, secretAccessKey: cfg.s3.secretAccessKey },
  forcePathStyle: cfg.s3.forcePathStyle
});

export function parseS3Url(url: string): { bucket: string; prefix: string } {
  if (!url.startsWith("s3://")) throw new Error("invalid_s3_url");
  const rest = url.substring(5);
  const slash = rest.indexOf("/");
  if (slash < 0) return { bucket: rest, prefix: "" };
  return { bucket: rest.substring(0, slash), prefix: rest.substring(slash + 1) };
}

export async function statPrefix(url: string, limit = 100000): Promise<S3Stats> {
  const { bucket, prefix } = parseS3Url(url);
  let token: string | undefined = undefined;
  let count = 0;
  let bytes = 0;
  let maxLM: number | null = null;
  do {
    const out = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: token,
      MaxKeys: 1000
    }));
    for (const o of (out.Contents ?? [])) {
      count++;
      bytes += Number(o.Size ?? 0);
      const lm = o.LastModified?.getTime() ?? null;
      if (lm != null) maxLM = Math.max(maxLM ?? 0, lm);
      if (count >= limit) break;
    }
    token = (out.IsTruncated && count < limit) ? out.NextContinuationToken ?? undefined : undefined;
  } while (token);
  return { bucket, prefix, count, bytes, maxLastModified: maxLM };
}


