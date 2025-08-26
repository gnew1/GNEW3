# ADR 0004: Secret Management

## Context
Hard‑coding credentials or using plain `.env` files risks leaks in repositories and logs.

## Decision
Store secrets in dedicated secret managers or encrypted `.env` files. CI pipelines load them at runtime without committing values.

## Consequences
- Reduces risk of credential exposure.
- Requires provisioning access for developers and CI systems.
