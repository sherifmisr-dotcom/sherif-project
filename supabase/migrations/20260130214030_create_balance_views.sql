/*
  # إنشاء Views لحساب أرصدة العملاء والوكلاء
  
  هذا الـ migration ينشئ database views لحساب الأرصدة بكفاءة عالية
  بدلاً من جلب كشف حساب لكل عميل/وكيل على حدة
  
  Views:
  1. customers_with_balance: العملاء مع الأرصدة المحسوبة
  2. agents_with_balance: الوكلاء مع الأرصدة المحسوبة
*/

-- View للعملاء مع الأرصدة المحسوبة
CREATE OR REPLACE VIEW customers_with_balance AS
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
    COALESCE(SUM(i.total), 0) as total_invoices,
    -- حساب إجمالي المدفوعات (دائن) - سندات القبض فقط
    COALESCE(SUM(CASE WHEN v.type = 'receipt' AND v.party_type = 'customer' AND v.party_id = c.id THEN v.amount ELSE 0 END), 0) as total_payments,
    -- حساب الرصيد الحالي
    (
        -- الرصيد الافتتاحي (مدين موجب، دائن سالب)
        COALESCE(c.opening_balance, 0) * CASE WHEN c.opening_side = 'debit' THEN 1 ELSE -1 END +
        -- إجمالي الفواتير (مدين)
        COALESCE(SUM(i.total), 0) - 
        -- إجمالي المدفوعات (دائن)
        COALESCE(SUM(CASE WHEN v.type = 'receipt' AND v.party_type = 'customer' AND v.party_id = c.id THEN v.amount ELSE 0 END), 0)
    ) as current_balance
FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id AND i.deleted_at IS NULL
LEFT JOIN vouchers v ON v.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name, c.phone, c.email, c.address, c.type, c.opening_balance, c.opening_side, c.is_active, c.created_at, c.updated_at;

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
    -- حساب إجمالي الرحلات (مدين)
    COALESCE(SUM(t.total_amount), 0) as total_trips,
    -- حساب إجمالي المدفوعات (دائن) - سندات الصرف للوكلاء فقط
    COALESCE(SUM(CASE WHEN v.type = 'payment' AND v.party_type = 'agent' AND v.party_id = a.id THEN v.amount ELSE 0 END), 0) as total_payments,
    -- حساب الرصيد الحالي (ما ندين به للوكيل)
    (
        COALESCE(SUM(t.total_amount), 0) - 
        COALESCE(SUM(CASE WHEN v.type = 'payment' AND v.party_type = 'agent' AND v.party_id = a.id THEN v.amount ELSE 0 END), 0)
    ) as current_balance
FROM agents a
LEFT JOIN trips t ON t.agent_id = a.id AND t.deleted_at IS NULL
LEFT JOIN vouchers v ON v.deleted_at IS NULL
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.name, a.phone, a.email, a.address, a.is_active, a.created_at, a.updated_at;

-- إنشاء فهارس لتحسين أداء الـ Views
CREATE INDEX IF NOT EXISTS idx_invoices_customer_active ON invoices(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_agent_active ON trips(agent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vouchers_party ON vouchers(party_type, party_id, type) WHERE deleted_at IS NULL;

-- تعليق على الـ Views للتوثيق
COMMENT ON VIEW customers_with_balance IS 'View يحسب أرصدة العملاء تلقائياً من الفواتير والسندات';
COMMENT ON VIEW agents_with_balance IS 'View يحسب أرصدة الوكلاء تلقائياً من الرحلات والسندات';
