/*
  # إصلاح جميع سياسات RLS للسماح بالوصول
  
  1. التغييرات
    - حذف جميع السياسات القديمة
    - إنشاء سياسات جديدة تسمح بالوصول لـ anon و authenticated
    - هذا ضروري لأننا نستخدم نظام تسجيل دخول مخصص
*/

-- Customers
DROP POLICY IF EXISTS "Allow authenticated access" ON customers;
CREATE POLICY "Allow all access" ON customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Employees
DROP POLICY IF EXISTS "Allow authenticated access" ON employees;
CREATE POLICY "Allow all access" ON employees FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Banks
DROP POLICY IF EXISTS "Allow authenticated access" ON banks;
CREATE POLICY "Allow all access" ON banks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Bank Accounts
DROP POLICY IF EXISTS "Allow authenticated access" ON bank_accounts;
CREATE POLICY "Allow all access" ON bank_accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Invoices
DROP POLICY IF EXISTS "Allow authenticated access" ON invoices;
CREATE POLICY "Allow all access" ON invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Invoice Items
DROP POLICY IF EXISTS "Allow authenticated access" ON invoice_items;
CREATE POLICY "Allow all access" ON invoice_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Vouchers
DROP POLICY IF EXISTS "Allow authenticated access" ON vouchers;
CREATE POLICY "Allow all access" ON vouchers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Ledger Entries
DROP POLICY IF EXISTS "Allow authenticated access" ON ledger_entries;
CREATE POLICY "Allow all access" ON ledger_entries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Payroll Runs
DROP POLICY IF EXISTS "Allow authenticated access" ON payroll_runs;
CREATE POLICY "Allow all access" ON payroll_runs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Payroll Items
DROP POLICY IF EXISTS "Allow authenticated access" ON payroll_items;
CREATE POLICY "Allow all access" ON payroll_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Treasury
DROP POLICY IF EXISTS "Allow authenticated access" ON treasury;
CREATE POLICY "Allow all access" ON treasury FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Treasury Transactions
DROP POLICY IF EXISTS "Allow authenticated access" ON treasury_transactions;
CREATE POLICY "Allow all access" ON treasury_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Expense Categories
DROP POLICY IF EXISTS "Allow authenticated access" ON expense_categories;
CREATE POLICY "Allow all access" ON expense_categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Settings
DROP POLICY IF EXISTS "Allow authenticated access" ON settings;
CREATE POLICY "Allow all access" ON settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Audit Logs
DROP POLICY IF EXISTS "Allow authenticated access" ON audit_logs;
CREATE POLICY "Allow all access" ON audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);