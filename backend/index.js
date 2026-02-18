
// ✅ FULLY CONVERTED - SUPABASE READY
// This file has been completely migrated from MongoDB/Mongoose to Supabase/PostgreSQL.
// All 49 database queries have been converted.
// 
// Conversion completed: January 29, 2026
// 
// Key changes:
// - Removed all Mongoose schemas and models
// - All queries now use Supabase client from ./db/supabase.js
// - Field names converted from camelCase to snake_case
// - Error handling updated for Supabase patterns
//
// Next steps:
// 1. Test locally: node backend/index-supabase.js
// 2. Test all endpoints work correctly
// 3. Deploy: mv backend/index-supabase.js backend/index.js
// 4. Push to Railway
//
// Backend v3.0.0 - Supabase Migration - Ads management, article delete
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import multer from 'multer'
import bcrypt from 'bcryptjs'
import { supabase } from './db/supabase.js'
import { v4 as uuid } from 'uuid'
import OpenAI from 'openai'
import { extract } from '@extractus/article-extractor'
import { v2 as cloudinary } from 'cloudinary'

// Load backend/.env even if started from repo root
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '.env') })

const PORT = process.env.PORT || 4000
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})


const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null

const upload = multer({ storage: multer.memoryStorage() })
const app = express()

const APP_VERSION = '2.0.0'

// CORS - allow Vercel frontend and localhost for dev
const baseAllowedOrigins = [
  'https://uxdesignjournal.vercel.app',
  'https://uxdesignjournal.com',
  'https://www.uxdesignjournal.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
]

const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const allowedOrigins = [...baseAllowedOrigins, ...envAllowedOrigins]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, origin)
    // Allow Vercel preview deployments (e.g. uxdesignjournal-abc123-user.vercel.app)
    if (origin && origin.endsWith('.vercel.app')) return callback(null, origin)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(bodyParser.json())

// Health check for Railway
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, uptime: process.uptime() })
})

app.get('/', (_req, res) => {
  res.status(200).json({ app: 'uxdesignjournal-backend', status: 'running' })
})

// Debug: check database state (temporary)
app.get('/api/public/debug-db', async (_req, res) => {
  try {
    const { data: articles, error: artErr, count: artCount } = await supabase
      .from('articles').select('slug, status, created_at', { count: 'exact' })
    const { data: users, error: usrErr, count: usrCount } = await supabase
      .from('users').select('email, role', { count: 'exact' })
    res.json({
      articles: { count: artCount, error: artErr, rows: articles },
      users: { count: usrCount, error: usrErr, rows: users },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Version/health (useful for verifying production deploy is on latest backend)
app.get('/api/public/version', (_req, res) => {
  res.json({
    app: 'uxdesignjournal-backend',
    version: APP_VERSION,
    commit:
      process.env.RAILWAY_GIT_COMMIT_SHA ||
      process.env.GIT_COMMIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      null,
    now: new Date().toISOString(),
  })
})

// Helper to check if URL is temporary (from OpenAI Azure blob storage)
function isTemporaryImageUrl(url) {
  if (!url) return false
  return url.includes('blob.core.windows.net') || url.includes('oaidalleapiprodscus')
}

// Helper to upload image to Cloudinary
async function uploadToCloudinary(imageUrl, slug) {
  if (!imageUrl) {
    console.error('Cannot upload image: no URL provided')
    return null
  }
  
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error('CRITICAL: Cloudinary not configured. Cannot save images permanently.')
    return null
  }
  
  try {
    console.log('Uploading image to Cloudinary for:', slug)
    const result = await cloudinary.uploader.upload(imageUrl, {
      public_id: `uxdj/${slug}-${Date.now()}`,
      folder: 'uxdesignjournal',
      transformation: [{ width: 1024, height: 1024, crop: 'limit' }],
    })
    console.log('✓ Successfully uploaded to Cloudinary:', result.secure_url)
    return result.secure_url
  } catch (err) {
    console.error('✗ Cloudinary upload FAILED:', err?.message || err)
    return null
  }
}


// Field name mapping (MongoDB camelCase → PostgreSQL snake_case):
// passwordHash → password_hash
// imageUrl → image_url
// bodyHtml → body_html
// bodyMarkdown → body_markdown
// publishAt → publish_at
// featureOrder → feature_order
// aiGenerated → ai_generated
// aiProvider → ai_provider
// sourceUrl → source_url
// ipAddress → ip_address
// createdAt → created_at
// updatedAt → updated_at

const categories = [
  { slug: 'practice', name: 'Practice' },
  { slug: 'design-reviews', name: 'Design Reviews' },
  { slug: 'career', name: 'Career' },
  { slug: 'signals', name: 'Signals' },
  { slug: 'journal', name: 'Journal' },
]

const slugify = (text) =>
  text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')


// Seed admin
const ensureAdmin = async () => {
  const { data: existing, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', ADMIN_EMAIL)
    .maybeSingle()
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error checking for admin:', error)
    return
  }
  
  if (existing) return
  
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  const { error: insertError } = await supabase
    .from('users')
    .insert({
      email: ADMIN_EMAIL,
      password_hash: passwordHash,
      role: 'admin',
      status: 'active'
    })
  
  if (insertError) {
    console.error('Error seeding admin:', insertError)
  } else {
    console.log('Seeded admin user', ADMIN_EMAIL)
  }
}

// Seed sample articles if empty
const seedArticles = async () => {
  const { count, error } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    console.error('Error checking articles:', error)
    return
  }
  
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
    {
      slug: 'long-middle-design-career',
      title: 'The Long Middle of a Design Career',
      excerpt: 'After momentum fades and before legacy forms, most designers live here.',
      category: 'career',
      date: now.toISOString().split('T')[0],
      author: 'UXDJ',
      body_markdown: 'Middle career realities.',
      status: 'published',
    },
    {
      slug: 'ai-didnt-change-ux',
      title: "AI Didn't Change UX. Compliance Did.",
      excerpt: 'The quiet shift reshaping authority inside design teams.',
      category: 'signals',
      date: now.toISOString().split('T')[0],
      author: 'UXDJ',
      body_markdown: 'The quiet shift reshaping authority inside design teams.',
      status: 'published',
    },
    {
      slug: 'good-design-misalignment',
      title: "Good Design Doesn't Survive Bad Alignment",
      excerpt: 'Talent cannot outwork misalignment. Stop trying.',
      category: 'practice',
      date: now.toISOString().split('T')[0],
      author: 'UXDJ',
      body_markdown: 'Talent cannot outwork misalignment. Stop trying.',
      status: 'published',
    },
  ]
  
  console.log(`Seeding ${samples.length} sample articles...`)
  const { error: insertError } = await supabase.from('articles').insert(samples)
  if (insertError) {
    console.error('Error seeding articles:', JSON.stringify(insertError, null, 2))
  } else {
    console.log('Seeded sample articles successfully')
  }
}

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body || {}
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle()
  if (error || !user) return res.status(401).json({ message: 'Invalid credentials' })
  // Check if user is active
  if (user.status !== 'active') return res.status(401).json({ message: 'Account is inactive' })
  const ok = await bcrypt.compare(password || '', user.password_hash || '')
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
  return res.json({ token: 'dev-token', user: { email: user.email } })
})

