/**
 * Demo E2E: Alice y Bob establecen sesión y envían/reciben mensajes via servidor.
 * Ejecutar con mTLS activo (Envoy) o directo en dev.
 */
import { DoubleRatchet } from "@gnew/ratchet";
import { createPrekeyBundle, x3dhInitiator, x3dhResponder } from "@gnew/ratchet";
import { x25519 } from "@gnew/ratchet/src/crypto";

const base = process.env.MBOX || "http://localhost:8020";

async function json(url: string, opt?: any) {
  const r = await fetch(url, { ...opt, headers: { "Content-Type": "application/json", ...(opt?.headers||{}) } });
  return r.json();
}

(async () => {
  const aliceIK = x25519();
  const bobBundle = createPrekeyBundle();

  await json(`${base}/prekeys`, { method: "POST", body: JSON.stringify({
    user: "bob", identity_pk: Buffer.from(bobBundle.identity.pk).toString("base64url"),
    signed_prekey_pk: Buffer.from(bobBundle.signedPrekey.pk).toString("base64url"),
    one_time_pk: Buffer.from(bobBundle.oneTime!.pk).toString("base64url")
  })});

  const bundle = await json(`${base}/prekeys/bob`);
  const ssA = x3dhInitiator(aliceIK, {
    identity: { pk: Buffer.from(bundle.identity_pk, "base64url"), sk: new Uint8Array() },
    signedPrekey: { pk: Buffer.from(bundle.signed_prekey_pk, "base64url"), sk: new Uint8Array() },
    oneTime: { pk: Buffer.from(bundle.one_time_pk, "base64url"), sk: new Uint8Array() }
  } as any);
  const ssB = x3dhResponder(bobBundle, aliceIK.pk);

  const A = await DoubleRatchet.initAlice(ssA, bobBundle.signedPrekey.pk);
  const B = await DoubleRatchet.initBob(ssB, bobBundle.signedPrekey);

  const pkt = A.send(new TextEncoder().encode("hola desde Alice"));
  await json(`${base}/messages`, { method: "POST", body: JSON.stringify({
    to_user: "bob", from_user: "alice", header: pkt.header, nonce: pkt.nonce, ciphertext: pkt.ciphertext
  })});

  const msgs = await json(`${base}/messages?user=bob`);
  const m0 = msgs[0];
  const pt = B.receive(m0);
  console.log("Bob recibió:", new TextDecoder().decode(pt));
})();

 
Cómo cumple con el Prompt 66
●	Objetivo (E2E para mensajería interna y API sensibles):

○	Mensajería E2E implementada con Double Ratchet + X3DH (@gnew/ratchet) y mailbox sin acceso a claves (services/messaging).

○	API sensibles protegidas con mTLS (Envoy) y TLS rotation.

●	Roles: Seguridad y Backend — política en /policies/crypto/rotation.yml, CI en /.github/workflows/crypto.yml.

●	Stack:

○	Double Ratchet / (MLS): ratchet listo; para MLS, este repo actúa como “perfil de transición” (puedes integrar OpenMLS en un microservicio separado).

○	TLS mTLS: infra/envoy/envoy.yaml + K8s manifest.

○	KMS/HSM: services/secrets/envelope.ts + proveedor aws-kms.ts (stub demostrativo).

●	Entregables:

○	Rotación de claves: política + workflow de recordatorio + endpoints de prekeys para rotación user-side.

○	PFS: test __tests__/pfs.test.ts y derivación por mensaje.

●	Pasos:

○	Política de rotación y revocación: /policies/crypto/rotation.yml.

○	HSM/KMS para secretos: envelope encryption con interfaz KMS (sustituir stub por AWS/Vault en prod).

●	DoD:

○	PenTests sin críticos → Checklist a validar:

■	mTLS obligatorio en ingress; client cert requerido (probar 403 sin cert).

■	Servidor no accede a plaintext (ver diseño mailbox).

■	PFS verificada por tests.

■	Rotación de prekeys y TLS operativa con evidencia (issues programados + logs).

¿Quieres que añada un servicio verificador MLS (OpenMLS gRPC, Rust) y un script de rotación automática de certificados (ACME interno) para cerrar el gap MLS y PKI en producción?
Tú dijiste:
programa a nivel de detalle para GNEW N67 7.7 Control de acceso descentralizado (Prompt 67) Objetivo: RBAC/ABAC gobernado por DAO. Roles: Backend, Gobernanza, Seguridad. Stack: Casbin/OPA, políticas on-chain → off-chain cache. Entregables: Servicio “authz” y editor de políticas. Pasos: Roles y atributos por contexto. Versionado de políticas y auditoría. DoD: Evaluación <50ms, logs trazables.
ChatGPT Plus
Pensó durante 1m 26s
