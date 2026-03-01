# وثيقة التصميم - نظام صلاحيات المستخدمين

## نظرة عامة

نظام صلاحيات المستخدمين هو نظام شامل يوفر تحكماً دقيقاً في الوصول على مستوى المستخدم الفردي. يتكون النظام من ثلاث طبقات رئيسية:

1. **طبقة قاعدة البيانات**: تخزين الصلاحيات والمستخدمين باستخدام PostgreSQL و Prisma
2. **طبقة الخادم**: التحقق من الصلاحيات وإدارتها باستخدام NestJS
3. **طبقة الواجهة**: عرض الصلاحيات وإخفاء العناصر غير المصرح بها باستخدام React + TypeScript

يدعم النظام 7 شاشات رئيسية مع أكثر من 100 صلاحية فرعية، ويوفر Super Admin بصلاحيات كاملة غير قابلة للتعديل.

## البنية المعمارية

### نمط المعمارية

النظام يتبع معمارية ثلاثية الطبقات (Three-Tier Architecture):

```
┌─────────────────────────────────────────┐
│         React Frontend (UI)             │
│  - Permission Context                   │
│  - Protected Components                 │
│  - Permission Hooks                     │
└──────────────┬──────────────────────────┘
               │ HTTP/REST API
┌──────────────▼──────────────────────────┐
│         NestJS Backend (API)            │
│  - Permission Guards                    │
│  - Permission Service                   │
│  - Permission Controllers               │
└──────────────┬──────────────────────────┘
               │ Prisma ORM
┌──────────────▼──────────────────────────┐
│      PostgreSQL Database                │
│  - Users Table                          │
│  - Permissions Table                    │
│  - UserPermissions Table                │
└─────────────────────────────────────────┘
```

### تدفق البيانات

1. **عند تسجيل الدخول**:
   - المستخدم يسجل الدخول → Backend يتحقق من بيانات الاعتماد
   - Backend يحمل جميع صلاحيات المستخدم من Database
   - Backend يضمن الصلاحيات في JWT token أو session
   - Frontend يستقبل الصلاحيات ويخزنها في Context

2. **عند الوصول إلى شاشة**:
   - Frontend يتحقق من صلاحية View في Context
   - إذا موجودة: يعرض الشاشة
   - إذا غير موجودة: يخفي الشاشة من القائمة أو يعيد التوجيه

3. **عند تنفيذ إجراء**:
   - Frontend يتحقق من الصلاحية ويخفي/يعطل الزر إذا لم تكن موجودة
   - عند الطلب: Backend يتحقق من الصلاحية مرة أخرى (Double Validation)
   - إذا غير مصرح: يرجع 403 Forbidden
   - إذا مصرح: ينفذ الإجراء

## المكونات والواجهات

### 1. نماذج البيانات (Database Schema)

#### جدول Users

```prisma
model User {
  id            String          @id @default(uuid())
  email         String          @unique
  username      String          @unique
  passwordHash  String
  isSuperAdmin  Boolean         @default(false)
  isActive      Boolean         @default(true)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  permissions   UserPermission[]
  
  @@index([email])
  @@index([username])
}
```

#### جدول Permissions

```prisma
model Permission {
  id          String          @id @default(uuid())
  code        String          @unique  // e.g., "customers.view", "invoices.type1.create"
  screen      String                   // e.g., "customers", "invoices", "reports"
  subScreen   String?                  // e.g., "type1", "receipt_vouchers", "treasury"
  action      String                   // e.g., "view", "create", "edit", "delete", "print"
  nameAr      String                   // Arabic display name
  nameEn      String                   // English display name
  description String?
  category    String                   // For grouping in UI
  isViewPermission Boolean @default(false)  // Marks if this is a view permission
  createdAt   DateTime        @default(now())
  users       UserPermission[]
  
  @@index([code])
  @@index([screen])
  @@index([category])
}
```

#### جدول UserPermissions

```prisma
model UserPermission {
  id           String     @id @default(uuid())
  userId       String
  permissionId String
  grantedAt    DateTime   @default(now())
  grantedBy    String?    // User ID who granted this permission
  
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  
  @@unique([userId, permissionId])
  @@index([userId])
  @@index([permissionId])
}
```

