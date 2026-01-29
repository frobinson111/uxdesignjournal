# Backend Refactoring Guide: Mongoose → Supabase

## Overview

Your `backend/index.js` needs to be updated to use Supabase instead of Mongoose. This guide shows exactly what to change.

**File size:** ~800 lines  
**Estimated time:** 2-3 hours  
**Risk level:** Medium (test thoroughly)

---

## Step-by-Step Refactoring

### Step 1: Update Imports (Lines 1-15)

**REMOVE these imports:**
```javascript
import mongoose from 'mongoose'
```

**ADD this import:**
```javascript
import { supabase } from './db/supabase.js'
```

---

### Step 2: Remove Mongoose Schemas (Lines 50-140)

**DELETE these entire sections:**
```javascript
const UserSchema = new mongoose.Schema({...})
const ArticleSchema = new mongoose.Schema({...})
const AdSchema = new mongoose.Schema({...})
const SubscriberSchema = new mongoose.Schema({...})
const ContactSchema = new mongoose.Schema({...})

const User = mongoose.model('User', UserSchema)
const Article = mongoose.model('Article', ArticleSchema)
const Ad = mongoose.model('Ad', AdSchema)
const Subscriber = mongoose.model('Subscriber', SubscriberSchema)
const Contact = mongoose.model('Contact', ContactSchema)
```

These are no longer needed - Supabase uses the PostgreSQL schema we created.

---

### Step 3: Replace Database Connection (Lines 140-150)

**REMOVE:**
```javascript
const start = async () => {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to Mongo')
  await ensureAdmin()
  await seedArticles()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend running on http://0.0.0.0:${PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start backend', err)
  process.exit(1)
})
```

**REPLACE WITH:**
```javascript
const start = async () => {
  // Supabase connection is already initialized in db/supabase.js
  console.log('Connected to Supabase')
  await ensureAdmin()
  await seedArticles()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend running on http://0.0.0.0:${PORT}`)
    console.log(`Health check: http://0.0.0.0:${PORT}/api/public/version`)
  })
}

start().catch((err) => {
  console.error('Failed to start backend', err)
  process.exit(1)
})
```

---

### Step 4: Refactor Helper Functions

#### ensureAdmin() Function

**BEFORE (Mongoose):**
```javascript
const ensureAdmin = async () => {
  const existing = await User.findOne({ email: ADMIN_EMAIL })
  if (existing) return
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  await User.create({ email: ADMIN_EMAIL, passwordHash, role: 'admin', status: 'active' })
  console.log('Seeded admin user', ADMIN_EMAIL)
}
```

**AFTER (Supabase):**
```javascript
const ensureAdmin = async () => {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('email', ADMIN_EMAIL)
    .single()
  
  if (existing) return
  
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  await supabase
    .from('users')
    .insert({
      email: ADMIN_EMAIL,
      password_hash: passwordHash,
      role: 'admin',
      status: 'active'
    })
  
  console.log('Seeded admin user', ADMIN_EMAIL)
}
```

**Key changes:**
- `User.findOne()` → `supabase.from('users').select().eq().single()`
- `User.create()` → `supabase.from('users').insert()`
- `passwordHash` → `password_hash` (snake_case)

---

#### seedArticles() Function

**BEFORE:**
```javascript
const seedArticles = async () => {
  const count = await Article.estimatedDocumentCount()
  if (count > 0) return
  // ... insert samples
  await Article.insertMany(samples)
}
```

**AFTER:**
```javascript
const seedArticles = async () => {
  const { count } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
  
  if (count > 0) return
  
  const now = new Date()
  const samples = [
    {
      slug: 'before-the-design-ships',
      title: 'Before the Design Ships, Someone Has to Be Right',
      excerpt: 'Judgment becomes the defining skill at the top.',
      category: 'practice',
      date: now.toISOString().split('T')[0],
      author: 'UXDJ',
      body_markdown: '## Lead story\n\nDesign ships when someone owns the call.',
      featured: true,
      feature_order: 1,
      status: 'published',
    },
    // ... more samples
  ]
  
  await supabase.from('articles').insert(samples)
  console.log('Seeded sample articles')
}
```

---

### Step 5: Refactor API Endpoints

This is the bulk of the work. Here are the patterns:

#### Pattern 1: Find One

**BEFORE:**
```javascript
const user = await User.findOne({ email })
```

**AFTER:**
```javascript
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('email', email)
  .single()
