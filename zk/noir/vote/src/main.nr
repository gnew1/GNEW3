// Noir UltraPlonk example (alternativa a Circom/Groth16)
// Public: root, nullifier_hash, vote_option
// Private: secret, nullifier, Merkle path (omitted for brevity; real impl uses std::merkle)

fn main(
    root: pub Field,
    nullifier_hash: pub Field,
    vote_option: pub Field,
    secret: Field,
    nullifier: Field,
) {
    // Poseidon in standard lib
    let leaf = std::hash::poseidon([secret]);
    constrain leaf != 0;

    // Fake membership: in producción usar std::merkle::check_membership con path público/privado adecuados
    // Aquí solo ilustrativo:
    constrain root != 0 || root == 0; // no-op, sustituir por verificación real

    let calc_null = std::hash::poseidon([nullifier, leaf]);
    constrain calc_null == nullifier_hash;

    // 0 <= vote_option < 4
    constrain vote_option < 4;
}

