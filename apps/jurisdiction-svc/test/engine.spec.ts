import { resolveEffective } from "../src/services/engine"; 
 
describe("jurisdiction engine", ()=>{ 
  it("EU digital returns VAT applicable", async ()=>{ 
    const out = await resolveEffective({ country: "ES", productType: 
"digital" }); 
    expect(out.tax.vatApplicable).toBe(true); 
    expect(out.tax.vatRate).toBeGreaterThan(0); 
  }); 
  it("US no VAT for digital", async ()=>{ 
    const out = await resolveEffective({ country: "US", productType: 
"digital" }); 
    expect(out.tax.vatApplicable).toBe(false); 
    expect(out.tax.vatRate).toBe(0); 
  }); 
  it("limits depend on KYC level", async ()=>{ 
    const basic = await resolveEffective({ country: "ES", productType: 
"digital", kycLevel: "BASIC" }); 
    const std = await resolveEffective({ country: "ES", productType: 
"digital", kycLevel: "STANDARD" }); 
    expect(std.limits.tx_max).toBeGreaterThan(basic.limits.tx_max); 
  }); 
}); 
 
