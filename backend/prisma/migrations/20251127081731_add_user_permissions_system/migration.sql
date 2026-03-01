/*
  Warnings:

  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.

*/

-- Step 1: Add new columns to users table
ALTER TABLE "users" ADD COLUMN "full_name" TEXT;
ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Migrate existing role data to is_admin
-- Set is_admin = true for users with ADMIN role
UPDATE "users" SET "is_admin" = true WHERE "role" = 'ADMIN';

-- Step 3: Create user_permissions table
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "screen" TEXT NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create default permissions for existing non-admin users based on their role
-- For ACCOUNTANT role: give full access to invoices, customers, vouchers, reports
INSERT INTO "user_permissions" ("id", "user_id", "screen", "can_view", "can_create", "can_edit", "can_delete")
SELECT 
    gen_random_uuid(),
    id,
    unnest(ARRAY['invoices_import', 'invoices_export', 'invoices_transit', 'invoices_free', 'customers', 'vouchers_receipt', 'vouchers_payment', 'reports_financial', 'reports_customs']),
    true,
    true,
    true,
    false
FROM "users"
WHERE "role" = 'ACCOUNTANT';

-- For VIEWER role: give view-only access to invoices, customers, reports
INSERT INTO "user_permissions" ("id", "user_id", "screen", "can_view", "can_create", "can_edit", "can_delete")
SELECT 
    gen_random_uuid(),
    id,
    unnest(ARRAY['invoices_import', 'invoices_export', 'invoices_transit', 'invoices_free', 'customers', 'reports_financial', 'reports_customs']),
    true,
    false,
    false,
    false
FROM "users"
WHERE "role" = 'VIEWER';

-- Step 5: Drop the old role column and UserRole enum
ALTER TABLE "users" DROP COLUMN "role";
DROP TYPE "UserRole";

-- Step 6: Create indexes and constraints
CREATE UNIQUE INDEX "user_permissions_user_id_screen_key" ON "user_permissions"("user_id", "screen");

-- Step 7: Add foreign key constraint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