```

#### Pattern 2: Find Many with Sort/Limit

**BEFORE:**
```javascript
const articles = await Article.find({ status: 'published' })
  .sort({ createdAt: -1 })
  .limit(10)
  .lean()
```

**AFTER:**
```javascript
const { data: articles } = await supabase
  .from('articles')
  .select('*')
  .eq('status', 'published')
  .order('created_at', { ascending: false })
  .limit(10)
```

#### Pattern 3: Create

**BEFORE:**
```javascript
const article = await Article.create({ slug, title, ... })
```

**AFTER:**
```javascript
const { data: article, error } = await supabase
  .from('articles')
  .insert({ slug, title, ... })
  .select()
  .single()

if (error) throw error
```

#### Pattern 4: Update

**BEFORE:**
```javascript
const updated = await Article.findOneAndUpdate(
  { slug: req.params.slug },
  { title: 'New Title' },
  { new: true }
)
```

**AFTER:**
```javascript
const { data: updated, error } = await supabase
  .from('articles')
  .update({ title: 'New Title' })
  .eq('slug', req.params.slug)
  .select()
  .single()

if (error) throw error
```

#### Pattern 5: Delete

**BEFORE:**
```javascript
await Article.findOneAndDelete({ slug: req.params.slug })
```

**AFTER:**
```javascript
const { error } = await supabase
  .from('articles')
  .delete()
  .eq('slug', req.params.slug)

if (error) throw error
```

#### Pattern 6: Count

**BEFORE:**
```javascript
const total = await Article.countDocuments({ status: 'published' })
```

**AFTER:**
```javascript
const { count: total } = await supabase
  .from('articles')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'published')
```

#### Pattern 7: Pagination

**BEFORE:**
```javascript
const articles = await Article.find({})
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit)
```

**AFTER:**
```javascript
const from = (page - 1) * limit
const to = from + limit - 1

const { data: articles } = await supabase
  .from('articles')
  .select('*')
  .order('created_at', { ascending: false })
  .range(from, to)
```

---

### Step 6: Field Name Changes

**MongoDB uses camelCase, PostgreSQL uses snake_case:**

| MongoDB | PostgreSQL |
|---------|------------|
| `passwordHash` | `password_hash` |
| `imageUrl` | `image_url` |
| `bodyHtml` | `body_html` |
| `bodyMarkdown` | `body_markdown` |
| `publishAt` | `publish_at` |
| `featureOrder` | `feature_order` |
| `aiGenerated` | `ai_generated` |
| `aiProvider` | `ai_provider` |
| `sourceUrl` | `source_url` |
| `ipAddress` | `ip_address` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

**When reading FROM database:**
```javascript
// Access with snake_case
user.password_hash
article.image_url
```

**When writing TO database:**
```javascript
// Use snake_case keys
{ 
  image_url: url,
  body_markdown: markdown,
  feature_order: 1
}
```

---

### Step 7: Error Handling

Supabase returns errors differently:

**BEFORE:**
```javascript
try {
  const article = await Article.findOne({ slug })
  if (!article) return res.status(404).json({ message: 'Not found' })
} catch (err) {
  res.status(500).json({ error: err.message })
}
```

**AFTER:**
```javascript
const { data: article, error } = await supabase
  .from('articles')
  .select('*')
  .eq('slug', slug)
  .single()

if (error && error.code !== 'PGRST116') {
  return res.status(500).json({ error: error.message })
}

