
/**
 * Hook de React para enviar eventos de telemetría desde la app web.
 */
import { useCallback } from "react";

export function useTelemetry(service: string) {
  return useCallback((event: string, data: Record<string, any>) => {
    fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service, event, data }),
    });
  }, [service]);
}


