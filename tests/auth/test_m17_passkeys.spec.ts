
import { expect } from "chai";
import { PasskeyManager } from "../../services/auth/passkeys/passkeyManager";

describe("M17 PasskeyManager", () => {
  const manager = new PasskeyManager();
  const userId = "u123";
  const username = "testUser";

  it("genera opciones de registro", () => {
    const options = manager.generateRegistrationOptions(userId, username);
    expect(options.challenge).to.be.a("string");
    expect(options.user.name).to.equal(username);
  });

  it("verifica registro y autenticación", () => {
    const fakeResponse = { id: "cred123" };
    const verifiedReg = manager.verifyRegistrationResponse(userId, fakeResponse);
    expect(verifiedReg).to.be.true;

    const authOptions = manager.generateAuthenticationOptions(userId);
    expect(authOptions.allowCredentials[0].id).to.equal("cred123");

    const verifiedAuth = manager.verifyAuthenticationResponse(userId, { id: "cred123" });
    expect(verifiedAuth).to.be.true;
  });
});


