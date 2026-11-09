# Build context: repository root
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server/src ./src
COPY database/schema.sql ./database/schema.sql
ENV SCHEMA_PATH=/app/database/schema.sql

RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node

EXPOSE 5000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/index.js"]
