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

// CORS - allow Vercel frontend and localhost for dev
const allowedOrigins = [
  'https://uxdesignjournal.vercel.app',
  'https://uxdesignjournal.com',
  'http://localhost:3000',
  'http://localhost:5173',
]
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    // Allow any vercel preview URLs
    if (origin.endsWith('.vercel.app')) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(bodyParser.json())

// Helper to upload image to Cloudinary
async function uploadToCloudinary(imageUrl, slug) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn('Cloudinary not configured, using fallback')
    return null
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

const User = mongoose.model('User', UserSchema)
const Article = mongoose.model('Article', ArticleSchema)

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
      const img = await openai.images.generate({
        model: 'dall-e-3',
        prompt: `Create a classic Wall Street Journal Hedcut portrait illustration. Style: hand-drawn stipple dot technique, thousands of tiny black ink dots on pure white background, crosshatching for shadows, no solid fills, only dots and fine lines. Subject: a conceptual scene related to "${parsed.title || 'UX design'}". Must look exactly like a traditional newspaper Hedcut engraving - monochromatic black dots on white, high contrast, editorial illustration style.`,
        size: '1024x1024',
      })
      const tempUrl = img.data?.[0]?.url || ''
      if (!tempUrl) throw new Error('No image URL returned from OpenAI')
      // Download and save permanently
      const cloudinaryUrl = await uploadToCloudinary(tempUrl, slugBase)
      imageUrl = cloudinaryUrl || fallbackImage(slugBase)
      console.log('Image saved permanently:', imageUrl)
    } catch (err) {
      console.error('Image gen failed', err?.message || err)
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
    const img = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Create a classic Wall Street Journal Hedcut portrait illustration. Style: hand-drawn stipple dot technique, thousands of tiny black ink dots on pure white background, crosshatching for shadows, no solid fills, only dots and fine lines. Subject: a conceptual scene related to "${article.title || 'UX design'}". Must look exactly like a traditional newspaper Hedcut engraving - monochromatic black dots on white, high contrast, editorial illustration style.`,
      size: '1024x1024',
    })
    const tempUrl = img.data?.[0]?.url
    if (!tempUrl) throw new Error('No image URL returned from OpenAI')
    
    // Download and save permanently
    const cloudinaryUrl = await uploadToCloudinary(tempUrl, article.slug)
    const imageUrl = cloudinaryUrl || fallbackImage(article.slug)
    
    article.imageUrl = imageUrl
    await article.save()
    console.log('Image regen success for', article.slug, '->', imageUrl)
    res.json({ imageUrl })
  } catch (err) {
    console.error('Image regen failed', err?.message || err)
    const fallback = fallbackImage(article.slug)
    article.imageUrl = fallback
    await article.save()
    res.status(200).json({ imageUrl: fallback, warning: 'OpenAI failed; using fallback image' })
  }
})

// Public endpoints
app.get('/api/public/categories', (_req, res) => {
  res.json(categories)
})

app.get('/api/public/homepage', async (_req, res) => {
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
    ads: { sidebar: [], inline: [] },
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
  const a = await Article.findOne({ slug: req.params.slug }).lean()
  if (!a) return res.status(404).json({ message: 'Not found' })
  const related = await Article.find({ slug: { $ne: a.slug }, status: 'published' }).limit(3).lean()
  res.json({ ...mapArticle(a), related: related.map(mapArticle), ads: { sidebar: [], inline: [] } })
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

app.post('/api/public/subscribe', (_req, res) => {
  res.json({ success: true, message: 'Subscribed.' })
})

app.post('/api/public/session/heartbeat', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/public/session/identify', (_req, res) => {
  res.json({ ok: true })
})

// Fallback image helper
const fallbackImage = (slug = 'placeholder') => `https://picsum.photos/seed/${encodeURIComponent(slug)}/1024/1024?grayscale`
const safeImageUrl = (doc) => {
  const url = doc?.imageUrl || ''
  if (!url) return fallbackImage(doc?.slug || 'placeholder')
  
  // Allow Cloudinary URLs
  if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) return url
  
  // Allow picsum placeholder URLs
  if (url.includes('picsum.photos')) return url
  
  const lowered = url.toLowerCase()
  // Replace expired OpenAI blob URLs and mock upload URLs with placeholders
  if (
    lowered.includes('oaidalle') ||
    lowered.includes('blob.core.windows.net') ||
    lowered.includes('images.example.com') ||
    lowered.includes('/uploads/')
  ) {
    return fallbackImage(doc?.slug || 'placeholder')
  }
  return url
}
const mapArticle = (a) => ({ ...a, imageUrl: safeImageUrl(a) })

const start = async () => {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to Mongo')
  await ensureAdmin()
  await seedArticles()
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start backend', err)
  process.exit(1)
})

