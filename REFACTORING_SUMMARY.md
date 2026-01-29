# Backend Refactoring Summary

Your `backend/index.js` has ~900 lines. Here's the refactoring strategy:

## Changes Overview

### 1. Imports (Lines 1-15)
- **REMOVE:** `import mongoose from 'mongoose'`
- **ADD:** `import { supabase } from './db/supabase.js'`

### 2. Delete Schemas (Lines 140-200)
Delete these entire sections:
- UserSchema, ArticleSchema, AdSchema, SubscriberSchema, ContactSchema
- All `mongoose.model()` calls

### 3. Helper Functions

**ensureAdmin()** - Update to:
```javascript
const ensureAdmin = async () => {
  const { data: existing, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', ADMIN_EMAIL)
    .maybeSingle()
  
  if (existing) return
  
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  await supabase.from('users').insert({
    email: ADMIN_EMAIL,
    password_hash: passwordHash,
    role: 'admin',
    status: 'active'
  })
  console.log('Seeded admin user', ADMIN_EMAIL)
}
```

**seedArticles()** - Similar pattern with supabase queries

### 4. Database Connection (Lines 880-890)
```javascript
const start = async () => {
  console.log('✅ Connected to Supabase')
  await ensureAdmin()
  await seedArticles()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend running on http://0.0.0.0:${PORT}`)
  })
}
```

## Quick Implementation Plan

Given the file size, I recommend:

**Option A: Gradual Migration**
1. Keep `index.js` using MongoDB
2. Create `index-supabase.js` with Supabase
3. Test `index-supabase.js` locally
4. When ready, rename files
5. Deploy

**Option B: Direct Replacement** 
1. I create complete `index-supabase.js`
2. You test it locally
3. Replace `index.js` when ready
4. Deploy

**Option C: Automated Script**
1. I create a migration script that does find/replace
2. Converts the file automatically
3. You review and test

## Which would you prefer?

Due to context limits, Option A (gradual) or automated script (Option C) would be most efficient.

Let me know and I'll proceed!
