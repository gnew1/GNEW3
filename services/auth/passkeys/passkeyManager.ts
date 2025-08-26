
/**
 * M17: Autenticación fuerte y device binding (Passkeys)
 * Servicio centralizado para gestionar creación, verificación
 * y almacenamiento seguro de credenciales WebAuthn (passkeys).
 */
import base64url from "base64url";
import { generateChallenge, verifyAttestation, verifyAssertion } from "./webauthnUtils";

export interface RegistrationOptions {
  challenge: string;
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: string; alg: number }[];
  timeout: number;
}

export interface AuthenticationOptions {
  challenge: string;
  allowCredentials: { type: string; id: string; transports: string[] }[];
  timeout: number;
  userVerification: "preferred" | "required" | "discouraged";
}

export class PasskeyManager {
  private readonly store: Map<string, any> = new Map();

  generateRegistrationOptions(userId: string, username: string): RegistrationOptions {
    const challenge = generateChallenge();
    return {
      challenge,
      rp: { name: "GNEW DAO", id: "gnew.local" },
      user: {
        id: base64url.encode(userId),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      timeout: 60000,
    };
  }

  verifyRegistrationResponse(userId: string, response: any): boolean {
    const verified = verifyAttestation(response);
    if (verified) {
      this.store.set(userId, response);
    }
    return verified;
  }

  generateAuthenticationOptions(userId: string): AuthenticationOptions {
    const challenge = generateChallenge();
    const cred = this.store.get(userId);
    return {
      challenge,
      allowCredentials: [
        {
          type: "public-key",
          id: cred?.id,
          transports: ["usb", "ble", "nfc", "internal"],
        },
      ],
      timeout: 60000,
      userVerification: "preferred",
    };
  }

  verifyAuthenticationResponse(userId: string, response: any): boolean {
    const cred = this.store.get(userId);
    return verifyAssertion(response, cred);
  }
}