// Admin Users CRUD
app.get('/api/admin/users', async (req, res) => {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ message: error.message })
  res.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.created_at,
    })),
  })
})

app.post('/api/admin/users', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' })
  }
  const { data: existing } = await supabase.from('users').select('*').eq('email', email).maybeSingle()
  if (existing) {
    return res.status(400).json({ message: 'User with this email already exists' })
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const { data: user, error } = await supabase.from('users').insert({ email, password_hash: passwordHash, role: 'admin', status: 'active' }).select().single()
  if (error) return res.status(500).json({ message: error.message })
  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
  })
})

app.patch('/api/admin/users/:id/status', async (req, res) => {
  const { status } = req.body || {}
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' })
  }
  // Prevent deactivating the last active admin
  if (status === 'inactive') {
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('role', 'admin')
    if (count <= 1) {
      return res.status(400).json({ message: 'Cannot deactivate the last active admin' })
    }
  }
  const { data: user, error } = await supabase.from('users').update({ status }).eq('id', req.params.id).select().single()
  if (error || !user) return res.status(404).json({ message: 'User not found' })
  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
  })
})

app.delete('/api/admin/users/:id', async (req, res) => {
  // Prevent deleting the last active admin
  const { data: user } = await supabase.from('users').select('*').eq('id', req.params.id).single()
  if (!user) return res.status(404).json({ message: 'User not found' })
  if (user.status === 'active') {
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('role', 'admin')
    if (count <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last active admin' })
    }
  }
  await supabase.from('users').delete().eq('id', req.params.id)
  res.json({ ok: true })
})

// Admin list articles
app.get('/api/admin/articles', async (req, res) => {
  const page = Number(req.query.page) || 1
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
  const q = (req.query.q || '').toString().trim()
  const status = (req.query.status || '').toString().trim()
  const category = (req.query.category || '').toString().trim()
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  let query = supabase.from('articles').select('*', { count: 'exact' })
  if (q) query = query.ilike('title', `%${q}%`)
  if (status && ['draft', 'scheduled', 'published'].includes(status)) query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  
  const { data: items, count: total, error } = await query.order('created_at', { ascending: false }).range(from, to)
  if (error) return res.status(500).json({ message: error.message })
  res.json({
    items: (items || []).map((a) => ({
      id: a.slug,
      slug: a.slug,
      title: a.title,
      category: a.category,
      date: a.date,
      status: a.status,
      featured: a.featured,
      featureOrder: a.feature_order,
      imageUrl: safeImageUrl(a),
    })),
    page,
    total: total || 0,
    totalPages: Math.max(1, Math.ceil((total || 0) / limit)),
  })
})

// Admin get article
app.get('/api/admin/articles/:slug', async (req, res) => {
  const { data: a, error } = await supabase.from('articles').select('*').eq('slug', req.params.slug).single()
  if (error || !a) return res.status(404).json({ message: 'Not found' })
  res.json(mapArticle(a))
})

// Admin create
app.post('/api/admin/articles', async (req, res) => {
  const body = req.body || {}
  const slug = body.slug ? slugify(body.slug) : slugify(body.title || uuid())
  const { data: exists } = await supabase.from('articles').select('slug').eq('slug', slug).maybeSingle()
  if (exists) return res.status(400).json({ message: 'Slug already exists' })
  const articleData = {
    slug,
    title: body.title || '',
    excerpt: body.excerpt || '',
    dek: body.dek || '',
    category: body.category || '',
    date: body.date || null,
    author: body.author || '',
    image_url: body.imageUrl || '',
    body_html: body.bodyHtml || '',
    body_markdown: body.bodyMarkdown || '',
    tags: body.tags || [],
    status: body.status || 'draft',
    publish_at: body.publishAt || null,
    featured: body.featured || false,
    feature_order: body.featureOrder || 0,
  }
  const { data: record, error } = await supabase.from('articles').insert(articleData).select().single()
  if (error) return res.status(500).json({ message: error.message })
  res.json(record)
})

// Admin update
app.put('/api/admin/articles/:slug', async (req, res) => {
  const body = req.body || {}
  const updateData = {
    title: body.title,
    excerpt: body.excerpt,
    dek: body.dek,
    category: typeof body.category === 'object' ? body.category?.slug : body.category,
    date: body.date || null,
    author: body.author,
    image_url: body.imageUrl,
    body_html: body.bodyHtml,
    body_markdown: body.bodyMarkdown,
    tags: body.tags,
    status: body.status,
    publish_at: body.publishAt || null,
    featured: body.featured,
    feature_order: body.featureOrder,
  }
  // Remove undefined values
  Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k])
  const { data: updated, error } = await supabase.from('articles').update(updateData).eq('slug', req.params.slug).select().single()
  if (error) {
    console.error('Article update error:', error)
    return res.status(500).json({ message: error.message || 'Update failed' })
  }
  if (!updated) return res.status(404).json({ message: 'Not found' })
  res.json(updated)
})

app.delete('/api/admin/articles/:slug', async (req, res) => {
  const { error } = await supabase.from('articles').delete().eq('slug', req.params.slug)
  if (error) return res.status(404).json({ message: 'Not found' })
  res.json({ ok: true })
})

// Admin ads CRUD
app.get('/api/admin/ads', async (req, res) => {
  const placement = (req.query.placement || '').toString()
  let query = supabase.from('ads').select('*')
  if (placement) query = query.eq('placement', placement)
  const { data: ads, error } = await query.order('placement').order('order').order('updated_at', { ascending: false })
  if (error) {
    console.error('List ads error:', error)
    return res.status(500).json({ message: error.message })
  }
  res.json((ads || []).map(mapAd))
})

