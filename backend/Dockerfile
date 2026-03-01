# ---- Build Stage ----
FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

# Compile seed script to JS for production (ts-node not available in prod)
RUN npx tsc --esModuleInterop --skipLibCheck --module commonjs --target es2020 --outDir prisma-compiled prisma/seed.ts

# ---- Production Stage ----
FROM node:20-alpine AS production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Generate Prisma client for production
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy compiled seed script
COPY --from=builder /app/prisma-compiled ./prisma-compiled

# Create uploads directory
RUN mkdir -p uploads backups

# Expose port (Railway sets PORT automatically)
EXPOSE ${PORT:-3000}

ENV NODE_ENV=production

# Run migrations, seed data, then start application
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma-compiled/prisma/seed.js && node dist/main"]

