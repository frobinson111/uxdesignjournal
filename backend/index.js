// Backend v2.0.0 - Ads management, article delete
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import multer from 'multer'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { v4 as uuid } from 'uuid'
import OpenAI from 'openai'
import { extract } from '@extractus/article-extractor'
import { v2 as cloudinary } from 'cloudinary'

dotenv.config()

const PORT = process.env.PORT || 4000
const MONGO_URI = process.env.MONGO_URI
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

if (!MONGO_URI) {
  console.error('Missing MONGO_URI. Set it in backend/.env')
  process.exit(1)
}

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
  'http://localhost:5173',
]

const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const allowedOrigins = [...baseAllowedOrigins, ...envAllowedOrigins]

const isAllowedOrigin = (_origin) => true // Temporarily allow all origins while debugging CORS
app.use(cors({
  origin: (origin, callback) => {
    // Reflect request origin (needed for credentials + wildcard)
    callback(null, origin || true)
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

// Helper to upload image to Cloudinary
async function uploadToCloudinary(imageUrl, slug) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn('Cloudinary not configured, returning source image URL')
    return imageUrl || null
  }
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      public_id: `uxdj/${slug}-${Date.now()}`,
      folder: 'uxdesignjournal',
      transformation: [{ width: 1024, height: 1024, crop: 'limit' }],
    })
    console.log('Uploaded to Cloudinary:', result.secure_url)
    return result.secure_url
  } catch (err) {
    console.error('Cloudinary upload failed:', err?.message || err)
    return null
  }
}

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

// Schemas
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, default: 'admin' },
  status: { type: String, default: 'active' },
}, { timestamps: true })

const ArticleSchema = new mongoose.Schema({
  slug: { type: String, unique: true },
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
  status: { type: String, default: 'draft' },
  publishAt: String,
  featured: { type: Boolean, default: false },
  featureOrder: { type: Number, default: 0 },
}, { timestamps: true })

const AdSchema = new mongoose.Schema({
  placement: { type: String, required: true },
  size: { type: String, default: '' },
  type: { type: String, enum: ['IMAGE_LINK', 'EMBED_SNIPPET'], required: true },
  imageUrl: String,
  href: String,
  alt: String,
  html: String,
  label: String,
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true })

const SubscriberSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  status: { type: String, default: 'active' }, // 'active' | 'unsubscribed'
  source: { type: String, default: 'newsletter-form' },
}, { timestamps: true })

const User = mongoose.model('User', UserSchema)
const Article = mongoose.model('Article', ArticleSchema)
const Ad = mongoose.model('Ad', AdSchema)
const Subscriber = mongoose.model('Subscriber', SubscriberSchema)

// Seed admin
const ensureAdmin = async () => {
  const existing = await User.findOne({ email: ADMIN_EMAIL })
  if (existing) return
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  await User.create({ email: ADMIN_EMAIL, passwordHash, role: 'admin', status: 'active' })
  console.log('Seeded admin user', ADMIN_EMAIL)
}

// Seed sample articles if empty
const seedArticles = async () => {
  const count = await Article.estimatedDocumentCount()
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
      bodyMarkdown: '## Lead story\n\nDesign ships when someone owns the call.',
      featured: true,
      featureOrder: 1,
      status: 'published',
    },
    {
      slug: 'long-middle-design-career',
      title: 'The Long Middle of a Design Career',
      excerpt: 'After momentum fades and before legacy forms, most designers live here.',
      category: 'career',
      date: now.toISOString().split('T')[0],
      bodyMarkdown: 'Middle career realities.',
      status: 'published',
    },
    {
      slug: 'ai-didnt-change-ux',
      title: 'AI Didn’t Change UX. Compliance Did.',
      excerpt: 'The quiet shift reshaping authority inside design teams.',
      category: 'signals',
      date: now.toISOString().split('T')[0],
      status: 'published',
    },
    {
      slug: 'good-design-misalignment',
      title: 'Good Design Doesn’t Survive Bad Alignment',
      excerpt: 'Talent cannot outwork misalignment. Stop trying.',
      category: 'practice',
      date: now.toISOString().split('T')[0],
      status: 'published',
    },
  ]
  await Article.insertMany(samples)
  console.log('Seeded sample articles')
}

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body || {}
  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })
  const ok = await bcrypt.compare(password || '', user.passwordHash || '')
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
  return res.json({ token: 'dev-token', user: { email: user.email } })
})

