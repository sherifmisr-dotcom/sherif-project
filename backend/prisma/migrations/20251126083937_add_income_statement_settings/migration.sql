/*
  Warnings:

  - You are about to drop the column `category_id` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the `invoice_item_categories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "invoice_items" DROP CONSTRAINT "invoice_items_category_id_fkey";

-- AlterTable
ALTER TABLE "invoice_items" DROP COLUMN "category_id";

-- DropTable
DROP TABLE "invoice_item_categories";

-- CreateTable
CREATE TABLE "income_statement_settings" (
    "id" TEXT NOT NULL DEFAULT 'single_row',
    "revenue_item_template_ids" TEXT[],
    "expense_category_ids" TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_statement_settings_pkey" PRIMARY KEY ("id")
);
