// Minimal local ABIs to keep build/runtime decoupled from contracts artifacts.
// Extend as needed; unknown logs are safely ignored by parseLog try/catch.
export const ABIS = {
    GnewGovToken: { abi: [] },
    GnewToken: { abi: [] },
    StakingManager: { abi: [] },
};