// Admin list articles
app.get('/api/admin/articles', async (req, res) => {
  const page = Number(req.query.page) || 1
  const limit = 10
  const q = (req.query.q || '').toString().trim().toLowerCase()
  const filter = {}
  if (q) filter.title = { $regex: q, $options: 'i' }
  const total = await Article.countDocuments(filter)
  const items = await Article.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
  res.json({
    items: items.map((a) => ({
      id: a.slug,
      slug: a.slug,
      title: a.title,
      category: a.category,
      date: a.date,
      status: a.status,
      featured: a.featured,
      featureOrder: a.featureOrder,
      imageUrl: safeImageUrl(a),
    })),
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  })
})

// Admin get article
app.get('/api/admin/articles/:slug', async (req, res) => {
  const a = await Article.findOne({ slug: req.params.slug }).lean()
  if (!a) return res.status(404).json({ message: 'Not found' })
  res.json(mapArticle(a))
})

// Admin create
app.post('/api/admin/articles', async (req, res) => {
  const body = req.body || {}
  const slug = body.slug ? slugify(body.slug) : slugify(body.title || uuid())
  const exists = await Article.findOne({ slug })
  if (exists) return res.status(400).json({ message: 'Slug already exists' })
  const record = await Article.create({ ...body, slug })
  res.json(record)
})

// Admin update
app.put('/api/admin/articles/:slug', async (req, res) => {
  const updated = await Article.findOneAndUpdate(
    { slug: req.params.slug },
    { ...req.body, slug: req.params.slug },
    { new: true }
  )
  if (!updated) return res.status(404).json({ message: 'Not found' })
  res.json(updated)
})

app.delete('/api/admin/articles/:slug', async (req, res) => {
  const deleted = await Article.findOneAndDelete({ slug: req.params.slug })
  if (!deleted) return res.status(404).json({ message: 'Not found' })
  res.json({ ok: true })
})

// Admin ads CRUD
app.get('/api/admin/ads', async (req, res) => {
  const placement = (req.query.placement || '').toString()
  const filter = placement ? { placement } : {}
  const ads = await Ad.find(filter).sort({ placement: 1, order: 1, updatedAt: -1 }).lean()
  res.json(ads)
})

app.post('/api/admin/ads', async (req, res) => {
  try {
    const payload = sanitizeAdPayload(req.body || {})
    const created = await Ad.create(payload)
    res.json(created)
  } catch (err) {
    res.status(400).json({ message: err.message || 'Invalid payload' })
  }
})

app.put('/api/admin/ads/:id', async (req, res) => {
  try {
    const payload = sanitizeAdPayload(req.body || {})
    const updated = await Ad.findByIdAndUpdate(req.params.id, payload, { new: true })
    if (!updated) return res.status(404).json({ message: 'Not found' })
    res.json(updated)
  } catch (err) {
    res.status(400).json({ message: err.message || 'Invalid payload' })
  }
})

app.delete('/api/admin/ads/:id', async (req, res) => {
  const deleted = await Ad.findByIdAndDelete(req.params.id)
  if (!deleted) return res.status(404).json({ message: 'Not found' })
  res.json({ ok: true })
})

