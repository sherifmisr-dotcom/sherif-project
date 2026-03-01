# تحليل نظام الصلاحيات القديم

## تاريخ التحليل
2026-02-16

## نظرة عامة
النظام الحالي يستخدم نموذج صلاحيات بسيط مبني على:
- جدول `UserPermission` في قاعدة البيانات
- صلاحيات على مستوى الشاشة (screen-level permissions)
- 5 أنواع من الصلاحيات لكل شاشة: canView, canCreate, canEdit, canDelete, canPrint
- دعم Admin bypass (المسؤولون لديهم صلاحيات كاملة)

---

## 1. Backend Components

### 1.1 Database Schema (Prisma)

**الملف:** `backend/prisma/schema.prisma`

**الجداول المتأثرة:**

#### جدول `User`
```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String   @map("password_hash")
  fullName     String?  @map("full_name")
  isActive     Boolean  @default(true) @map("is_active")
  isAdmin      Boolean  @default(false) @map("is_admin")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  permissions      UserPermission[]
  // ... other relations
}
```

**الإجراء:** الحقل `permissions` relation سيتم حذفه لاحقاً عند حذف جدول UserPermission

#### جدول `UserPermission` (سيتم حذفه بالكامل)
```prisma
model UserPermission {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  screen    String   // Screen identifier
  canView   Boolean  @default(true) @map("can_view")
  canCreate Boolean  @default(false) @map("can_create")
  canEdit   Boolean  @default(false) @map("can_edit")
  canDelete Boolean  @default(false) @map("can_delete")
  canPrint  Boolean  @default(false) @map("can_print")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, screen])
  @@map("user_permissions")
}
```

**الإجراء:** حذف هذا الجدول بالكامل

---

### 1.2 Backend Services

**الملف:** `backend/src/users/users.service.ts`

**الوظائف المتأثرة:**

1. **getUserPermissions(userId: string)**
   - السطور: ~199-228
   - الوظيفة: تحميل صلاحيات المستخدم من قاعدة البيانات
   - الإجراء: حذف

2. **updatePermissions(userId: string, updatePermissionsDto: UpdatePermissionsDto)**
   - السطور: ~229-259
   - الوظيفة: تحديث صلاحيات المستخدم
   - الإجراء: حذف

3. **في createUser()**
   - السطور: ~84-89
   - الكود:
   ```typescript
   if (!user.isAdmin && createUserDto.permissions && createUserDto.permissions.length > 0) {
       await this.prisma.userPermission.createMany({
           data: createUserDto.permissions.map(p => ({
               userId: user.id,
               screen: p.screen,
               // ...
           })),
       });
   }
   ```
   - الإجراء: حذف هذا الجزء

**الإجراء الكلي:** حذف الوظائف المتعلقة بالصلاحيات من UsersService

---

### 1.3 Backend Controllers

**الملف:** `backend/src/users/users.controller.ts`

**الـ Endpoints المتأثرة:**

1. **GET /users/me/permissions**
   - السطور: ~40-46
   - الإجراء: حذف

2. **GET /users/:id/permissions**
   - السطور: ~58-62
   - الإجراء: حذف

3. **PATCH /users/:id/permissions**
   - السطور: ~97-104
   - الإجراء: حذف

**الإجراء الكلي:** حذف الـ endpoints المتعلقة بالصلاحيات

---

### 1.4 Backend DTOs

**الملف:** `backend/src/users/dto/user.dto.ts`

**الـ DTOs المتأثرة:**

1. **PermissionDto**
   - السطور: ~59-77
   - الإجراء: حذف بالكامل

2. **UpdatePermissionsDto**
   - السطور: ~79-85
   - الإجراء: حذف بالكامل

3. **في CreateUserDto**
   - السطور: ~22-25
   - الحقل: `permissions?: PermissionDto[]`
   - الإجراء: حذف هذا الحقل

**الإجراء الكلي:** حذف DTOs المتعلقة بالصلاحيات

---

