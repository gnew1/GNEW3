
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface RegionConfig {
  region: string;
  bucket: string;
  endpoint?: string;
}

interface MultiRegionObjectStoreOptions {
  primary: RegionConfig;
  replicas: RegionConfig[];
}

export class MultiRegionObjectStore {
  private readonly primary: RegionConfig;
  private readonly replicas: RegionConfig[];

  constructor(options: MultiRegionObjectStoreOptions) {
    this.primary = options.primary;
    this.replicas = options.replicas;
  }

  private getClient(regionConfig: RegionConfig): S3Client {
    return new S3Client({
      region: regionConfig.region,
      endpoint: regionConfig.endpoint,
    });
  }

  async putObject(key: string, body: Buffer | Uint8Array | Blob | string): Promise<void> {
    const primaryClient = this.getClient(this.primary);

    await primaryClient.send(
      new PutObjectCommand({
        Bucket: this.primary.bucket,
        Key: key,
        Body: body,
      })
    );

    // Async replication (fire and forget)
    this.replicas.forEach(replica => {
      const replicaClient = this.getClient(replica);
      replicaClient.send(
        new PutObjectCommand({
          Bucket: replica.bucket,
          Key: key,
          Body: body,
        })
      ).catch(err => {
        console.error(`[Replication Error][${replica.region}] ${err}`);
      });
    });
  }

  async getObject(key: string, preferRegion?: string): Promise<Buffer | null> {
    const region = preferRegion ? [preferRegion, this.primary.region] : [this.primary.region];
    const allRegions = [...region, ...this.replicas.map(r => r.region)];

    for (const reg of allRegions) {
      const cfg = this.resolveRegion(reg);
      if (!cfg) continue;

      try {
        const client = this.getClient(cfg);
        const obj = await client.send(
          new GetObjectCommand({
            Bucket: cfg.bucket,
            Key: key,
          })
        );
        if (obj.Body) {
          return Buffer.from(await obj.Body.transformToByteArray());
        }
      } catch (err) {
        console.warn(`[Read Fallback][${cfg.region}] ${err}`);
      }
    }
    return null;
  }

  async getSignedUrlForUpload(key: string, expiresIn = 3600): Promise<string> {
    const client = this.getClient(this.primary);
    const command = new PutObjectCommand({
      Bucket: this.primary.bucket,
      Key: key,
    });
    return getSignedUrl(client, command, { expiresIn });
  }

  async getSignedUrlForDownload(key: string, expiresIn = 3600): Promise<string> {
    const client = this.getClient(this.primary);
    const command = new GetObjectCommand({
      Bucket: this.primary.bucket,
      Key: key,
    });
    return getSignedUrl(client, command, { expiresIn });
  }

  private resolveRegion(region: string): RegionConfig | undefined {
    if (region === this.primary.region) return this.primary;
    return this.replicas.find(r => r.region === region);
  }
}


