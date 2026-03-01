-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('VIEWER', 'ACCOUNTANT', 'ADMIN');
CREATE TYPE "CustomerType" AS ENUM ('EXPORT', 'IMPORT', 'TRANSIT', 'FREE');
CREATE TYPE "BalanceSide" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "InvoiceType" AS ENUM ('EXPORT', 'IMPORT', 'TRANSIT', 'FREE');
CREATE TYPE "TxType" AS ENUM ('IN', 'OUT');
CREATE TYPE "VoucherType" AS ENUM ('RECEIPT', 'PAYMENT');
CREATE TYPE "PartyType" AS ENUM ('CUSTOMER', 'EMPLOYEE', 'AGENT', 'OTHER');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER');
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED');
CREATE TYPE "SourceType" AS ENUM ('VOUCHER', 'INVOICE', 'PAYROLL', 'TRIP', 'ADDITIONAL_FEE');

-- Insert default admin user
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (id, username, password_hash, role, is_active)
VALUES (
  gen_random_uuid(),
  'admin',
  '$2a$10$YourHashedPasswordHere',
  'ADMIN',
  true
);

-- Insert default settings
INSERT INTO company_settings (id) VALUES ('single_row');
INSERT INTO app_settings (id) VALUES ('single_row');
INSERT INTO print_settings (id) VALUES ('single_row');
INSERT INTO treasury (id) VALUES ('single_row');

-- Insert default invoice item template
INSERT INTO invoice_item_templates (id, description, vat_rate, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'أجور تخليص',
  15.00,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (description) DO NOTHING;
