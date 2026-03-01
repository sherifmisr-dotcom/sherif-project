# Permission Management UI - Visual Preview

## Modal Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🛡️  إدارة صلاحيات المستخدم                                          ✕     │
│     أحمد محمد  [🛡️ مدير النظام]                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ⚠️  تنبيه: هذا المستخدم مدير نظام ولديه صلاحيات كاملة على جميع أجزاء    │
│     النظام. لا يمكن تعديل صلاحياته.                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  إجمالي الصلاحيات          │  صلاحيات هذه الشاشة                           │
│  45 / 106                   │  4 / 4                                        │
│                                                                              │
│  [عرض فقط]  [صلاحيات كاملة]                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔍 ابحث عن صلاحية...                                    [تحديد الكل]      │
├─────────────────────────────────────────────────────────────────────────────┤
│  [👥 العملاء 4/4] [📄 الفواتير 12/24] [🚢 الوكلاء 8/12] [💰 الحسابات 15/47]│
│  [👤 الموظفين 2/4] [📊 التقارير 3/10] [⚙️ المستخدمين 1/5]                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ 👁️ عرض العملاء   │  │ ➕ إضافة عميل    │  │ ✏️ تعديل عميل    │         │
│  │ customers.view   │  │ customers.create │  │ customers.edit   │         │
│  │ ✅               │  │ ✅               │  │ ⭕               │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                              │
│  ┌──────────────────┐                                                       │
│  │ 🔄 تفعيل/تعطيل   │                                                       │
│  │ customers.act... │                                                       │
│  │ ⭕               │                                                       │
│  └──────────────────┘                                                       │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  جاري الحفظ... ⏳                                              [إغلاق]     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Permission Card States

### Granted Permission (Green)
```
┌────────────────────────────────────┐
│ 👁️  عرض العملاء                    │
│    customers.view                  │
│    View customers screen and list  │
│                              ✅    │
└────────────────────────────────────┘
```

### Not Granted Permission (Gray)
```
┌────────────────────────────────────┐
│ ✏️  تعديل عميل                     │
│    customers.edit                  │
│    Edit existing customer          │
│                              ⭕    │
└────────────────────────────────────┘
```

### Pending Change (Blue Ring)
```
┌════════════════════════════════════┐ ← Blue ring
║ ➕  إضافة عميل                     ║
║    customers.create                ║
║    Add new customer                ║
║                              ✅    ║
└════════════════════════════════════┘
```

## Tab Design

### Active Tab (Blue)
```
┌─────────────────────┐
│ 👥 العملاء  [4/4]   │ ← Blue background
└─────────────────────┘
```

### Inactive Tab (Gray)
```
┌─────────────────────┐
│ 📄 الفواتير [12/24] │ ← Gray background
└─────────────────────┘
```

## Screen Categories with Colors

1. **العملاء (Customers)** - 👥 Blue
   - عرض العملاء
   - إضافة عميل
   - تعديل عميل
   - تفعيل/تعطيل عميل

2. **الفواتير (Invoices)** - 📄 Green
   - Type 1: Export Invoices (6 permissions)
   - Type 2: Import Invoices (6 permissions)
   - Type 3: Transit Invoices (6 permissions)
   - Type 4: Customs Invoices (6 permissions)

3. **الوكلاء الملاحيين (Shipping Agents)** - 🚢 Cyan
   - Agents Management (4 permissions)
   - Trips Registration (4 permissions)
   - Additional Fees (4 permissions)

4. **إدارة الحسابات (Accounts)** - 💰 Purple
   - Treasury (2 permissions)
   - Bank Accounts (5 permissions)
   - Receipt Vouchers (6 permissions)
   - Payment Vouchers (6 permissions)
   - Customs Fees (4 permissions)
   - Internal Transfers (5 permissions)
   - Voucher Search (1 permission)
   - Payroll (6 permissions)

5. **الموظفين (Employees)** - 👤 Orange
   - عرض الموظفين
   - إضافة موظف
   - تعديل موظف
   - حذف موظف

6. **التقارير (Reports)** - 📊 Pink
   - Financial Reports (6 permissions)
   - Customer Reports (1 permission)
   - Customs Reports (1 permission)
   - Shipping Agents Reports (1 permission)

7. **إدارة المستخدمين (Users)** - ⚙️ Red
   - عرض المستخدمين
   - إضافة مستخدم
   - تعديل مستخدم
   - حذف مستخدم
   - إدارة الصلاحيات

## Action Icons

- 👁️ **View** - Eye icon
- ➕ **Create** - Plus icon
- ✏️ **Edit** - Edit icon
- 🗑️ **Delete** - Trash icon
- 🖨️ **Print** - Printer icon
- 👁️ **Preview** - Eye icon
- 🔄 **Activate/Deactivate** - Power icon
- 🔒 **Manage Permissions** - Lock icon
- 🔓 **Carry Forward** - Unlock icon
- ✅ **Approve** - CheckCircle icon

## Stats Bar

