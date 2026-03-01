# وثيقة المتطلبات - نظام صلاحيات المستخدمين

## المقدمة

نظام صلاحيات المستخدمين هو نظام شامل لإدارة الصلاحيات على مستوى المستخدم الفردي (بدون نظام أدوار). يتيح النظام التحكم الدقيق في الوصول إلى 7 شاشات رئيسية مع صلاحيات مفصلة لكل شاشة. يدعم النظام Super Admin بصلاحيات كاملة غير قابلة للتعديل، ويوفر واجهة سهلة لإدارة صلاحيات المستخدمين.

## المصطلحات

- **System**: نظام صلاحيات المستخدمين الكامل
- **User**: مستخدم عادي في النظام له صلاحيات محددة
- **Super_Admin**: مستخدم خاص له صلاحيات كاملة على جميع أجزاء النظام
- **Permission**: صلاحية محددة للوصول إلى ميزة أو إجراء معين
- **Screen**: شاشة رئيسية في التطبيق
- **View_Permission**: صلاحية عرض الشاشة (شرط أساسي للوصول)
- **Action_Permission**: صلاحية تنفيذ إجراء معين (Create, Edit, Delete, Print, إلخ)
- **Database**: قاعدة بيانات PostgreSQL
- **UI**: واجهة المستخدم المبنية بـ React + TypeScript
- **Backend**: الخادم المبني بـ NestJS
- **ORM**: Prisma لإدارة قاعدة البيانات

## المتطلبات

### المتطلب 1: إدارة Super Admin

**قصة المستخدم:** بصفتي مسؤول النظام، أريد أن يكون هناك Super Admin بصلاحيات كاملة دائمة، حتى يكون هناك دائماً مستخدم قادر على إدارة النظام بالكامل.

#### معايير القبول

1. THE System SHALL designate at least one user as Super_Admin
2. WHEN Super_Admin accesses any screen or feature, THE System SHALL grant full access without permission checks
3. THE System SHALL prevent modification or deletion of Super_Admin permissions
4. THE System SHALL prevent deletion of Super_Admin user accounts
5. WHEN displaying permission management interface for Super_Admin, THE System SHALL show all permissions as granted and disabled from editing

### المتطلب 2: إدارة صلاحيات شاشة العملاء

**قصة المستخدم:** بصفتي مدير النظام، أريد التحكم في صلاحيات المستخدمين على شاشة العملاء، حتى أتمكن من تحديد من يمكنه عرض وإدارة بيانات العملاء.

#### معايير القبول

1. WHEN a User has View_Permission for Customers screen, THE System SHALL display the Customers screen in navigation
2. WHEN a User lacks View_Permission for Customers screen, THE System SHALL hide the Customers screen from navigation
3. WHEN a User with Create permission clicks add customer button, THE System SHALL allow customer creation
4. WHEN a User lacks Create permission, THE System SHALL hide the add customer button
5. WHEN a User with Edit permission clicks edit customer button, THE System SHALL allow customer modification
6. WHEN a User lacks Edit permission, THE System SHALL hide the edit customer button
7. WHEN a User with Activate_Deactivate permission clicks activate or deactivate button, THE System SHALL allow customer status change
8. WHEN a User lacks Activate_Deactivate permission, THE System SHALL hide the activate and deactivate buttons

### المتطلب 3: إدارة صلاحيات شاشة الفواتير

**قصة المستخدم:** بصفتي مدير النظام، أريد التحكم في صلاحيات المستخدمين على أنواع الفواتير الأربعة بشكل منفصل، حتى أتمكن من تخصيص الوصول لكل نوع فاتورة بشكل مستقل.

#### معايير القبول

1. THE System SHALL support four separate invoice types with independent permission sets
2. WHEN a User has View_Permission for a specific invoice type, THE System SHALL display that invoice type in navigation
3. WHEN a User lacks View_Permission for a specific invoice type, THE System SHALL hide that invoice type from navigation
4. WHEN a User with Create permission for an invoice type clicks new invoice button, THE System SHALL allow invoice creation for that type
5. WHEN a User lacks Create permission for an invoice type, THE System SHALL hide the new invoice button for that type
6. WHEN a User with Preview permission clicks preview invoice button, THE System SHALL display invoice preview with print button
7. WHEN a User lacks Preview permission, THE System SHALL hide the preview invoice button
8. WHEN a User with Print permission clicks print button in preview, THE System SHALL allow invoice printing
9. WHEN a User lacks Print permission, THE System SHALL hide or disable the print button in preview
10. WHEN a User with Edit permission clicks edit invoice button, THE System SHALL allow invoice modification
11. WHEN a User lacks Edit permission, THE System SHALL hide the edit invoice button
12. WHEN a User with Delete permission clicks delete invoice button, THE System SHALL allow invoice deletion
13. WHEN a User lacks Delete permission, THE System SHALL hide the delete invoice button

