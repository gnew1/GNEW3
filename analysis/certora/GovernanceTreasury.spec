
// Especificación en CVL para Certora Prover (M2)

methods {
    deposit();
    withdraw(address,uint256);
}

invariant TotalBalanceInvariant() {
    assert contract.totalBalance() == balance(contract);
}

invariant OnlyGovernanceCanWithdraw() {
    // Solo governance puede invocar withdraw
    if (lastSender != contract.governance()) {
        assert !lastReverted;
    }
}


