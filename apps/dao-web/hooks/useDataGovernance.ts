
/**
 * Hook React para invocar el servicio de gobierno de datos desde la app web.
 */
import { useCallback } from "react";

export function useDataGovernance() {
  return useCallback(async (field: string, value: any) => {
    const res = await fetch("/api/data-governance/encrypt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value }),
    });
    return res.json();
  }, []);
}


