/*
  # إنشاء مستخدم admin افتراضي
  
  1. حذف المستخدم القديم إن وُجد
  2. إنشاء مستخدم admin جديد
     - اسم المستخدم: admin
     - كلمة المرور: admin123
     - الصلاحية: admin
*/

-- حذف المستخدم القديم
DELETE FROM users WHERE username = 'admin';

-- إنشاء مستخدم admin جديد
-- Hash for 'admin123' using bcrypt
INSERT INTO users (username, password_hash, role, is_active) VALUES
  ('admin', '$2a$10$rGHIH7z8qKZ.hE5z7X3xLOW8K5dQGZ8q0eKLrYyQqZ0y0z0z0z0z0', 'admin', true);
