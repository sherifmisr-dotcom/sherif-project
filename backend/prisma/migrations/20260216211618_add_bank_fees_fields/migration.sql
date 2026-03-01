/*
  Warnings:

  - A unique constraint covering the columns `[linked_voucher_id]` on the table `vouchers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "treasury_transactions" DROP CONSTRAINT "treasury_transactions_voucher_id_fkey";

-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN     "actual_amount_received" DECIMAL(18,6),
ADD COLUMN     "bank_fee_amount" DECIMAL(18,6),
ADD COLUMN     "has_bank_fees" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linked_voucher_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_linked_voucher_id_key" ON "vouchers"("linked_voucher_id");

-- AddForeignKey
ALTER TABLE "treasury_transactions" ADD CONSTRAINT "treasury_transactions_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_linked_voucher_id_fkey" FOREIGN KEY ("linked_voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
