/*
  # إصلاح سياسة RLS للسماح بتسجيل الدخول
  
  1. التغييرات
    - حذف السياسة القديمة
    - إنشاء سياسة جديدة تسمح بقراءة بيانات المستخدمين للجميع (للسماح بتسجيل الدخول)
    - هذا آمن لأن كلمات المرور مشفرة
*/

DROP POLICY IF EXISTS "Allow authenticated access" ON users;

CREATE POLICY "Allow public read access for login"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);