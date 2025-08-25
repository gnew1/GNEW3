function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
export function scoreTx(features, model) {
    let z = model.bias ?? 0;
    for (const [k, v] of Object.entries(features)) {
        const m = model.means?.[k] ?? 0;
        const s = model.stds?.[k] ?? 1;
        const x = s !== 0 ? (v - m) / s : v;
        const w = model.weights[k] ?? 0;
        z += w * x;
    }
    const score = sigmoid(z);
    return Math.max(0, Math.min(1, score));
}
export function explainTx(features, model) {
    // Atribución lineal simple: w * (x - mean) / std
    const out = {};
    for (const [k, v] of Object.entries(features)) {
        const m = model.means?.[k] ?? 0;
        const s = model.stds?.[k] ?? 1;
        const w = model.weights[k] ?? 0;
        out[k] = w * (s !== 0 ? (v - m) / s : v);
    }
    return out;
}
