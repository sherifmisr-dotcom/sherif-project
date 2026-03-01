-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "category_id" TEXT;

-- CreateTable
CREATE TABLE "invoice_item_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_item_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_item_categories_name_key" ON "invoice_item_categories"("name");

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "invoice_item_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
