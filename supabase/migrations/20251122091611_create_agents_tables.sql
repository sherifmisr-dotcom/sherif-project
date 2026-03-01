/*
  # إنشاء جداول الوكلاء الملاحيين والرحلات

  1. جداول جديدة
    - `agents` - جدول الوكلاء الملاحيين
      - `id` (uuid, primary key)
      - `name` (text, اسم الوكيل)
      - `opening_balance` (numeric, الرصيد الافتتاحي)
      - `opening_side` (text, نوع الرصيد: دائن أو مدين)
      - `current_balance` (numeric, الرصيد الحالي)
      - `is_active` (boolean, حالة النشاط)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `deleted_at` (timestamptz)

    - `agent_vessels` - جدول العبارات المرتبطة بالوكلاء
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key)
      - `name` (text, اسم العبارة)
      - `created_at` (timestamptz)

    - `agent_trips` - جدول الرحلات
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key)
      - `vessel_id` (uuid, foreign key)
      - `date` (date, التاريخ)
      - `delivery_orders_count` (integer, عدد النوالين/اذون التسليم)
      - `unit_price` (numeric, سعر الوحدة)
      - `total_amount` (numeric, المبلغ الإجمالي)
      - `notes` (text, ملاحظات)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `deleted_at` (timestamptz)

    - `agent_additional_fees` - جدول الرسوم الإضافية
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key)
      - `vessel_id` (uuid, foreign key)
      - `date` (date, التاريخ)
      - `fee_type` (text, نوع الرسوم)
      - `amount` (numeric, المبلغ)
      - `bill_number` (text, رقم البوليصة)
      - `details` (text, التفاصيل)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `deleted_at` (timestamptz)

  2. الأمان
    - تفعيل RLS على جميع الجداول
    - إضافة سياسات للمستخدمين المصادق عليهم
*/

-- جدول الوكلاء الملاحيين
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  opening_balance numeric DEFAULT 0,
  opening_side text CHECK (opening_side IN ('debit', 'credit')),
  current_balance numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- جدول العبارات
CREATE TABLE IF NOT EXISTS agent_vessels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- جدول الرحلات
CREATE TABLE IF NOT EXISTS agent_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE RESTRICT,
  vessel_id uuid REFERENCES agent_vessels(id) ON DELETE RESTRICT,
  date date NOT NULL,
  delivery_orders_count integer NOT NULL CHECK (delivery_orders_count > 0),
  unit_price numeric NOT NULL CHECK (unit_price > 0),
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- جدول الرسوم الإضافية
CREATE TABLE IF NOT EXISTS agent_additional_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE RESTRICT,
  vessel_id uuid REFERENCES agent_vessels(id) ON DELETE RESTRICT,
  date date NOT NULL,
  fee_type text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  bill_number text,
  details text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- تفعيل RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_additional_fees ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للوكلاء
CREATE POLICY "Users can view agents"
  ON agents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert agents"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update agents"
  ON agents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete agents"
  ON agents FOR DELETE
  TO authenticated
  USING (true);

-- سياسات الأمان للعبارات
CREATE POLICY "Users can view vessels"
  ON agent_vessels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert vessels"
  ON agent_vessels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update vessels"
  ON agent_vessels FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete vessels"
  ON agent_vessels FOR DELETE
  TO authenticated
  USING (true);

-- سياسات الأمان للرحلات
CREATE POLICY "Users can view trips"
  ON agent_trips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert trips"
  ON agent_trips FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update trips"
  ON agent_trips FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete trips"
  ON agent_trips FOR DELETE
  TO authenticated
  USING (true);

-- سياسات الأمان للرسوم الإضافية
CREATE POLICY "Users can view fees"
  ON agent_additional_fees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert fees"
  ON agent_additional_fees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update fees"
  ON agent_additional_fees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete fees"
  ON agent_additional_fees FOR DELETE
  TO authenticated
  USING (true);

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_agents_deleted_at ON agents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_agent_vessels_agent_id ON agent_vessels(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_trips_agent_id ON agent_trips(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_trips_deleted_at ON agent_trips(deleted_at);
CREATE INDEX IF NOT EXISTS idx_agent_fees_agent_id ON agent_additional_fees(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_fees_deleted_at ON agent_additional_fees(deleted_at);