#### جدول PermissionAuditLog

```prisma
model PermissionAuditLog {
  id           String   @id @default(uuid())
  userId       String
  permissionId String
  action       String   // "granted", "revoked"
  performedBy  String   // User ID who performed the action
  performedAt  DateTime @default(now())
  ipAddress    String?
  userAgent    String?
  
  @@index([userId])
  @@index([performedAt])
}
```

### 2. Backend Components (NestJS)

#### Permission Module Structure

```
src/
├── permissions/
│   ├── permissions.module.ts
│   ├── permissions.service.ts
│   ├── permissions.controller.ts
│   ├── guards/
│   │   ├── permission.guard.ts
│   │   └── super-admin.guard.ts
│   ├── decorators/
│   │   ├── require-permission.decorator.ts
│   │   └── current-user.decorator.ts
│   ├── dto/
│   │   ├── grant-permission.dto.ts
│   │   ├── revoke-permission.dto.ts
│   │   └── user-permissions.dto.ts
│   └── interfaces/
│       ├── permission.interface.ts
│       └── user-with-permissions.interface.ts
```

#### PermissionsService

```typescript
interface PermissionsService {
  // User permissions management
  getUserPermissions(userId: string): Promise<Permission[]>;
  grantPermission(userId: string, permissionCode: string, grantedBy: string): Promise<void>;
  revokePermission(userId: string, permissionCode: string, revokedBy: string): Promise<void>;
  grantMultiplePermissions(userId: string, permissionCodes: string[], grantedBy: string): Promise<void>;
  revokeMultiplePermissions(userId: string, permissionCodes: string[], revokedBy: string): Promise<void>;
  
  // Permission checks
  userHasPermission(userId: string, permissionCode: string): Promise<boolean>;
  userHasAnyPermission(userId: string, permissionCodes: string[]): Promise<boolean>;
  userHasAllPermissions(userId: string, permissionCodes: string[]): Promise<boolean>;
  
  // Permission definitions
  getAllPermissions(): Promise<Permission[]>;
  getPermissionsByScreen(screen: string): Promise<Permission[]>;
  getPermissionsByCategory(category: string): Promise<Permission[]>;
  
  // Super Admin
  isSuperAdmin(userId: string): Promise<boolean>;
  
  // Audit
  logPermissionChange(userId: string, permissionId: string, action: string, performedBy: string, metadata: any): Promise<void>;
  getPermissionHistory(userId: string): Promise<PermissionAuditLog[]>;
}
```

#### PermissionGuard

```typescript
@Injectable()
class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    
    if (!requiredPermissions) {
      return true; // No permissions required
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    // Super Admin bypass
    if (await this.permissionsService.isSuperAdmin(user.id)) {
      return true;
    }
    
    // Check if user has required permissions
    const hasPermission = await this.permissionsService.userHasAllPermissions(
      user.id,
      requiredPermissions,
    );
    
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }
    
    return true;
  }
}
```

#### RequirePermission Decorator

