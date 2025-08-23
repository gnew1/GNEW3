
FROM node:18-bookworm as build
WORKDIR /app
COPY . /app
RUN corepack enable && pnpm


