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

# ---- Production Stage ----
FROM node:20-alpine AS production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Install ts-node for running seed script
RUN npm install ts-node typescript

# Generate Prisma client for production
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p uploads backups

# Expose port (Railway sets PORT automatically)
EXPOSE ${PORT:-3000}

ENV NODE_ENV=production

# Run migrations, seed data, then start application
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/main"]


