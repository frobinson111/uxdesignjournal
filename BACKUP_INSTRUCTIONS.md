# MongoDB Backup Instructions

## Issue: IP Address Not Whitelisted

Your MongoDB Atlas cluster requires IP whitelisting for security. Before running the backup, you need to whitelist your current IP address.

---

## Option 1: Whitelist Your Current IP (Recommended for Local Development)

1. **Go to MongoDB Atlas**
   - Visit: https://cloud.mongodb.com/
   - Log in to your account

2. **Navigate to Network Access**
   - Click on "Network Access" in the left sidebar (under "Security")

3. **Add Your Current IP**
   - Click "+ ADD IP ADDRESS" button
   - Click "ADD CURRENT IP ADDRESS" button
   - MongoDB Atlas will auto-detect and add your current IP
   - Click "Confirm"

4. **Wait for Activation** (usually 1-2 minutes)
   - The status will change from "Pending" to "Active"

5. **Run the Backup Script Again**
   ```bash
   cd backend
   node backup-mongodb.js
   ```

---

## Option 2: Allow Access from Anywhere (Temporary for Migration)

⚠️ **WARNING:** This is less secure and should only be used temporarily for migration.

1. **Go to MongoDB Atlas**
   - Visit: https://cloud.mongodb.com/
   - Log in to your account

2. **Navigate to Network Access**
   - Click on "Network Access" in the left sidebar

3. **Add 0.0.0.0/0**
   - Click "+ ADD IP ADDRESS"
   - Click "ALLOW ACCESS FROM ANYWHERE"
   - Add a comment like "Temporary for migration"
   - Click "Confirm"

4. **Run the Backup Script**
   ```bash
   cd backend
   node backup-mongodb.js
   ```

5. **IMPORTANT: Remove After Migration**
   - After completing the migration, delete the 0.0.0.0/0 entry
   - Keep only specific IP addresses whitelisted

---

## Option 3: Use MongoDB Atlas UI to Export Data

If you prefer not to whitelist IPs, you can export data directly from MongoDB Atlas:

1. **Go to MongoDB Atlas**
   - Visit: https://cloud.mongodb.com/

2. **Select Your Cluster**
   - Click on your cluster name (Cluster3)

3. **Browse Collections**
   - Click "Browse Collections"

4. **Export Each Collection**
   - Select each collection (users, articles, ads, subscribers, contacts)
   - Click "Export Collection" (if available)
   - Or use MongoDB Compass to connect and export

---

## Option 4: Use MongoDB Compass (GUI Tool)

1. **Download MongoDB Compass**
   - Visit: https://www.mongodb.com/try/download/compass
   - Install MongoDB Compass

2. **Connect Using Connection String**
   - Open Compass
   - Paste your MONGO_URI connection string
   - Connect

3. **Export Collections**
   - Select each collection
   - Click "Export Collection"
   - Choose JSON format
   - Save to `migration-data/backup-[timestamp]/` folder

---

## After Whitelisting Your IP

Once you've whitelisted your IP address, run:

```bash
cd "/Users/frankrobinson/Desktop/UX Design Journal/desktop app website files/backend"
node backup-mongodb.js
```

Expected output:
```
✅ Connected to MongoDB
📦 Backing up: users
   ✓ Exported X documents
📦 Backing up: articles
   ✓ Exported X documents
...
✅ BACKUP COMPLETE
💾 Your MongoDB data is safely backed up!
```

---

## Troubleshooting

### Still Can't Connect?
- Wait 2-3 minutes after adding IP (propagation time)
- Verify the IP was added correctly
- Check if you have the correct MONGO_URI in backend/.env
- Try the "Allow Access from Anywhere" option temporarily

### Check Your Current IP
Run this command to see your current public IP:
```bash
curl -4 ifconfig.me
```

Then manually add this IP to MongoDB Atlas.

---

## Next Steps After Successful Backup

Once the backup completes successfully, we'll proceed with:
1. ✅ MongoDB backup complete
2. 🔜 Set up Supabase project
3. 🔜 Create PostgreSQL schema
4. 🔜 Import data to Supabase
5. 🔜 Refactor backend code
6. 🔜 Test and deploy

---

## Need Help?

If you continue to have connection issues, you can:
1. Share the MongoDB Atlas project with a team member who can help whitelist the IP
2. Use MongoDB Compass for a GUI-based backup
3. Export data directly from MongoDB Atlas UI
