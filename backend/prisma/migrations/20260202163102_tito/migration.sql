-- DropForeignKey
ALTER TABLE "customs_fee_batches" DROP CONSTRAINT "customs_fee_batches_bank_account_id_fkey";

-- DropIndex
DROP INDEX "idx_batch_items_batch_id";

-- DropIndex
DROP INDEX "idx_batch_items_customs_no";

-- AlterTable
ALTER TABLE "customs_fee_batch_items" ALTER COLUMN "customs_no" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "customs_fee_batches" ADD CONSTRAINT "customs_fee_batches_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
