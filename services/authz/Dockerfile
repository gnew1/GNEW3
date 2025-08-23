FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm ci
COPY src ./src
COPY ../../policies ./policies
RUN npm run build
EXPOSE 8030
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:8030/healthz || exit 1
CMD ["node", "dist/server.js"]

