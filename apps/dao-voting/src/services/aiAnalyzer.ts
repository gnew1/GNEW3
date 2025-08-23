
/**
 * Servicio de análisis IA para auditoría de propuestas.
 * Aquí se usa un mock; en producción se integraría un LLM externo.
 */
export async function analyzeProposal(content: string): Promise<Record<string, any>> {
  // Simulación de IA detectando riesgos y sesgos
  const risks: string[] = [];
  if (content.toLowerCase().includes("only elites")) {
    risks.push("Bias detected: exclusivity for elites");
  }
  if (content.length > 5000) {
    risks.push("Proposal too long; may hide complexity risks");
  }

  return {
    summary: content.slice(0, 120) + (content.length > 120 ? "..." : ""),
    risks,
    score: risks.length === 0 ? "A" : "C"
  };
}


