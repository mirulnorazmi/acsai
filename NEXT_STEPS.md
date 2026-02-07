# Next Steps: Route Migration Guide

## Current State
✅ App is running successfully with React Router inside Next.js
🔄 Ready to begin gradual migration to Next.js file-based routing

---

## Migration Strategy

### Phase 1: Simple Static Pages (Start Here)

#### 1. Migrate `/settings` Route
```bash
# Create the route directory
mkdir -p app/settings

# Create the page component
touch app/settings/page.tsx
```

**File: `/app/settings/page.tsx`**
```typescript
"use client";

import Settings from "@/pages/Settings";

export default function SettingsPage() {
  return <Settings />;
}
```

**Then remove from bootstrap:**
- Remove `<Route path="/settings" element={<Settings />} />` from `vite-app-bootstrap.tsx`
- Test at `http://localhost:3000/settings`

---

#### 2. Migrate `/executions` Route
```bash
mkdir -p app/executions
touch app/executions/page.tsx
```

**File: `/app/executions/page.tsx`**
```typescript
"use client";

import Executions from "@/pages/Executions";

export default function ExecutionsPage() {
  return <Executions />;
}
```

---

### Phase 2: List Pages

#### 3. Migrate `/workflows` Route
```bash
mkdir -p app/workflows
touch app/workflows/page.tsx
```

**File: `/app/workflows/page.tsx`**
```typescript
"use client";

import Workflows from "@/pages/Workflows";

export default function WorkflowsPage() {
  return <Workflows />;
}
```

---

### Phase 3: Complex Pages

#### 4. Migrate `/builder` Route
```bash
mkdir -p app/builder
touch app/builder/page.tsx
```

**File: `/app/builder/page.tsx`**
```typescript
"use client";

import Builder from "@/pages/Builder";

export default function BuilderPage() {
  return <Builder />;
}
```

---

### Phase 4: Dashboard (Root Route)

#### 5. Update Root `/` Route

**File: `/app/page.tsx`** (replace existing)
```typescript
"use client";

import Index from "@/pages/Index";

/**
 * Main dashboard page
 */
export default function Home() {
  return <Index />;
}
```

---

### Phase 5: Cleanup

Once all routes are migrated:

1. **Remove React Router Bootstrap**
```bash
rm app/vite-app-bootstrap.tsx
```

2. **Remove React Router Dependency**
```bash
npm uninstall react-router-dom
```

3. **Optional: Remove `/app/pages/` Directory**
```bash
# Only if you've refactored page components to be route-specific
# Otherwise, keep them as they are
```

---

## Testing Checklist

After each route migration:

- [ ] Route loads without errors
- [ ] Navigation to/from the route works
- [ ] All components render correctly
- [ ] Styles are applied
- [ ] Interactions work (buttons, forms, etc.)
- [ ] Data fetching works (if applicable)
- [ ] No console errors

---

## Advanced: Converting to Server Components

Once routes are migrated, you can optimize by converting components to Server Components:

### Identify Server Component Candidates:
- Components that don't use `useState`, `useEffect`, `onClick`, etc.
- Components that fetch data
- Static content components

### Example Conversion:

**Before (Client Component):**
```typescript
"use client";

export function StaticHeader() {
  return <h1>Dashboard</h1>;
}
```

**After (Server Component):**
```typescript
// No "use client" directive
export function StaticHeader() {
  return <h1>Dashboard</h1>;
}
```

### Benefits:
- Smaller JavaScript bundle
- Faster initial page load
- Better SEO
- Server-side data fetching

---

## Common Issues & Solutions

### Issue: "Module not found" errors
**Solution**: Check that imports use `@/` alias correctly
```typescript
// ✅ Correct
import { Button } from "@/components/ui/button";

// ❌ Wrong
import { Button } from "@/app/components/ui/button";
```

### Issue: "Hydration mismatch" errors
**Solution**: Ensure client components use `"use client"` directive

### Issue: localStorage/window errors
**Solution**: Use `useEffect` or dynamic imports
```typescript
"use client";

import { useEffect, useState } from "react";

export function ClientOnlyComponent() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  // Now safe to use window, localStorage, etc.
  return <div>{window.location.href}</div>;
}
```

---

## Recommended Order Summary

1. ✅ Settings (simplest)
2. ✅ Executions
3. ✅ Workflows
4. ✅ Builder
5. ✅ Dashboard (root)
6. ✅ Cleanup React Router

**Estimated Time**: 1-2 hours for all routes

---

## Need Help?

Refer to:
- `MIGRATION_SUMMARY.md` for complete migration details
- [Next.js Routing Docs](https://nextjs.org/docs/app/building-your-application/routing)
- [Client vs Server Components](https://nextjs.org/docs/app/building-your-application/rendering)
