/*
  Warnings:

  - Added the required column `updated_at` to the `invoice_item_templates` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterEnum
ALTER TYPE "VoucherType" ADD VALUE 'INTERNAL_TRANSFER';

-- AlterTable
ALTER TABLE "app_settings" ADD COLUMN     "auto_backup_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "auto_backup_frequency" TEXT NOT NULL DEFAULT 'DAILY',
ADD COLUMN     "auto_backup_time" TEXT NOT NULL DEFAULT '02:00',
ADD COLUMN     "backup_retention_days" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "invoice_item_templates" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "vat_rate" DECIMAL(5,2) DEFAULT 0;

-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN     "dest_account_id" TEXT,
ADD COLUMN     "dest_type" TEXT,
ADD COLUMN     "source_account_id" TEXT,
ADD COLUMN     "source_type" TEXT;

-- CreateTable
CREATE TABLE "backups" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "type" "BackupType" NOT NULL DEFAULT 'MANUAL',
    "status" "BackupStatus" NOT NULL DEFAULT 'COMPLETED',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "backups_filename_key" ON "backups"("filename");
