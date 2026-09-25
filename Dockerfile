# Consumer Terreno backend image — builds backend/ only (not the Terreno monorepo).
FROM oven/bun:1-slim AS builder
WORKDIR /app

COPY backend/package.json ./
RUN bun install

COPY backend/ ./

FROM oven/bun:1-slim
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/* \
  && useradd -r -u 1001 appuser

COPY --from=builder /app/ ./

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health" | grep -q '"healthy":true' || exit 1

RUN chown -R appuser:appuser /app
USER appuser

CMD ["bun", "run", "start"]
