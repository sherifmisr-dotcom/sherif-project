# Manual Testing Guide for Permissions System

## Prerequisites
1. Backend server is running (`npm run start:dev`)
2. Database is seeded with permissions (`npm run seed`)
3. You have a REST client (Postman, Insomnia, or curl)
4. You have at least one user account (preferably one super admin and one regular user)

## Test Scenarios

### 1. Test: Get All Permission Definitions
**Endpoint:** `GET /permissions/definitions`
**Headers:** `Authorization: Bearer <your-jwt-token>`
**Expected Result:** Returns array of all 106 permissions

```bash
curl -X GET http://localhost:3000/permissions/definitions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Success Criteria:**
- Status: 200 OK
- Response contains array with 106 permission objects
- Each permission has: code, screen, action, nameAr, nameEn, category, isViewPermission

---

### 2. Test: Get Current User Permissions
**Endpoint:** `GET /permissions/me/permissions`
**Headers:** `Authorization: Bearer <your-jwt-token>`
**Expected Result:** Returns current user's permissions and super admin status

```bash
curl -X GET http://localhost:3000/permissions/me/permissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Success Criteria:**
- Status: 200 OK
- Response contains: `{ permissions: [...], isSuperAdmin: boolean }`
- If super admin: permissions array contains all 106 permissions
- If regular user: permissions array contains only granted permissions

---

### 3. Test: Super Admin Bypass
**Setup:** Login as super admin user
**Endpoint:** Any protected endpoint (e.g., `GET /customers`)
**Expected Result:** Access granted without explicit permission check

**Success Criteria:**
- Super admin can access all endpoints regardless of granted permissions
- No 403 Forbidden errors for super admin

---

### 4. Test: Grant Permission to User
**Endpoint:** `POST /permissions/grant`
**Headers:** 
- `Authorization: Bearer <admin-token>`
- `Content-Type: application/json`
**Body:**
```json
{
  "userId": "user-id-here",
  "permissionCode": "customers.create"
}
```

**Expected Result:** Permission granted successfully

```bash
curl -X POST http://localhost:3000/permissions/grant \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","permissionCode":"customers.create"}'
```

**Success Criteria:**
- Status: 200 OK
- Response: `{ message: "تم منح الصلاحية بنجاح", success: true }`
- View permission auto-granted if not already present

---

### 5. Test: Auto-Grant View Permission
**Endpoint:** `POST /permissions/grant`
**Setup:** Grant an action permission (e.g., `customers.create`) to a user who doesn't have `customers.view`
**Expected Result:** Both `customers.create` AND `customers.view` are granted

**Success Criteria:**
- After granting `customers.create`, check user permissions
- User should have both `customers.view` and `customers.create`

---

### 6. Test: Revoke Permission from User
**Endpoint:** `POST /permissions/revoke`
**Headers:** 
- `Authorization: Bearer <admin-token>`
- `Content-Type: application/json`
**Body:**
```json
{
  "userId": "user-id-here",
  "permissionCode": "customers.create"
}
```

**Expected Result:** Permission revoked successfully

```bash
curl -X POST http://localhost:3000/permissions/revoke \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","permissionCode":"customers.create"}'
```

**Success Criteria:**
- Status: 200 OK
- Response: `{ message: "تم إلغاء الصلاحية بنجاح", success: true }`

---

### 7. Test: Cannot Modify Super Admin Permissions
**Endpoint:** `POST /permissions/grant` or `POST /permissions/revoke`
**Setup:** Try to grant/revoke permission to/from a super admin user
**Expected Result:** 403 Forbidden error

**Success Criteria:**
- Status: 403 Forbidden
- Error message: "لا يمكن تعديل صلاحيات المسؤول الرئيسي"

---

### 8. Test: Permission Guard - Access Denied
**Setup:** Login as regular user without required permission
**Endpoint:** Any protected endpoint (e.g., `POST /permissions/grant` requires `users.manage_permissions`)
**Expected Result:** 403 Forbidden error

**Success Criteria:**
- Status: 403 Forbidden
- Error message: "ليس لديك صلاحية للوصول إلى هذا المورد"
- Access attempt is logged to console

---

### 9. Test: Permission Guard - Access Granted
**Setup:** Login as regular user WITH required permission
**Endpoint:** Protected endpoint matching user's permission
**Expected Result:** Access granted

**Success Criteria:**
- Status: 200 OK (or appropriate success status)
- Endpoint executes successfully

---

### 10. Test: Get User Permissions (Admin View)
**Endpoint:** `GET /permissions/user/:userId`
**Headers:** `Authorization: Bearer <admin-token>` (must have `users.manage_permissions`)
**Expected Result:** Returns specified user's permissions

```bash
curl -X GET http://localhost:3000/permissions/user/USER_ID \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Success Criteria:**
- Status: 200 OK
- Response: `{ permissions: [...] }`
- Only accessible by users with `users.manage_permissions` permission

---

## Verification Checklist

After running all tests, verify:

- [ ] All 106 permissions are seeded in database
- [ ] Super admin can access all endpoints
- [ ] Regular users are blocked from unauthorized endpoints (403)
- [ ] Granting permission works correctly
- [ ] Auto-grant view permission works
- [ ] Revoking permission works correctly
- [ ] Cannot modify super admin permissions
- [ ] Permission guard logs access denials
- [ ] JWT token includes isSuperAdmin flag
- [ ] Login response includes user permissions

## Database Verification

Check database directly:

```sql
-- Count total permissions
SELECT COUNT(*) FROM permissions;
-- Should return 106

-- Check user permissions
SELECT u.username, p.code, p.name_ar
FROM users u
JOIN user_permissions up ON u.id = up.user_id
JOIN permissions p ON up.permission_id = p.id
WHERE u.username = 'your-username';

-- Check super admin status
SELECT username, is_super_admin FROM users;

-- Check audit log
SELECT * FROM permission_audit_logs ORDER BY performed_at DESC LIMIT 10;
```

## Notes

- All error messages should be in Arabic
- Super admin bypass should work for ALL endpoints
- Permission checks happen on BOTH frontend (UI) and backend (API)
- Backend is the source of truth for security