### 1.5 Backend - ملفات أخرى متأثرة

**الملف:** `backend/src/system/system.service.ts`

**الكود المتأثر:**
- السطور: ~101-104
- الوظيفة: حذف صلاحيات المستخدمين عند إعادة تعيين النظام
```typescript
await this.prisma.userPermission.deleteMany({
    where: {
        user: { username: { not: 'admin' } },
    },
});
```
- الإجراء: حذف هذا الجزء (سيتم حذفه تلقائياً عند حذف الجدول)

---

## 2. Frontend Components

### 2.1 API Client

**الملف:** `src/lib/api.ts`

**الوظائف المتأثرة:**

1. **getCurrentUserPermissions()**
   - السطور: ~687-691
   - الإجراء: حذف

2. **getUserPermissions(id: string)**
   - السطور: ~712-716
   - الإجراء: حذف

3. **updateUserPermissions(id: string, data: any)**
   - السطور: ~717-721
   - الإجراء: حذف

---

### 2.2 Contexts

**الملف:** `src/contexts/AuthContext.tsx`

**الأجزاء المتأثرة:**

1. **Permission Interface**
   - السطور: ~3-9
   - الإجراء: حذف (سيتم استبداله بنظام جديد)

2. **في User Interface**
   - السطر: ~14
   - الحقل: `permissions?: Permission[]`
   - الإجراء: حذف

3. **loadUserPermissions() function**
   - السطور: ~52-70
   - الإجراء: حذف

4. **hasPermission() function**
   - السطور: ~117-127
   - الإجراء: تعديل (سيتم إعادة كتابته للنظام الجديد)

5. **canAccessScreen() function**
   - السطور: ~129-137
   - الإجراء: تعديل

6. **hasAnyInvoicePermission() function**
   - السطور: ~139-148
   - الإجراء: تعديل

7. **hasAnySettingsPermission() function**
   - السطور: ~150-166
   - الإجراء: تعديل

**الإجراء الكلي:** إعادة كتابة AuthContext بالكامل للنظام الجديد

---

### 2.3 Hooks

**الملف:** `src/hooks/usePermissions.ts`

**الإجراء:** حذف الملف بالكامل (سيتم استبداله بـ hook جديد)

---

### 2.4 Configuration

**الملف:** `src/config/screens.ts`

**الإجراء:** 
- الاحتفاظ بالملف لكن سيتم تعديله لاحقاً ليتوافق مع النظام الجديد
- النظام الحالي يستخدم screen IDs مثل: `invoices_import`, `customers`, إلخ
- النظام الجديد سيستخدم permission codes مثل: `invoices.type1.view`, `customers.view`, إلخ

---

### 2.5 Pages & Modals

**الملف:** `src/pages/settings/UserManagement.tsx`

**الأجزاء المتأثرة:**
- استخدام `usePermissions` hook
- استدعاء `handleEditPermissions`
- عرض `PermissionsModal`

**الإجراء:** تعديل لاستخدام النظام الجديد

**الملف:** `src/pages/settings/modals/PermissionsModal.tsx`

**الإجراء:** حذف الملف بالكامل (سيتم استبداله بواجهة جديدة)

---

## 3. الاعتماديات (Dependencies)

### 3.1 استخدامات الصلاحيات في الشاشات

تم العثور على استخدامات `usePermissions` hook في الملفات التالية:
- `src/pages/settings/UserManagement.tsx`
- (قد توجد استخدامات أخرى في ملفات الشاشات الأخرى)

**الإجراء:** البحث عن جميع الاستخدامات وتوثيقها

---

## 4. قاعدة البيانات

### 4.1 الجداول المتأثرة

1. **user_permissions** (سيتم حذفه)
   - عدد الأعمدة: 8
   - العلاقات: 
     - Foreign key إلى `users.id`
   - الـ Indexes:
     - Primary key على `id`
     - Unique constraint على `(userId, screen)`
     - Index على `userId`

### 4.2 البيانات الموجودة

