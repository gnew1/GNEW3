
# GNEW Voting DAO (N417)

**Purpose:** Manage decentralized governance via proposals and votes.  
- **Gnew0 tokens:** advisory survey votes.  
- **Gnews tokens:** binding decision-making votes.  

## Endpoints
- `POST /api/dao/proposals` – create new proposal
- `GET /api/dao/proposals` – list all proposals
- `POST /api/dao/votes` – cast a vote
- `GET /api/dao/tally/:proposalId` – tally results for a proposal

## Run Locally
```bash
pnpm --filter @gnew/voting-dao dev

Build
pnpm --filter @gnew/voting-dao build

Test
pnpm --filter @gnew/voting-dao test

Deploy

Dockerfile included. Default port: 9250.


/docker/voting-dao.Dockerfile  
```dockerfile
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/voting-dao... && pnpm --filter @gnew/voting-dao build
EXPOSE 9250
CMD ["node","apps/voting-dao/dist/server.js"]


