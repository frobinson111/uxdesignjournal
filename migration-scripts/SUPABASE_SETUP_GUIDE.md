# Supabase Setup Guide

## Step 1: Run SQL Schema in Supabase

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: "UX Design Journal"
   - Project URL: https://pxisouwccjbshnedykoj.supabase.co

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "+ New query" button

3. **Copy and Paste Schema**
   - Open: `migration-scripts/1-create-schema.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run the Schema**
   - Click "Run" button (or press Cmd+Enter)
   - You should see: "Schema created successfully!"
   - This creates all 5 tables with indexes and triggers

5. **Verify Tables Created**
   - Click "Table Editor" in left sidebar
   - You should see: users, articles, ads, subscribers, contacts

---

## Step 2: Get Service Role Key

1. **Go to Project Settings**
   - Click gear icon (⚙️) in left sidebar
   - Click "API" section

2. **Copy Keys** (you need both)
   - **Project URL:** https://pxisouwccjbshnedykoj.supabase.co
   - **anon/public key:** (starts with `eyJ...`) - Already have: sb_publishable_4PhKezVN7N4OUMMP9fsZXg_tGd31ttr
   - **service_role key:** Click "Reveal" next to "service_role" and copy it
     - ⚠️ This is SECRET - never commit to git!

---

## Step 3: Update Backend .env

Add these to `backend/.env`:

```bash
# Supabase Configuration
SUPABASE_URL=https://pxisouwccjbshnedykoj.supabase.co
SUPABASE_ANON_KEY=sb_publishable_4PhKezVN7N4OUMMP9fsZXg_tGd31ttr
SUPABASE_SERVICE_ROLE_KEY=[PASTE_SERVICE_ROLE_KEY_HERE]

# Keep MongoDB for now (we'll remove after migration)
MONGO_URI=mongodb+srv://...
```

---

## Step 4: Run Data Import

Once schema is created and .env is updated, run:

```bash
cd migration-scripts
node 2-import-data.js
```

This will:
- Read all JSON files from `migration-data/backup-latest/`
- Transform MongoDB format → PostgreSQL format
- Import to Supabase
- Verify counts match

---

## Step 5: Verify Migration

1. **Check Table Editor**
   - Go to Table Editor in Supabase
   - Click each table and verify data is there
   - Expected counts:
     - users: 2 rows
     - articles: 16 rows
     - ads: 8 rows
     - subscribers: 0 rows
     - contacts: 0 rows

2. **Run SQL Query**
   ```sql
   SELECT 
     'users' as table_name, COUNT(*) as count FROM users
   UNION ALL
   SELECT 'articles', COUNT(*) FROM articles
   UNION ALL
   SELECT 'ads', COUNT(*) FROM ads
   UNION ALL
   SELECT 'subscribers', COUNT(*) FROM subscribers
   UNION ALL
   SELECT 'contacts', COUNT(*) FROM contacts;
   ```

---

## Troubleshooting

### Schema fails to run
- Make sure you're in the correct project
- Check for any existing tables (may need to drop them first)
- Ensure uuid-ossp extension is available

### Can't find service_role key
- Settings → API → Scroll down to "Service role" section
- Click "Reveal" button to see the key
- Copy the entire key (starts with `eyJ...`)

### Import fails with "not found"
- Ensure schema was run successfully first
- Check that .env file has correct Supabase credentials
- Verify backup files exist in migration-data/backup-latest/

---

## Next Steps

After successful import:
1. ✅ Schema created
2. ✅ Data imported
3. 🔜 Refactor backend code
4. 🔜 Test API endpoints
5. 🔜 Deploy to production
