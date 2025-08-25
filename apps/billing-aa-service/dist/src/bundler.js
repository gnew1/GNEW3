export class BundlerClient {
    bundlerRpc;
    entryPoint;
    constructor(bundlerRpc, entryPoint) {
        this.bundlerRpc = bundlerRpc;
        this.entryPoint = entryPoint;
    }
    async chargeViaAA(req) {
        // Monta una userOp mínima de ejemplo con callData directo al target a través del smart account del sender.
        // En producción, usa SDK de tu smart account (Biconomy, ZeroDev, Rhinestone, etc.)
        const userOp = {
            sender: req.sender,
            nonce: "0x0",
            initCode: "0x",
            callData: req.data, // <- normalmente va envuelta por execute(...)
            callGasLimit: "0x0",
            verificationGasLimit: "0x0",
            preVerificationGas: "0x0",
            maxFeePerGas: "0x0",
            maxPriorityFeePerGas: "0x0",
            paymasterAndData: req.paymaster ?? "0x",
            signature: "0x" // firma del sender (smart account)
        };
        // RPC: eth_sendUserOperation
        const body = {
            jsonrpc: "2.0",
            id: 1,
            method: "eth_sendUserOperation",
            params: [userOp, this.entryPoint]
        };
        const resp = await fetch(this.bundlerRpc, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!resp.ok) {
            throw new Error(`bundler_http_${resp.status}`);
        }
        const json = await resp.json();
        if (json.error) {
            throw new Error(`bundler_error_${json.error.code}_${json.error.message}`);
        }
        return json.result; // userOpHash
    }
}