### المتطلب 4: إدارة صلاحيات شاشة الوكلاء الملاحيين

**قصة المستخدم:** بصفتي مدير النظام، أريد التحكم في صلاحيات المستخدمين على الشاشات الفرعية الثلاث للوكلاء الملاحيين، حتى أتمكن من تحديد من يمكنه إدارة الوكلاء والرحلات والرسوم.

#### معايير القبول

1. THE System SHALL support three separate sub-screens for Shipping Agents with independent permission sets
2. WHEN a User has View_Permission for Agents Management sub-screen, THE System SHALL display the Agents Management tab
3. WHEN a User lacks View_Permission for Agents Management sub-screen, THE System SHALL hide the Agents Management tab
4. WHEN a User with Create permission in Agents Management clicks add agent button, THE System SHALL allow agent creation
5. WHEN a User with Edit permission in Agents Management clicks edit agent button, THE System SHALL allow agent modification
6. WHEN a User with Delete permission in Agents Management clicks delete agent button, THE System SHALL allow agent deletion
7. WHEN a User has View_Permission for Trips Registration sub-screen, THE System SHALL display the Trips Registration tab
8. WHEN a User lacks View_Permission for Trips Registration sub-screen, THE System SHALL hide the Trips Registration tab
9. WHEN a User with Create permission in Trips Registration clicks register trip button, THE System SHALL allow trip registration
10. WHEN a User with Edit permission in Trips Registration clicks edit trip button, THE System SHALL allow trip modification
11. WHEN a User with Delete permission in Trips Registration clicks delete trip button, THE System SHALL allow trip deletion
12. WHEN a User has View_Permission for Additional Fees sub-screen, THE System SHALL display the Additional Fees tab
13. WHEN a User lacks View_Permission for Additional Fees sub-screen, THE System SHALL hide the Additional Fees tab
14. WHEN a User with Create permission in Additional Fees clicks add fee button, THE System SHALL allow fee creation
15. WHEN a User with Edit permission in Additional Fees clicks edit fee button, THE System SHALL allow fee modification
16. WHEN a User with Delete permission in Additional Fees clicks delete fee button, THE System SHALL allow fee deletion

### المتطلب 5: إدارة صلاحيات شاشة إدارة الحسابات

**قصة المستخدم:** بصفتي مدير النظام، أريد التحكم في صلاحيات المستخدمين على التبويبات السبعة لإدارة الحسابات، حتى أتمكن من تحديد من يمكنه الوصول إلى البيانات المالية الحساسة.

#### معايير القبول

