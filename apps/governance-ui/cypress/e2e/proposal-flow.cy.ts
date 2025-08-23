/// <reference types="cypress" /> 
 
describe("Gobernanza E2E — propose → vote → queue → execute", () => { 
  before(() => { 
    cy.task("deployFixture").then((addrs: any) => { 
      // Inyecta env para la app 
      (window as any).__GOV_ADDR__ = addrs.gov; 
      (window as any).__TL_ADDR__  = addrs.timelock; 
    }); 
  }); 
 
  it("flujo completo", () => { 
    // Inicia la app con el dev signer (VITE_FORCE_DEV_SIGNER=true) 
    cy.visit("/"); 
    // Parchea las direcciones a runtime 
    cy.window().then((win) => { 
      const gov = (win as any).__GOV_ADDR__; 
      const tl  = (win as any).__TL_ADDR__; 
      (win as any).import_meta_env = { VITE_GOVERNOR_ADDRESS: gov, 
VITE_TIMELOCK_ADDRESS: tl }; 
    }); 
 
    // Crea propuesta 
    cy.contains("Nueva propuesta").click(); 
    cy.get("input[placeholder='Descripción de la 
propuesta']").clear().type("set quorum to 3%"); 
    cy.get("input").contains("bps"); // campo quorum 
    cy.contains("Proponer").click(); 
 
    // Volver a listado y abrir detalle 
    cy.contains("Propuestas").should("exist"); 
    cy.get("a").first().click(); 
 
    // Vota For con razón 
    cy.get("input[placeholder='Razón (opcional)']").type("Looks 
good"); 
    cy.contains("For").click(); 
 
    // Avanza periodo (simulación: esperar bloques no es posible desde 
UI, pero el Governor configurado tiene period corto) 
    cy.wait(4000); 
 
    // Queue 
    cy.contains("Queue").click(); 
 
    // Espera delay del timelock (1 min configurado en fixture) 
    cy.wait(65000); 
 
    // Execute 
    cy.contains("Execute").click(); 
 
    // Verifica que no falla (UI simple: si ejecuta, el tx hash 
aparece) 
cy.contains("exec tx:").should("exist"); 
}); 
}); 
