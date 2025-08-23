ARG NODE_VERSION=20-alpine 
FROM node:${NODE_VERSION} 
WORKDIR /app 
COPY package.json ./ 
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev 
COPY index.js ./ 
USER 1001 
EXPOSE 8010 
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- 
http://127.0.0.1:8010/health || exit 1 
CMD ["node","index.js"] 
