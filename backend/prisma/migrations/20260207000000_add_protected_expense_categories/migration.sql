-- AlterTable
ALTER TABLE "expense_categories" ADD COLUMN     "is_protected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "expense_categories" ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 999;

-- Delete all existing expense categories (will be re-seeded with correct data)
DELETE FROM "expense_categories";

-- Seed default expense categories
-- Protected categories (cannot be deleted, always appear at top)
INSERT INTO "expense_categories" ("id", "name", "is_protected", "sort_order", "created_at") 
VALUES 
  (gen_random_uuid(), 'رسوم جمركية', true, 1, NOW()),
  (gen_random_uuid(), 'الوكلاء الملاحيين', true, 2, NOW()),
  (gen_random_uuid(), 'رواتب وسلف', true, 3, NOW());

-- Non-protected default categories (can be deleted, appear after protected ones)
INSERT INTO "expense_categories" ("id", "name", "is_protected", "sort_order", "created_at") 
VALUES 
  (gen_random_uuid(), 'إيجار', false, 10, NOW()),
  (gen_random_uuid(), 'كهرباء وماء', false, 11, NOW()),
  (gen_random_uuid(), 'صيانة', false, 12, NOW()),
  (gen_random_uuid(), 'مصاريف إدارية', false, 13, NOW()),
  (gen_random_uuid(), 'مصاريف أخرى', false, 14, NOW());
