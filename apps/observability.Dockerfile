# Build-layer 
FROM node:20-alpine AS build 
WORKDIR /app 
COPY package.json pnpm-lock.yaml ./ 
COPY pnpm-workspace.yaml ./ 
COPY apps/observability/package.json ./apps/observability/package.json 
COPY packages/contracts/package.json ./packages/contracts/package.json 
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate 
RUN pnpm install --frozen-lockfile 
COPY tsconfig.base.json ./ 
COPY apps/observability ./apps/observability 
COPY packages/contracts/artifacts ./packages/contracts/artifacts 
RUN pnpm --filter @gnew/observability build 
# Runtime 
FROM node:20-alpine 
WORKDIR /app 
ENV NODE_ENV=production 
COPY --from=build /app/apps/observability/dist ./dist 
COPY --from=build /app/apps/observability/package.json ./ 
COPY --from=build /app/node_modules ./node_modules 
EXPOSE 9108 
CMD ["node", "dist/index.js"] 