app.post('/api/admin/ads', async (req, res) => {
  try {
    const payload = sanitizeAdPayload(req.body || {})
    const adData = {
      placement: payload.placement,
      size: payload.size,
      type: payload.type,
      image_url: payload.imageUrl,
      href: payload.href,
      alt: payload.alt,
      html: payload.html,
      label: payload.label,
      active: payload.active,
      order: payload.order,
    }
    const { data: created, error } = await supabase.from('ads').insert(adData).select().single()
    if (error) {
      console.error('Create ad error:', error)
      throw new Error(error.message)
    }
    res.json(mapAd(created))
  } catch (err) {
    console.error('Ad create failed:', err.message)
    res.status(400).json({ message: err.message || 'Invalid payload' })
  }
})

app.put('/api/admin/ads/:id', async (req, res) => {
  try {
    const payload = sanitizeAdPayload(req.body || {})
    const adData = {
      placement: payload.placement,
      size: payload.size,
      type: payload.type,
      image_url: payload.imageUrl,
      href: payload.href,
      alt: payload.alt,
      html: payload.html,
      label: payload.label,
      active: payload.active,
      order: payload.order,
    }
    const { data: updated, error } = await supabase.from('ads').update(adData).eq('id', req.params.id).select().single()
    if (error) {
      console.error('Update ad error:', error)
      return res.status(500).json({ message: error.message || 'Update failed' })
    }
    if (!updated) return res.status(404).json({ message: 'Not found' })
    res.json(mapAd(updated))
  } catch (err) {
    console.error('Ad update failed:', err.message)
    res.status(400).json({ message: err.message || 'Invalid payload' })
  }
})

app.delete('/api/admin/ads/:id', async (req, res) => {
  const { error } = await supabase.from('ads').delete().eq('id', req.params.id)
  if (error) return res.status(404).json({ message: 'Not found' })
  res.json({ ok: true })
})

