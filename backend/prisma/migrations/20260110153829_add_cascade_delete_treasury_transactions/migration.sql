-- DropForeignKey
ALTER TABLE "treasury_transactions" DROP CONSTRAINT "treasury_transactions_voucher_id_fkey";

-- AddForeignKey
ALTER TABLE "treasury_transactions" ADD CONSTRAINT "treasury_transactions_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