**الإجراء المطلوب:**
1. إنشاء backup كامل لقاعدة البيانات قبل أي تعديل
2. تصدير بيانات جدول `user_permissions` للرجوع إليها إذا لزم الأمر
3. حذف الجدول عبر migration

---

## 5. خطة الحذف المقترحة

### المرحلة 1: Backend
1. حذف endpoints من `users.controller.ts`
2. حذف وظائف الصلاحيات من `users.service.ts`
3. حذف DTOs من `user.dto.ts`
4. تنظيف `system.service.ts`
5. التأكد من عدم وجود imports مكسورة

### المرحلة 2: Frontend
1. حذف `usePermissions.ts` hook
2. حذف `PermissionsModal.tsx`
3. تعديل `AuthContext.tsx` (إزالة الأجزاء القديمة)
4. تعديل `api.ts` (حذف وظائف الصلاحيات)
5. تعديل `UserManagement.tsx` (إزالة استخدامات الصلاحيات القديمة)
6. البحث عن استخدامات أخرى وإزالتها

### المرحلة 3: Database
1. إنشاء backup
2. إنشاء migration لحذف جدول `user_permissions`
3. تحديث Prisma schema
4. تشغيل migration

### المرحلة 4: Testing
1. اختبار تسجيل الدخول
2. اختبار الوظائف الأساسية
3. التأكد من عدم وجود أخطاء في console

---

## 6. المخاطر والاحتياطات

### المخاطر:
1. **فقدان البيانات**: حذف جدول الصلاحيات سيؤدي لفقدان جميع إعدادات الصلاحيات الحالية
2. **تعطل التطبيق**: قد تكون هناك استخدامات غير موثقة للنظام القديم
3. **مشاكل في الـ Migration**: قد تفشل migration إذا كانت هناك قيود أو علاقات غير متوقعة

### الاحتياطات:
1. ✅ إنشاء backup كامل قبل أي تعديل
2. ✅ توثيق جميع الملفات المتأثرة
3. ✅ اختبار شامل بعد كل مرحلة
4. ✅ الاحتفاظ بنسخة من الكود القديم للرجوع إليها

---

## 7. الملفات التي ستحذف

### Backend:
- لا توجد ملفات كاملة ستحذف (فقط أجزاء من ملفات موجودة)

### Frontend:
1. `src/hooks/usePermissions.ts` ✅
2. `src/pages/settings/modals/PermissionsModal.tsx` ✅

### Database:
1. جدول `user_permissions` (عبر migration) ✅

---

## 8. الملفات التي ستعدل

### Backend:
1. `backend/prisma/schema.prisma` - حذف model UserPermission
2. `backend/src/users/users.service.ts` - حذف وظائف الصلاحيات
3. `backend/src/users/users.controller.ts` - حذف endpoints
4. `backend/src/users/dto/user.dto.ts` - حذف DTOs
5. `backend/src/system/system.service.ts` - تنظيف

### Frontend:
1. `src/lib/api.ts` - حذف وظائف API
2. `src/contexts/AuthContext.tsx` - إعادة كتابة
3. `src/pages/settings/UserManagement.tsx` - تعديل
4. `src/config/screens.ts` - تعديل لاحقاً

---

## 9. الخلاصة

النظام القديم بسيط نسبياً ومحصور في:
- جدول واحد في قاعدة البيانات
- بضع وظائف في Backend
- hook واحد وmodal واحد في Frontend
- استخدامات محدودة في الشاشات

**التقييم:** الحذف آمن نسبياً إذا تم اتباع الخطوات بحذر وإنشاء backup قبل البدء.

**الوقت المتوقع:** 2-3 ساعات للحذف الكامل والاختبار

---

## 10. الخطوات التالية

1. ✅ مراجعة هذا التحليل مع المستخدم
2. ⏳ إنشاء backup لقاعدة البيانات
3. ⏳ البدء بحذف Backend
4. ⏳ حذف Frontend
5. ⏳ تنظيف Database
6. ⏳ اختبار شامل