// Admin stats
app.get('/api/admin/stats', async (_req, res) => {
  try {
    const [subsRes, artRes, adsRes, adminsRes] = await Promise.all([
      supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('articles').select('*', { count: 'exact', head: true }),
      supabase.from('ads').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    ])
    
    const { data: recentArticles } = await supabase.from('articles').select('title, slug, created_at').order('created_at', { ascending: false }).limit(6)
    const { data: recentSubscribers } = await supabase.from('subscribers').select('email, created_at').order('created_at', { ascending: false }).limit(4)
    
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
    
    const [subsRecentRes, subsPrevRes, artRecentRes, artPrevRes] = await Promise.all([
      supabase.from('subscribers').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      supabase.from('subscribers').select('*', { count: 'exact', head: true }).gte('created_at', fourteenDaysAgo).lt('created_at', sevenDaysAgo),
      supabase.from('articles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      supabase.from('articles').select('*', { count: 'exact', head: true }).gte('created_at', fourteenDaysAgo).lt('created_at', sevenDaysAgo),
    ])
    
    res.json({
      subscribers: subsRes.count || 0,
      articles: artRes.count || 0,
      categories: categories.length,
      ads: adsRes.count || 0,
      admins: adminsRes.count || 0,
      recentEvents: [
        ...(recentArticles || []).map((a) => ({ type: 'article', title: a.title, slug: a.slug, date: a.created_at })),
        ...(recentSubscribers || []).map((s) => ({ type: 'subscriber', email: s.email, date: s.created_at })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10),
      trends: {
        subscribers: { current: subsRecentRes.count || 0, previous: subsPrevRes.count || 0 },
        articles: { current: artRecentRes.count || 0, previous: artPrevRes.count || 0 },
      },
    })
  } catch (err) {
    console.error('Stats error:', err)
    res.status(500).json({ message: 'Could not load stats' })
  }
})

// Admin subscribers CRUD
app.get('/api/admin/subscribers', async (req, res) => {
  const page = Number(req.query.page) || 1
  const limit = 20
  const q = (req.query.q || '').toString().trim()
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  let query = supabase.from('subscribers').select('*', { count: 'exact' })
  if (q) query = query.ilike('email', `%${q}%`)
  
  const { data: items, count: total, error } = await query.order('created_at', { ascending: false }).range(from, to)
  if (error) return res.status(500).json({ message: error.message })
  res.json({
    items: (items || []).map((s) => ({
      id: s.id,
      email: s.email,
      status: s.status,
      source: s.source,
      subscribedAt: s.created_at,
    })),
    page,
    totalPages: Math.max(1, Math.ceil((total || 0) / limit)),
    total: total || 0,
  })
})

app.put('/api/admin/subscribers/:email', async (req, res) => {
  const { status } = req.body || {}
  const { data: updated, error } = await supabase.from('subscribers').update({ status }).eq('email', req.params.email).select().single()
  if (error || !updated) return res.status(404).json({ message: 'Not found' })
  res.json(updated)
})

app.delete('/api/admin/subscribers/:email', async (req, res) => {
  const { error } = await supabase.from('subscribers').delete().eq('email', req.params.email)
  if (error) return res.status(404).json({ message: 'Not found' })
  res.json({ ok: true })
})

app.post('/api/admin/subscribers/bulk-delete', async (req, res) => {
  const { emails } = req.body || {}
  if (!Array.isArray(emails)) return res.status(400).json({ message: 'emails array required' })
  const { error, count } = await supabase.from('subscribers').delete().in('email', emails)
  if (error) return res.status(500).json({ message: error.message })
  res.json({ deleted: count || emails.length })
})

// Upload mock
app.post('/api/admin/uploads', upload.single('file'), (req, res) => {
  const filename = req.file ? req.file.originalname : 'upload'
  res.json({ url: `https://images.example.com/${Date.now()}-${filename}` })
})

// Helper function to generate contextual image prompt based on article content
function generateImagePrompt(title, dek, excerpt, bodyMarkdown, category, topic) {
  // Build category-aware visual subject suggestions
  const categoryHints = {
    'practice': 'tools, wireframes, sketches, sticky notes, prototypes, design artifacts, user flows',
    'design-reviews': 'screens, interfaces, magnifying glass, design critique, comparison layouts',
    'career': 'desk workspace, ladder, handshake, briefcase, growth chart, mentorship scene',
    'signals': 'radar, compass, telescope, trend arrows, emerging technology, data patterns',
    'journal': 'notebook, pen, coffee cup, window view, thoughtful workspace, open sketchbook',
  }[category] || 'design tools, digital interfaces, creative workspace'

  // Extract the core subject from article content
  const contentSummary = `${dek || excerpt || ''}`.slice(0, 300)
  const bodySnippet = bodyMarkdown ? bodyMarkdown.slice(0, 500) : ''
  const topicContext = topic ? `Topic focus: ${topic}. ` : ''

  // Use GPT-style structured prompt: subject first, style second
  return `Editorial illustration for a UX design newspaper article.

SUBJECT (most important — the image must clearly relate to this):
Article: "${title}"
${topicContext}Summary: "${contentSummary}"
The illustration must depict a specific scene, object, or visual metaphor that directly represents the article's subject matter. Consider objects like: ${categoryHints}. Do NOT default to a generic face or person — instead show the concepts, tools, environments, or metaphors central to the article's topic.

STYLE (Hedcut stipple engraving):
Black and white only. Rendered entirely with tiny hand-drawn ink dots (stippling) and fine crosshatch lines on a pure white background — in the style of classic Wall Street Journal Hedcut illustrations by Kevin Sprouls. High contrast. No solid fills, no gradients, no gray tones — only varying dot density. Must look hand-engraved for a newspaper editorial page.`
}

// Simple topic sanitizer: trims, strips HTML tags, collapses whitespace, enforces max length
function sanitizeTopic(input) {
  if (!input) return ''
  try {
    let s = String(input)
    s = s.replace(/<[^>]*>/g, '') // remove HTML tags
    s = s.replace(/[\r\n\t]+/g, ' ') // remove control whitespace
    s = s.replace(/\s+/g, ' ').trim()
    if (s.length === 0) return ''
    if (s.length > 120) s = s.slice(0, 120).trim()
    // basic blacklist for prompt injection phrases
    const forbidden = ['ignore previous', 'ignore all previous', 'disregard instructions', 'do not follow']
    const lower = s.toLowerCase()
    for (const phrase of forbidden) {
      if (lower.includes(phrase)) return null
    }
    return s
  } catch (err) {
    return null
  }
}

// AI generate article
app.post('/api/admin/ai/generate', async (req, res) => {
  if (!openai) return res.status(500).json({ message: 'OPENAI_API_KEY not configured' })
  const { category, topic, sourceUrl, mode = 'rewrite' } = req.body || {}
  if (!category) return res.status(400).json({ message: 'category is required' })

  // sanitize topic if present
  let sanitizedTopic = ''
  if (typeof topic !== 'undefined') {
    const s = sanitizeTopic(topic)
    if (s === null) return res.status(400).json({ message: 'Invalid topic' })
    sanitizedTopic = s
  }

  try {
    let sourceText = ''
    if (sourceUrl) {
      const extracted = await extract(sourceUrl).catch(() => null)
      sourceText = extracted?.content || extracted?.text || extracted?.description || ''
    }

    const userMessageLines = []
    userMessageLines.push(`Write an article for category "${category}" in a calm, authoritative tone.`)
    if (sanitizedTopic) userMessageLines.push(`Focus the article on the topic: "${sanitizedTopic}".`)
    userMessageLines.push(`Mode: ${mode}`)
    userMessageLines.push(`Source:\n${sourceText.slice(0, 6000)}`)
    const prompt = [
      { role: 'system', content: 'You are an editor for a newspaper-style UX publication. Output JSON only.' },
      { role: 'user', content: userMessageLines.join('\n') },
      { role: 'user', content: 'Return JSON with keys: title, dek, excerpt, body_markdown. Body should include h2s, bullets if useful.' },
    ]

    const aiResp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: prompt,
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    })

    const content = aiResp.choices[0]?.message?.content || '{}'
    let parsed = {}
    try { parsed = JSON.parse(content) } catch { parsed = {} }

    // Image - generate and save permanently
    const slugBase = parsed.title ? slugify(parsed.title) : slugify(uuid())
    let imageUrl = ''
    try {
      console.log('Generating Hedcut image for:', parsed.title || 'UX design')
      const img = await openai.images.generate({
        model: 'dall-e-3',
        prompt: generateImagePrompt(parsed.title || 'UX design', parsed.dek, parsed.excerpt, parsed.body_markdown, category, sanitizedTopic),
        size: '1024x1024',
        quality: 'hd',
        style: 'natural',
      })
      const tempUrl = img.data?.[0]?.url || ''
      if (!tempUrl) throw new Error('No image URL returned from OpenAI')
      console.log('OpenAI returned temporary image URL, uploading to Cloudinary...')
      
      // CRITICAL: Must upload to Cloudinary before storing in database
      const cloudinaryUrl = await uploadToCloudinary(tempUrl, slugBase)
      
      // VALIDATION: Never store temporary OpenAI URLs
      if (!cloudinaryUrl) {
        console.error('✗ CRITICAL: Cloudinary upload failed. Cannot proceed without permanent storage.')
        throw new Error('Image upload to permanent storage (Cloudinary) failed. Please check Cloudinary configuration.')
      }
      
      if (isTemporaryImageUrl(cloudinaryUrl)) {
        console.error('✗ CRITICAL: Attempted to store temporary OpenAI URL in database:', cloudinaryUrl)
        throw new Error('Validation failed: Cannot store temporary image URLs')
      }
      
      imageUrl = cloudinaryUrl
      console.log('✓ Image permanently stored:', imageUrl)
    } catch (err) {
      console.error('✗ Image generation failed:', err?.message || err)
      console.error('Details:', err)
      imageUrl = fallbackImage(slugBase)
      console.warn('Using fallback placeholder image due to generation failure')
    }

    let slug = slugBase
    let suffix = 1
    let exists = true
    while (exists) {
      const { data } = await supabase.from('articles').select('slug').eq('slug', slug).maybeSingle()
      if (!data) { exists = false } else { slug = `${slugBase}-${suffix++}` }
    }

    const { data: record, error } = await supabase.from('articles').insert({
      slug,
      title: parsed.title || 'Untitled',
      dek: parsed.dek || parsed.excerpt,
      excerpt: parsed.excerpt || parsed.dek,
      body_markdown: parsed.body_markdown || parsed.body || '',
      category,
      status: 'draft',
      featured: false,
      feature_order: 0,
      image_url: imageUrl,
      ai_generated: true,
      ai_provider: 'openai',
      source_url: sourceUrl || '',
    }).select().single()
    if (error) throw error

    res.json({ slug: record.slug, status: record.status })
  } catch (err) {
    console.error('AI generate failed', err)
    res.status(500).json({ message: 'AI generation failed' })
  }
})

