export function s3Connector() { 
  return { 
    async apply(input: { resourceId: string; action: 
"delete"|"anonymize"|"compact"|"s3_lifecycle" }) { 
      if (input.action === "s3_lifecycle") { 
        // no-op: gestionado por lifecycle nativo (ver IaC). Registrar 
como done. 
        return { action: "s3_lifecycle", result: { delegated: true } 
}; 
      } 
      if (input.action === "delete") { 
        // opcional: borrar objeto directamente 
        return { action: "delete", result: { attempted: true } }; 
      } 
      return { action: "skip", result: { reason: "not_applicable" } }; 
    } 
  }; 
} 
 
 
SDK de registro de retención + minimización 
