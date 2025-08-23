import { ethers } from "ethers";
import axios from "axios";
import crypto from "node:crypto";
import { buildEnforcer } from "../casbin/enforcer";

export type ActivePolicy = {
  version: number;
  uri: string;
  hash: string;           // 0x-prefixed keccak256 expected
  model: string;
  policy: string;
};

type Callbacks = {
  onPolicyLoaded: (p: ActivePolicy) => void;
  onError: (err: Error) => void;
};

const ABI = [
  "function activeVersion() view returns (uint256)",
  "function activePolicy() view returns (tuple(uint256 version,string uri,bytes32 hash))",
  "event PolicyActivated(uint256 indexed version, string uri, bytes32 hash)"
];

export class PolicyWatcher {
  #provider: ethers.JsonRpcProvider;
  #contract: ethers.Contract;
  #timer?: NodeJS.Timeout;

  constructor(rpc: string, addr: string) {
    this.#provider = new ethers.JsonRpcProvider(rpc);
    this.#contract = new ethers.Contract(addr, ABI, this.#provider);
  }

  async fetchAndVerify(uri: string, hashHex: string): Promise<{ model: string; policy: string }> {
    const res = await axios.get(uri, { responseType: "arraybuffer", timeout: 5000 });
    const buf = Buffer.from(res.data);
    const keccak = "0x" + Buffer.from(ethers.keccak256(buf).slice(2), "hex").toString("hex");
    if (keccak.toLowerCase() !== hashHex.toLowerCase()) {
      throw new Error(`hash mismatch: expected ${hashHex}, got ${keccak}`);
    }
    // Asumimos bundle simple: JSON {model, policy} o concatenado "===MODEL===\n...\n===POLICY===\n..."
    try {
      const j = JSON.parse(buf.toString("utf8"));
      return { model: j.model, policy: j.policy };
    } catch {
      const s = buf.toString("utf8");
      const [_, model, policy] = s.split(/===MODEL===\n|\n===POLICY===\n/);
      return { model, policy };
    }
  }

  async current(): Promise<ActivePolicy> {
    const { version, uri, hash } = await this.#contract.activePolicy();
    const { model, policy } = await this.fetchAndVerify(uri, hash);
    return { version: Number(version), uri, hash: hash as string, model, policy };
  }

  start(cb: Callbacks) {
    const handler = async (version: bigint, uri: string, hash: string) => {
      try {
        const { model, policy } = await this.fetchAndVerify(uri, hash);
        cb.onPolicyLoaded({ version: Number(version), uri, hash, model, policy });
      } catch (e: any) {
        cb.onError(e);
      }
    };
    this.#contract.on("PolicyActivated", handler);
    // Fallback polling (cada 60s)
    this.#timer = setInterval(async () => {
      try {
        const cp = await this.current();
        cb.onPolicyLoaded(cp);
      } catch (e: any) { cb.onError(e); }
    }, 60000);
  }

  stop() { if (this.#timer) clearInterval(this.#timer); this.#contract.removeAllListeners(); }
}

