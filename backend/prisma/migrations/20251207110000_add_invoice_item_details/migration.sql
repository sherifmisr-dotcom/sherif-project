-- Add new columns to invoice_items table
ALTER TABLE "invoice_items" 
ADD COLUMN "unit_price" DECIMAL(18,6) NOT NULL DEFAULT 0,
ADD COLUMN "quantity" DECIMAL(18,6) NOT NULL DEFAULT 1,
ADD COLUMN "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 0;
