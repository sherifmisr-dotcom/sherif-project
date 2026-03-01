/*
  # تحديث سياسات RLS لنظام الحسابات

  1. التغييرات
    - تحديث سياسات RLS لجداول الخزنة والبنوك والسندات والرواتب
    - إضافة حقل prevent_negative_bank لجدول settings
    - التأكد من وجود سياسات تسمح بالوصول لجميع المستخدمين
*/

-- تحديث أو إنشاء سياسات للخزنة
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow all for treasury" ON treasury;
  CREATE POLICY "Allow all for treasury"
    ON treasury
    FOR ALL
    USING (true)
    WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow all for treasury_transactions" ON treasury_transactions;
  CREATE POLICY "Allow all for treasury_transactions"
    ON treasury_transactions
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- تحديث أو إنشاء سياسات للبنوك
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow all for banks" ON banks;
  CREATE POLICY "Allow all for banks"
    ON banks
    FOR ALL
    USING (true)
    WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow all for bank_accounts" ON bank_accounts;
  CREATE POLICY "Allow all for bank_accounts"
    ON bank_accounts
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- تحديث أو إنشاء سياسات للسندات
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow all for vouchers" ON vouchers;
  CREATE POLICY "Allow all for vouchers"
    ON vouchers
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- تحديث أو إنشاء سياسات لتصنيفات المصروفات
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow all for expense_categories" ON expense_categories;
  CREATE POLICY "Allow all for expense_categories"
    ON expense_categories
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- تحديث أو إنشاء سياسات للرواتب
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow all for payroll_runs" ON payroll_runs;
  CREATE POLICY "Allow all for payroll_runs"
    ON payroll_runs
    FOR ALL
    USING (true)
    WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow all for payroll_items" ON payroll_items;
  CREATE POLICY "Allow all for payroll_items"
    ON payroll_items
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- إضافة إعداد منع الرصيد السالب للبنوك في جدول settings
INSERT INTO settings (key, value)
VALUES ('prevent_negative_bank', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- إضافة إعداد منع الرصيد السالب للخزنة في جدول settings
INSERT INTO settings (key, value)
VALUES ('prevent_negative_treasury', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
