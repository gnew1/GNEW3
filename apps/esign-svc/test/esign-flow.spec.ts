import { prisma } from "../src/infra/prisma"; 
import { reloadTemplates } from "../src/services/templates"; 
import { createEnvelope, renderEnvelopePDF, sendEnvelope, 
applySignature } from "../src/services/envelopes"; 
 
describe("N138 e-sign flow", () => { 
  it("create→render→send→sign→anchor", async ()=>{ 
    await reloadTemplates(); 
    const env = await createEnvelope({ 
      templateKey: "msa", locale:"es-ES", 
      data: { company_name:"GNEW SA", company_address:"C/ Demo 1", 
counterparty_name:"ACME SL", counterparty_address:"C/ Foo 2", 
effective_date:"2025-08-19" }, 
      createdBy: "subject_creator", 
      signers: [{ role:"company", name:"GNEW Rep", 
email:"rep@gnew.org", order:1 }, { role:"counterparty", name:"ACME 
Rep", email:"rep@acme.com", order:2 }] 
    }); 
    const r = await renderEnvelopePDF(env.id); 
    expect(r.sha256).toHaveLength(64); 
    await sendEnvelope(env.id); 
    // Simula firma 1 
    const s1 = await prisma.signer.findFirst({ where: { envelopeId: 
env.id }, orderBy: { order: "asc" }}); 
    // @ts-ignore (token privado) 
    const { applySignature: signFn } = await 
import("../src/services/envelopes"); 
    const tok = (await import("../src/services/envelopes") as 
any).signToken({ envelopeId: env.id, signerId: s1!.id }); 
    await applySignature(tok, { ip:"1.1.1.1", userAgent:"jest", 
signatureImg: null }); 
    // Simula firma 2 
    const s2 = await prisma.signer.findFirst({ where: { envelopeId: 
env.id, id: { not: s1!.id } }}); 
    const tok2 = (await import("../src/services/envelopes") as 
any).signToken({ envelopeId: env.id, signerId: s2!.id }); 
    const final = await applySignature(tok2, { ip:"2.2.2.2", 
userAgent:"jest", signatureImg: null }); 
    expect(final.status).toBe("completed"); 
  }, 30_000); 
}); 
 
