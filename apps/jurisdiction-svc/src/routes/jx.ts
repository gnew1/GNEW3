import { Router } from "express"; 
import { z } from "zod"; 
import { resolveEffective, versionString, listCoverage, recordDecision 
} from "../services/engine"; 
 
export const router = Router(); 
 
// Catálogo / versión activa 
router.get("/catalog", async (_req, res) => { 
  const coverage = await listCoverage(); 
  res.json({ version: await versionString(), coverage }); 
}); 
 
// Reglas efectivas por país (y opcional producto) 
router.get("/:countryCode/effective", async (req, res) => { 
  const country = req.params.countryCode.toUpperCase(); 
  const p = { country, productType: (req.query.productType as string) 
|| "digital" }; 
  res.json(await resolveEffective({ country: p.country, productType: 
p.productType })); 
}); 
 
// Resolve: entrada rica (KYC/tx) → obligaciones 
router.post("/resolve", async (req, res) => { 
  const Body = z.object({ 
    country: z.string().length(2), 
    productType: z.enum(["digital","physical","financial","service"]), 
    kycLevel: 
z.enum(["NONE","BASIC","STANDARD","ENHANCED"]).optional(), 
    isPEP: z.boolean().optional().default(false), 
    sanctionsStatus: 
z.enum(["clear","review","blocked"]).optional().default("clear"), 
    amount: z.number().nonnegative().optional(), 
    currency: z.string().optional().default("EUR") 
  }); 
  const input = Body.parse(req.body); 
  const out = await resolveEffective(input); 
  const decision = { 
    tax: out.tax, 
    kyc: out.kyc, 
    limits: out.limits, 
    obligations: [ 
      ...(input.isPEP ? (out.risk.pep === "REVIEW" ? ["manual_review"] 
: []) : []), 
      ...(input.sanctionsStatus === "blocked" ? ["block"] : []), 
      ...(out.embargo ? ["block_embargo"] : []) 
    ] 
  }; 
  const ev = await recordDecision(input, decision); 
  res.json({ ...decision, decisionId: ev.id, eventHash: ev.eventHash 
}); 
}); 
 
