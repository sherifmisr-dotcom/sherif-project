-- AlterTable: Add start_date column and remove fixed_deductions
ALTER TABLE "employees" ADD COLUMN "start_date" TIMESTAMP(3);
ALTER TABLE "employees" DROP COLUMN "fixed_deductions";
