# ADR 0002: TypeChain for Contract Typings

## Context
Interacting with contracts in TypeScript previously relied on generic `ethers` types, increasing runtime errors.

## Decision
Generate contract bindings with TypeChain during builds. Projects import the generated factories and types instead of raw ABIs.

## Consequences
- Safer contract calls with compile‑time checks.
- Build step requires running TypeChain when ABIs change.
