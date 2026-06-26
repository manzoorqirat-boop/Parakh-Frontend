# ---- Build stage ----
FROM node:20-slim AS build
WORKDIR /app

# VITE_API_URL must be available AT BUILD TIME because Vite bakes env vars
# into the bundle. Railway passes service variables as build args when a
# variable of the same name exists on the service. We re-export it as an
# ENV so `npm run build` (vite) can read import.meta.env.VITE_API_URL.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Install deps (force optional native binaries: @tailwindcss/oxide etc.)
COPY package.json package-lock.json* ./
RUN npm install --include=optional

# Build
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-slim AS runtime
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "serve -s dist -l ${PORT}"]