1. THE System SHALL support seven separate tabs for Accounts Management with independent permission sets
2. WHEN a User has View_Permission for Treasury tab, THE System SHALL display the Treasury tab
3. WHEN a User with Carry_Forward_Balance permission in Treasury clicks carry forward button, THE System SHALL allow balance carry forward
4. WHEN a User has View_Permission for Bank Accounts tab, THE System SHALL display the Bank Accounts tab
5. WHEN a User with Carry_Forward_All_Balances permission in Bank Accounts clicks carry forward all button, THE System SHALL allow all balances carry forward
6. WHEN a User with Create permission in Bank Accounts clicks add account button, THE System SHALL allow bank account creation
7. WHEN a User with Edit permission in Bank Accounts clicks edit account button, THE System SHALL allow bank account modification
8. WHEN a User with Delete permission in Bank Accounts clicks delete account button, THE System SHALL allow bank account deletion
9. THE System SHALL support two separate voucher types (Receipt and Payment) with independent permission sets
10. WHEN a User has View_Permission for Receipt Vouchers, THE System SHALL display receipt vouchers list
11. WHEN a User with Create permission for Receipt Vouchers clicks new voucher button, THE System SHALL allow receipt voucher creation
12. WHEN a User with Preview permission for Receipt Vouchers clicks preview button, THE System SHALL display voucher preview with print button
13. WHEN a User with Print permission for Receipt Vouchers clicks print button, THE System SHALL allow voucher printing
14. WHEN a User with Edit permission for Receipt Vouchers clicks edit button, THE System SHALL allow voucher modification
15. WHEN a User with Delete permission for Receipt Vouchers clicks delete button, THE System SHALL allow voucher deletion
16. WHEN a User has View_Permission for Payment Vouchers, THE System SHALL display payment vouchers list
17. WHEN a User with Create permission for Payment Vouchers clicks new voucher button, THE System SHALL allow payment voucher creation
18. WHEN a User with Preview permission for Payment Vouchers clicks preview button, THE System SHALL display voucher preview with print button
19. WHEN a User with Print permission for Payment Vouchers clicks print button, THE System SHALL allow voucher printing
20. WHEN a User with Edit permission for Payment Vouchers clicks edit button, THE System SHALL allow voucher modification
21. WHEN a User with Delete permission for Payment Vouchers clicks delete button, THE System SHALL allow voucher deletion
22. WHEN a User has View_Permission for Customs Fees tab, THE System SHALL display the Customs Fees tab
23. WHEN a User with Create_Batch permission in Customs Fees clicks new batch button, THE System SHALL allow batch creation
24. WHEN a User with View_Details permission in Customs Fees clicks view details button, THE System SHALL display batch details
25. WHEN a User with Delete permission in Customs Fees clicks delete batch button, THE System SHALL allow batch deletion
26. WHEN a User has View_Permission for Internal Transfers tab, THE System SHALL display the Internal Transfers tab
27. WHEN a User with Create permission in Internal Transfers clicks new transfer button, THE System SHALL allow transfer creation
28. WHEN a User with Preview permission in Internal Transfers clicks preview button, THE System SHALL display transfer preview
29. WHEN a User with Edit permission in Internal Transfers clicks edit button, THE System SHALL allow transfer modification
30. WHEN a User with Delete permission in Internal Transfers clicks delete button, THE System SHALL allow transfer deletion
31. WHEN a User has Access permission for Voucher Search tab, THE System SHALL display the Voucher Search tab
32. WHEN a User lacks Access permission for Voucher Search tab, THE System SHALL hide the Voucher Search tab
33. WHEN a User has View_Permission for Payroll tab, THE System SHALL display the Payroll tab
34. WHEN a User with Create permission in Payroll clicks new payroll button, THE System SHALL allow payroll creation
35. WHEN a User with Preview permission in Payroll clicks preview button, THE System SHALL display payroll preview
36. WHEN a User with Edit permission in Payroll clicks edit button, THE System SHALL allow payroll modification
37. WHEN a User with Approve permission in Payroll clicks approve button, THE System SHALL allow payroll approval
38. WHEN a User with Delete permission in Payroll clicks delete button, THE System SHALL allow payroll deletion

### المتطلب 6: إدارة صلاحيات شاشة إدارة الموظفين

**قصة المستخدم:** بصفتي مدير النظام، أريد التحكم في صلاحيات المستخدمين على شاشة إدارة الموظفين، حتى أتمكن من تحديد من يمكنه عرض وإدارة بيانات الموظفين.

#### معايير القبول

1. WHEN a User has View_Permission for Employees screen, THE System SHALL display the Employees screen in navigation
2. WHEN a User lacks View_Permission for Employees screen, THE System SHALL hide the Employees screen from navigation
3. WHEN a User with Create permission clicks add employee button, THE System SHALL allow employee creation
4. WHEN a User lacks Create permission, THE System SHALL hide the add employee button
5. WHEN a User with Edit permission clicks edit employee button, THE System SHALL allow employee modification
6. WHEN a User lacks Edit permission, THE System SHALL hide the edit employee button
7. WHEN a User with Delete permission clicks delete employee button, THE System SHALL allow employee deletion
8. WHEN a User lacks Delete permission, THE System SHALL hide the delete employee button

### المتطلب 7: إدارة صلاحيات شاشة التقارير

**قصة المستخدم:** بصفتي مدير النظام، أريد التحكم في صلاحيات المستخدمين على التقارير المختلفة، حتى أتمكن من تحديد من يمكنه الوصول إلى التقارير المالية والتشغيلية الحساسة.

