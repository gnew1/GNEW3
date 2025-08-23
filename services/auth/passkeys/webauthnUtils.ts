
/**
 * Utilidades stub autocontenidas para WebAuthn
 * Nxx dependencias simuladas en entorno de pruebas.
 */
import crypto from "crypto";

export function generateChallenge(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function verifyAttestation(_response: any): boolean {
  // Validación simulada
  return true;
}

export function verifyAssertion(_response: any, _storedCred: any): boolean {
  // Validación simulada
  return true;
}


