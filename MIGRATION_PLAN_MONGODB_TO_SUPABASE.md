# Migration Plan: MongoDB Atlas (Mongoose) → Supabase (Postgres)

**Project:** UX Design Journal  
**Current Stack:** Node.js + Express + Mongoose + MongoDB Atlas  
**Target Stack:** Node.js + Express + Supabase (Postgres) + Supabase Client  
**Created:** January 29, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Schema Migration Strategy](#schema-migration-strategy)
4. [Data Migration Plan](#data-migration-plan)
5. [Code Refactoring Steps](#code-refactoring-steps)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)
8. [Timeline & Milestones](#timeline--milestones)

---

## Overview

### Migration Goals
- Migrate from MongoDB Atlas to Supabase (PostgreSQL)
- Preserve all existing data and functionality
- Minimize downtime during migration
- Improve query performance and add relational integrity
- Enable real-time features (optional future enhancement)
- Leverage Supabase Auth for enhanced security (optional)

### Why Supabase?
- Built-in PostgreSQL with excellent performance
- Built-in authentication and authorization (Row Level Security)
- Real-time subscriptions out of the box
- Auto-generated REST APIs
- Better support for complex queries and joins
- Free tier with generous limits
- Easy integration with serverless platforms

---

## Current Architecture Analysis

### Database Collections (5 total)

#### 1. **Users Collection**
```javascript
{
  email: String (unique),
  passwordHash: String,
  role: String (default: 'admin'),
  status: String (default: 'active'),
  createdAt: Date (timestamp),
  updatedAt: Date (timestamp)
}
```

#### 2. **Articles Collection**
```javascript
{
  slug: String (unique),
  title: String,
  excerpt: String,
  dek: String,
  category: String,
  date: String,
  author: String,
  imageUrl: String,
  bodyHtml: String,
  bodyMarkdown: String,
  tags: [String],
  status: String (default: 'draft'),
  publishAt: String,
  featured: Boolean (default: false),
  featureOrder: Number (default: 0),
  aiGenerated: Boolean,
  aiProvider: String,
  sourceUrl: String,
  createdAt: Date (timestamp),
  updatedAt: Date (timestamp)
}
```

#### 3. **Ads Collection**
```javascript
{
  placement: String (required),
  size: String,
  type: String (enum: ['IMAGE_LINK', 'EMBED_SNIPPET']),
  imageUrl: String,
  href: String,
  alt: String,
  html: String,
  label: String,
  active: Boolean (default: true),
  order: Number (default: 0),
  createdAt: Date (timestamp),
  updatedAt: Date (timestamp)
}
```

#### 4. **Subscribers Collection**
```javascript
{
  email: String (unique, required),
  status: String (default: 'active'),
  source: String (default: 'newsletter-form'),
  createdAt: Date (timestamp),
  updatedAt: Date (timestamp)
}
```
- **Indexes:** email, name, createdAt

#### 5. **Contacts Collection**
```javascript
{
  name: String (required),
  email: String (required),
  phone: String,
  subject: String (required),
  message: String (required),
  status: String (enum: ['new', 'read', 'archived'], default: 'new'),
  ipAddress: String,
  createdAt: Date (timestamp),
  updatedAt: Date (timestamp)
}
```
- **Indexes:** email, name, createdAt

### Current Dependencies
```json
{
  "mongoose": "^9.1.2",
  "@types/mongoose": "^5.11.96"
}
```

---

## Schema Migration Strategy

### Step 1: Create PostgreSQL Schema

#### SQL Schema Definition

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- 2. Articles Table
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  dek TEXT,
  category VARCHAR(100),
  date DATE,
  author VARCHAR(255),
  image_url TEXT,
  body_html TEXT,
  body_markdown TEXT,
  tags TEXT[], -- PostgreSQL array type
  status VARCHAR(50) DEFAULT 'draft',
  publish_at TIMESTAMPTZ,
  featured BOOLEAN DEFAULT false,
  feature_order INTEGER DEFAULT 0,
  ai_generated BOOLEAN DEFAULT false,
  ai_provider VARCHAR(100),
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_featured ON articles(featured);
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX idx_articles_title_search ON articles USING gin(to_tsvector('english', title));

-- 3. Ads Table
CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  placement VARCHAR(100) NOT NULL,
  size VARCHAR(50),
  type VARCHAR(50) NOT NULL CHECK (type IN ('IMAGE_LINK', 'EMBED_SNIPPET')),
  image_url TEXT,
  href TEXT,
  alt TEXT,
  html TEXT,
  label VARCHAR(255),
  active BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ads_placement ON ads(placement);
CREATE INDEX idx_ads_active ON ads(active);
CREATE INDEX idx_ads_order ON ads("order");

-- 4. Subscribers Table
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  source VARCHAR(100) DEFAULT 'newsletter-form',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_subscribers_created_at ON subscribers(created_at DESC);

-- 5. Contacts Table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  subject VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_name ON contacts(name);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_created_at ON contacts(created_at DESC);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON ads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscribers_updated_at BEFORE UPDATE ON subscribers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Key Schema Changes

| MongoDB | PostgreSQL | Notes |
|---------|-----------|-------|
| `_id` (ObjectId) | `id` (UUID) | UUID for better compatibility |
| `camelCase` fields | `snake_case` fields | PostgreSQL convention |
| `createdAt`, `updatedAt` | `created_at`, `updated_at` | Automatic triggers |
| Array fields | PostgreSQL arrays | Native array support |
| No constraints | Foreign keys & checks | Data integrity |

---

## Data Migration Plan

### Migration Approach: Zero-Downtime Blue-Green Deployment

#### Phase 1: Preparation (No Downtime)
1. Set up Supabase project
2. Create PostgreSQL schema
3. Test schema with sample data
4. Develop migration scripts

#### Phase 2: Data Export from MongoDB
```javascript
// migration-scripts/export-mongodb.js
import mongoose from 'mongoose'
import fs from 'fs'

const MONGO_URI = process.env.MONGO_URI
await mongoose.connect(MONGO_URI)

const collections = ['users', 'articles', 'ads', 'subscribers', 'contacts']

for (const collectionName of collections) {
  const Model = mongoose.model(collectionName, new mongoose.Schema({}, { strict: false }))
  const data = await Model.find({}).lean()
  
  fs.writeFileSync(
    `./migration-data/${collectionName}.json`,
    JSON.stringify(data, null, 2)
  )
  
  console.log(`✓ Exported ${data.length} ${collectionName}`)
}

await mongoose.disconnect()
```

#### Phase 3: Data Transform & Import to Supabase
```javascript
// migration-scripts/import-supabase.js
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Helper: Transform MongoDB doc to PostgreSQL row
function transformUser(doc) {
  return {
    id: doc._id.toString(), // Keep original ID as UUID-compatible string
    email: doc.email,
    password_hash: doc.passwordHash,
    role: doc.role,
    status: doc.status,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt
  }
}

function transformArticle(doc) {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt,
    dek: doc.dek,
    category: doc.category,
    date: doc.date,
    author: doc.author,
    image_url: doc.imageUrl,
    body_html: doc.bodyHtml,
    body_markdown: doc.bodyMarkdown,
    tags: doc.tags || [],
    status: doc.status,
    publish_at: doc.publishAt,
    featured: doc.featured,
    feature_order: doc.featureOrder,
    ai_generated: doc.aiGenerated,
    ai_provider: doc.aiProvider,
    source_url: doc.sourceUrl,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt
  }
}

function transformAd(doc) {
  return {
    id: doc._id.toString(),
    placement: doc.placement,
    size: doc.size,
    type: doc.type,
    image_url: doc.imageUrl,
    href: doc.href,
    alt: doc.alt,
    html: doc.html,
    label: doc.label,
    active: doc.active,
    order: doc.order,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt
  }
}

function transformSubscriber(doc) {
  return {
    id: doc._id.toString(),
    email: doc.email,
    status: doc.status,
    source: doc.source,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt
  }
}

function transformContact(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    subject: doc.subject,
    message: doc.message,
    status: doc.status,
    ip_address: doc.ipAddress,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt
  }
}

// Import data
async function importCollection(tableName, transformFn) {
  const data = JSON.parse(fs.readFileSync(`./migration-data/${tableName}.json`))
  const transformed = data.map(transformFn)
  
  // Batch insert (Supabase has 1000 row limit per insert)
  const batchSize = 1000
  for (let i = 0; i < transformed.length; i += batchSize) {
    const batch = transformed.slice(i, i + batchSize)
    const { error } = await supabase.from(tableName).insert(batch)
    
    if (error) {
      console.error(`✗ Error importing ${tableName}:`, error)
      throw error
    }
    
    console.log(`✓ Imported ${batch.length} ${tableName} (${i + batch.length}/${transformed.length})`)
  }
}

// Execute migrations
await importCollection('users', transformUser)
await importCollection('articles', transformArticle)
await importCollection('ads', transformAd)
await importCollection('subscribers', transformSubscriber)
await importCollection('contacts', transformContact)

console.log('✓ Migration complete!')
```

#### Phase 4: Verification
```javascript
// migration-scripts/verify-migration.js
import mongoose from 'mongoose'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Compare counts
const tables = ['users', 'articles', 'ads', 'subscribers', 'contacts']

for (const table of tables) {
  const mongoCount = await mongoose.model(table).countDocuments()
  const { count: pgCount } = await supabase.from(table).select('*', { count: 'exact', head: true })
  
  console.log(`${table}: MongoDB=${mongoCount}, Postgres=${pgCount}`, mongoCount === pgCount ? '✓' : '✗')
}
```

---

## Code Refactoring Steps

### Step 1: Install Supabase Dependencies

```bash
cd backend
npm install @supabase/supabase-js
npm uninstall mongoose @types/mongoose
```

Update `package.json`:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    // Remove mongoose
  }
}
```

### Step 2: Create Supabase Client

Create `backend/db/supabase.js`:
```javascript
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

// Service role client (bypasses RLS, use for admin operations)
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Public client (respects RLS, use for frontend operations if needed)
export const supabasePublic = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)
```

### Step 3: Refactor Database Operations

#### Before (Mongoose):
```javascript
// Get all articles
const articles = await Article.find({ status: 'published' })
  .sort({ createdAt: -1 })
  .limit(10)
  .lean()

// Create article
const article = await Article.create({ slug, title, ... })

// Update article
const updated = await Article.findOneAndUpdate(
  { slug },
  { title: 'New Title' },
  { new: true }
)

// Delete article
await Article.findOneAndDelete({ slug })
```

#### After (Supabase):
```javascript
import { supabase } from './db/supabase.js'

// Get all articles
const { data: articles, error } = await supabase
  .from('articles')
  .select('*')
  .eq('status', 'published')
  .order('created_at', { ascending: false })
  .limit(10)

// Create article
const { data: article, error } = await supabase
  .from('articles')
  .insert({ slug, title, ... })
  .select()
  .single()

// Update article
const { data: updated, error } = await supabase
  .from('articles')
  .update({ title: 'New Title' })
  .eq('slug', slug)
  .select()
  .single()

// Delete article
const { error } = await supabase
  .from('articles')
  .delete()
  .eq('slug', slug)
```

### Step 4: Refactor All Routes

Create helper functions in `backend/db/queries.js`:

```javascript
import { supabase } from './supabase.js'

// Users
export async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
  return data
}

