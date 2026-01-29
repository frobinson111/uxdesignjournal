#!/usr/bin/env node
/**
 * Automated Backend Refactoring Script
 * Converts backend/index.js from Mongoose to Supabase
 * 
 * Usage: node migration-scripts/3-refactor-backend.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INPUT_FILE = path.join(__dirname, '../backend/index.js')
const OUTPUT_FILE = path.join(__dirname, '../backend/index-supabase.js')
const BACKUP_FILE = path.join(__dirname, '../backend/index.js.backup')

console.log('🔄 Automated Backend Refactoring Script')
console.log('=' .repeat(60))
console.log('Input:', INPUT_FILE)
console.log('Output:', OUTPUT_FILE)
console.log('=' .repeat(60))
console.log()

// Read the original file
let code = fs.readFileSync(INPUT_FILE, 'utf8')

console.log('📝 Original file size:', code.length, 'characters')
console.log()

// Backup original
fs.copyFileSync(INPUT_FILE, BACKUP_FILE)
console.log('✅ Backup created:', BACKUP_FILE)
console.log()

console.log('🔧 Applying transformations...')
console.log()

// 1. Replace imports
console.log('  1/10 Replacing imports...')
code = code.replace(
  "import mongoose from 'mongoose'",
  "import { supabase } from './db/supabase.js'"
)

// 2. Remove MONGO_URI
console.log('  2/10 Removing MONGO_URI reference...')
code = code.replace(/const MONGO_URI = process\.env\.MONGO_URI\n/g, '')
code = code.replace(/if \(!MONGO_URI\) \{[\s\S]*?\}\n/g, '')

// 3. Remove all Mongoose schemas (between const UserSchema and const User/Article/etc models)
console.log('  3/10 Removing Mongoose schemas...')
code = code.replace(/\/\/ Schemas[\s\S]*?const Contact = mongoose\.model\('Contact', ContactSchema\)\n/g, '')

// 4. Update ensureAdmin function
console.log('  4/10 Refactoring ensureAdmin()...')
const ensureAdminOld = /const ensureAdmin = async \(\) => \{[\s\S]*?console\.log\('Seeded admin user', ADMIN_EMAIL\)\n\}/
const ensureAdminNew = `const ensureAdmin = async () => {
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
}`
code = code.replace(ensureAdminOld, ensureAdminNew)

// 5. Update seedArticles function  
console.log('  5/10 Refactoring seedArticles()...')
const seedArticlesOld = /const seedArticles = async \(\) => \{[\s\S]*?console\.log\('Seeded sample articles'\)\n\}/
const seedArticlesNew = `const seedArticles = async () => {
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
      body_markdown: '## Lead story\\n\\nDesign ships when someone owns the call.',
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
      body_markdown: 'Middle career realities.',
      status: 'published',
    },
    {
      slug: 'ai-didnt-change-ux',
      title: 'AI Didn't Change UX. Compliance Did.',
      excerpt: 'The quiet shift reshaping authority inside design teams.',
      category: 'signals',
      date: now.toISOString().split('T')[0],
      status: 'published',
    },
    {
      slug: 'good-design-misalignment',
      title: 'Good Design Doesn't Survive Bad Alignment',
      excerpt: 'Talent cannot outwork misalignment. Stop trying.',
      category: 'practice',
      date: now.toISOString().split('T')[0],
      status: 'published',
    },
  ]
  
  const { error: insertError } = await supabase.from('articles').insert(samples)
  if (insertError) {
    console.error('Error seeding articles:', insertError)
  } else {
    console.log('Seeded sample articles')
  }
}`
code = code.replace(seedArticlesOld, seedArticlesNew)

// 6. Update database connection in start() function
console.log('  6/10 Updating start() function...')
code = code.replace(
  /await mongoose\.connect\(MONGO_URI\)\n  console\.log\('Connected to Mongo'\)/,
  "console.log('✅ Connected to Supabase')"
)

// 7. Add comment about field name mapping
console.log('  7/10 Adding field name mapping note...')
const fieldMappingComment = `
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
`
code = code.replace(
  /const categories = \[/,
  fieldMappingComment + '\nconst categories = ['
)

// 8. Update comments
console.log('  8/10 Updating comments...')
code = code.replace('// Backend v2.0.0', '// Backend v3.0.0 - Supabase Migration')
code = code.replace(/Backend running on/g, 'Backend (Supabase) running on')

// 9. Add NOTE at top about manual review needed
console.log('  9/10 Adding review notice...')
const reviewNotice = `
// ⚠️  GENERATED FILE - REQUIRES MANUAL REVIEW
// This file was automatically refactored from Mongoose to Supabase.
// Please review all database queries before deploying to production.
// 
// Key changes made:
// - Removed Mongoose schemas and models
// - Updated to use Supabase client from ./db/supabase.js
// - Field names remain in camelCase (need manual conversion to snake_case in queries)
// - All Model.find/create/update/delete patterns need manual conversion
//
// Next steps:
// 1. Search for all remaining "await User." / "await Article." / "await Ad." patterns
// 2. Convert each to Supabase query format
// 3. Update field names from camelCase to snake_case
// 4. Test locally before deploying
//
`
code = reviewNotice + code

// 10. Write output file
console.log('  10/10 Writing output file...')
fs.writeFileSync(OUTPUT_FILE, code, 'utf8')

console.log()
console.log('=' .repeat(60))
console.log('✅ REFACTORING COMPLETE')
console.log('=' .repeat(60))
console.log()
console.log('📊 Summary:')
console.log('  • Original file backed up to:', BACKUP_FILE)
console.log('  • Refactored file created:', OUTPUT_FILE)
console.log('  • New file size:', code.length, 'characters')
console.log()
console.log('⚠️  IMPORTANT: This is a PARTIAL automated refactoring!')
console.log()
console.log('Still requires MANUAL work:')
console.log('  1. Search for "await User." - convert to supabase.from("users")')
console.log('  2. Search for "await Article." - convert to supabase.from("articles")')
console.log('  3. Search for "await Ad." - convert to supabase.from("ads")')
console.log('  4. Search for "await Subscriber." - convert to supabase.from("subscribers")')
console.log('  5. Search for "await Contact." - convert to supabase.from("contacts")')
console.log('  6. Update all field names: camelCase → snake_case')
console.log()
console.log('📖 Use BACKEND_REFACTORING_GUIDE.md for conversion patterns')
console.log()
console.log('Next steps:')
console.log('  1. Open backend/index-supabase.js')
console.log('  2. Search for remaining "User.\\|Article.\\|Ad." patterns')
console.log('  3. Convert each using the guide')
console.log('  4. Test locally: node backend/index-supabase.js')
console.log('  5. When ready: mv backend/index-supabase.js backend/index.js')
console.log('  6. Deploy to Railway')
