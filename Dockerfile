# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines env vars at build time, so we need ARG to receive it from Railway
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve

# Copy built files
COPY --from=builder /app/dist ./dist

EXPOSE ${PORT:-5173}

# Serve with SPA fallback (-s flag ensures all routes go to index.html)
CMD ["sh", "-c", "serve dist -s -l ${PORT:-5173}"]