// AI regenerate image for an article
app.post('/api/admin/ai/regenerate-image/:slug', async (req, res) => {
  if (!openai) return res.status(500).json({ message: 'OPENAI_API_KEY not configured' })
  const { data: article, error } = await supabase.from('articles').select('*').eq('slug', req.params.slug).single()
  if (error || !article) return res.status(404).json({ message: 'Article not found' })

  try {
    console.log('Regenerating Hedcut image for:', article.title)
    const img = await openai.images.generate({
      model: 'dall-e-3',
      prompt: generateImagePrompt(article.title, article.dek, article.excerpt, article.body_markdown, article.category),
      size: '1024x1024',
      quality: 'hd',
      style: 'natural',
    })
    const tempUrl = img.data?.[0]?.url
    if (!tempUrl) throw new Error('No image URL returned from OpenAI')
    console.log('OpenAI returned temporary image URL for regen, uploading to Cloudinary...')
    
    // CRITICAL: Must upload to Cloudinary before storing in database
    const cloudinaryUrl = await uploadToCloudinary(tempUrl, article.slug)
    
    // VALIDATION: Never store temporary OpenAI URLs
    if (!cloudinaryUrl) {
      console.error('✗ CRITICAL: Cloudinary upload failed during regeneration')
      throw new Error('Image upload to permanent storage (Cloudinary) failed. Please check Cloudinary configuration.')
    }
    
    if (isTemporaryImageUrl(cloudinaryUrl)) {
      console.error('✗ CRITICAL: Attempted to store temporary OpenAI URL:', cloudinaryUrl)
      throw new Error('Validation failed: Cannot store temporary image URLs')
    }
    
    await supabase.from('articles').update({ image_url: cloudinaryUrl }).eq('slug', article.slug)
    console.log('✓ Image regenerated and saved:', cloudinaryUrl)
    console.log('Image regen success for', article.slug, '->', cloudinaryUrl)
    res.json({ imageUrl: cloudinaryUrl })
  } catch (err) {
    console.error('Image regen failed', err?.message || err)
    const fallback = fallbackImage(article.slug)
    await supabase.from('articles').update({ image_url: fallback }).eq('slug', article.slug)
    res.status(200).json({ imageUrl: fallback, warning: 'OpenAI generation failed; using fallback image' })
  }
})

// Public endpoints
app.get('/api/public/categories', (_req, res) => {
  res.json(categories)
})

app.get('/api/public/homepage', async (_req, res) => {
  try {
    const adPlacements = await getAdsByPlacement(['homepage-latest', 'homepage-lead'])
    const pickPlacement = (key) => pickRandom(adPlacements[key] || []).map(mapAd)

    const { data: latest } = await supabase.from('articles').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(6)
    const lead = latest?.[0] ? mapArticle(latest[0]) : null
    const daily = (latest || []).slice(0, 4).map(mapArticle)
    const { data: featured } = await supabase.from('articles').select('*').eq('featured', true).eq('status', 'published').order('feature_order').order('created_at', { ascending: false }).limit(6)
    const { data: tiles } = await supabase.from('articles').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(4)
    res.json({
      categories,
      latest: (latest || []).map(mapArticle),
      lead,
      daily,
      featured: (featured || []).map(mapArticle),
      tiles: (tiles || []).map(mapArticle),
      ads: {
        sidebar: pickPlacement('homepage-latest'),
        inline: pickPlacement('homepage-lead'),
      },
    })
  } catch (err) {
    console.error('Homepage error:', err)
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

app.get('/api/public/category/:slug', async (req, res) => {
  const cat = categories.find((c) => c.slug === req.params.slug)
  if (!cat) return res.status(404).json({ message: 'Not found' })
  const { data: filtered } = await supabase.from('articles').select('*').eq('category', cat.slug).eq('status', 'published').order('created_at', { ascending: false })
  res.json({
    category: cat,
    articles: (filtered || []).map(mapArticle),
    daily: (filtered || []).slice(0, 3).map(mapArticle),
    page: 1,
    totalPages: 1,
  })
})

app.get('/api/public/article/:slug', async (req, res) => {
  const adPlacements = await getAdsByPlacement(['article-inline', 'article-readmore', 'article-sidebar'])
  const pickPlacement = (key) => pickRandom(adPlacements[key] || []).map(mapAd)

  const { data: a, error } = await supabase.from('articles').select('*').eq('slug', req.params.slug).single()
  if (error || !a) return res.status(404).json({ message: 'Not found' })
  const { data: related } = await supabase.from('articles').select('*').neq('slug', a.slug).eq('status', 'published').limit(3)
  res.json({
    ...mapArticle(a),
    related: (related || []).map(mapArticle),
    ads: {
      sidebar: pickPlacement('article-sidebar'),
      inline: [...pickPlacement('article-inline'), ...pickPlacement('article-readmore')],
    },
  })
})

app.get('/api/public/archive', async (req, res) => {
  const page = Number(req.query.page) || 1
  const limit = 20
  const from = (page - 1) * limit
  const to = from + limit - 1
  const { count: total } = await supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'published')
  const { data: results } = await supabase.from('articles').select('*').eq('status', 'published').order('created_at', { ascending: false }).range(from, to)
  res.json({
    results: (results || []).map((a) => ({
      headline: a.title,
      slug: a.slug,
      category: a.category,
      date: a.date,
      imageUrl: safeImageUrl(a),
    })),
    page,
    totalPages: Math.max(1, Math.ceil((total || 0) / limit)),
  })
})

app.get('/api/public/search', async (req, res) => {
  const q = (req.query.q || '').toString().trim()
  const page = Number(req.query.page) || 1
  const limit = 20
  const from = (page - 1) * limit
  const to = from + limit - 1
  let query = supabase.from('articles').select('*', { count: 'exact' }).eq('status', 'published')
  if (q) query = query.ilike('title', `%${q}%`)
  const { data: results, count: total } = await query.order('created_at', { ascending: false }).range(from, to)
  res.json({
    results: (results || []).map((a) => ({
      headline: a.title,
      slug: a.slug,
      category: a.category,
      date: a.date,
      imageUrl: safeImageUrl(a),
    })),
    page,
    totalPages: Math.max(1, Math.ceil((total || 0) / limit)),
  })
})

app.post('/api/public/subscribe', async (req, res) => {
  const { email, source = 'newsletter-form' } = req.body || {}
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Valid email required.' })
  }
  try {
    const { data: existing } = await supabase.from('subscribers').select('*').eq('email', email).maybeSingle()
    if (existing) {
      if (existing.status === 'unsubscribed') {
        await supabase.from('subscribers').update({ status: 'active' }).eq('email', email)
        return res.json({ success: true, message: 'Resubscribed successfully.' })
      }
      return res.json({ success: true, message: 'Already subscribed.' })
    }
    await supabase.from('subscribers').insert({ email, source, status: 'active' })
    res.json({ success: true, message: 'Subscribed successfully.' })
  } catch (err) {
    console.error('Subscribe error:', err)
    res.status(500).json({ success: false, message: 'Subscription failed.' })
  }
})

app.post('/api/public/session/heartbeat', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/public/session/identify', (_req, res) => {
  res.json({ ok: true })
})

