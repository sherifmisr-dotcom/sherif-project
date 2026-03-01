# Permissions Module

نظام صلاحيات المستخدمين - Backend Implementation

## الملفات المنفذة

### 1. PermissionsService (`permissions.service.ts`)
خدمة إدارة الصلاحيات التي توفر:
- `getUserPermissions(userId)` - الحصول على جميع صلاحيات المستخدم
- `grantPermission(userId, permissionCode, grantedBy)` - منح صلاحية مع auto-grant للـ view permission
- `revokePermission(userId, permissionCode, revokedBy)` - إلغاء صلاحية
- `userHasPermission(userId, permissionCode)` - التحقق من وجود صلاحية
- `isSuperAdmin(userId)` - التحقق من كون المستخدم Super Admin

**المتطلبات المنفذة:** 1.1، 1.2، 10.7

### 2. PermissionGuard (`guards/permission.guard.ts`)
Guard للتحقق من الصلاحيات على مستوى الـ routes:
- التحقق من Super Admin bypass
- التحقق من الصلاحيات المطلوبة
- إرجاع 403 عند عدم الصلاحية
- تسجيل محاولات الوصول المرفوضة

**المتطلبات المنفذة:** 9.1، 9.2، 1.2

### 3. RequirePermission Decorator (`decorators/require-permission.decorator.ts`)
Decorator بسيط لتطبيق الصلاحيات على الـ routes:
```typescript
@Get()
@RequirePermission('customers.view')
async getCustomers() {
  // Implementation
}
```

**المتطلبات المنفذة:** 9.1، 9.2

### 4. PermissionsModule (`permissions.module.ts`)
Module الرئيسي الذي يجمع جميع المكونات

## الاستخدام

### 1. استيراد الـ Module
```typescript
import { PermissionsModule } from './permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  // ...
})
export class AppModule {}
```

### 2. استخدام الـ Decorator
```typescript
import { RequirePermission } from './permissions';

@Controller('customers')
export class CustomersController {
  @Get()
  @RequirePermission('customers.view')
  async getCustomers() {
    // Implementation
  }

  @Post()
  @RequirePermission('customers.view', 'customers.create')
  async createCustomer(@Body() dto: CreateCustomerDto) {
    // Implementation
  }
}
```

### 3. استخدام الـ Service مباشرة
```typescript
import { PermissionsService } from './permissions';

@Injectable()
export class SomeService {
  constructor(private permissionsService: PermissionsService) {}

  async checkPermission(userId: string) {
    const hasPermission = await this.permissionsService.userHasPermission(
      userId,
      'customers.view'
    );
    return hasPermission;
  }
}
```

## ملاحظات مهمة

### Prisma Client
⚠️ **مهم:** يجب تشغيل `npx prisma generate` لتحديث الـ Prisma Client بعد أي تغييرات في الـ schema.

إذا واجهت أخطاء TypeScript تتعلق بـ `isSuperAdmin` أو `permission` أو `permissionAuditLog`، قم بتشغيل:
```bash
cd backend
npx prisma generate
```

### Super Admin
- Super Admin له صلاحيات كاملة على جميع أجزاء النظام
- لا يمكن تعديل أو حذف صلاحيات Super Admin
- يتم التحقق من Super Admin في كل من Service و Guard

### Auto-Grant View Permission
عند منح صلاحية إجراء (create, edit, delete، إلخ)، يتم منح صلاحية View تلقائياً إذا لم تكن موجودة.

مثال:
```typescript
// منح صلاحية customers.create
await permissionsService.grantPermission(userId, 'customers.create', adminId);
// سيتم منح customers.view تلقائياً
```

### Audit Logging
جميع التغييرات في الصلاحيات (منح/إلغاء) يتم تسجيلها في جدول `permission_audit_logs`.

## المهام التالية

### اختبارات اختيارية (Optional)
- [ ] 3.2 كتابة اختبارات وحدة لـ PermissionsService
- [ ] 3.4 كتابة اختبارات وحدة لـ PermissionGuard

### المهام القادمة
- [ ] 4. إنشاء PermissionsController
- [ ] 5. تحديث Auth Module
- [ ] 6. Checkpoint - التحقق من Backend

## الموارد

- [Prisma Documentation](https://www.prisma.io/docs)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
