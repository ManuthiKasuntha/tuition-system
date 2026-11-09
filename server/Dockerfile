# Backend (Node.js + Express) image for TuitionHub.
# Build context is the REPOSITORY ROOT (see compose.yaml) so that
# database/schema.sql can be copied into the image.

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# 1. Install dependencies first. This layer is cached and only rebuilt
#    when package.json / package-lock.json change, which makes builds faster.
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 2. Copy the application source and the database schema
COPY server/src ./src
COPY database/schema.sql ./database/schema.sql
ENV SCHEMA_PATH=/app/database/schema.sql

# 3. Folder for uploaded learning materials (a Docker volume is mounted here).
#    It is owned by the unprivileged "node" user that runs the app.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Do not run the application as root
USER node

EXPOSE 5000

# Docker marks the container "healthy" only when the API answers and MySQL is reachable
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/index.js"]
