
/**
 * M18: FinOps de gas e infraestructura
 * Servicio de optimización de costes de gas y métricas
 * para operaciones en contratos y servicios EVM de GNEW.
 */
import { ethers } from "ethers";

export interface GasEstimation {
  function: string;
  estimatedGas: number;
  gasPrice: string;
  costETH: string;
}

export class GasOptimizer {
  private provider: ethers.JsonRpcProvider;

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async estimateGas(tx: ethers.TransactionRequest, functionName: string): Promise<GasEstimation> {
    const estimatedGas = await this.provider.estimateGas(tx);
    const gasPrice = await this.provider.getGasPrice();
    const costETH = ethers.formatEther(estimatedGas * gasPrice);
    return {
      function: functionName,
      estimatedGas: Number(estimatedGas),
      gasPrice: gasPrice.toString(),
      costETH,
    };
  }

  async batchEstimate(transactions: { tx: ethers.TransactionRequest; name: string }[]): Promise<GasEstimation[]> {
    const results: GasEstimation[] = [];
    for (const { tx, name } of transactions) {
      results.push(await this.estimateGas(tx, name));
    }
    return results;
  }
}


