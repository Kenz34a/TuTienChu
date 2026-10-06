# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
# Web/server builds need the Electron package metadata, not the desktop binary.
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN --mount=type=secret,id=proxy_ca,target=/run/secrets/proxy_ca,required=false \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --no-audit --no-fund
COPY . .
RUN npm run build:all

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN --mount=type=secret,id=proxy_ca,target=/run/secrets/proxy_ca,required=false \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --omit=dev --no-audit --no-fund && mkdir /data && chown node:node /data
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server-build ./server-build
COPY --from=build --chown=node:node /app/release ./release
USER node
EXPOSE 3000
VOLUME ["/data"]
CMD ["npm", "start"]
