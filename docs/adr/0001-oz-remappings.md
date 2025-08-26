# ADR 0001: OpenZeppelin Remappings

## Context
OpenZeppelin libraries are used across contracts. Import paths vary between tools and can lead to brittle references.

## Decision
Define a single `openzeppelin/` remapping in tooling (Foundry, Hardhat) so imports use `import "openzeppelin/contracts/..."`.

## Consequences
- Simplified imports and migrations between tools.
- Upgrades require updating the remapping only once.
