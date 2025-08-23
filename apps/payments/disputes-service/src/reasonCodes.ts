
/** Mapeo mínimo de reason codes → categorías humanas */
export const ReasonCatalog: Record<string, { category: string; description: string }> = {
  "10.4": { category: "Fraud", description: "Other Fraud—Card-Absent Environment" },
  "13.1": { category: "Service", description: "Merchandise/Services Not Received" },
  "13.2": { category: "Service", description: "Canceled Recurring Transaction" },
  "13.3": { category: "Quality", description: "Not as Described or Defective" },
  "4808": { category: "Authorization", description: "Authorization-Related Chargeback" }, // MC sample
  "4863": { category: "Fraud", description: "Cardholder Does Not Recognize" }
};