#### معايير القبول

1. THE System SHALL support six separate financial reports with independent access permissions
2. WHEN a User has Access permission for Treasury and Cash Report, THE System SHALL display the report in reports menu
3. WHEN a User lacks Access permission for Treasury and Cash Report, THE System SHALL hide the report from reports menu
4. WHEN a User has Access permission for Bank Accounts Report, THE System SHALL display the report in reports menu
5. WHEN a User has Access permission for Income and Expenses Report, THE System SHALL display the report in reports menu
6. WHEN a User has Access permission for Income Statement Report, THE System SHALL display the report in reports menu
7. WHEN a User has Access permission for General Journal Report, THE System SHALL display the report in reports menu
8. WHEN a User has Access permission for Trial Balance Report, THE System SHALL display the report in reports menu
9. WHEN a User has Access permission for Customer Reports section, THE System SHALL display the Customer Reports section in reports menu
10. WHEN a User lacks Access permission for Customer Reports section, THE System SHALL hide the Customer Reports section from reports menu
11. WHEN a User has Access permission for Customs Reports section, THE System SHALL display the Customs Reports section in reports menu
12. WHEN a User lacks Access permission for Customs Reports section, THE System SHALL hide the Customs Reports section from reports menu
13. WHEN a User has Access permission for Shipping Agents Reports section, THE System SHALL display the Shipping Agents Reports section in reports menu
14. WHEN a User lacks Access permission for Shipping Agents Reports section, THE System SHALL hide the Shipping Agents Reports section from reports menu

### المتطلب 8: إدارة صلاحيات شاشة إدارة المستخدمين والصلاحيات

**قصة المستخدم:** بصفتي مدير النظام، أريد التحكم في من يمكنه إدارة المستخدمين وصلاحياتهم، حتى أحافظ على أمان النظام وأمنع التعديلات غير المصرح بها.

#### معايير القبول

1. WHEN a User has View_Users permission, THE System SHALL display the Users Management screen in navigation
2. WHEN a User lacks View_Users permission, THE System SHALL hide the Users Management screen from navigation
3. WHEN a User with Create_User permission clicks add user button, THE System SHALL allow user creation
4. WHEN a User lacks Create_User permission, THE System SHALL hide the add user button
5. WHEN a User with Edit_User permission clicks edit user button, THE System SHALL allow user modification
6. WHEN a User lacks Edit_User permission, THE System SHALL hide the edit user button
7. WHEN a User with Delete_User permission clicks delete user button, THE System SHALL allow user deletion
8. WHEN a User lacks Delete_User permission, THE System SHALL hide the delete user button
9. WHEN a User with Manage_User_Permissions permission clicks manage permissions button, THE System SHALL display permissions management interface
10. WHEN a User lacks Manage_User_Permissions permission, THE System SHALL hide the manage permissions button

### المتطلب 9: التحقق من الصلاحيات والأمان

**قصة المستخدم:** بصفتي مدير النظام، أريد أن يتحقق النظام من الصلاحيات على مستوى الخادم والواجهة، حتى أضمن عدم إمكانية تجاوز قيود الصلاحيات.

#### معايير القبول

1. WHEN a User attempts to access a screen without View_Permission, THE System SHALL return HTTP 403 Forbidden error
2. WHEN a User attempts to perform an action without required Action_Permission, THE System SHALL return HTTP 403 Forbidden error
3. THE Backend SHALL validate all permissions before executing any operation
4. THE UI SHALL hide or disable UI elements based on User permissions
5. WHEN a User attempts direct URL access to unauthorized screen, THE System SHALL redirect to error page with appropriate message
6. THE System SHALL log all permission denial attempts with user ID, attempted action, and timestamp
7. WHEN Super_Admin performs any action, THE System SHALL skip permission validation and allow the action

### المتطلب 10: واجهة إدارة الصلاحيات

**قصة المستخدم:** بصفتي مدير النظام، أريد واجهة سهلة ومنظمة لإدارة صلاحيات المستخدمين، حتى أتمكن من تعيين الصلاحيات بسرعة ودقة.

#### معايير القبول

