
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * M14: Resiliencia ante MEV y ordenamiento justo.
 * Implementa un mecanismo simple de ordenamiento justo usando commit-reveal
 * para mitigar el frontrunning y manipulación por mineros/validadores.
 */

contract FairOrdering {
    struct Commitment {
        bytes32 commitHash;
        uint256 blockNumber;
        bool revealed;
    }

    mapping(address => Commitment) public commitments;

    event Committed(address indexed sender, bytes32 commitHash, uint256 blockNumber);
    event Revealed(address indexed sender, bytes32 txData, uint256 blockNumber);

    function commit(bytes32 _commitHash) external {
        require(commitments[msg.sender].commitHash == 0, "Ya comprometido");
        commitments[msg.sender] = Commitment(_commitHash, block.number, false);
        emit Committed(msg.sender, _commitHash, block.number);
    }

    function reveal(bytes memory txData, bytes32 salt) external {
        Commitment storage c = commitments[msg.sender];
        require(c.commitHash != 0, "No hay compromiso");
        require(!c.revealed, "Ya revelado");

        bytes32 hashCheck = keccak256(abi.encodePacked(txData, salt));
        require(hashCheck == c.commitHash, "Hash inválido");

        c.revealed = true;
        emit Revealed(msg.sender, txData, block.number);

        // ejecutar acción codificada (ejemplo: transfer simple)
        (address to, uint256 value) = abi.decode(txData, (address, uint256));
        payable(to).transfer(value);
    }

    receive() external payable {}
}


