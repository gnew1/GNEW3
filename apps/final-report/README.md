
# GNEW Final Report Generator (N420)

This utility consolidates the outputs of all prompts from **N398 to N420** into a final human-readable report.

## Usage
```bash
pnpm --filter @gnew/final-report build
pnpm --filter @gnew/final-report generate


This produces:

reports/final-report.md – Markdown summary

reports/final-report.html – HTML summary

Contents

Overview of completed prompts

Deliverables generated

Status confirmation


/docker/final-report.Dockerfile  
```dockerfile
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/final-report... && pnpm --filter @gnew/final-report build
CMD ["pnpm","--filter","@gnew/final-report","generate"]