```typescript
const RequirePermission = (...permissions: string[]) => {
  return applyDecorators(
    SetMetadata('permissions', permissions),
    UseGuards(PermissionGuard),
  );
};

// Usage example:
@Controller('customers')
class CustomersController {
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

#### PermissionsController

```typescript
@Controller('permissions')
@UseGuards(AuthGuard)
class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}
  
  @Get('user/:userId')
  @RequirePermission('users.manage_permissions')
  async getUserPermissions(@Param('userId') userId: string) {
    return this.permissionsService.getUserPermissions(userId);
  }
  
  @Post('grant')
  @RequirePermission('users.manage_permissions')
  async grantPermission(
    @Body() dto: GrantPermissionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.permissionsService.grantPermission(
      dto.userId,
      dto.permissionCode,
      currentUser.id,
    );
  }
  
  @Post('revoke')
  @RequirePermission('users.manage_permissions')
  async revokePermission(
    @Body() dto: RevokePermissionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.permissionsService.revokePermission(
      dto.userId,
      dto.permissionCode,
      currentUser.id,
    );
  }
  
  @Get('definitions')
  @RequirePermission('users.view')
  async getAllPermissions() {
    return this.permissionsService.getAllPermissions();
  }
}
```

### 3. Frontend Components (React + TypeScript)

#### Permission Context

```typescript
interface PermissionContextValue {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isSuperAdmin: boolean;
  loading: boolean;
}

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Load permissions from API or auth token
    loadUserPermissions();
  }, []);
  
  const hasPermission = (permission: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.includes(permission);
  };
  
  const hasAnyPermission = (perms: string[]): boolean => {
    if (isSuperAdmin) return true;
    return perms.some(p => permissions.includes(p));
  };
  
  const hasAllPermissions = (perms: string[]): boolean => {
    if (isSuperAdmin) return true;
    return perms.every(p => permissions.includes(p));
  };
  
  return (
    <PermissionContext.Provider value={{
      permissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isSuperAdmin,
      loading,
    }}>
      {children}
    </PermissionContext.Provider>
  );
};
```

#### usePermission Hook

```typescript
const usePermission = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission must be used within PermissionProvider');
  }
  return context;
};
```

#### Protected Component

```typescript
interface ProtectedProps {
  permission: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
  requireAll?: boolean; // If true, requires all permissions; if false, requires any
}

const Protected: React.FC<ProtectedProps> = ({
  permission,
  fallback = null,
  children,
  requireAll = false,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();
  
  const isAuthorized = Array.isArray(permission)
    ? requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission)
    : hasPermission(permission);
  
  if (!isAuthorized) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// Usage example:
<Protected permission="customers.view">
  <CustomersScreen />
</Protected>

<Protected permission="customers.create">
  <Button onClick={handleAddCustomer}>إضافة عميل</Button>
</Protected>
```

#### ProtectedRoute Component

```typescript
interface ProtectedRouteProps {
  permission: string;
  element: React.ReactElement;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  permission,
  element,
  redirectTo = '/unauthorized',
}) => {
  const { hasPermission, loading } = usePermission();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!hasPermission(permission)) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return element;
};

// Usage in routes:
<Route
  path="/customers"
  element={<ProtectedRoute permission="customers.view" element={<CustomersScreen />} />}
/>
```

#### Permission Management UI Component

```typescript
interface PermissionManagementProps {
  userId: string;
}