export async function createUser(userData) {
  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

// Articles
export async function getPublishedArticles(limit = 10) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data
}

export async function getArticleBySlug(slug) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function createArticle(articleData) {
  const { data, error } = await supabase
    .from('articles')
    .insert(articleData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateArticle(slug, updates) {
  const { data, error } = await supabase
    .from('articles')
    .update(updates)
    .eq('slug', slug)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteArticle(slug) {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('slug', slug)
  
  if (error) throw error
  return true
}

export async function searchArticles(query, page = 1, limit = 20) {
  const offset = (page - 1) * limit
  
  // Use PostgreSQL full-text search
  const { data, error, count } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  if (error) throw error
  return { data, total: count }
}

// Subscribers
export async function createSubscriber(email, source = 'newsletter-form') {
  const { data, error } = await supabase
    .from('subscribers')
    .insert({ email, source, status: 'active' })
    .select()
    .single()
  
  if (error) {
    // Handle duplicate email
    if (error.code === '23505') {
      throw new Error('Email already subscribed')
    }
    throw error
  }
  return data
}

export async function getSubscribers(page = 1, limit = 20, searchQuery = '') {
  const offset = (page - 1) * limit
  let query = supabase
    .from('subscribers')
    .select('*', { count: 'exact' })
  
  if (searchQuery) {
    query = query.ilike('email', `%${searchQuery}%`)
  }
  
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  if (error) throw error
  return { data, total: count }
}

// Contacts
export async function createContact(contactData) {
  const { data, error } = await supabase
    .from('contacts')
    .insert(contactData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getContacts(filters = {}) {
  const { page = 1, limit = 20, search = '', status = '' } = filters
  const offset = (page - 1) * limit
  
  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
  
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  
  if (status && ['new', 'read', 'archived'].includes(status)) {
    query = query.eq('status', status)
  }
  
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  if (error) throw error
  return { data, total: count }
}

// Ads
export async function getAdsByPlacement(placements = []) {
  const results = {}
  
  for (const placement of placements) {
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .eq('placement', placement)
      .eq('active', true)
      .order('order', { ascending: true })
    
    if (error) throw error
    results[placement] = data
  }
  
  return results
}
```

### Step 5: Update Environment Variables

Update `.env`:
```bash
# Remove MongoDB
# MONGO_URI=mongodb+srv://...

# Add Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

### Step 6: Refactor Main Backend File

Major changes in `backend/index.js`:

1. Replace `mongoose.connect()` with Supabase client initialization
2. Replace all `Model.find()`, `Model.create()`, etc. with Supabase queries
3. Update field names (camelCase → snake_case)
4. Handle Supabase error responses

Example refactoring of login endpoint:

```javascript
// BEFORE (Mongoose)
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body || {}
  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })
  if (user.status !== 'active') return res.status(401).json({ message: 'Account is inactive' })
  const ok = await bcrypt.compare(password || '', user.passwordHash || '')
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
  return res.json({ token: 'dev-token', user: { email: user.email } })
})

// AFTER (Supabase)
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body || {}
  
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  
  if (error || !user) return res.status(401).json({ message: 'Invalid credentials' })
  if (user.status !== 'active') return res.status(401).json({ message: 'Account is inactive' })
  
  const ok = await bcrypt.compare(password || '', user.password_hash || '')
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
  
  return res.json({ token: 'dev-token', user: { email: user.email } })
})
```

### Step 7: Update Frontend API Calls (if needed)

The frontend API calls should remain mostly unchanged since the backend API structure stays the same. However, update field mappings if necessary:

```typescript
// ux-design-journal/src/types.ts
// Update any MongoDB-specific types if needed
export interface Article {
  id: string // was _id
  slug: string
  title: string
  // ... rest remains the same
}
```

---

## Testing Strategy

### Phase 1: Unit Tests

Create `backend/tests/db-operations.test.js`:
```javascript
import { describe, it, expect } from 'vitest'
import * as queries from '../db/queries.js'

describe('Database Operations', () => {
  it('should create and retrieve user', async () => {
    const user = await queries.createUser({
      email: 'test@example.com',
      password_hash: 'hashed',
      role: 'admin'
    })
    
    expect(user.email).toBe('test@example.com')
    
    const retrieved = await queries.findUserByEmail('test@example.com')
    expect(retrieved.id).toBe(user.id)
  })
  
  it('should create and retrieve article', async () => {
    const article = await queries.createArticle({
      slug: 'test-article',
      title: 'Test Article',
      status: 'published'
    })
    
    expect(article.slug).toBe('test-article')
    
    const retrieved = await queries.getArticleBySlug('test-article')
    expect(retrieved.id).toBe(article.id)
  })
  
  // More tests...
})
```

### Phase 2: Integration Tests

Test all API endpoints:
```javascript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../index.js'

describe('API Endpoints', () => {
  it('GET /api/public/homepage should return data', async () => {
    const res = await request(app).get('/api/public/homepage')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('latest')
    expect(res.body).toHaveProperty('featured')
  })
  
  it('POST /api/admin/login should authenticate', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ email: 'admin@example.com', password: 'admin123' })
    
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
  })
  
  // More tests...
})
```

### Phase 3: Manual Testing Checklist

- [ ] Admin login works
- [ ] Create new article
- [ ] Edit existing article
- [ ] Delete article
- [ ] Search articles
- [ ] Subscribe to newsletter
- [ ] Submit contact form
- [ ] View homepage
- [ ] View category pages
- [ ] View individual articles
- [ ] Admin dashboard statistics
- [ ] Ads display correctly
- [ ] Image uploads work
- [ ] AI generation works

### Phase 4: Load Testing

Use `k6` or `artillery` to test performance:
```javascript
// load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 10,
  duration: '30s',
}

export default function () {
  const res = http.get('https://your-api.com/api/public/homepage')
  check(res, { 'status is 200': (r) => r.status === 200 })
  sleep(1)
}
```

---

## Rollback Plan

### If Migration Fails:

1. **Immediate Rollback**
   - Update `.env` to point back to MongoDB
   - Restart backend server
   - No data loss (MongoDB still has all data)

2. **Partial Rollback**
   - If some data was migrated incorrectly
   - Drop Supabase tables: `DROP TABLE IF EXISTS articles CASCADE;`
   - Re-run migration scripts

3. **Data Recovery**
   - All MongoDB data exported to JSON files
   - Can re-import anytime
   - Keep MongoDB backups for 30 days post-migration

### Rollback Commands:
```bash
# Revert to MongoDB
git checkout main
git revert <migration-commit>
npm install
# Update .env to use MONGO_URI
npm run start
```

---

## Timeline & Milestones

### Week 1: Preparation & Setup
- [x] Document current architecture
- [ ] Set up Supabase project
- [ ] Create PostgreSQL schema
- [ ] Test schema with sample data
- [ ] Develop migration scripts

### Week 2: Data Migration
- [ ] Export all data from MongoDB
- [ ] Transform and validate data
- [ ] Import data to Supabase
- [ ] Verify data integrity
- [ ] Run comparison scripts

### Week 3: Code Refactoring
- [ ] Install Supabase dependencies
- [ ] Create Supabase client and query helpers
- [ ] Refactor all API endpoints
- [ ] Update field mappings
- [ ] Test locally

### Week 4: Testing & Deployment
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Manual QA testing
- [ ] Load testing
- [ ] Deploy to staging
- [ ] Final verification
- [ ] Deploy to production
- [ ] Monitor for 48 hours
- [ ] Decommission MongoDB (after 30 days)

---

## Additional Resources

### Supabase Documentation
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL Functions](https://supabase.com/docs/guides/database/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

### Migration Tools
- [MongoDB to PostgreSQL Converter](https://github.com/ClickHouse/clickhouse-migrator)
- [pgloader](https://github.com/dimitri/pgloader) (direct MongoDB → PostgreSQL)

### Best Practices
- Always use prepared statements (Supabase does this automatically)
- Enable Row Level Security for public tables
- Use connection pooling for production
- Set up database backups
- Monitor query performance

---

## Environment Setup

### Required Environment Variables

```bash
# backend/.env

# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...

# Keep these unchanged
PORT=4000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
OPENAI_API_KEY=sk-...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
ALLOWED_ORIGINS=https://uxdesignjournal.com
```

---

## Success Criteria

✅ **Migration is successful if:**
1. All data migrated (100% match in record counts)
2. All API endpoints return expected data
3. Frontend functions without errors
4. Response times ≤ MongoDB (ideally faster)
5. No data loss or corruption
6. All admin functions work
7. Public pages load correctly
8. Search functionality works
9. Zero downtime for end users

---

## Post-Migration Enhancements (Optional)

Once migration is complete, consider these Supabase features:

1. **Real-time Subscriptions**
   - Live article updates on homepage
   - Real-time subscriber count on dashboard

2. **Row Level Security (RLS)**
   - Secure direct database access from frontend
   - Remove backend proxy for some operations

3. **Supabase Auth**
   - Replace bcrypt with Supabase Auth
   - Add OAuth providers (Google, GitHub)
   - Magic link authentication

4. **Edge Functions**
   - Move AI generation to Supabase Edge Functions
   - Deploy globally for better performance

5. **Supabase Storage**
   - Replace Cloudinary with Supabase Storage
   - Simpler image management

---

## Notes

- **Backup Strategy:** Always keep MongoDB instance running for 30 days after successful migration
- **Monitoring:** Set up alerts for Supabase queries that take >1s
- **Indexing:** Add additional indexes based on query patterns
- **Cost:** Supabase free tier includes 500MB database, 1GB file storage, 2GB bandwidth

---

**Last Updated:** January 29, 2026  
**Status:** Draft - Ready for Review  
**Author:** Migration Planning Team
