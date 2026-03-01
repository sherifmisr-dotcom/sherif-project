/*
  # تغيير العملة الافتراضية إلى الريال السعودي

  1. التغييرات:
    - تغيير العملة الافتراضية في جدول invoices من EGP إلى SAR
*/

ALTER TABLE invoices 
ALTER COLUMN currency SET DEFAULT 'SAR';
