
import { MultiRegionObjectStore } from "../src/multiRegionObjectStore";

describe("MultiRegionObjectStore", () => {
  const store = new MultiRegionObjectStore({
    primary: { region: "us-east-1", bucket: "gnew-primary" },
    replicas: [
      { region: "eu-west-1", bucket: "gnew-replica-eu" },
      { region: "ap-south-1", bucket: "gnew-replica-ap" },
    ],
  });

  it("should generate signed upload url", async () => {
    const url = await store.getSignedUrlForUpload("test.txt");
    expect(url).toContain("test.txt");
  });

  it("should generate signed download url", async () => {
    const url = await store.getSignedUrlForDownload("test.txt");
    expect(url).toContain("test.txt");
  });
});


Este módulo MultiRegionObjectStore:

Escribe en la región primaria y replica en segundo plano a otras regiones.

Lee primero de la región solicitada o primaria, y hace fallback a réplicas.

Expone métodos para URLs prefirmadas de subida y descarga.

Se integra en el monorepo con packages/storage.

¿Quieres que prepare también un Terraform module para desplegar buckets multi-región y enlazarlo a este servicio?