// In-memory rate limiter for contact submissions (IP -> timestamps)
const contactRateLimiter = new Map()

// Helper: Get client IP
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection.remoteAddress || 'unknown'
}

// Helper: Check rate limit (5 submissions per IP per hour)
const checkContactRateLimit = (ipAddress) => {
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000
  
  if (!contactRateLimiter.has(ipAddress)) {
    contactRateLimiter.set(ipAddress, [])
  }
  
  let timestamps = contactRateLimiter.get(ipAddress)
  timestamps = timestamps.filter((t) => t > oneHourAgo)
  
  if (timestamps.length >= 5) {
    return false
  }
  
  timestamps.push(now)
  contactRateLimiter.set(ipAddress, timestamps)
  return true
}

// Helper: Sanitize contact input
const sanitizeContactInput = (input, maxLength = 500) => {
  if (typeof input !== 'string') return ''
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .trim()
    .slice(0, maxLength)
}

// Contact form submission
app.post('/api/public/contact', async (req, res) => {
  const { name, email, phone = '', subject, message } = req.body || {}
  const ipAddress = getClientIp(req)
  
  // Validate required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: 'Missing required fields: name, email, subject, message.' })
  }
  
  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Valid email address required.' })
  }
  
  // Check rate limit
  if (!checkContactRateLimit(ipAddress)) {
    return res.status(429).json({ success: false, message: 'Too many submissions. Please try again in an hour.' })
  }
  
  try {
    // Sanitize inputs
    const sanitizedName = sanitizeContactInput(name, 100)
    const sanitizedEmail = email.toLowerCase().trim()
    const sanitizedPhone = sanitizeContactInput(phone, 20)
    const sanitizedSubject = sanitizeContactInput(subject, 200)
    const sanitizedMessage = sanitizeContactInput(message, 5000)
    
    // Validate sanitized inputs
    if (!sanitizedName || !sanitizedSubject || !sanitizedMessage) {
      return res.status(400).json({ success: false, message: 'Input validation failed.' })
    }
    
    // Create contact record
    const { data: contact, error } = await supabase.from('contacts').insert({
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      subject: sanitizedSubject,
      message: sanitizedMessage,
      ip_address: ipAddress,
      status: 'new',
    }).select().single()
    
    if (error) throw error
    
    res.json({
      success: true,
      message: 'Thank you for reaching out. We will be in touch soon.',
      contactId: contact.id,
    })
  } catch (err) {
    console.error('Contact submission error:', err)
    res.status(500).json({ success: false, message: 'Failed to submit contact form.' })
  }
})

// Admin: Get all contacts with pagination and search
app.get('/api/admin/contacts', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const search = (req.query.search || '').toLowerCase()
    const status = req.query.status || ''
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    // Build query
    let query = supabase.from('contacts').select('*', { count: 'exact' })
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (status && ['new', 'read', 'archived'].includes(status)) {
      query = query.eq('status', status)
    }
    
    const { data: contacts, count: total, error } = await query.order('created_at', { ascending: false }).range(from, to)
    if (error) throw error
    
    res.json({
      contacts: contacts || [],
      page,
      limit,
      total: total || 0,
      totalPages: Math.ceil((total || 0) / limit),
    })
  } catch (err) {
    console.error('Get contacts error:', err)
    res.status(500).json({ error: 'Failed to fetch contacts.' })
  }
})

// Admin: Update contact status
app.put('/api/admin/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body || {}
    
    // Validate status
    if (!status || !['new', 'read', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required: new, read, or archived.' })
    }
    
    // Update contact
    const { data: contact, error } = await supabase.from('contacts').update({ status }).eq('id', id).select().single()
    if (error || !contact) {
      return res.status(404).json({ error: 'Contact not found.' })
    }
    
    res.json({ success: true, contact })
  } catch (err) {
    console.error('Update contact error:', err)
    res.status(500).json({ error: 'Failed to update contact.' })
  }
})

// Admin: Delete contact
app.delete('/api/admin/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    
    if (error) {
      return res.status(404).json({ error: 'Contact not found.' })
    }
    
    res.json({ success: true, message: 'Contact deleted.' })
  } catch (err) {
    console.error('Delete contact error:', err)
    res.status(500).json({ error: 'Failed to delete contact.' })
  }
})

// ============================================================================
// POPUP LEAD CAPTURE SYSTEM
// ============================================================================

// Public: Get active popup config
app.get('/api/public/popup/active', async (_req, res) => {
  try {
    const { data: popup, error } = await supabase
      .from('popup_configs')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (error) throw error
    
    if (!popup) {
      return res.json({ popup: null })
    }
    
    res.json({
      popup: {
        id: popup.id,
        title: popup.title,
        description: popup.description,
        imageUrl: popup.image_url,
        imageCaption: popup.image_caption,
        pdfTitle: popup.pdf_title,
        buttonText: popup.button_text,
        delaySeconds: popup.delay_seconds,
      }
    })
  } catch (err) {
    console.error('Get active popup error:', err)
    res.status(500).json({ error: 'Failed to fetch popup.' })
  }
})

