
/**
 * SDK para interactuar con DynamicPaymaster.
 * Incluye funciones para verificar políticas y enviar UserOperations.
 */
import { ethers } from "ethers";
import DynamicPaymaster from "../../artifacts/contracts/paymasters/DynamicPaymaster.sol/DynamicPaymaster.json";

export class PaymasterSDK {
  private contract: ethers.Contract;

  constructor(address: string, provider: ethers.JsonRpcProvider, signer?: ethers.Signer) {
    this.contract = new ethers.Contract(address, DynamicPaymaster.abi, signer || provider);
  }

  async getMaxGasFee(): Promise<bigint> {
    return await this.contract.maxGasFee();
  }

  async isAllowed(account: string): Promise<boolean> {
    return await this.contract.allowlist(account);
  }

  async updatePolicy(newMaxGas: bigint) {
    const tx = await this.contract.updatePolicy(newMaxGas);
    return tx.wait();
  }

  async setAllowlist(account: string, allowed: boolean) {
    const tx = await this.contract.setAllowlist(account, allowed);
    return tx.wait();
  }
}


