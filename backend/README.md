# Customs Operations Backend

Backend API for Customs Operations Management System built with NestJS, Prisma, and PostgreSQL.

## Features

- ✅ JWT Authentication with Refresh Tokens
- ✅ Role-Based Access Control (RBAC)
- ✅ Prisma ORM with PostgreSQL
- ✅ Central Ledger Service for accounting
- ✅ Swagger API Documentation
- ✅ Validation with class-validator
- ✅ Arabic error messages

## Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- npm or yarn

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your database credentials

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run seed
```

## Running the app

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Documentation

When running in development mode, Swagger documentation is available at:
```
http://localhost:3000/api
```

## Project Structure

```
src/
├── auth/              # Authentication & Authorization
├── customers/         # Customers management
├── invoices/          # Invoice management (all types)
├── agents/            # Shipping agents management
├── accounts/          # Financial accounts
│   ├── treasury/      # Treasury management
│   ├── banks/         # Bank accounts
│   ├── vouchers/      # Receipt & Payment vouchers
│   └── payroll/       # Employee payroll
├── ledger/            # Central accounting ledger
├── reports/           # All report types
├── settings/          # Application settings
├── prisma/            # Prisma service
└── main.ts            # Application entry point
```

## Database Schema

The database uses PostgreSQL with the following key features:
- NUMERIC(18,6) for all financial values
- Soft delete support
- Audit logging
- Unique constraints for business rules

## Environment Variables

See `.env.example` for all available environment variables.

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## License

UNLICENSED