// Public: Submit popup lead and get download link
app.post('/api/public/popup/submit', async (req, res) => {
  const { email, popupId } = req.body || {}
  const ipAddress = getClientIp(req)
  const userAgent = req.headers['user-agent'] || ''
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Valid email required.' })
  }
  
  if (!popupId) {
    return res.status(400).json({ success: false, message: 'Popup ID required.' })
  }
  
  try {
    // Verify popup exists and is active
    const { data: popup, error: popupError } = await supabase
      .from('popup_configs')
      .select('*')
      .eq('id', popupId)
      .eq('active', true)
      .single()
    
    if (popupError || !popup) {
      return res.status(404).json({ success: false, message: 'Popup not found or inactive.' })
    }
    
    // Check if email already submitted for this popup (prevent duplicates in last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('popup_leads')
      .select('id')
      .eq('popup_config_id', popupId)
      .eq('email', email.toLowerCase().trim())
      .gte('created_at', oneDayAgo)
      .maybeSingle()
    
    // Create lead record (even if duplicate - for analytics)
    const { data: lead, error: leadError } = await supabase
      .from('popup_leads')
      .insert({
        popup_config_id: popupId,
        email: email.toLowerCase().trim(),
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'active'
      })
      .select()
      .single()
    
    if (leadError) throw leadError
    
    // Also add to subscribers if not already there
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()
    
    if (!subscriber) {
      await supabase.from('subscribers').insert({
        email: email.toLowerCase().trim(),
        source: 'popup-lead-capture',
        status: 'active'
      })
    } else if (subscriber.status === 'unsubscribed') {
      await supabase
        .from('subscribers')
        .update({ status: 'active', source: 'popup-lead-capture' })
        .eq('email', email.toLowerCase().trim())
    }
    
    res.json({
      success: true,
      message: existing ? 'Download link sent again!' : 'Success! Check your email for the download link.',
      downloadUrl: popup.pdf_url,
      pdfTitle: popup.pdf_title,
      leadId: lead.id
    })
  } catch (err) {
    console.error('Popup lead submission error:', err)
    res.status(500).json({ success: false, message: 'Failed to process request.' })
  }
})

// Admin: List popup configs
app.get('/api/admin/popups', async (req, res) => {
  try {
    const { data: popups, error } = await supabase
      .from('popup_configs')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    res.json({
      popups: (popups || []).map(p => ({
        id: p.id,
        name: p.name,
        title: p.title,
        description: p.description,
        imageUrl: p.image_url,
        imageCaption: p.image_caption,
        pdfUrl: p.pdf_url,
        pdfTitle: p.pdf_title,
        buttonText: p.button_text,
        delaySeconds: p.delay_seconds,
        active: p.active,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }))
    })
  } catch (err) {
    console.error('List popups error:', err)
    res.status(500).json({ error: 'Failed to fetch popups.' })
  }
})

// Admin: Get popup config
app.get('/api/admin/popups/:id', async (req, res) => {
  try {
    const { data: popup, error } = await supabase
      .from('popup_configs')
      .select('*')
      .eq('id', req.params.id)
      .single()
    
    if (error || !popup) {
      return res.status(404).json({ error: 'Popup not found.' })
    }
    
    // Get lead count for this popup
    const { count: leadCount } = await supabase
      .from('popup_leads')
      .select('*', { count: 'exact', head: true })
      .eq('popup_config_id', popup.id)
    
    res.json({
      id: popup.id,
      name: popup.name,
      title: popup.title,
      description: popup.description,
      imageUrl: popup.image_url,
      imageCaption: popup.image_caption,
      pdfUrl: popup.pdf_url,
      pdfTitle: popup.pdf_title,
      buttonText: popup.button_text,
      delaySeconds: popup.delay_seconds,
      active: popup.active,
      leadCount: leadCount || 0,
      createdAt: popup.created_at,
      updatedAt: popup.updated_at
    })
  } catch (err) {
    console.error('Get popup error:', err)
    res.status(500).json({ error: 'Failed to fetch popup.' })
  }
})

// Admin: Create popup config
app.post('/api/admin/popups', async (req, res) => {
  try {
    const {
      name,
      title,
      description,
      imageUrl,
      imageCaption,
      pdfUrl,
      pdfTitle,
      buttonText,
      delaySeconds,
      active
    } = req.body || {}
    
    if (!name || !title || !pdfUrl || !pdfTitle) {
      return res.status(400).json({ error: 'Name, title, pdfUrl, and pdfTitle are required.' })
    }
    
    // Use raw SQL to bypass PostgREST cache issues
    const { data: popup, error } = await supabase.rpc('create_popup_config', {
      p_name: name,
      p_title: title,
      p_description: description || '',
      p_image_url: imageUrl || '',
      p_image_caption: imageCaption || '',
      p_pdf_url: pdfUrl,
      p_pdf_title: pdfTitle,
      p_button_text: buttonText || 'Get Download Link',
      p_delay_seconds: delaySeconds || 10,
      p_active: active || false
    })
    
    if (error) {
      console.error('Create popup RPC error:', error)
      throw error
    }
    
    res.json(popup)
  } catch (err) {
    console.error('Create popup error:', err)
    res.status(500).json({ error: 'Failed to create popup.' })
  }
})

// Admin: Update popup config
app.put('/api/admin/popups/:id', async (req, res) => {
  try {
    const {
      name,
      title,
      description,
      imageUrl,
      imageCaption,
      pdfUrl,
      pdfTitle,
      buttonText,
      delaySeconds,
      active
    } = req.body || {}
    
    // If setting this as active, deactivate all others first
    if (active) {
      await supabase.from('popup_configs').update({ active: false }).neq('id', req.params.id)
    }
    
    const updateData = {
      name,
      title,
      description,
      image_url: imageUrl,
      image_caption: imageCaption,
      pdf_url: pdfUrl,
      pdf_title: pdfTitle,
      button_text: buttonText,
      delay_seconds: delaySeconds,
      active
    }
    
    // Remove undefined values
    Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k])
    
    const { data: popup, error } = await supabase
      .from('popup_configs')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single()
    
    if (error || !popup) {
      return res.status(404).json({ error: 'Popup not found.' })
    }
    
    res.json({
      id: popup.id,
      name: popup.name,
      title: popup.title,
      description: popup.description,
      imageUrl: popup.image_url,
      imageCaption: popup.image_caption,
      pdfUrl: popup.pdf_url,
      pdfTitle: popup.pdf_title,
      buttonText: popup.button_text,
      delaySeconds: popup.delay_seconds,
      active: popup.active,
      updatedAt: popup.updated_at
    })
  } catch (err) {
    console.error('Update popup error:', err)
    res.status(500).json({ error: 'Failed to update popup.' })
  }
})

