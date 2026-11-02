# Single image for the whole app: stage 1 builds the web app (web/), stage 2
# is the API (backend/) with the built files copied into /app/public, which
# Express serves from the same origin as /api and /uploads.

FROM node:24-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:24-alpine
WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev

COPY backend/ ./
COPY --from=web /web/dist ./public

# Commit the image was built from, shown in the admin panel.
ARG APP_VERSION=""
ENV APP_VERSION=$APP_VERSION

RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/health" > /dev/null || exit 1

CMD ["sh", "-c", "node src/migrate.js && node src/index.js"]