1. THE System SHALL display permissions grouped by screen in the permissions management interface
2. THE System SHALL display permissions in a hierarchical structure with screens as parent nodes and actions as child nodes
3. WHEN an administrator selects a User for permission management, THE System SHALL display all available permissions with current status
4. THE System SHALL provide checkboxes or toggles for each permission
5. WHEN an administrator changes a permission, THE System SHALL save the change to Database immediately
6. THE System SHALL provide visual indication of permission dependencies (e.g., View required for other actions)
7. WHEN an administrator attempts to grant an action permission without View_Permission, THE System SHALL automatically grant View_Permission
8. THE System SHALL provide a search or filter capability to quickly find specific permissions
9. THE System SHALL display permission changes history for audit purposes

### المتطلب 11: تخزين الصلاحيات في قاعدة البيانات

**قصة المستخدم:** بصفتي مطور النظام، أريد تخزين الصلاحيات بشكل منظم في قاعدة البيانات، حتى يكون النظام قابلاً للتوسع والصيانة.

#### معايير القبول

1. THE Database SHALL store user permissions in a dedicated permissions table
2. THE Database SHALL maintain referential integrity between users and permissions
3. THE System SHALL use Prisma ORM for all database operations related to permissions
4. THE Database SHALL support efficient querying of user permissions
5. THE Database SHALL store permission definitions (screen, action, description) in a separate table
6. THE System SHALL support adding new permissions without schema changes through permission definitions table
7. WHEN a User is deleted, THE System SHALL cascade delete all associated permissions
8. THE Database SHALL index permission queries for optimal performance

### المتطلب 12: التكامل مع المصادقة والجلسات

**قصة المستخدم:** بصفتي مستخدم، أريد أن يتم التحقق من صلاحياتي تلقائياً عند تسجيل الدخول، حتى أرى فقط ما أملك صلاحية الوصول إليه.

#### معايير القبول

1. WHEN a User logs in successfully, THE System SHALL load all User permissions from Database
2. THE System SHALL cache User permissions in session for performance
3. WHEN User permissions are modified, THE System SHALL invalidate the cached permissions
4. THE Backend SHALL include User permissions in authentication token or session data
5. THE UI SHALL receive User permissions after successful authentication
6. THE System SHALL refresh User permissions when session is renewed
7. WHEN a User's permissions are revoked while logged in, THE System SHALL enforce new permissions on next request

### المتطلب 13: معالجة الأخطاء والرسائل

**قصة المستخدم:** بصفتي مستخدم، أريد رسائل واضحة عندما لا أملك صلاحية للوصول، حتى أفهم سبب عدم قدرتي على تنفيذ إجراء معين.

#### معايير القبول

1. WHEN a User attempts unauthorized access, THE System SHALL display a user-friendly error message in Arabic
2. THE System SHALL display different messages for missing View_Permission versus missing Action_Permission
3. THE System SHALL provide contact information or instructions for requesting additional permissions
4. THE System SHALL log detailed error information for administrators while showing simplified messages to users
5. WHEN a User encounters a permission error, THE System SHALL not expose sensitive system information

### المتطلب 14: الأداء وقابلية التوسع

**قصة المستخدم:** بصفتي مطور النظام، أريد أن يكون نظام الصلاحيات فعالاً وقابلاً للتوسع، حتى يدعم عدداً كبيراً من المستخدمين والصلاحيات.

#### معايير القبول

1. THE System SHALL load User permissions once per session and cache them
2. THE System SHALL perform permission checks in memory without database queries for each request
3. THE Backend SHALL use database indexes for permission queries
4. THE System SHALL support at least 1000 concurrent users without performance degradation
5. THE System SHALL respond to permission checks in less than 10 milliseconds
6. THE Database SHALL optimize permission storage to minimize storage overhead

### المتطلب 15: التوافق مع المتطلبات التقنية

**قصة المستخدم:** بصفتي مطور النظام، أريد أن يتكامل نظام الصلاحيات مع المجموعة التقنية المحددة، حتى يعمل بسلاسة مع باقي التطبيق.

#### معايير القبول

1. THE UI SHALL be built using React and TypeScript
2. THE Backend SHALL be built using NestJS framework
3. THE System SHALL use Prisma as the ORM layer
4. THE Database SHALL be PostgreSQL
5. THE System SHALL follow NestJS Guards pattern for permission checks
6. THE UI SHALL use React Context or state management library for permissions state
7. THE System SHALL provide TypeScript type definitions for all permission-related entities
8. THE System SHALL follow REST API conventions for permission management endpoints
