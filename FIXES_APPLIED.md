# Fixes Applied - Loading and Error Issues

## Date: 2025-11-10

### Problems Identified:
1. ❌ `GET /sw.js 404` - Service worker file not found
2. ❌ `Cannot read properties of undefined (reading 'call')` - Aggregate queries causing errors
3. ❌ Slow loading times and continuous errors
4. ❌ Middleware processing static files unnecessarily

### Solutions Applied:

#### 1. Service Worker 404 Fix
**File: `web/public/sw.js`**
- Created empty placeholder service worker file
- Prevents browser from showing 404 errors
- Can be replaced with actual PWA service worker if needed

#### 2. Middleware Configuration Fix
**File: `web/middleware.ts`**
- Updated matcher pattern to exclude:
  - `sw.js` (service worker)
  - `workbox-*` (workbox files)
  - `manifest.*` (manifest files)
  - Static assets (`.js`, `.css`, `.map`, etc.)
  - `_next/webpack-hmr` (webpack hot module replacement)

**Before:**
```typescript
'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
```

**After:**
```typescript
'/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|sw.js|workbox-.*|manifest.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|map)$).*)'
```

#### 3. Next.js Configuration Fix
**File: `web/next.config.ts`**
- Added image remote patterns for:
  - Unsplash (used in seed data)
  - Supabase storage (for uploaded images)

#### 4. Aggregate Query Fix
**Files:**
- `web/components/erp-import/ERPImportPanel.tsx`
- `web/components/count-sessions/CountSessionsList.tsx`

**Problem:** Supabase aggregate queries causing "Cannot read properties of undefined" errors

**Solution:** Replaced aggregate queries with manual count queries:

**Before:**
```typescript
.select(`
  *,
  erp_items_aggregate (
    aggregate (
      count
    )
  )
`)
```

**After:**
```typescript
.select(`
  *,
  users (
    full_name
  )
`)
// Then manually fetch counts
const { count } = await supabase
  .from('erp_items')
  .select('*', { count: 'exact', head: true })
  .eq('erp_import_id', importRecord.id)
```

### Benefits:
✅ No more 404 errors for sw.js
✅ Faster page loads (middleware not processing static files)
✅ Reliable data loading (no aggregate query errors)
✅ Better error handling
✅ Image optimization configured properly

### Pages Verified:
- ✅ `/` (Home - redirects correctly)
- ✅ `/login` (Login page)
- ✅ `/dashboard` (Dashboard)
- ✅ `/dashboard/matching` (Matching panel - updated design)
- ✅ `/dashboard/erp-import` (ERP Import - fixed aggregate)
- ✅ `/dashboard/count-sessions` (Count sessions - fixed aggregate)
- ✅ `/dashboard/barcoding` (Barcoding)
- ✅ `/dashboard/warehouses` (Warehouses)
- ✅ `/dashboard/users` (Users management)

### Testing Recommendations:
1. Clear browser cache and reload
2. Check browser console for any remaining errors
3. Test all pages to ensure proper loading
4. Verify seed data creation: `POST /api/test/seed`
5. Monitor network tab for any new 404 errors

### Additional Notes:
- All components use proper error handling
- Loading states implemented in all data fetching
- Real-time subscriptions properly cleaned up on unmount
- Image components configured for external URLs

---

## Update: Warehouse RLS Policy Fix (2025-11-10)

### New Problem Identified:
❌ **Infinite recursion in users table RLS policies**
- Error: "infinite recursion detected in policy for relation 'users'"
- Occurs when loading warehouses or adding new warehouses
- Caused by circular references in RLS policies

### Solution Applied:

#### Created Migration: `004_fix_users_rls_complete.sql`

**Key Changes:**
1. ✅ Created `auth.get_user_company_id()` - Security definer function to get company_id
2. ✅ Created `auth.is_admin()` - Security definer function to check admin status
3. ✅ Removed all circular policy references
4. ✅ Updated all policies to use the new functions

**New Policies:**
- `users_select_own` - View own record (no recursion)
- `users_select_company` - View company members (uses function)
- `users_insert_own` - Insert own record on signup
- `users_update_own` - Update own profile
- `users_update_admin` - Admins update company users
- `users_insert_admin` - Admins add company users

### How to Apply:

**Option 1: Supabase Dashboard (Recommended)**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents from `supabase/migrations/004_fix_users_rls_complete.sql`
3. Paste and run

**Option 2: Supabase CLI**
```bash
supabase db push
```

### Verification:
After applying migration, test warehouse page:
- Navigate to `/dashboard/warehouses`
- Try adding a new warehouse
- Error should be resolved

See `supabase/APPLY_MIGRATIONS.md` for detailed instructions.

