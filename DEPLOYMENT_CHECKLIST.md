# Organization-Based Data Isolation - Deployment Checklist

## 🚨 URGENT: Fix 401 Login Error

The 401 error is happening because the VPS is running old code that doesn't handle the missing `organization_id` column properly. Follow these steps to fix it:

## Step 1: SSH into VPS
```bash
ssh root@72.61.226.59
cd /var/www/analytics-dashboard
```

## Step 2: Backup Current Code (Optional but Recommended)
```bash
cp -r src/backend/models src/backend/models.backup
cp -r src/backend/middleware src/backend/middleware.backup
cp -r src/backend/routes src/backend/routes.backup
```

## Step 3: Update Critical Authentication Files

### 3.1 Update User Model (CRITICAL - Fixes 401 error)
```bash
nano src/backend/models/User.js
```
**Replace the `authenticateUser` method with the version that uses `COALESCE(organization_id, 1)` to handle missing columns.**

### 3.2 Update Auth Middleware
```bash
nano src/backend/middleware/auth.js
```
**Add the `enforceOrganizationAccess` middleware and organization context.**

## Step 4: Test Authentication Fix
```bash
# Restart the server first
cd src/backend
pm2 restart analytics-dashboard

# Test login endpoint
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@ccl.com","password":"Aerovania_grhns@2002","role":"admin"}'
```

**If this returns a token instead of 401, the fix worked!**

## Step 5: Update All Route Files

### 5.1 Upload Routes (JSON Violation Data)
```bash
nano src/backend/routes/upload.js
```
**Add authentication and organization context to upload endpoints.**

### 5.2 Violations Routes
```bash
nano src/backend/routes/violations.js
```
**Add organization filtering to violation data endpoints.**

### 5.3 Inferred Reports Routes
```bash
nano src/backend/routes/inferredReports.js
```
**Add organization filtering to PDF report endpoints.**

### 5.4 Uploaded ATR Routes
```bash
nano src/backend/routes/uploadedATR.js
```
**Add organization filtering to ATR document endpoints.**

### 5.5 Organizations Routes
```bash
nano src/backend/routes/organizations.js
```
**Update with complete user management functionality.**

## Step 6: Update Model Files

### 6.1 Violation Model
```bash
nano src/backend/models/Violation.js
```
**Add organization context to violation data methods.**

### 6.2 InferredReports Model
```bash
nano src/backend/models/InferredReports.js
```
**Add organization filtering methods.**

### 6.3 UploadedATR Model
```bash
nano src/backend/models/UploadedATR.js
```
**Add organization filtering methods.**

### 6.4 Organization Model
```bash
nano src/backend/models/Organization.js
```
**Add user management methods.**

## Step 7: Run Database Migration
```bash
# Copy migration script content to VPS
nano migrate-violations-organization.js

# Run migration
node migrate-violations-organization.js
```

## Step 8: Update Frontend Files

### 8.1 Organizations Page
```bash
nano src/frontend/src/pages/Organizations.js
```
**Update with complete user management UI.**

### 8.2 Organizations CSS
```bash
nano src/frontend/src/styles/Organizations.css
```
**Add styling for user management components.**

## Step 9: Restart Services
```bash
# Restart backend
cd src/backend
pm2 restart analytics-dashboard

# Rebuild frontend
cd ../frontend
npm run build
```

## Step 10: Test Everything

### 10.1 Test Authentication
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@aero.com","password":"SuperAero@2025","role":"admin"}'
```

### 10.2 Test Organization Access
Visit: `https://aiminesanalytics.com`
- Login with `superadmin@aero.com` / `SuperAero@2025`
- Check Organizations page
- Try creating a new organization and users

### 10.3 Test Data Isolation
- Login with CCL admin: `admin1@ccl.com` / `Aerovania_grhns@2002`
- Upload some JSON violation data
- Login with super admin and verify you can see the data
- Create another organization and verify data isolation

## 🎯 Expected Results After Deployment

1. **Login Fixed**: 401 error should be resolved
2. **Data Isolation**: Each organization sees only their data
3. **Super Admin Access**: Can see all data and manage organizations
4. **User Management**: Can create users/admins for each organization
5. **Backward Compatibility**: Existing data assigned to CCL organization

## 🚨 If Something Goes Wrong

1. **Restore from backup**:
   ```bash
   cp -r src/backend/models.backup/* src/backend/models/
   cp -r src/backend/middleware.backup/* src/backend/middleware/
   cp -r src/backend/routes.backup/* src/backend/routes/
   pm2 restart analytics-dashboard
   ```

2. **Check logs**:
   ```bash
   pm2 logs analytics-dashboard
   ```

3. **Test basic functionality**:
   ```bash
   curl http://localhost:8080/api/health
   ```

## 📞 Priority Order

**CRITICAL (Fix 401 error first):**
1. Update `src/backend/models/User.js`
2. Restart server: `pm2 restart analytics-dashboard`
3. Test login

**IMPORTANT (Complete data isolation):**
4. Update all route files
5. Update all model files
6. Run database migration

**NICE TO HAVE (UI improvements):**
7. Update frontend files
8. Rebuild frontend

Focus on steps 1-3 first to fix the immediate login issue!