export type ModelCfg = {
    weights: Record<string, number>;
    bias: number;
    means?: Record<string, number>;
    stds?: Record<string, number>;
    thresholdL1?: number;
    thresholdL2?: number;
    mode?: "shadow" | "enforced";
};
export declare function scoreTx(features: Record<string, number>, model: ModelCfg): number;
export declare function explainTx(features: Record<string, number>, model: ModelCfg): Record<string, number>;
