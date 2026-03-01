# خطة التنفيذ - نظام صلاحيات المستخدمين

## نظرة عامة

تنفيذ نظام صلاحيات مبسط وعملي (MVP) باستخدام React + TypeScript + NestJS + Prisma + PostgreSQL. النظام يركز على الوظائف الأساسية بدون تعقيد زائد، مع إمكانية التوسع لاحقاً.

## المهام

- [x] 0. تحليل وحذف نظام الصلاحيات القديم بحذر
  - [x] 0.1 تحليل النظام القديم
    - فحص الكود الحالي للصلاحيات (Backend و Frontend)
    - تحديد جميع الملفات والمكونات المرتبطة بنظام الصلاحيات القديم
    - تحديد الاعتماديات (dependencies) على نظام الصلاحيات القديم
    - توثيق جميع الملفات التي ستحذف
  
  - [x] 0.2 حذف نظام الصلاحيات القديم من Backend
    - حذف Permission-related modules/services/controllers القديمة
    - حذف Guards و Decorators القديمة
    - حذف DTOs و Interfaces القديمة
    - تحديث Auth module لإزالة الاعتماديات القديمة
    - التأكد من عدم وجود imports مكسورة
  
  - [x] 0.3 حذف نظام الصلاحيات القديم من Frontend
    - حذف Permission Context/Provider القديم
    - حذف Protected Components القديمة
    - حذف Permission hooks القديمة
    - حذف صفحات إدارة الصلاحيات القديمة
    - إزالة استخدامات الصلاحيات من الشاشات
    - التأكد من عدم وجود imports مكسورة
  
  - [x] 0.4 تنظيف قاعدة البيانات
    - حذف جداول الصلاحيات القديمة (إن وجدت)
    - إنشاء backup قبل الحذف
    - إنشاء migration للحذف
  
  - [x] 0.5 اختبار التطبيق بعد الحذف
    - التأكد من أن التطبيق يعمل بدون أخطاء
    - التأكد من عدم وجود references مكسورة
    - اختبار تسجيل الدخول والوظائف الأساسية

- [x] 1. إعداد قاعدة البيانات والـ Schema
  - إنشاء Prisma schema للجداول الثلاثة الأساسية (User, Permission, UserPermission)
  - إضافة indexes للأداء
  - إنشاء migration
  - _المتطلبات: 11.1، 11.2، 11.7_

- [x] 2. إنشاء Permission Seed Data
  - إنشاء ملف seed يحتوي على جميع الصلاحيات الـ 106
  - تنظيم الصلاحيات حسب الشاشات (7 شاشات رئيسية)
  - تشغيل seed لإدخال البيانات في قاعدة البيانات
  - _المتطلبات: 11.5، 11.6_

- [x] 3. بناء Permission Module في Backend
  - [x] 3.1 إنشاء PermissionsService
    - تنفيذ getUserPermissions
    - تنفيذ grantPermission مع auto-grant للـ view permission
    - تنفيذ revokePermission
    - تنفيذ userHasPermission
    - تنفيذ isSuperAdmin
    - _المتطلبات: 1.1، 1.2، 10.7_
  
  - [ ]* 3.2 كتابة اختبارات وحدة لـ PermissionsService
    - اختبار getUserPermissions
    - اختبار grantPermission و auto-grant
    - اختبار revokePermission
    - اختبار Super Admin bypass
    - _المتطلبات: 1.2، 10.7_
  
  - [x] 3.3 إنشاء PermissionGuard
    - التحقق من Super Admin bypass
    - التحقق من الصلاحيات المطلوبة
    - إرجاع 403 عند عدم الصلاحية
    - _المتطلبات: 9.1، 9.2، 1.2_
  
  - [ ]* 3.4 كتابة اختبارات وحدة لـ PermissionGuard
    - اختبار السماح بالوصول مع الصلاحية
    - اختبار المنع بدون الصلاحية (403)
    - اختبار Super Admin bypass
    - _المتطلبات: 9.1، 9.2، 1.2_
  
  - [x] 3.5 إنشاء RequirePermission Decorator
    - تنفيذ decorator بسيط يستخدم PermissionGuard
    - _المتطلبات: 9.1، 9.2_

- [x] 4. إنشاء PermissionsController
  - [x] 4.1 تنفيذ endpoints الأساسية
    - GET /permissions/definitions (جميع الصلاحيات المتاحة)
    - GET /permissions/user/:id (صلاحيات مستخدم معين)
    - GET /me/permissions (صلاحيات المستخدم الحالي)
    - POST /permissions/grant (منح صلاحية)
    - POST /permissions/revoke (إلغاء صلاحية)
    - _المتطلبات: 8.9، 10.3، 10.5_
  
  - [ ]* 4.2 كتابة اختبارات تكامل للـ endpoints
    - اختبار GET /me/permissions
    - اختبار POST /permissions/grant
    - اختبار POST /permissions/revoke
    - _المتطلبات: 10.5_

- [x] 5. تحديث Auth Module
  - تضمين isSuperAdmin في JWT payload
  - تحميل صلاحيات المستخدم عند تسجيل الدخول
  - إرجاع الصلاحيات مع response تسجيل الدخول
  - _المتطلبات: 12.1، 12.4_

- [x] 6. Checkpoint - التحقق من Backend
  - التأكد من جميع اختبارات Backend تعمل
  - اختبار endpoints يدوياً باستخدام Postman/Insomnia
  - التأكد من Super Admin bypass يعمل
  - سؤال المستخدم إذا كانت هناك أسئلة

