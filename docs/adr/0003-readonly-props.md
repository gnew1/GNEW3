# ADR 0003: Readonly Component Props

## Context
Mutable component props in React/TS lead to unintended side effects and unclear ownership.

## Decision
Declare props interfaces with `readonly` fields by default. Mutability must be explicit.

## Consequences
- Components become easier to reason about.
- Passing mutable objects requires wrapping or refactoring.
