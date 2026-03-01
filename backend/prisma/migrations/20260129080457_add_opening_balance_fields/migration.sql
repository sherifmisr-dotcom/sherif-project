-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN     "carry_forward_note" TEXT,
ADD COLUMN     "is_initial_balance" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "opening_balance_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "treasury_settings" (
    "id" TEXT NOT NULL DEFAULT 'single_row',
    "opening_balance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "opening_balance_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "carry_forward_note" TEXT,
    "is_initial_balance" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasury_settings_pkey" PRIMARY KEY ("id")
);
