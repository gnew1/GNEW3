
#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { runVerification, type VerifyInput } from "../src/verify.js";

function parseArgs(argv: string[]) {
  const out: any = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const nxt = argv[i+1];
    if (a === "--spec") { out.spec = nxt; i++; }
    else if (a === "--file") { out.file = nxt; i++; }
    else if (a === "--url")  { out.url = nxt; i++; }
    else if (a === "--hash") { out.hash = nxt; i++; }
    else if (a === "--pub")  { out.pub = nxt; i++; }
    else if (a === "--sig")  { out.sig = nxt; i++; }
    else if (a === "--scheme") { out.scheme = nxt; i++; }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  let spec: VerifyInput;

  if (args.spec) {
    const p = path.resolve(process.cwd(), args.spec);
    spec = JSON.parse(fs.readFileSync(p, "utf8"));
  } else {
    if (!args.file && !args.url) {
      console.error("Usage: gnew-verify --spec spec.json  OR  --file ./artifact.bin [--hash sha256:HEX] [--pub pub.pem --sig file.sig --scheme ed25519]");
      process.exit(2);
      return;
    }
    let source: VerifyInput["source"];
    if (args.file) {
      const buf = fs.readFileSync(path.resolve(process.cwd(), args.file));
      source = { type: "base64", data: buf.toString("base64") } as any;
    } else {
      source = { type: "url", url: String(args.url) } as any;
    }

    let hash: any;
    if (args.hash) {
      const [algo, hex] = String(args.hash).split(":");
      hash = { algo, expectedHex: hex };
    }

    let signature: any;
    if (args.pub && args.sig && args.scheme) {
      signature = {
        scheme: String(args.scheme),
        publicKeyPem: fs.readFileSync(path.resolve(process.cwd(), args.pub), "utf8"),
        signatureBase64: fs.readFileSync(path.resolve(process.cwd(), args.sig)).toString("base64"),
        over: "artifact",
        hashAlgo: "sha256"
      };
    }

    spec = { source, hash, signature } as any;
  }

  try {
    const out = await runVerification(spec);
    console.log(JSON.stringify(out, null, 2));
    process.exit(out.ok ? 0 : 1);
  } catch (e: any) {
    console.error(JSON.stringify({ ok: false, error: e?.message ?? String(e) }, null, 2));
    process.exit(1);
  }
}

main();


