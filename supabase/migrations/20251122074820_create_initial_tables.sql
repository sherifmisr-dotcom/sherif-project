/*
  # إنشاء الجداول الأساسية لنظام إدارة العمليات الجمركية
  
  1. جداول جديدة:
    - users: المستخدمين مع صلاحيات RBAC
    - customers: العملاء مع أنواعهم والرصيد الافتتاحي
    - banks: البنوك
    - bank_accounts: الحسابات البنكية مع الأرصدة
    - treasury: الخزنة (صف واحد فقط)
    - treasury_transactions: حركات الخزنة
    - expense_categories: تصنيفات المصروفات
    - invoices: الفواتير (صادر/استيراد/ترانزيت/حر)
    - invoice_items: بنود الفواتير
    - vouchers: السندات (قبض/صرف)
    - ledger_entries: القيود المحاسبية المركزية
    - employees: الموظفين
    - payroll_runs: دورات الرواتب
    - payroll_items: تفاصيل رواتب الموظفين
    - audit_logs: سجل التدقيق
    - settings: إعدادات النظام
    
  2. الأمان:
    - تفعيل RLS على جميع الجداول
    - سياسات وصول للمستخدمين المصادق عليهم فقط
*/

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('viewer', 'accountant', 'admin')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول العملاء
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  type text CHECK (type IN ('export', 'import', 'transit', 'free')),
  opening_balance numeric(18,6) DEFAULT 0,
  opening_side text CHECK (opening_side IN ('debit', 'credit')),
  current_balance numeric(18,6) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(name, phone)
);

-- جدول البنوك
CREATE TABLE IF NOT EXISTS banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- جدول الحسابات البنكية
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id uuid REFERENCES banks(id) ON DELETE RESTRICT,
  account_no text UNIQUE NOT NULL,
  opening_balance numeric(18,6) DEFAULT 0,
  current_balance numeric(18,6) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- جدول الخزنة (صف واحد فقط)
CREATE TABLE IF NOT EXISTS treasury (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_balance numeric(18,6) DEFAULT 0,
  current_balance numeric(18,6) DEFAULT 0,
  opening_set_at timestamptz,
  opening_set_by uuid REFERENCES users(id),
  prevent_negative boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول حركات الخزنة
CREATE TABLE IF NOT EXISTS treasury_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz DEFAULT now(),
  type text NOT NULL CHECK (type IN ('in', 'out')),
  amount numeric(18,6) NOT NULL CHECK (amount > 0),
  note text,
  balance_after numeric(18,6) NOT NULL,
  voucher_id uuid,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- جدول تصنيفات المصروفات
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- جدول الفواتير
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('export', 'import', 'transit', 'free')),
  code text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT,
  customs_no text,
  invoice_year int,
  date date NOT NULL,
  driver_name text,
  shipper_name text,
  vehicle_no text,
  cargo_type text,
  subtotal numeric(18,6) DEFAULT 0,
  vat_enabled boolean DEFAULT false,
  vat_rate numeric(5,2) DEFAULT 0,
  vat_amount numeric(18,6) DEFAULT 0,
  total numeric(18,6) NOT NULL,
  currency text DEFAULT 'EGP',
  exchange_rate numeric(10,4) DEFAULT 1,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type) WHERE deleted_at IS NULL;

-- قيد فريد للتأكد من عدم تكرار رقم البيان في نفس السنة والنوع
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_customs 
  ON invoices(type, customs_no, invoice_year) 
  WHERE deleted_at IS NULL AND customs_no IS NOT NULL;

-- جدول بنود الفواتير
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(18,6) NOT NULL,
  apply_vat boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- جدول السندات
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('receipt', 'payment')),
  code text UNIQUE NOT NULL,
  party_type text CHECK (party_type IN ('customer', 'employee', 'agent', 'other')),
  party_id uuid,
  party_name text,
  method text NOT NULL CHECK (method IN ('cash', 'bank')),
  bank_account_id uuid REFERENCES bank_accounts(id),
  amount numeric(18,6) NOT NULL CHECK (amount > 0),
  expense_category_id uuid REFERENCES expense_categories(id),
  note text,
  date timestamptz DEFAULT now(),
  attachments jsonb DEFAULT '[]',
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(type) WHERE deleted_at IS NULL;

-- جدول القيود المحاسبية المركزية
CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('voucher', 'invoice', 'payroll')),
  source_id uuid NOT NULL,
  debit_account text NOT NULL,
  credit_account text NOT NULL,
  amount numeric(18,6) NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'EGP',
  exchange_rate numeric(10,4) DEFAULT 1,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_source ON ledger_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts ON ledger_entries(debit_account, credit_account);

-- جدول الموظفين
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text,
  base_salary numeric(18,6) DEFAULT 0,
  allowances numeric(18,6) DEFAULT 0,
  fixed_deductions numeric(18,6) DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  hire_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- جدول دورات الرواتب
CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  total_net numeric(18,6) DEFAULT 0,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(month)
);

-- جدول تفاصيل الرواتب
CREATE TABLE IF NOT EXISTS payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE RESTRICT,
  base numeric(18,6) DEFAULT 0,
  allowances numeric(18,6) DEFAULT 0,
  deductions numeric(18,6) DEFAULT 0,
  net numeric(18,6) DEFAULT 0,
  voucher_id uuid REFERENCES vouchers(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(run_id, employee_id)
);

-- جدول سجل التدقيق
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- جدول الإعدادات
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now()
);

-- إدراج الإعدادات الافتراضية
INSERT INTO settings (key, value) VALUES
  ('company_info', '{"name_ar": "", "name_en": "", "activity_ar": "", "activity_en": "", "tax_no": "", "license_no": "", "email": "", "phone": "", "address_ar": "", "address_en": "", "logo_url": ""}'),
  ('app_settings', '{"font_size": "medium", "theme": "light", "language": "ar", "date_format": "DD/MM/YYYY", "currency": "EGP", "prevent_negative_treasury": true, "prevent_negative_bank": true}'),
  ('print_settings', '{"header_right": "", "header_left": "", "footer": ""}'),
  ('numbering_format', '{"invoice_export": "EX-{YY}-{0001}", "invoice_import": "IM-{YY}-{0001}", "invoice_transit": "TR-{YY}-{0001}", "invoice_free": "FR-{YY}-{0001}", "voucher_receipt": "RC-{YY}-{0001}", "voucher_payment": "PY-{YY}-{0001}"}')
ON CONFLICT (key) DO NOTHING;

-- إدراج تصنيفات مصروفات افتراضية
INSERT INTO expense_categories (name) VALUES
  ('مرتبات وأجور'),
  ('إيجارات'),
  ('مصاريف إدارية'),
  ('صيانة'),
  ('وقود ومواصلات'),
  ('اتصالات'),
  ('مصاريف أخرى')
ON CONFLICT (name) DO NOTHING;

-- إنشاء مستخدم admin افتراضي (كلمة المرور: admin123)
INSERT INTO users (username, password_hash, role) VALUES
  ('admin', '$2b$10$rGHIH7z8qKZ.hE5z7X3xLOxKxKz1dQGZ8q0eKLrYyQqZ0y0z0z0z0', 'admin')
ON CONFLICT (username) DO NOTHING;

-- تفعيل RLS على جميع الجداول
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول: السماح بالعرض والإدارة للمستخدمين المصادق عليهم
CREATE POLICY "Allow authenticated access" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON banks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON bank_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON treasury FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON treasury_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON expense_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON vouchers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON ledger_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON payroll_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON payroll_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