const PermissionManagement: React.FC<PermissionManagementProps> = ({ userId }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<GroupedPermissions>({});
  
  useEffect(() => {
    loadPermissions();
    loadUserPermissions();
  }, [userId]);
  
  const handleTogglePermission = async (permissionCode: string, isGranted: boolean) => {
    if (isGranted) {
      await grantPermission(userId, permissionCode);
    } else {
      await revokePermission(userId, permissionCode);
    }
    loadUserPermissions(); // Refresh
  };
  
  return (
    <div className="permission-management">
      {Object.entries(groupedPermissions).map(([screen, perms]) => (
        <div key={screen} className="permission-group">
          <h3>{screen}</h3>
          {perms.map(perm => (
            <div key={perm.code} className="permission-item">
              <Checkbox
                checked={userPermissions.includes(perm.code)}
                onChange={(e) => handleTogglePermission(perm.code, e.target.checked)}
                disabled={isSuperAdmin}
              />
              <label>{perm.nameAr}</label>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
```

## نماذج البيانات التفصيلية

### هيكل الصلاحيات (Permission Codes)

الصلاحيات تتبع نمط تسمية هرمي:

```
{screen}.{subScreen?}.{action}
```

أمثلة:
- `customers.view`
- `customers.create`
- `invoices.type1.view`
- `invoices.type1.create`
- `invoices.type1.print`
- `accounts.treasury.view`
- `accounts.vouchers_receipt.create`
- `reports.financial.treasury_cash`

### قائمة الصلاحيات الكاملة

#### 1. Customers (4 صلاحيات)
- `customers.view`
- `customers.create`
- `customers.edit`
- `customers.activate_deactivate`

#### 2. Invoices (24 صلاحية - 6 لكل نوع × 4 أنواع)
- `invoices.type1.view`
- `invoices.type1.create`
- `invoices.type1.preview`
- `invoices.type1.print`
- `invoices.type1.edit`
- `invoices.type1.delete`
- (نفس الصلاحيات لـ type2, type3, type4)

#### 3. Shipping Agents (12 صلاحية - 4 لكل شاشة فرعية × 3)
- `shipping_agents.agents.view`
- `shipping_agents.agents.create`
- `shipping_agents.agents.edit`
- `shipping_agents.agents.delete`
- `shipping_agents.trips.view`
- `shipping_agents.trips.create`
- `shipping_agents.trips.edit`
- `shipping_agents.trips.delete`
- `shipping_agents.fees.view`
- `shipping_agents.fees.create`
- `shipping_agents.fees.edit`
- `shipping_agents.fees.delete`

#### 4. Accounts Management (47 صلاحية)

**Treasury (2):**
- `accounts.treasury.view`
- `accounts.treasury.carry_forward`

**Bank Accounts (5):**
- `accounts.bank_accounts.view`
- `accounts.bank_accounts.carry_forward_all`
- `accounts.bank_accounts.create`
- `accounts.bank_accounts.edit`
- `accounts.bank_accounts.delete`

**Receipt Vouchers (6):**
- `accounts.vouchers_receipt.view`
- `accounts.vouchers_receipt.create`
- `accounts.vouchers_receipt.preview`
- `accounts.vouchers_receipt.print`
- `accounts.vouchers_receipt.edit`
- `accounts.vouchers_receipt.delete`

**Payment Vouchers (6):**
- `accounts.vouchers_payment.view`
- `accounts.vouchers_payment.create`
- `accounts.vouchers_payment.preview`
- `accounts.vouchers_payment.print`
- `accounts.vouchers_payment.edit`
- `accounts.vouchers_payment.delete`

**Customs Fees (4):**
- `accounts.customs_fees.view`
- `accounts.customs_fees.create_batch`
- `accounts.customs_fees.view_details`
- `accounts.customs_fees.delete`

**Internal Transfers (5):**
- `accounts.internal_transfers.view`
- `accounts.internal_transfers.create`
- `accounts.internal_transfers.preview`
- `accounts.internal_transfers.edit`
- `accounts.internal_transfers.delete`

**Voucher Search (1):**
- `accounts.voucher_search.access`

**Payroll (6):**
- `accounts.payroll.view`
- `accounts.payroll.create`
- `accounts.payroll.preview`
- `accounts.payroll.edit`
- `accounts.payroll.approve`
- `accounts.payroll.delete`

#### 5. Employees (4 صلاحيات)
- `employees.view`
- `employees.create`
- `employees.edit`
- `employees.delete`

#### 6. Reports (10 صلاحيات)
- `reports.financial.treasury_cash`
- `reports.financial.bank_accounts`
- `reports.financial.income_expenses`
- `reports.financial.income_statement`
- `reports.financial.general_journal`
- `reports.financial.trial_balance`
- `reports.customers.access`
- `reports.customs.access`
- `reports.shipping_agents.access`

#### 7. Users Management (5 صلاحيات)
- `users.view`
- `users.create`
- `users.edit`
- `users.delete`
- `users.manage_permissions`

**إجمالي الصلاحيات: 106 صلاحية**

### Permission Seeding Data

عند تهيئة النظام، يجب إدخال جميع الصلاحيات في جدول Permissions:

```typescript
const permissionsSeedData = [
  // Customers
  { code: 'customers.view', screen: 'customers', action: 'view', nameAr: 'عرض العملاء', nameEn: 'View Customers', category: 'customers', isViewPermission: true },
  { code: 'customers.create', screen: 'customers', action: 'create', nameAr: 'إضافة عميل', nameEn: 'Create Customer', category: 'customers', isViewPermission: false },
  // ... rest of permissions
];
```

## خصائص الصحة (Correctness Properties)

الخاصية (Property) هي سمة أو سلوك يجب أن يكون صحيحاً عبر جميع عمليات التنفيذ الصالحة للنظام - في الأساس، بيان رسمي حول ما يجب أن يفعله النظام. تعمل الخصائص كجسر بين المواصفات المقروءة للإنسان وضمانات الصحة القابلة للتحقق آلياً.

### الخاصية 1: Super Admin Bypass

*لأي* مستخدم Super Admin ولأي صلاحية في النظام، يجب أن يُمنح المستخدم الوصول دون التحقق من الصلاحية.

**يتحقق من: المتطلبات 1.2، 9.7**

### الخاصية 2: Super Admin Protection

*لأي* مستخدم Super Admin، يجب أن يمنع النظام حذف حساب المستخدم أو تعديل صلاحياته.

**يتحقق من: المتطلبات 1.3، 1.4**

### الخاصية 3: Permission-Based UI Visibility

*لأي* مستخدم وأي شاشة، إذا كان المستخدم يفتقر إلى صلاحية View للشاشة، يجب أن تخفي الواجهة الشاشة من القائمة، وإذا كان يملك الصلاحية، يجب أن تعرضها.

**يتحقق من: المتطلبات 2.1، 2.2، 3.2، 3.3، 4.2، 4.3، 4.7، 4.8، 4.12، 4.13، 5.2، 5.4، 5.9، 5.10، 5.16، 5.22، 5.26، 5.31، 5.33، 6.1، 6.2، 7.2-7.4، 7.9-7.14، 8.1، 8.2**

### الخاصية 4: Permission-Based Action Authorization

*لأي* مستخدم وأي إجراء (create, edit, delete, print، إلخ)، إذا كان المستخدم يفتقر إلى الصلاحية المطلوبة، يجب أن تخفي الواجهة الزر أو تعطله، وإذا كان يملك الصلاحية، يجب أن تعرضه وتمكنه.

**يتحقق من: المتطلبات 2.3-2.8، 3.4-3.13، 4.4-4.6، 4.9-4.11، 4.14-4.16، 5.3، 5.5-5.8، 5.11-5.15، 5.17-5.21، 5.23-5.25، 5.27-5.30، 5.34-5.38، 6.3-6.8، 8.3-8.10**

### الخاصية 5: Backend Permission Enforcement

*لأي* طلب HTTP لتنفيذ إجراء، إذا كان المستخدم يفتقر إلى الصلاحية المطلوبة، يجب أن يرجع الخادم HTTP 403 Forbidden.

**يتحقق من: المتطلبات 9.1، 9.2**

### الخاصية 6: Permission Independence for Invoice Types

*لأي* نوعين مختلفين من الفواتير، يجب أن تكون صلاحيات أحدهما مستقلة تماماً عن الآخر - منح صلاحية لنوع واحد لا يمنح صلاحية للنوع الآخر.

**يتحقق من: المتطلبات 3.1**

### الخاصية 7: Permission Audit Logging

*لأي* محاولة وصول مرفوضة، يجب أن يسجل النظام المحاولة مع معرف المستخدم والإجراء المحاول والطابع الزمني.

**يتحقق من: المتطلبات 9.6**

### الخاصية 8: Permission Persistence

*لأي* تغيير في صلاحيات المستخدم (منح أو إلغاء)، يجب أن يحفظ النظام التغيير في قاعدة البيانات فوراً، وعند استعلام صلاحيات المستخدم لاحقاً، يجب أن تعكس التغيير.

**يتحقق من: المتطلبات 10.5**

### الخاصية 9: View Permission Auto-Grant

*لأي* صلاحية إجراء (غير View) يتم منحها لمستخدم، إذا لم يكن المستخدم يملك صلاحية View للشاشة نفسها، يجب أن يمنح النظام صلاحية View تلقائياً.

**يتحقق من: المتطلبات 10.7**

### الخاصية 10: User Deletion Cascade

*لأي* مستخدم (غير Super Admin) يتم حذفه، يجب أن يحذف النظام جميع صلاحياته المرتبطة من قاعدة البيانات.

**يتحقق من: المتطلبات 11.2، 11.7**

### الخاصية 11: Permission Cache Invalidation

*لأي* مستخدم مسجل دخول، إذا تم تعديل صلاحياته (منح أو إلغاء)، يجب أن تطبق الصلاحيات الجديدة على الطلب التالي.

**يتحقق من: المتطلبات 12.3، 12.7**

### الخاصية 12: Error Message Security

*لأي* خطأ صلاحيات يواجهه المستخدم، يجب أن تعرض الواجهة رسالة مبسطة للمستخدم بينما تسجل معلومات تفصيلية للمسؤولين، ويجب ألا تكشف الرسالة معلومات حساسة عن النظام.

**يتحقق من: المتطلبات 13.4، 13.5**

## معالجة الأخطاء

### أنواع الأخطاء

1. **UnauthorizedException (401)**
   - يحدث عندما: المستخدم غير مصادق عليه
   - الرسالة: "يجب تسجيل الدخول للوصول إلى هذا المورد"
   - الإجراء: إعادة التوجيه إلى صفحة تسجيل الدخول

2. **ForbiddenException (403)**
   - يحدث عندما: المستخدم مصادق عليه لكن يفتقر إلى الصلاحية
   - الرسالة للمستخدم: "ليس لديك صلاحية للوصول إلى هذا المورد"
   - الرسالة للمسؤول (في السجلات): تفاصيل كاملة عن الصلاحية المطلوبة والمستخدم
   - الإجراء: عرض صفحة خطأ مع معلومات الاتصال لطلب الصلاحيات

3. **NotFoundException (404)**
   - يحدث عندما: الصلاحية أو المستخدم غير موجود
   - الرسالة: "المورد المطلوب غير موجود"

4. **BadRequestException (400)**
   - يحدث عندما: بيانات الطلب غير صالحة (مثل: رمز صلاحية غير صحيح)
   - الرسالة: وصف واضح للخطأ في البيانات

### استراتيجية معالجة الأخطاء

#### في Backend (NestJS)

```typescript
@Catch()
class PermissionExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    // Log detailed error for admins
    this.logger.error({
      userId: request.user?.id,
      path: request.url,
      method: request.method,
      error: exception.message,
      stack: exception.stack,
      timestamp: new Date().toISOString(),
    });
    
    // Return simplified error to user
    const status = exception.getStatus?.() || 500;
    response.status(status).json({
      statusCode: status,
      message: this.getUserFriendlyMessage(exception),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
  
  private getUserFriendlyMessage(exception: any): string {
    if (exception instanceof ForbiddenException) {
      return 'ليس لديك صلاحية للوصول إلى هذا المورد. للحصول على الصلاحيات، يرجى التواصل مع مسؤول النظام.';
    }
    if (exception instanceof UnauthorizedException) {
      return 'يجب تسجيل الدخول للوصول إلى هذا المورد.';
    }
    return 'حدث خطأ أثناء معالجة طلبك.';
  }
}
```

#### في Frontend (React)

```typescript
const PermissionErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handleError = (error: Error) => {
    if (error.message.includes('403')) {
      // Show permission denied page
      return <PermissionDeniedPage />;
    }
    if (error.message.includes('401')) {
      // Redirect to login
      window.location.href = '/login';
    }
    // Show generic error page
    return <ErrorPage />;
  };
  
  return (
    <ErrorBoundary FallbackComponent={handleError}>
      {children}
    </ErrorBoundary>
  );
};
```

### رسائل الخطأ بالعربية

جميع رسائل الخطأ المعروضة للمستخدمين يجب أن تكون بالعربية:

- "ليس لديك صلاحية لعرض هذه الشاشة"
- "ليس لديك صلاحية لتنفيذ هذا الإجراء"
- "يجب تسجيل الدخول أولاً"
- "للحصول على صلاحيات إضافية، يرجى التواصل مع مسؤول النظام"

## استراتيجية الاختبار

### نهج الاختبار المزدوج

يتطلب النظام نهجاً مزدوجاً للاختبار:

1. **اختبارات الوحدة (Unit Tests)**: للتحقق من أمثلة محددة وحالات حدية وشروط الخطأ
2. **اختبارات الخصائص (Property-Based Tests)**: للتحقق من الخصائص العامة عبر جميع المدخلات

كلا النوعين ضروري ومكمل لبعضهما البعض.

### اختبارات الوحدة (Unit Tests)

#### أمثلة اختبارات الوحدة

**Backend Tests:**

```typescript
describe('PermissionsService', () => {
  describe('getUserPermissions', () => {
    it('should return all permissions for a user', async () => {
      const userId = 'user-123';
      const permissions = await service.getUserPermissions(userId);
      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);
    });
    
    it('should return empty array for user with no permissions', async () => {
      const userId = 'user-no-perms';
      const permissions = await service.getUserPermissions(userId);
      expect(permissions).toEqual([]);
    });
  });
  
  describe('isSuperAdmin', () => {
    it('should return true for super admin user', async () => {
      const result = await service.isSuperAdmin('super-admin-id');
      expect(result).toBe(true);
    });
    
    it('should return false for regular user', async () => {
      const result = await service.isSuperAdmin('regular-user-id');
      expect(result).toBe(false);
    });
  });
  
  describe('grantPermission', () => {
    it('should grant permission to user', async () => {
      await service.grantPermission('user-123', 'customers.view', 'admin-id');
      const hasPermission = await service.userHasPermission('user-123', 'customers.view');
      expect(hasPermission).toBe(true);
    });
    
    it('should auto-grant view permission when granting action permission', async () => {
      await service.grantPermission('user-123', 'customers.create', 'admin-id');
      const hasView = await service.userHasPermission('user-123', 'customers.view');
      expect(hasView).toBe(true);
    });
    
    it('should throw error when granting to super admin', async () => {
      await expect(
        service.grantPermission('super-admin-id', 'customers.view', 'admin-id')
      ).rejects.toThrow();
    });
  });
});

describe('PermissionGuard', () => {
  it('should allow access for user with required permission', async () => {
    const context = createMockContext('user-with-permission');
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
  
  it('should deny access for user without required permission', async () => {
    const context = createMockContext('user-without-permission');
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
  
  it('should always allow access for super admin', async () => {
    const context = createMockContext('super-admin-id');
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
```

**Frontend Tests:**

```typescript
describe('usePermission hook', () => {
  it('should return permissions from context', () => {
    const { result } = renderHook(() => usePermission(), {
      wrapper: createPermissionProvider(['customers.view']),
    });
    
    expect(result.current.hasPermission('customers.view')).toBe(true);
    expect(result.current.hasPermission('customers.create')).toBe(false);
  });
  
  it('should return true for all permissions when super admin', () => {
    const { result } = renderHook(() => usePermission(), {
      wrapper: createPermissionProvider([], true), // isSuperAdmin = true
    });
    
    expect(result.current.hasPermission('any.permission')).toBe(true);
  });
});

describe('Protected component', () => {
  it('should render children when user has permission', () => {
    const { getByText } = render(
      <PermissionProvider permissions={['customers.view']}>
        <Protected permission="customers.view">
          <div>Protected Content</div>
        </Protected>
      </PermissionProvider>
    );
    
    expect(getByText('Protected Content')).toBeInTheDocument();
  });
  
  it('should render fallback when user lacks permission', () => {
    const { getByText, queryByText } = render(
      <PermissionProvider permissions={[]}>
        <Protected permission="customers.view" fallback={<div>No Access</div>}>
          <div>Protected Content</div>
        </Protected>
      </PermissionProvider>
    );
    
    expect(queryByText('Protected Content')).not.toBeInTheDocument();
    expect(getByText('No Access')).toBeInTheDocument();
  });
});
```

### اختبارات الخصائص (Property-Based Tests)

يجب استخدام مكتبة اختبار الخصائص المناسبة:
- **Backend (TypeScript/NestJS)**: استخدام `fast-check`
- **Frontend (React/TypeScript)**: استخدام `fast-check`

#### تكوين اختبارات الخصائص

كل اختبار خاصية يجب:
- تشغيل 100 تكرار على الأقل
- الإشارة إلى رقم الخاصية في التصميم
- استخدام تعليق بالصيغة: `Feature: user-permissions-system, Property {number}: {property_text}`

#### أمثلة اختبارات الخصائص

```typescript
import * as fc from 'fast-check';

describe('Property-Based Tests', () => {
  // Feature: user-permissions-system, Property 1: Super Admin Bypass
  it('Property 1: Super admin should have access to all permissions', () => {
    fc.assert(
      fc.property(
        fc.string(), // Random permission code
        async (permissionCode) => {
          const superAdminId = 'super-admin-id';
          const hasPermission = await service.userHasPermission(superAdminId, permissionCode);
          expect(hasPermission).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: user-permissions-system, Property 3: Permission-Based UI Visibility
  it('Property 3: Screen visibility should match view permission', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          screen: fc.constantFrom('customers', 'invoices', 'employees', 'reports'),
          hasViewPermission: fc.boolean(),
        }),
        async ({ userId, screen, hasViewPermission }) => {
          // Setup: Grant or revoke view permission
          if (hasViewPermission) {
            await service.grantPermission(userId, `${screen}.view`, 'admin');
          } else {
            await service.revokePermission(userId, `${screen}.view`, 'admin');
          }
          
          // Test: Check if screen is visible in UI
          const permissions = await service.getUserPermissions(userId);
          const isVisible = permissions.some(p => p.code === `${screen}.view`);
          
          expect(isVisible).toBe(hasViewPermission);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: user-permissions-system, Property 5: Backend Permission Enforcement
  it('Property 5: Backend should return 403 for unauthorized requests', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          permissionCode: fc.string(),
          hasPermission: fc.boolean(),
        }),
        async ({ userId, permissionCode, hasPermission }) => {
          // Setup permissions
          if (hasPermission) {
            await service.grantPermission(userId, permissionCode, 'admin');
          }
          
          // Make request
          const request = createMockRequest(userId, permissionCode);
          
          if (hasPermission) {
            // Should succeed
            const result = await guard.canActivate(request);
            expect(result).toBe(true);
          } else {
            // Should throw 403
            await expect(guard.canActivate(request)).rejects.toThrow(ForbiddenException);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: user-permissions-system, Property 8: Permission Persistence
  it('Property 8: Permission changes should persist to database', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          permissionCode: fc.string(),
          shouldGrant: fc.boolean(),
        }),
        async ({ userId, permissionCode, shouldGrant }) => {
          // Perform action
          if (shouldGrant) {
            await service.grantPermission(userId, permissionCode, 'admin');
          } else {
            await service.revokePermission(userId, permissionCode, 'admin');
          }
          
          // Query from database
          const permissions = await service.getUserPermissions(userId);
          const hasPermission = permissions.some(p => p.code === permissionCode);
          
          expect(hasPermission).toBe(shouldGrant);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: user-permissions-system, Property 9: View Permission Auto-Grant
  it('Property 9: Granting action permission should auto-grant view permission', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          screen: fc.constantFrom('customers', 'invoices', 'employees'),
          action: fc.constantFrom('create', 'edit', 'delete'),
        }),
        async ({ userId, screen, action }) => {
          const actionPermission = `${screen}.${action}`;
          const viewPermission = `${screen}.view`;
          
          // Grant action permission
          await service.grantPermission(userId, actionPermission, 'admin');
          
          // Check if view permission was auto-granted
          const hasView = await service.userHasPermission(userId, viewPermission);
          expect(hasView).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### اختبارات التكامل

اختبارات التكامل للتحقق من التفاعل بين المكونات:

```typescript
describe('Integration Tests', () => {
  it('should enforce permissions end-to-end', async () => {
    // Create user
    const user = await createUser({ email: 'test@example.com' });
    
    // Grant permission
    await service.grantPermission(user.id, 'customers.view', 'admin');
    
    // Login
    const token = await login(user.email, 'password');
    
    // Make authenticated request
    const response = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(response.body).toBeDefined();
  });
  
  it('should deny access without permission', async () => {
    const user = await createUser({ email: 'test2@example.com' });
    const token = await login(user.email, 'password');
    
    await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
```

### تغطية الاختبارات

الهدف:
- تغطية الكود: 80% على الأقل
- تغطية الخصائص: جميع الخصائص الـ 12 يجب أن يكون لها اختبار خاصية
- تغطية الحالات الحدية: جميع حالات الخطأ والحالات الخاصة

### استراتيجية التنفيذ

1. كتابة اختبارات الوحدة أولاً للوظائف الأساسية
2. كتابة اختبارات الخصائص للتحقق من الخصائص العامة
3. كتابة اختبارات التكامل للتحقق من التدفقات الكاملة
4. تشغيل جميع الاختبارات في CI/CD pipeline

