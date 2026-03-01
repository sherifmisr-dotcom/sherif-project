/*
  # تحديث سياسات RLS للوكلاء الملاحيين

  1. التغييرات
    - تحديث سياسات RLS لجميع جداول الوكلاء لتسمح بالوصول لجميع المستخدمين
    - هذا ضروري لأن التطبيق يستخدم نظام مصادقة مخصص وليس Supabase Auth
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Users can view agents" ON agents;
DROP POLICY IF EXISTS "Users can insert agents" ON agents;
DROP POLICY IF EXISTS "Users can update agents" ON agents;
DROP POLICY IF EXISTS "Users can delete agents" ON agents;

DROP POLICY IF EXISTS "Users can view vessels" ON agent_vessels;
DROP POLICY IF EXISTS "Users can insert vessels" ON agent_vessels;
DROP POLICY IF EXISTS "Users can update vessels" ON agent_vessels;
DROP POLICY IF EXISTS "Users can delete vessels" ON agent_vessels;

DROP POLICY IF EXISTS "Users can view trips" ON agent_trips;
DROP POLICY IF EXISTS "Users can insert trips" ON agent_trips;
DROP POLICY IF EXISTS "Users can update trips" ON agent_trips;
DROP POLICY IF EXISTS "Users can delete trips" ON agent_trips;

DROP POLICY IF EXISTS "Users can view fees" ON agent_additional_fees;
DROP POLICY IF EXISTS "Users can insert fees" ON agent_additional_fees;
DROP POLICY IF EXISTS "Users can update fees" ON agent_additional_fees;
DROP POLICY IF EXISTS "Users can delete fees" ON agent_additional_fees;

-- إنشاء سياسات جديدة تسمح بالوصول لجميع المستخدمين
CREATE POLICY "Allow all for agents"
  ON agents
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for vessels"
  ON agent_vessels
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for trips"
  ON agent_trips
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for fees"
  ON agent_additional_fees
  FOR ALL
  USING (true)
  WITH CHECK (true);
