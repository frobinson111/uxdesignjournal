#!/usr/bin/env node
/**
 * MongoDB Backup Script
 * Exports all collections to timestamped JSON files
 * Run: node migration-scripts/backup-mongodb.js
 */

import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// ES module dirname workaround
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../backend/.env') })

const MONGO_URI = process.env.MONGO_URI

if (!MONGO_URI) {
  console.error('❌ ERROR: MONGO_URI not found in backend/.env')
  console.error('Please ensure backend/.env contains: MONGO_URI=mongodb+srv://...')
  process.exit(1)
}

// Create timestamped backup directory
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
const backupDir = path.join(__dirname, `../migration-data/backup-${timestamp}`)

console.log('🔄 MongoDB Backup Script')
console.log('=' .repeat(60))
console.log(`📁 Backup directory: ${backupDir}`)
console.log(`🔗 MongoDB URI: ${MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`)
console.log('=' .repeat(60))
console.log()

// Collections to backup
const collections = [
  'users',
  'articles', 
  'ads',
  'subscribers',
  'contacts'
]

// Mongoose schemas (simple schemas for backup purposes)
const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' })
const ArticleSchema = new mongoose.Schema({}, { strict: false, collection: 'articles' })
const AdSchema = new mongoose.Schema({}, { strict: false, collection: 'ads' })
const SubscriberSchema = new mongoose.Schema({}, { strict: false, collection: 'subscribers' })
const ContactSchema = new mongoose.Schema({}, { strict: false, collection: 'contacts' })

async function backupMongoDB() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    })
    console.log('✅ Connected to MongoDB\n')

    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
      console.log(`✅ Created backup directory: ${backupDir}\n`)
    }

    // Models
    const models = {
      users: mongoose.model('User', UserSchema),
      articles: mongoose.model('Article', ArticleSchema),
      ads: mongoose.model('Ad', AdSchema),
      subscribers: mongoose.model('Subscriber', SubscriberSchema),
      contacts: mongoose.model('Contact', ContactSchema)
    }

    const backupStats = {
      timestamp: new Date().toISOString(),
      mongoUri: MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'),
      collections: {},
      totalDocuments: 0,
      totalSizeBytes: 0
    }

    // Backup each collection
    for (const collectionName of collections) {
      try {
        console.log(`📦 Backing up: ${collectionName}`)
        
        const Model = models[collectionName]
        const data = await Model.find({}).lean()
        
        const filename = `${collectionName}.json`
        const filepath = path.join(backupDir, filename)
        const jsonContent = JSON.stringify(data, null, 2)
        
        fs.writeFileSync(filepath, jsonContent)
        
        const fileSize = fs.statSync(filepath).size
        const fileSizeKB = (fileSize / 1024).toFixed(2)
        
        backupStats.collections[collectionName] = {
          documents: data.length,
          sizeBytes: fileSize,
          sizeKB: fileSizeKB,
          filename: filename
        }
        
        backupStats.totalDocuments += data.length
        backupStats.totalSizeBytes += fileSize
        
        console.log(`   ✓ Exported ${data.length} documents (${fileSizeKB} KB)`)
        console.log(`   ✓ Saved to: ${filename}\n`)
      } catch (err) {
        console.error(`   ✗ Error backing up ${collectionName}:`, err.message)
        backupStats.collections[collectionName] = {
          error: err.message
        }
      }
    }

    // Save backup metadata
    const metadataPath = path.join(backupDir, '_backup-metadata.json')
    fs.writeFileSync(metadataPath, JSON.stringify(backupStats, null, 2))
    console.log(`📋 Saved backup metadata: _backup-metadata.json\n`)

    // Generate backup summary
    console.log('=' .repeat(60))
    console.log('✅ BACKUP COMPLETE')
    console.log('=' .repeat(60))
    console.log(`📊 Summary:`)
    console.log(`   Total Collections: ${collections.length}`)
    console.log(`   Total Documents: ${backupStats.totalDocuments}`)
    console.log(`   Total Size: ${(backupStats.totalSizeBytes / 1024).toFixed(2)} KB (${(backupStats.totalSizeBytes / 1024 / 1024).toFixed(2)} MB)`)
    console.log(`   Backup Location: ${backupDir}`)
    console.log()
    
    console.log('📄 Backed up collections:')
    for (const [name, stats] of Object.entries(backupStats.collections)) {
      if (stats.error) {
        console.log(`   ✗ ${name}: ERROR - ${stats.error}`)
      } else {
        console.log(`   ✓ ${name}: ${stats.documents} docs (${stats.sizeKB} KB)`)
      }
    }
    console.log()
    
    // Create a "latest" symlink for easy access (optional)
    const latestLink = path.join(__dirname, '../migration-data/backup-latest')
    try {
      if (fs.existsSync(latestLink)) {
        fs.unlinkSync(latestLink)
      }
      fs.symlinkSync(backupDir, latestLink)
      console.log(`🔗 Created symlink: migration-data/backup-latest -> backup-${timestamp}`)
    } catch (err) {
      // Symlinks might not work on all systems, that's okay
      console.log(`   (Symlink creation skipped: ${err.message})`)
    }
    
    console.log()
    console.log('=' .repeat(60))
    console.log('💾 Your MongoDB data is safely backed up!')
    console.log('=' .repeat(60))

  } catch (err) {
    console.error('\n❌ BACKUP FAILED:', err.message)
    console.error('\nFull error:', err)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('\n👋 Disconnected from MongoDB')
  }
}

// Run backup
backupMongoDB()
