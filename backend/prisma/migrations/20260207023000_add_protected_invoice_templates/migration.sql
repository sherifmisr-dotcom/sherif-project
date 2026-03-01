-- AlterTable
ALTER TABLE "invoice_item_templates" ADD COLUMN "is_protected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "invoice_item_templates" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 999;

-- Update existing template to be protected
UPDATE "invoice_item_templates" 
SET "is_protected" = true, "sort_order" = 1 
WHERE "description" = 'أجور تخليص';

-- Insert new protected template
INSERT INTO "invoice_item_templates" ("id", "description", "vat_rate", "is_protected", "sort_order", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), 'رسوم جمركية', 15.00, true, 2, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "invoice_item_templates" WHERE "description" = 'رسوم جمركية');
