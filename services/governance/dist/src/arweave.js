import Arweave from "arweave";
const arweave = Arweave.init({
    host: process.env.ARWEAVE_HOST || "arweave.net",
    port: Number(process.env.ARWEAVE_PORT || 443),
    protocol: process.env.ARWEAVE_PROTO || "https"
});
export async function mirrorToArweave(obj) {
    const tx = await arweave.createTransaction({ data: Buffer.from(JSON.stringify(obj)) });
    tx.addTag("Content-Type", "application/json");
    await arweave.transactions.sign(tx);
    const res = await arweave.transactions.post(tx);
    if (res.status >= 200 && res.status < 300)
        return tx.id;
    throw new Error("Arweave post failed: " + res.status);
}