if (!article) {
  return res.status(404).json({ message: 'Not found' })
}
```

**Note:** `PGRST116` = "not found" error code in Supabase

---

### Step 8: Remove Mongoose from package.json

After refactoring is complete and tested:

```bash
cd backend
npm uninstall mongoose
```

---

## Testing Checklist

After refactoring, test each endpoint:

### Auth Endpoints
- [ ] POST `/api/admin/login` - Admin login works
- [ ] GET `/api/admin/users` - List users
- [ ] POST `/api/admin/users` - Create user
- [ ] PATCH `/api/admin/users/:id/status` - Update user status
- [ ] DELETE `/api/admin/users/:id` - Delete user

### Article Endpoints
- [ ] GET `/api/admin/articles` - List articles with pagination
- [ ] GET `/api/admin/articles/:slug` - Get single article
- [ ] POST `/api/admin/articles` - Create article
- [ ] PUT `/api/admin/articles/:slug` - Update article
- [ ] DELETE `/api/admin/articles/:slug` - Delete article

### Public Endpoints
- [ ] GET `/api/public/homepage` - Homepage data loads
- [ ] GET `/api/public/article/:slug` - Article page loads
- [ ] GET `/api/public/category/:slug` - Category page loads
- [ ] GET `/api/public/archive` - Archive with pagination
- [ ] GET `/api/public/search?q=test` - Search works
- [ ] POST `/api/public/subscribe` - Newsletter signup
- [ ] POST `/api/public/contact` - Contact form

### Admin Endpoints
- [ ] GET `/api/admin/stats` - Dashboard stats
- [ ] GET `/api/admin/subscribers` - List subscribers
- [ ] PUT `/api/admin/subscribers/:email` - Update subscriber
- [ ] DELETE `/api/admin/subscribers/:email` - Delete subscriber
- [ ] GET `/api/admin/contacts` - List contacts
- [ ] PUT `/api/admin/contacts/:id` - Update contact status
- [ ] DELETE `/api/admin/contacts/:id` - Delete contact
- [ ] GET `/api/admin/ads` - List ads
- [ ] POST `/api/admin/ads` - Create ad
- [ ] PUT `/api/admin/ads/:id` - Update ad
- [ ] DELETE `/api/admin/ads/:id` - Delete ad

### AI Endpoints
- [ ] POST `/api/admin/ai/generate` - Generate article
- [ ] POST `/api/admin/ai/regenerate-image/:slug` - Regenerate image

---

## Common Pitfalls

### 1. Forgetting .single()
```javascript
// WRONG - returns array
const { data } = await supabase.from('users').select('*').eq('email', email)

// RIGHT - returns single object
const { data } = await supabase.from('users').select('*').eq('email', email).single()
```

### 2. Not checking for errors
```javascript
// WRONG
const { data } = await supabase.from('articles').insert(article)

// RIGHT
const { data, error } = await supabase.from('articles').insert(article)
if (error) throw error
```

### 3. Using camelCase instead of snake_case
```javascript
// WRONG
{ imageUrl: url, bodyMarkdown: markdown }

// RIGHT
{ image_url: url, body_markdown: markdown }
```

### 4. Forgetting to return data with .select()
```javascript
// WRONG - doesn't return inserted data
await supabase.from('articles').insert(article)

// RIGHT
const { data } = await supabase.from('articles').insert(article).select()
```

---

## Deployment After Refactoring

1. **Test locally thoroughly**
2. **Commit changes:**
   ```bash
   git add .
   git commit -m "Refactor backend: Mongoose → Supabase"
   git push origin main
   ```
3. **Railway auto-deploys** from git
4. **Monitor logs** in Railway dashboard
5. **Test production** endpoints
6. **Keep MongoDB active** for 30 days as backup

---

## Need Help?

The refactoring is straightforward but tedious. Would you like me to:
- Create a new `index-supabase.js` file with all changes? 
- Refactor specific endpoints one at a time?
- Provide more examples for specific sections?

Let me know and I'll help you through it!
