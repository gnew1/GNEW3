ARG NODE_VERSION=20-alpine 
FROM node:${NODE_VERSION} AS build 
WORKDIR /app 
RUN corepack enable 
ENV NODE_ENV=production 
COPY package.json ./ 
RUN pnpm install --prod --frozen-lockfile=false 
COPY . . 
FROM node:${NODE_VERSION} 
WORKDIR /app 
RUN corepack enable && apk add --no-cache curl 
ENV NODE_ENV=production 
COPY --from=build /app /app 
USER 1001 
EXPOSE 8000 
HEALTHCHECK --interval=30s CMD curl -sf 
http://localhost:8000/v1/health || exit 1 
CMD ["pnpm","dev"] 