```
┌─────────────────────────────────────────────────────────────────┐
│  إجمالي الصلاحيات          │  صلاحيات هذه الشاشة              │
│  45 / 106                   │  4 / 4                           │
│                                                                  │
│  [عرض فقط]  [صلاحيات كاملة]                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Search Bar

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 ابحث عن صلاحية...                        [تحديد الكل]      │
└─────────────────────────────────────────────────────────────────┘
```

## Super Admin Warning

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  تنبيه: هذا المستخدم مدير نظام ولديه صلاحيات كاملة على    │
│     جميع أجزاء النظام. لا يمكن تعديل صلاحياته.                │
└─────────────────────────────────────────────────────────────────┘
```

## Toast Notifications

### Success
```
┌─────────────────────────────────┐
│ ✅ تم منح الصلاحية بنجاح        │
└─────────────────────────────────┘
```

### Error
```
┌─────────────────────────────────────────────────┐
│ ❌ لا يمكن تعديل صلاحيات مدير النظام           │
└─────────────────────────────────────────────────┘
```

## Confirmation Dialog

```
┌─────────────────────────────────────────────────┐
│  هل تريد منح جميع صلاحيات العملاء؟             │
│                                                  │
│  [نعم]  [لا]                                    │
└─────────────────────────────────────────────────┘
```

## Responsive Design

### Desktop (3 columns)
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Perm 1   │  │ Perm 2   │  │ Perm 3   │
└──────────┘  └──────────┘  └──────────┘
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Perm 4   │  │ Perm 5   │  │ Perm 6   │
└──────────┘  └──────────┘  └──────────┘
```

### Tablet (2 columns)
```
┌──────────┐  ┌──────────┐
│ Perm 1   │  │ Perm 2   │
└──────────┘  └──────────┘
┌──────────┐  ┌──────────┐
│ Perm 3   │  │ Perm 4   │
└──────────┘  └──────────┘
```

### Mobile (1 column)
```
┌──────────┐
│ Perm 1   │
└──────────┘
┌──────────┐
│ Perm 2   │
└──────────┘
┌──────────┐
│ Perm 3   │
└──────────┘
```

## Dark Mode

### Dark Mode Colors
- Background: `bg-gray-800`
- Text: `text-white`
- Borders: `border-gray-700`
- Cards: `bg-gray-700`
- Hover: `hover:bg-gray-600`

### Dark Mode Example
```
┌─────────────────────────────────────┐ ← Dark gray background
│ 👁️  عرض العملاء                     │ ← White text
│    customers.view                   │ ← Gray text
│    View customers screen and list   │ ← Gray text
│                              ✅     │ ← Green checkmark
└─────────────────────────────────────┘ ← Dark gray border
```

## User Management Page Integration

```
┌─────────────────────────────────────────────────────────────────┐
│  👥 إدارة المستخدمين                          [➕ إضافة مستخدم] │
├─────────────────────────────────────────────────────────────────┤
│  اسم المستخدم │ الاسم الكامل │ الصلاحية │ الحالة │ الإجراءات  │
├─────────────────────────────────────────────────────────────────┤
│  admin        │ أحمد محمد    │ مدير     │ نشط   │ ⚙️ ✏️ 🔑 🔄 🗑️│
│  user1        │ محمد علي     │ مستخدم   │ نشط   │ ⚙️ ✏️ 🔑 🔄 🗑️│
│  user2        │ سارة أحمد    │ مستخدم   │ معطل  │ ⚙️ ✏️ 🔑 🔄 🗑️│
└─────────────────────────────────────────────────────────────────┘
                                                    ↑
                                    Manage Permissions Button (⚙️)
```

## Interaction Flow

1. **User clicks ⚙️ button** → Modal opens
2. **Modal loads data** → Shows loading spinner
3. **Data loaded** → Displays permissions grouped by screen
4. **User clicks permission card** → Toggles permission immediately
5. **API call completes** → Shows success toast
6. **User clicks "تحديد الكل"** → Shows confirmation dialog
7. **User confirms** → Grants/revokes all permissions for screen
8. **User clicks "عرض فقط"** → Shows confirmation dialog
9. **User confirms** → Applies view-only preset
10. **User clicks "إغلاق"** → Modal closes

## Key Features Visualization

### Auto-Grant View Permission
```
User clicks: [➕ إضافة عميل]
             ↓
System grants: [➕ إضافة عميل] + [👁️ عرض العملاء]
             ↓
Both cards turn green ✅
```

### Search Functionality
```
User types: "عرض"
             ↓
Shows only: [👁️ عرض العملاء]
            [👁️ عرض الفواتير]
            [👁️ عرض الموظفين]
            ... (all view permissions)
```

### Select All
```
User clicks: [تحديد الكل] on العملاء tab
             ↓
Confirmation: "هل تريد منح جميع صلاحيات العملاء؟"
             ↓
User confirms: [نعم]
             ↓
All 4 permissions turn green ✅
Badge updates: [👥 العملاء 4/4]
```

This visual preview demonstrates the modern, beautiful, and user-friendly interface that has been implemented for permission management.