// Admin stats
app.get('/api/admin/stats', async (_req, res) => {
  try {
    const [subscribersCount, articlesCount, adsCount, adminsCount] = await Promise.all([
      Subscriber.countDocuments({ status: 'active' }),
      Article.countDocuments({}),
      Ad.countDocuments({}),
      User.countDocuments({ role: 'admin' }),
    ])
    
    const recentArticles = await Article.find({}).sort({ createdAt: -1 }).limit(6).select('title slug createdAt').lean()
    const recentSubscribers = await Subscriber.find({}).sort({ createdAt: -1 }).limit(4).select('email createdAt').lean()
    
    // Simple trend data (last 7 days vs previous 7 days)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    
    const [subsRecent, subsPrevious, articlesRecent, articlesPrevious] = await Promise.all([
      Subscriber.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Subscriber.countDocuments({ createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }),
      Article.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Article.countDocuments({ createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }),
    ])
    
    res.json({
      subscribers: subscribersCount,
      articles: articlesCount,
      categories: categories.length,
      ads: adsCount,
      admins: adminsCount,
      recentEvents: [
        ...recentArticles.map((a) => ({ type: 'article', title: a.title, slug: a.slug, date: a.createdAt })),
        ...recentSubscribers.map((s) => ({ type: 'subscriber', email: s.email, date: s.createdAt })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10),
      trends: {
        subscribers: { current: subsRecent, previous: subsPrevious },
        articles: { current: articlesRecent, previous: articlesPrevious },
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
  const filter = q ? { email: { $regex: q, $options: 'i' } } : {}
  const total = await Subscriber.countDocuments(filter)
  const items = await Subscriber.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
  res.json({
    items: items.map((s) => ({
      id: s._id,
      email: s.email,
      status: s.status,
      source: s.source,
      subscribedAt: s.createdAt,
    })),
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    total,
  })
})

app.put('/api/admin/subscribers/:email', async (req, res) => {
  const { status } = req.body || {}
  const updated = await Subscriber.findOneAndUpdate(
    { email: req.params.email },
    { status },
    { new: true }
  )
  if (!updated) return res.status(404).json({ message: 'Not found' })
  res.json(updated)
})

app.delete('/api/admin/subscribers/:email', async (req, res) => {
  const deleted = await Subscriber.findOneAndDelete({ email: req.params.email })
  if (!deleted) return res.status(404).json({ message: 'Not found' })
  res.json({ ok: true })
})

app.post('/api/admin/subscribers/bulk-delete', async (req, res) => {
  const { emails } = req.body || {}
  if (!Array.isArray(emails)) return res.status(400).json({ message: 'emails array required' })
  const result = await Subscriber.deleteMany({ email: { $in: emails } })
  res.json({ deleted: result.deletedCount })
})

// Upload mock
app.post('/api/admin/uploads', upload.single('file'), (req, res) => {
  const filename = req.file ? req.file.originalname : 'upload'
  res.json({ url: `https://images.example.com/${Date.now()}-${filename}` })
})

// AI generate article
app.post('/api/admin/ai/generate', async (req, res) => {
  if (!openai) return res.status(500).json({ message: 'OPENAI_API_KEY not configured' })
  const { category, sourceUrl, mode = 'rewrite' } = req.body || {}
  if (!category) return res.status(400).json({ message: 'category is required' })

  try {
    let sourceText = ''
    if (sourceUrl) {
      const extracted = await extract(sourceUrl).catch(() => null)
      sourceText = extracted?.content || extracted?.text || extracted?.description || ''
    }

    const prompt = [
      { role: 'system', content: 'You are an editor for a newspaper-style UX publication. Output JSON only.' },
      { role: 'user', content: `Write an article for category "${category}" in a calm, authoritative tone.\nMode: ${mode}\nSource:\n${sourceText.slice(0, 6000)}` },
      { role: 'user', content: 'Return JSON with keys: title, dek, excerpt, body_markdown. Body should include h2s, bullets if useful.' },
    ]

    const aiResp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: prompt,
      temperature: 0.7,
      max_tokens: 900,
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
      prompt: `A black and white stipple engraving portrait in the exact style of Wall Street Journal Hedcut illustrations. The image must use only tiny black ink dots (stippling technique) and fine crosshatch lines on a pure white background to create the portrait. No solid black fills, no gradients, no shading, no gray tones - only individual black dots of varying density. High contrast. Hand-drawn stipple dot technique. The subject should be a conceptual editorial illustration related to "${parsed.title || 'UX design'}". Must look like it was hand-engraved for a 1980s newspaper. Reference: classic WSJ Hedcut portraits by Kevin Sprouls.`,
      size: '1024x1024',
      quality: 'hd',
      style: 'natural',
    })
      const tempUrl = img.data?.[0]?.url || ''
      if (!tempUrl) throw new Error('No image URL returned from OpenAI')
      console.log('OpenAI returned image URL:', tempUrl)
      // Download and save permanently
      const cloudinaryUrl = await uploadToCloudinary(tempUrl, slugBase)
      imageUrl = cloudinaryUrl || tempUrl // Use OpenAI URL if Cloudinary fails
      console.log('Image saved permanently:', imageUrl)
    } catch (err) {
      console.error('Image gen failed', err?.message || err)
      console.error('OpenAI error details:', err)
      imageUrl = fallbackImage(slugBase)
    }

    let slug = slugBase
    let suffix = 1
    while (await Article.findOne({ slug })) {
      slug = `${slugBase}-${suffix++}`
    }

    const record = await Article.create({
      slug,
      title: parsed.title || 'Untitled',
      dek: parsed.dek || parsed.excerpt,
      excerpt: parsed.excerpt || parsed.dek,
      bodyMarkdown: parsed.body_markdown || parsed.body || '',
      category,
      status: 'draft',
      featured: false,
      featureOrder: 0,
      imageUrl,
      aiGenerated: true,
      aiProvider: 'openai',
      sourceUrl: sourceUrl || '',
    })

    res.json({ slug: record.slug, status: record.status })
  } catch (err) {
    console.error('AI generate failed', err)
    res.status(500).json({ message: 'AI generation failed' })
  }
})

// AI regenerate image for an article
app.post('/api/admin/ai/regenerate-image/:slug', async (req, res) => {
  if (!openai) return res.status(500).json({ message: 'OPENAI_API_KEY not configured' })
  const article = await Article.findOne({ slug: req.params.slug })
  if (!article) return res.status(404).json({ message: 'Article not found' })

  try {
    console.log('Regenerating Hedcut image for:', article.title)
    const img = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `A black and white stipple engraving portrait in the exact style of Wall Street Journal Hedcut illustrations. The image must use only tiny black ink dots (stippling technique) and fine crosshatch lines on a pure white background to create the portrait. No solid black fills, no gradients, no shading, no gray tones - only individual black dots of varying density. High contrast. Hand-drawn stipple dot technique. The subject should be a conceptual editorial illustration related to "${article.title || 'UX design'}". Must look like it was hand-engraved for a 1980s newspaper. Reference: classic WSJ Hedcut portraits by Kevin Sprouls.`,
      size: '1024x1024',
      quality: 'hd',
      style: 'natural',
    })
    const tempUrl = img.data?.[0]?.url
    if (!tempUrl) throw new Error('No image URL returned from OpenAI')
    console.log('OpenAI returned image URL for regen:', tempUrl)
    
    // Download and save permanently
    const cloudinaryUrl = await uploadToCloudinary(tempUrl, article.slug)
    const imageUrl = cloudinaryUrl || tempUrl // Use OpenAI URL if Cloudinary fails
    
    article.imageUrl = imageUrl
    await article.save()
    console.log('Image regen success for', article.slug, '->', imageUrl)
    res.json({ imageUrl })
  } catch (err) {
    console.error('Image regen failed', err?.message || err)
    const fallback = fallbackImage(article.slug)
    article.imageUrl = fallback
    await article.save()
    res.status(200).json({ imageUrl: fallback, warning: 'OpenAI generation failed; using fallback image' })
  }
})

