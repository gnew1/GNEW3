import { render, screen, waitFor } from "@testing-library/react"; 
import React from "react"; 
import { DebatePanel } from "../src/debate-panel"; 
 
it("renderiza TL;DR y argumentos", async () => { 
  // mock fetch 
  // @ts-ignore 
  global.fetch = vi.fn(async () => ({ 
    ok: true, 
    json: async () => ({ 
      thread_id: 1, 
      title: "Demo", 
      tldr: "Resumen.", 
      key_arguments: ["A1", "A2"], 
      tags: ["finanzas", "kpis"], 
      agenda: ["definir KPIs"], 
      sources: [], 
    }), 
  })); 
 
  render(<DebatePanel apiBase="/x" threadId={1} />); 
  expect(screen.getByText(/generando/i)).toBeInTheDocument(); 
  await waitFor(() => screen.getByText("Resumen.")); 
  expect(screen.getByText("Resumen.")).toBeInTheDocument(); 
  expect(screen.getByText("Argumentos clave")).toBeInTheDocument(); 
}); 
 
 
