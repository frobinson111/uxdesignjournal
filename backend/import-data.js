#!/usr/bin/env node
/**
 * Import MongoDB Backup to Supabase
 * Reads JSON files from backup directory and imports to PostgreSQL
 * Run: node migration-scripts/2-import-data.js
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// ES module dirname workaround
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: Missing Supabase credentials in backend/.env')
  console.error('Please add:')
  console.error('  SUPABASE_URL=https://your-project.supabase.co')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
  process.exit(1)
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Backup directory
const backupDir = path.join(__dirname, '../migration-data/backup-latest')

console.log('🔄 Supabase Data Import Script')
console.log('=' .repeat(60))
console.log(`📁 Reading from: ${backupDir}`)
console.log(`🔗 Supabase URL: ${SUPABASE_URL}`)
console.log('=' .repeat(60))
console.log()

// Helper: Transform MongoDB document to PostgreSQL row
// Note: Omitting 'id' field - PostgreSQL will generate new UUIDs
function transformUser(doc) {
  return {
    email: doc.email,
    password_hash: doc.passwordHash,
    role: doc.role || 'admin',
    status: doc.status || 'active',
    created_at: doc.createdAt,
    updated_at: doc.updatedAt
  }
}

function transformArticle(doc) {
  return {
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt || null,
    dek: doc.dek || null,
    category: doc.category || null,
    date: doc.date || null,
    author: doc.author || null,
    image_url: doc.imageUrl || null,
    body_html: doc.bodyHtml || null,
    body_markdown: doc.bodyMarkdown || null,
    tags: doc.tags || [],
    status: doc.status || 'draft',
    publish_at: doc.publishAt || null,
    featured: doc.featured || false,
    feature_order: doc.featureOrder || 0,
    ai_generated: doc.aiGenerated || false,
    ai_provider: doc.aiProvider || null,
    source_url: doc.sourceUrl || null,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt
  }
}

function transformAd(doc) {
  return {
    placement: doc.placement,
    size: doc.size || null,
    type: doc.type,
    image_url: doc.imageUrl || null,
    href: doc.href || null,
    alt: doc.alt || null,
    html: doc.html || null,
    label: doc.label || null,
    active: doc.active !== undefined ? doc.active : true,
    order: doc.order || 0,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt
  }
}

function transformSubscriber(doc) {
  return {
    email: doc.email,
    status: doc.status || 'active',
    source: doc.source || 'newsletter-form',
    created_at: doc.createdAt,
    updated_at: doc.updatedAt
  }
}

function transformContact(doc) {
  return {
    name: doc.name,
    email: doc.email,
    phone: doc.phone || null,
    subject: doc.subject,
    message: doc.message,
    status: doc.status || 'new',
    ip_address: doc.ipAddress || null,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt
  }
}

// Import collection
async function importCollection(tableName, transformFn) {
  try {
    const filepath = path.join(backupDir, `${tableName}.json`)
    
    if (!fs.existsSync(filepath)) {
      console.error(`✗ File not found: ${filepath}`)
      return { success: false, count: 0 }
    }

    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`ℹ️  ${tableName}: No data to import (0 documents)`)
      return { success: true, count: 0 }
    }

    console.log(`📦 Importing ${tableName}: ${data.length} documents`)
    
    const transformed = data.map(transformFn)
    
    // Batch insert (Supabase recommends 1000 rows per insert)
    const batchSize = 1000
    let totalInserted = 0
    
    for (let i = 0; i < transformed.length; i += batchSize) {
      const batch = transformed.slice(i, i + batchSize)
      const { data: inserted, error } = await supabase
        .from(tableName)
        .insert(batch)
        .select()
      
      if (error) {
        console.error(`✗ Error importing ${tableName}:`, error)
        throw error
      }
      
      totalInserted += batch.length
      console.log(`   ✓ Imported batch ${Math.floor(i / batchSize) + 1}: ${batch.length} rows (${totalInserted}/${transformed.length})`)
    }
    
    console.log(`✅ ${tableName}: Successfully imported ${totalInserted} documents\n`)
    return { success: true, count: totalInserted }
    
  } catch (err) {
    console.error(`❌ Failed to import ${tableName}:`, err.message)
    return { success: false, count: 0, error: err.message }
  }
}

// Main import function
async function runImport() {
  const results = {
    timestamp: new Date().toISOString(),
    collections: {}
  }
  
  try {
    // Verify backup directory exists
    if (!fs.existsSync(backupDir)) {
      console.error(`❌ Backup directory not found: ${backupDir}`)
      console.error('Please run the MongoDB backup script first!')
      process.exit(1)
    }
    
    // Test Supabase connection
    console.log('🔌 Testing Supabase connection...')
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true })
    if (error) {
      console.error('❌ Failed to connect to Supabase:', error.message)
      console.error('Please check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
      process.exit(1)
    }
    console.log('✅ Connected to Supabase\n')
    
    // Import each collection
    results.collections.users = await importCollection('users', transformUser)
    results.collections.articles = await importCollection('articles', transformArticle)
    results.collections.ads = await importCollection('ads', transformAd)
    results.collections.subscribers = await importCollection('subscribers', transformSubscriber)
    results.collections.contacts = await importCollection('contacts', transformContact)
    
    // Summary
    console.log('=' .repeat(60))
    console.log('✅ IMPORT COMPLETE')
    console.log('=' .repeat(60))
    console.log('📊 Summary:')
    
    let totalImported = 0
    let failedCollections = 0
    
    for (const [name, result] of Object.entries(results.collections)) {
      if (result.success) {
        console.log(`   ✓ ${name}: ${result.count} documents`)
        totalImported += result.count
      } else {
        console.log(`   ✗ ${name}: FAILED - ${result.error}`)
        failedCollections++
      }
    }
    
    console.log()
    console.log(`Total Documents Imported: ${totalImported}`)
    console.log(`Failed Collections: ${failedCollections}`)
    
    if (failedCollections > 0) {
      console.log()
      console.log('⚠️  Some collections failed to import. Please check errors above.')
      process.exit(1)
    }
    
    // Verify counts in Supabase
    console.log()
    console.log('🔍 Verifying data in Supabase...')
    
    for (const tableName of ['users', 'articles', 'ads', 'subscribers', 'contacts']) {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.log(`   ✗ ${tableName}: Error checking count - ${error.message}`)
      } else {
        const expected = results.collections[tableName].count
        const match = count === expected ? '✓' : '✗'
        console.log(`   ${match} ${tableName}: ${count} rows (expected: ${expected})`)
      }
    }
    
    console.log()
    console.log('=' .repeat(60))
    console.log('🎉 Migration successful! Your data is now in Supabase.')
    console.log('=' .repeat(60))
    console.log()
    console.log('Next steps:')
    console.log('  1. Verify data in Supabase Table Editor')
    console.log('  2. Run: node migration-scripts/3-refactor-backend.js')
    console.log('  3. Test your API endpoints')
    
  } catch (err) {
    console.error('\n❌ IMPORT FAILED:', err.message)
    console.error('\nFull error:', err)
    process.exit(1)
  }
}

// Run import
runImport()
