// 
✅
 Pruebas legales (EU): opt-in explícito y bloqueo previo 
describe("Consent Banner (EU)", () => { 
  it("bloquea analytics hasta consentimiento y registra decisiones por 
canal", () => { 
    cy.clearCookies(); 
    cy.visit("/"); 
    cy.get('[aria-label="Consent banner"]').should("exist"); 
    // No carga script analytics 
    cy.request({ url: "/_script/analytics.js", failOnStatusCode: false 
}).its("status").should("eq", 204); 
    // Aceptar personalizado: analytics on, marketing email off 
    cy.get('label:contains("Analítica (web)") input').check(); 
    cy.get('label:contains("Marketing (email)") input').uncheck(); 
    cy.contains("Guardar selección").click(); 
    // Ahora analytics disponible 
    cy.request({ url: "/_script/analytics.js", failOnStatusCode: false 
}).its("status").should("eq", 200); 
  }); 
}); 
 