// Public endpoints
app.get('/api/public/categories', (_req, res) => {
  res.json(categories)
})

app.get('/api/public/homepage', async (_req, res) => {
  const adPlacements = await getAdsByPlacement(['homepage-latest', 'homepage-lead'])
  const pickPlacement = (key) => pickRandom(adPlacements[key] || []).map(mapAd)

  const latest = await Article.find({ status: 'published' }).sort({ createdAt: -1 }).limit(6).lean()
  const lead = latest[0] ? mapArticle(latest[0]) : null
  const daily = latest.slice(0, 4).map(mapArticle)
  const featured = await Article.find({ featured: true, status: 'published' })
    .sort({ featureOrder: 1, createdAt: -1 })
    .limit(6)
    .lean()
  const tiles = await Article.find({ status: 'published' }).sort({ createdAt: -1 }).limit(4).lean()
  res.json({
    categories,
    latest: latest.map(mapArticle),
    lead,
    daily,
    featured: featured.map(mapArticle),
    tiles: tiles.map(mapArticle),
    ads: {
      sidebar: pickPlacement('homepage-latest'),
      inline: pickPlacement('homepage-lead'),
    },
  })
})

app.get('/api/public/category/:slug', async (req, res) => {
  const cat = categories.find((c) => c.slug === req.params.slug)
  if (!cat) return res.status(404).json({ message: 'Not found' })
  const filtered = await Article.find({
    category: cat.slug,
    status: 'published',
  }).sort({ createdAt: -1 }).lean()
  res.json({
    category: cat,
    articles: filtered.map(mapArticle),
    daily: filtered.slice(0, 3).map(mapArticle),
    page: 1,
    totalPages: 1,
  })
})

