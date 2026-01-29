# Migration Quick Start Guide

## ✅ What's Already Done

1. ✅ MongoDB backup completed (26 documents backed up)
2. ✅ Supabase project created
3. ✅ SQL schema file ready (`migration-scripts/1-create-schema.sql`)
4. ✅ Import script ready (`migration-scripts/2-import-data.js`)
5. ✅ @supabase/supabase-js installed

---

## 🚀 Complete the Migration (3 Steps)

### Step 1: Run SQL Schema in Supabase (5 minutes)

1. Open Supabase: https://supabase.com/dashboard
2. Select project: "UX Design Journal"
3. Click "SQL Editor" in sidebar
4. Click "+ New query"
5. Open `migration-scripts/1-create-schema.sql` on your computer
6. Copy ALL contents and paste into SQL Editor
7. Click "Run" (or press Cmd+Enter)
8. ✅ You should see: "Schema created successfully!"

### Step 2: Get Service Role Key & Update .env (2 minutes)

1. In Supabase, click ⚙️ Settings → API
2. Scroll to "Service role" section
3. Click "Reveal" to see the key
4. Copy the service role key (starts with `eyJ...`)
5. Open `backend/.env` file
6. Add these lines:

```bash
# Supabase Configuration
SUPABASE_URL=https://pxisouwccjbshnedykoj.supabase.co
SUPABASE_ANON_KEY=sb_publishable_4PhKezVN7N4OUMMP9fsZXg_tGd31ttr
SUPABASE_SERVICE_ROLE_KEY=[PASTE YOUR SERVICE ROLE KEY HERE]
```

7. Save the file

### Step 3: Run Data Import (2 minutes)

```bash
node migration-scripts/2-import-data.js
```

Expected output:
```
🔄 Supabase Data Import Script
✅ Connected to Supabase
📦 Importing users: 2 documents
✅ users: Successfully imported 2 documents
📦 Importing articles: 16 documents
✅ articles: Successfully imported 16 documents
...
✅ IMPORT COMPLETE
🎉 Migration successful! Your data is now in Supabase.
```

---

## ✅ Verify Migration

1. Go to Supabase → Table Editor
2. Click each table:
   - users: should see 2 rows
   - articles: should see 16 rows
   - ads: should see 8 rows
   - subscribers: 0 rows (empty)
   - contacts: 0 rows (empty)

---

## 📋 What Happens Next

After successful data migration, I'll help you:

1. **Refactor Backend Code**
   - Replace Mongoose with Supabase client
   - Update all API endpoints
   - Change field names (camelCase → snake_case)

2. **Test Everything**
   - Login still works
   - Articles load correctly
   - Admin panel functions
   - All CRUD operations work

3. **Deploy**
   - Test in staging
   - Deploy to production
   - Monitor for issues
   - Keep MongoDB running for 30 days as backup

---

## 🆘 Troubleshooting

### Schema fails to run
- Make sure you copied the ENTIRE SQL file
- Check that you're in the correct Supabase project

### Import fails: "Missing Supabase credentials"
- Verify you added SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to `backend/.env`
- Make sure there are no typos in the keys

### Import fails: "Backup directory not found"
- The backup should be at: `migration-data/backup-latest/`
- If missing, run: `cd backend && node backup-mongodb.js`

### Can't find service role key
- Settings → API → Scroll down to "Service role"
- Click "Reveal" button
- The key is very long (starts with `eyJ...`)

---

## 🎯 Current Status

**You are here:** Ready to run Step 1 (SQL Schema)

**Your Supabase Info:**
- Project: UX Design Journal  
- URL: https://pxisouwccjbshnedykoj.supabase.co
- Anon Key: sb_publishable_4PhKezVN7N4OUMMP9fsZXg_tGd31ttr
- Database password: Wintertime2026!!

---

## 📞 When You're Done

Once the import completes successfully, let me know and I'll:
1. Create the backend refactoring scripts
2. Help you test the migrated system
3. Guide you through deployment

**Ready to begin? Start with Step 1!** 🚀
