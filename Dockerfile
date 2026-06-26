# ---- Build stage ----
FROM node:20-slim AS build
WORKDIR /app

# Install dependencies first (better layer caching).
# Copy manifests; lockfile is optional. We force a clean install that
# INCLUDES optional native binaries (@tailwindcss/oxide-linux-x64-gnu,
# lightningcss-linux-x64-gnu) to avoid npm's optional-dependency bug
# (npm/cli#4828) that breaks Tailwind v4 on Linux.
COPY package.json package-lock.json* ./
RUN npm install --include=optional

# Copy source and build.
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-slim AS runtime
WORKDIR /app

# 'serve' hosts the static SPA build.
RUN npm install -g serve

COPY --from=build /app/dist ./dist

# Railway provides $PORT at runtime.
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "serve -s dist -l ${PORT}"]
