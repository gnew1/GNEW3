
/**
 * M15: Telemetría end‑to‑end y correlación on/off‑chain
 * Servicio de recolección de métricas y eventos, con correlación de trazas
 * entre operaciones on-chain (EVM logs) y off-chain (servicios backend).
 */
import { ethers } from "ethers";
import { v4 as uuidv4 } from "uuid";
import { writeFileSync, appendFileSync } from "fs";

export interface TelemetryEvent {
  traceId: string;
  spanId: string;
  timestamp: number;
  source: "onchain" | "offchain";
  service: string;
  event: string;
  data: Record<string, any>;
}

export class TelemetryCollector {
  private readonly events: TelemetryEvent[] = [];

  constructor(private serviceName: string) {}

  log(event: string, data: Record<string, any>, traceId?: string, spanId?: string) {
    const evt: TelemetryEvent = {
      traceId: traceId || uuidv4(),
      spanId: spanId || uuidv4(),
      timestamp: Date.now(),
      source: "offchain",
      service: this.serviceName,
      event,
      data,
    };
    this.events.push(evt);
    appendFileSync("telemetry.log", JSON.stringify(evt) + "\n");
    return evt.traceId;
  }

  async logOnChain(providerUrl: string, contractAddress: string, abi: any, fromBlock: number) {
    const provider = new ethers.JsonRpcProvider(providerUrl);
    const contract = new ethers.Contract(contractAddress, abi, provider);

    contract.on("*", (...args: any[]) => {
      const evt: TelemetryEvent = {
        traceId: uuidv4(),
        spanId: uuidv4(),
        timestamp: Date.now(),
        source: "onchain",
        service: this.serviceName,
        event: "onchain_event",
        data: { args },
      };
      this.events.push(evt);
      appendFileSync("telemetry.log", JSON.stringify(evt) + "\n");
    });
  }

  exportAll(path: string) {
    writeFileSync(path, JSON.stringify(this.events, null, 2));
  }
}


