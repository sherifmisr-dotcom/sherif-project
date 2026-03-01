-- CreateTable
CREATE TABLE "customs_fee_batches" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(18,6) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "bank_account_id" TEXT,
    "voucher_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_fee_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_fee_batch_items" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "customs_no" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "customs_fee_batch_items_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "customs_fee_batch_item_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customs_fee_batches_voucher_id_key" ON "customs_fee_batches"("voucher_id");

-- CreateIndex
CREATE INDEX "idx_batch_items_batch_id" ON "customs_fee_batch_items"("batch_id");

-- CreateIndex
CREATE INDEX "idx_batch_items_customs_no" ON "customs_fee_batch_items"("customs_no");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customs_fee_batch_item_id_fkey" FOREIGN KEY ("customs_fee_batch_item_id") REFERENCES "customs_fee_batch_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_fee_batches" ADD CONSTRAINT "customs_fee_batches_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_fee_batches" ADD CONSTRAINT "customs_fee_batches_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_fee_batches" ADD CONSTRAINT "customs_fee_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_fee_batch_items" ADD CONSTRAINT "customs_fee_batch_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "customs_fee_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert رسوم جمركية expense category if it doesn't exist
INSERT INTO "expense_categories" ("id", "name", "created_at")
VALUES (gen_random_uuid(), 'رسوم جمركية', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;