app.get('/api/public/article/:slug', async (req, res) => {
  const adPlacements = await getAdsByPlacement(['article-inline', 'article-readmore', 'article-sidebar'])
  const pickPlacement = (key) => pickRandom(adPlacements[key] || []).map(mapAd)

  const a = await Article.findOne({ slug: req.params.slug }).lean()
  if (!a) return res.status(404).json({ message: 'Not found' })
  const related = await Article.find({ slug: { $ne: a.slug }, status: 'published' }).limit(3).lean()
  res.json({
    ...mapArticle(a),
    related: related.map(mapArticle),
    ads: {
      sidebar: pickPlacement('article-sidebar'),
      inline: [...pickPlacement('article-inline'), ...pickPlacement('article-readmore')],
    },
  })
})

app.get('/api/public/archive', async (req, res) => {
  const page = Number(req.query.page) || 1
  const limit = 20
  const total = await Article.countDocuments({ status: 'published' })
  const results = await Article.find({ status: 'published' })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
  res.json({
    results: results.map((a) => ({
      headline: a.title,
      slug: a.slug,
      category: a.category,
      date: a.date,
      imageUrl: safeImageUrl(a),
    })),
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  })
})

app.get('/api/public/search', async (req, res) => {
  const q = (req.query.q || '').toString().trim()
  const page = Number(req.query.page) || 1
  const limit = 20
  const filter = q ? { title: { $regex: q, $options: 'i' }, status: 'published' } : { status: 'published' }
  const total = await Article.countDocuments(filter)
  const results = await Article.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
  res.json({
    results: results.map((a) => ({
      headline: a.title,
      slug: a.slug,
      category: a.category,
      date: a.date,
      imageUrl: safeImageUrl(a),
    })),
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  })
})

app.post('/api/public/subscribe', async (req, res) => {
  const { email, source = 'newsletter-form' } = req.body || {}
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Valid email required.' })
  }
  try {
    const existing = await Subscriber.findOne({ email })
    if (existing) {
      if (existing.status === 'unsubscribed') {
        existing.status = 'active'
        await existing.save()
        return res.json({ success: true, message: 'Resubscribed successfully.' })
      }
      return res.json({ success: true, message: 'Already subscribed.' })
    }
    await Subscriber.create({ email, source, status: 'active' })
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

// Fallback image helper
const fallbackImage = (slug = 'placeholder') => `https://picsum.photos/seed/${encodeURIComponent(slug)}/1024/1024`
const safeImageUrl = (doc) => {
  const url = doc?.imageUrl || ''
  if (!url) return fallbackImage(doc?.slug || 'placeholder')
  
  // Allow Cloudinary URLs
  if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) return url
  
  // Allow picsum placeholder URLs
  if (url.includes('picsum.photos')) return url
  
  return url
}
const mapArticle = (a) => ({ ...a, imageUrl: safeImageUrl(a) })
const mapAd = (ad) => ({
  id: ad._id?.toString() || ad.id,
  placement: ad.placement,
  size: ad.size,
  type: ad.type,
  imageUrl: ad.imageUrl,
  href: ad.href,
  alt: ad.alt,
  html: ad.html,
  label: ad.label,
})

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
    const items = await Ad.find({ placement, active: true }).sort({ order: 1, updatedAt: -1 }).lean()
    results[placement] = items
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
  await mongoose.connect(MONGO_URI)
  console.log('Connected to Mongo')
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

