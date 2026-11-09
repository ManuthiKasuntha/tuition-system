# Frontend (React + Vite) image for TuitionHub - multi-stage build.
#
# Stage 1 ("build") uses Node.js to compile the React app into static files.
# Stage 2 copies ONLY those static files into a tiny Nginx image.
# Node.js, node_modules and the source code are not in the final image.

# ---------- Stage 1: build ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine

# Our Nginx config: serves the React app and forwards /api to the backend container
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
