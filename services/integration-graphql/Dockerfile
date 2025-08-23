FROM node:20-alpine 
WORKDIR /app 
COPY package.json tsconfig.json /app/ 
RUN npm i -g pnpm && pnpm install --frozen-lockfile || npm install 
COPY src /app/src 
EXPOSE 8007 
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:8007/health 
|| exit 1 
CMD ["pnpm", "dev"] 
Documentación (Tech Writer) y Política de versionado 