// Admin: Delete popup config
app.delete('/api/admin/popups/:id', async (req, res) => {
  try {
    // First delete all associated leads
    await supabase.from('popup_leads').delete().eq('popup_config_id', req.params.id)
    
    // Then delete the popup config
    const { error } = await supabase.from('popup_configs').delete().eq('id', req.params.id)
    
    if (error) {
      return res.status(404).json({ error: 'Popup not found.' })
    }
    
    res.json({ success: true, message: 'Popup deleted.' })
  } catch (err) {
    console.error('Delete popup error:', err)
    res.status(500).json({ error: 'Failed to delete popup.' })
  }
})

// Admin: List popup leads
app.get('/api/admin/popup-leads', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const popupId = req.query.popupId
    const search = (req.query.search || '').toLowerCase()
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    // Build query
    let query = supabase
      .from('popup_leads')
      .select('*, popup_configs(name, title)', { count: 'exact' })
    
    if (popupId) {
      query = query.eq('popup_config_id', popupId)
    }
    
    if (search) {
      query = query.ilike('email', `%${search}%`)
    }
    
    const { data: leads, count: total, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)
    
    if (error) throw error
    
    res.json({
      leads: (leads || []).map(l => ({
        id: l.id,
        email: l.email,
        popupConfigId: l.popup_config_id,
        popupName: l.popup_configs?.name || 'Unknown',
        popupTitle: l.popup_configs?.title || 'Unknown',
        status: l.status,
        ipAddress: l.ip_address,
        userAgent: l.user_agent,
        createdAt: l.created_at
      })),
      page,
      limit,
      total: total || 0,
      totalPages: Math.ceil((total || 0) / limit)
    })
  } catch (err) {
    console.error('List popup leads error:', err)
    res.status(500).json({ error: 'Failed to fetch leads.' })
  }
})

// Admin: Export popup leads as CSV
app.get('/api/admin/popup-leads/export', async (req, res) => {
  try {
    const popupId = req.query.popupId
    
    let query = supabase
      .from('popup_leads')
      .select('*, popup_configs(name, title)')
    
    if (popupId) {
      query = query.eq('popup_config_id', popupId)
    }
    
    const { data: leads, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Generate CSV
    const csvRows = []
    csvRows.push('Email,Popup Name,Popup Title,Status,IP Address,Submitted At')
    
    for (const lead of leads || []) {
      const row = [
        lead.email,
        lead.popup_configs?.name || 'Unknown',
        `"${(lead.popup_configs?.title || 'Unknown').replace(/"/g, '""')}"`,
        lead.status,
        lead.ip_address || 'N/A',
        new Date(lead.created_at).toISOString()
      ]
      csvRows.push(row.join(','))
    }
    
    const csv = csvRows.join('\n')
    const filename = `popup-leads-${new Date().toISOString().split('T')[0]}.csv`
    
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(csv)
  } catch (err) {
    console.error('Export popup leads error:', err)
    res.status(500).json({ error: 'Failed to export leads.' })
  }
})

// Admin: Delete popup lead
app.delete('/api/admin/popup-leads/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('popup_leads').delete().eq('id', req.params.id)
    
    if (error) {
      return res.status(404).json({ error: 'Lead not found.' })
    }
    
    res.json({ success: true, message: 'Lead deleted.' })
  } catch (err) {
    console.error('Delete popup lead error:', err)
    res.status(500).json({ error: 'Failed to delete lead.' })
  }
})

// Fallback image helper
const fallbackImage = (slug = 'placeholder') => `https://picsum.photos/seed/${encodeURIComponent(slug)}/1024/1024`
const safeImageUrl = (doc) => {
  const url = doc?.image_url || doc?.imageUrl || ''
  if (!url) return fallbackImage(doc?.slug || 'placeholder')
  
  // Block temporary OpenAI URLs (they expire)
  if (url.includes('blob.core.windows.net') || url.includes('oaidalleapiprodscus')) {
    return fallbackImage(doc?.slug || 'placeholder')
  }
  
  // Allow Cloudinary URLs
  if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) return url
  
  // Allow picsum placeholder URLs
  if (url.includes('picsum.photos')) return url
  
  return url
}
const mapArticle = (a) => ({
  ...a,
  imageUrl: safeImageUrl(a),
  bodyMarkdown: a.body_markdown || '',
  bodyHtml: a.body_html || '',
  featureOrder: a.feature_order || 0,
  publishAt: a.publish_at || null,
  sourceUrl: a.source_url || '',
})
const mapAd = (ad) => {
  let imageUrl = ad.image_url || ad.imageUrl || ''
  // Fix incomplete placeholder URLs
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = `https://placehold.co/${imageUrl}`
  }
  return {
    id: ad._id?.toString() || ad.id,
    placement: ad.placement,
    size: ad.size,
    type: ad.type,
    imageUrl,
    href: ad.href,
    alt: ad.alt,
    html: ad.html,
    label: ad.label,
    active: ad.active !== false,
    order: ad.order || 0,
  }
}

const sanitizeAdPayload = (body = {}) => {
  const base = {
    placement: (body.placement || '').toString(),
    size: (body.size || '').toString(),
    type: (body.type || '').toString(),
    imageUrl: (body.imageUrl || '').toString(),
    href: (body.href || '').toString(),
    alt: (body.alt || '').toString(),
    html: (body.html || '').toString(),
    label: (body.label || '').toString(),
    active: body.active !== false,
    order: Number.isFinite(body.order) ? body.order : 0,
  }
  if (!base.placement) throw new Error('placement is required')
  if (!base.type) throw new Error('type is required')
  if (base.type === 'IMAGE_LINK') {
    if (!base.imageUrl) throw new Error('imageUrl is required for IMAGE_LINK')
    if (!base.href) throw new Error('href is required for IMAGE_LINK')
  }
  if (base.type === 'EMBED_SNIPPET') {
    if (!base.html) throw new Error('html is required for EMBED_SNIPPET')
  }
  return base
}

const getAdsByPlacement = async (placements = []) => {
  const results = {}
  for (const placement of placements) {
    const { data: items } = await supabase.from('ads').select('*').eq('placement', placement).eq('active', true).order('order').order('updated_at', { ascending: false })
    results[placement] = items || []
  }
  return results
}

const pickRandom = (list = []) => {
  if (!list.length) return []
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const start = async () => {
  console.log('✅ Connected to Supabase')
  await ensureAdmin()
  await seedArticles()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend (Supabase) running on http://0.0.0.0:${PORT}`)
    console.log(`Health check: http://0.0.0.0:${PORT}/api/public/version`)
  })
}

start().catch((err) => {
  console.error('Failed to start backend', err)
  process.exit(1)
})

