/*
  # تحديث كلمة مرور المستخدم admin
  
  1. تحديث كلمة مرور المستخدم admin
     - كلمة المرور الجديدة: admin123
*/

UPDATE users 
SET password_hash = 'admin123'
WHERE username = 'admin';