- [x] 7. بناء Permission Context في Frontend
  - [x] 7.1 إنشاء PermissionContext و Provider
    - تخزين permissions و isSuperAdmin في state
    - تنفيذ hasPermission
    - تنفيذ hasAnyPermission
    - تنفيذ hasAllPermissions
    - تحميل الصلاحيات عند mount
    - _المتطلبات: 12.5_
  
  - [x] 7.2 إنشاء usePermission hook
    - hook بسيط للوصول إلى PermissionContext
    - _المتطلبات: 12.5_
  
  - [ ]* 7.3 كتابة اختبارات لـ usePermission
    - اختبار hasPermission
    - اختبار Super Admin bypass
    - _المتطلبات: 1.2_

- [x] 8. إنشاء Protected Components
  - [x] 8.1 إنشاء Protected Component
    - إخفاء children عند عدم الصلاحية
    - عرض fallback اختياري
    - _المتطلبات: 2.1، 2.4، 3.2، 3.4_
  
  - [x] 8.2 إنشاء ProtectedRoute Component
    - إعادة توجيه إلى /unauthorized عند عدم الصلاحية
    - _المتطلبات: 9.5_
  
  - [ ]* 8.3 كتابة اختبارات للـ Protected Components
    - اختبار عرض/إخفاء المحتوى
    - اختبار إعادة التوجيه
    - _المتطلبات: 2.1، 9.5_

- [x] 9. تطبيق الصلاحيات على الشاشات الرئيسية
  - [x] 9.1 حماية routes الأساسية
    - تطبيق ProtectedRoute على جميع الشاشات السبعة
    - _المتطلبات: 2.1، 3.2، 4.2، 5.2، 6.1، 7.2، 8.1_
  
  - [x] 9.2 حماية الأزرار والإجراءات
    - استخدام Protected Component لإخفاء الأزرار
    - تطبيق على Create, Edit, Delete, Print buttons
    - _المتطلبات: 2.3-2.8، 3.4-3.13، 4.4-4.16، 5.3-5.38، 6.3-6.8، 7.1-7.14، 8.3-8.10_

- [x] 10. بناء واجهة إدارة الصلاحيات (تصميم عصري وجميل)
  - [x] 10.1 إنشاء صفحة Users Management
    - عرض قائمة المستخدمين في جدول عصري
    - بطاقات (cards) للمستخدمين مع صورة وبيانات
    - زر "إدارة الصلاحيات" بتصميم جذاب
    - بحث وفلترة المستخدمين
    - _المتطلبات: 8.1، 8.9_
  
  - [x] 10.2 تصميم Permission Management Modal/Page
    - تصميم Modal كبير أو صفحة كاملة بتصميم عصري
    - استخدام Tabs أو Accordion للشاشات السبعة
    - عرض الصلاحيات في Grid جميل مع Icons
    - استخدام Toggle Switches بدلاً من Checkboxes
    - إضافة Search/Filter للصلاحيات
    - عرض وصف لكل صلاحية عند hover
    - إضافة Visual indicators للصلاحيات المفعلة
    - _المتطلبات: 10.1، 10.2، 10.3، 10.4_
  
  - [x] 10.3 تنفيذ وظائف الحفظ والتحديث
    - حفظ التغييرات مع loading state
    - عرض toast notifications للنجاح/الفشل
    - تعطيل التعديل للـ Super Admin مع رسالة توضيحية
    - إضافة Confirmation dialog عند التغييرات الكبيرة
    - _المتطلبات: 10.5، 1.5_
  
  - [x] 10.4 إضافة مميزات UX إضافية
    - إضافة "Select All" لكل شاشة
    - إضافة "Quick Presets" (مثل: View Only, Full Access)
    - عرض عدد الصلاحيات المفعلة
    - إضافة Dark Mode support
    - Responsive design للموبايل
  
  - [ ]* 10.5 كتابة اختبارات للواجهة
    - اختبار عرض الصلاحيات
    - اختبار حفظ التغييرات
    - _المتطلبات: 10.5_

- [x] 11. معالجة الأخطاء والرسائل
  - [x] 11.1 إنشاء Exception Filter في Backend
    - معالجة ForbiddenException
    - معالجة UnauthorizedException
    - تسجيل الأخطاء التفصيلية
    - إرجاع رسائل مبسطة بالعربية
    - _المتطلبات: 13.1، 13.2، 13.4، 13.5_
  
  - [x] 11.2 إنشاء صفحات الأخطاء في Frontend
    - صفحة /unauthorized (403)
    - رسائل خطأ بالعربية
    - معلومات الاتصال لطلب الصلاحيات
    - _المتطلبات: 13.1، 13.2، 13.3_

- [x] 12. منع تعديل/حذف Super Admin
  - إضافة validation في PermissionsService
  - منع grantPermission و revokePermission للـ Super Admin
  - منع حذف Super Admin من Users Management
  - _المتطلبات: 1.3، 1.4_

- [x] 13. تسجيل محاولات الوصول المرفوضة
  - إضافة logging في PermissionGuard
  - تسجيل userId, action, timestamp
  - _المتطلبات: 9.6_

- [x] 14. Checkpoint النهائي
  - تشغيل جميع الاختبارات
  - اختبار التدفقات الكاملة يدوياً
  - التأكد من جميع الشاشات السبعة محمية
  - التأكد من Super Admin يعمل بشكل صحيح
  - سؤال المستخدم إذا كانت هناك أسئلة أو تعديلات

## ملاحظات

- المهام المميزة بـ `*` اختيارية ويمكن تخطيها للحصول على MVP أسرع
- التركيز على البساطة والوضوح
- Backend هو مصدر الحقيقة للأمان
- Frontend للـ UX فقط (إخفاء/تعطيل العناصر)
- يمكن إضافة Roles و Audit Log لاحقاً بدون تغيير البنية الأساسية
