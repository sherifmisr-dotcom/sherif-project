-- Apply database views migration
-- This script creates views for efficient balance calculation

\c azoz

-- Drop existing view to avoid column rename issues
DROP VIEW IF EXISTS customers_with_balance CASCADE;

-- View للعملاء مع الأرصدة المحسوبة
CREATE VIEW customers_with_balance AS
SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    c.address,
    c.type,
    c.opening_balance,
    c.opening_side,
    c.is_active,
    c.created_at,
    c.updated_at,
    -- حساب إجمالي الفواتير (مدين)
    COALESCE((SELECT SUM(i.total) FROM invoices i WHERE i.customer_id = c.id), 0) as total_invoices,
    -- حساب إجمالي سندات القبض من العملاء (دائن)
    COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'RECEIPT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0) as total_receipts,
    -- حساب إجمالي سندات الصرف للعملاء (مدين) - مبالغ مصروفة للعملاء
    COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'PAYMENT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0) as total_payment_vouchers,
    -- حساب الرصيد الحالي
    -- المعادلة: الرصيد الافتتاحي + الفواتير + سندات الصرف للعملاء - سندات القبض من العملاء
    (
        -- الرصيد الافتتاحي (مدين موجب، دائن سالب)
        COALESCE(c.opening_balance, 0) * CASE WHEN c.opening_side = 'DEBIT' THEN 1 ELSE -1 END +
        -- إجمالي الفواتير (مدين)
        COALESCE((SELECT SUM(i.total) FROM invoices i WHERE i.customer_id = c.id), 0) +
        -- إجمالي سندات الصرف للعملاء (مدين)
        COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'PAYMENT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0) - 
        -- إجمالي سندات القبض من العملاء (دائن)
        COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'RECEIPT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0)
    ) as current_balance
FROM customers c;

-- View للوكلاء مع الأرصدة المحسوبة
CREATE OR REPLACE VIEW agents_with_balance AS
SELECT 
    a.id,
    a.name,
    a.phone,
    a.email,
    a.address,
    a.is_active,
    a.created_at,
    a.updated_at,
    -- حساب إجمالي الرحلات (دائن للوكيل)
    COALESCE((SELECT SUM(t.total_amount) FROM trips t WHERE t.agent_id = a.id), 0) as total_trips,
    -- حساب إجمالي الرسوم الإضافية (دائن للوكيل)
    COALESCE((SELECT SUM(f.amount) FROM additional_fees f WHERE f.agent_id = a.id), 0) as total_fees,
    -- حساب إجمالي المدفوعات (مدين - سندات الصرف للوكلاء فقط)
    COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'PAYMENT' AND v.party_type = 'AGENT' AND v.party_id = a.id), 0) as total_payments,
    -- حساب الرصيد الحالي (ما ندين به للوكيل)
    -- الرصيد = الرصيد الافتتاحي + الرحلات + الرسوم الإضافية - المدفوعات
    (
        COALESCE(a.opening_balance, 0) * CASE WHEN a.opening_side = 'CREDIT' THEN 1 ELSE -1 END +
        COALESCE((SELECT SUM(t.total_amount) FROM trips t WHERE t.agent_id = a.id), 0) +
        COALESCE((SELECT SUM(f.amount) FROM additional_fees f WHERE f.agent_id = a.id), 0) -
        COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'PAYMENT' AND v.party_type = 'AGENT' AND v.party_id = a.id), 0)
    ) as current_balance
FROM agents a;

-- إنشاء فهارس لتحسين أداء الـ Views
CREATE INDEX IF NOT EXISTS idx_invoices_customer_active ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_trips_agent_active ON trips(agent_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_party ON vouchers(party_type, party_id, type);

-- تعليق على الـ Views للتوثيق
COMMENT ON VIEW customers_with_balance IS 'View يحسب أرصدة العملاء تلقائياً من الفواتير والسندات';
COMMENT ON VIEW agents_with_balance IS 'View يحسب أرصدة الوكلاء تلقائياً من الرحلات والسندات';
