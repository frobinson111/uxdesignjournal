# Deployment Updates for Vercel & Railway

## Current Status
✅ Data migrated to Supabase (26 documents)  
⚠️ Backend code still uses Mongoose (needs refactoring)  
🔜 Deployment platforms need new environment variables

---

## Important: Two-Phase Deployment Strategy

### Phase 1: Add Supabase Variables (Do This Now)
- Add Supabase credentials to Vercel and Railway
- Keep MongoDB credentials active
- Backend will still use MongoDB for now
- **No downtime, no breaking changes**

### Phase 2: Switch to Supabase (After Backend Refactoring)
- After we refactor the backend code to use Supabase
- Deploy updated code
- Remove MongoDB credentials (optional, keep as backup)

---

## Phase 1: Update Environment Variables

### 🚂 Railway (Backend API)

**Your Backend URL:** Check Railway dashboard for your service URL

#### Steps:
1. Go to https://railway.app/
2. Select your project
3. Click on your backend service
4. Click "Variables" tab
5. Add these **new** environment variables:

```bash
SUPABASE_URL=https://pxisouwccjbshnedykoj.supabase.co
SUPABASE_ANON_KEY=sb_publishable_4PhKezVN7N4OUMMP9fsZXg_tGd31ttr
SUPABASE_SERVICE_ROLE_KEY=sb_secret_cNhG67Jrv0mCieUTWmGS8A_opoXt0tN
```

6. **Keep these existing variables:**
```bash
MONGO_URI=(your existing value)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
PORT=4000
OPENAI_API_KEY=(your existing value)
CLOUDINARY_CLOUD_NAME=(your existing value)
CLOUDINARY_API_KEY=(your existing value)
CLOUDINARY_API_SECRET=(your existing value)
ALLOWED_ORIGINS=(your existing value)
```

7. Click "Deploy" or wait for auto-deploy

---

### ▲ Vercel (Frontend)

**Your Frontend URL:** https://uxdesignjournal.vercel.app

#### Steps:
1. Go to https://vercel.com/dashboard
2. Select your "uxdesignjournal" project
3. Click "Settings" tab
4. Click "Environment Variables" in sidebar

#### Current Frontend Variable:
```bash
VITE_API_BASE=(your Railway backend URL)
```

#### No Changes Needed Yet!
- Frontend connects to backend via VITE_API_BASE
- Backend handles all database connections
- Frontend doesn't need direct Supabase access
- **No updates required for Phase 1**

---

## Verification After Phase 1

After adding variables to Railway:

1. **Check Deployment Logs**
   - Railway → Deployments → View logs
   - Look for successful deployment message
   - No errors about missing variables

2. **Test Backend API**
   ```bash
   curl https://your-railway-url.up.railway.app/api/public/version
   ```
   Should return JSON with version info

3. **Test Frontend**
   - Visit https://uxdesignjournal.vercel.app
   - Should work exactly as before
   - No visible changes (still using MongoDB)

---

## When to Deploy Phase 2 (After Backend Refactoring)

### Backend Changes Needed Before Phase 2:
1. Replace `mongoose` with `@supabase/supabase-js`
2. Update all `Model.find()` → `supabase.from().select()`
3. Change field names in queries (camelCase → snake_case)
4. Test locally thoroughly

### Deployment Steps for Phase 2:
1. **Test Locally First:**
   ```bash
   cd backend
   node index.js
   # Test all endpoints work with Supabase
   ```

2. **Commit & Push Code:**
   ```bash
   git add .
   git commit -m "Migrate backend from MongoDB to Supabase"
   git push origin main
   ```

3. **Railway Auto-Deploys:**
   - Railway will auto-deploy from git
   - Monitor deployment logs
   - Test all API endpoints

4. **Vercel Auto-Deploys:**
   - Vercel will auto-deploy from git (if frontend changed)
   - No changes needed if only backend updated

5. **Monitor for 24-48 Hours:**
   - Check error logs in Railway
   - Test all functionality
   - Keep MongoDB active as backup

6. **Optional: Remove MongoDB (After 30 Days):**
   - Delete `MONGO_URI` from Railway variables
   - Pause/delete MongoDB Atlas cluster
   - Remove `mongoose` from package.json

---

## Railway Variable Management

### How to Add Variables:
```bash
# Using Railway CLI (if installed)
railway variables set SUPABASE_URL=https://pxisouwccjbshnedykoj.supabase.co
railway variables set SUPABASE_ANON_KEY=sb_publishable_4PhKezVN7N4OUMMP9fsZXg_tGd31ttr
railway variables set SUPABASE_SERVICE_ROLE_KEY=sb_secret_cNhG67Jrv0mCieUTWmGS8A_opoXt0tN
```

### Or via Dashboard:
1. Railway dashboard → Your service → Variables
2. Click "+ New Variable"
3. Paste each key=value pair
4. Click "Add" for each

---

## Vercel Variable Management

### Via Dashboard:
1. Vercel → Project → Settings → Environment Variables
2. Add variable name and value
3. Select environments: Production, Preview, Development
4. Click "Save"

### Via CLI:
```bash
# If you have Vercel CLI installed
vercel env add SUPABASE_URL
# (paste value when prompted)
```

---

## Security Best Practices

### ✅ Do:
- Keep service role keys secret
- Never commit `.env` files to git
- Use different keys for dev/staging/production
- Rotate keys periodically

### ❌ Don't:
- Expose service role key in frontend code
- Commit Supabase keys to public repos
- Share keys in screenshots or logs
- Use production keys in development

---

## Troubleshooting

### "Variable not found" error in Railway
- Wait 1-2 minutes after adding variables
- Check variable name spelling (case-sensitive)
- Redeploy service manually

### Frontend can't connect to backend
- Verify VITE_API_BASE points to correct Railway URL
- Check Railway service is running
- Verify CORS settings in backend allow Vercel origin

### Backend crashes after adding Supabase variables
- This is normal - backend still uses Mongoose
- Supabase variables are added for future use
- Backend won't crash from having extra env variables

---

## Current Configuration Summary

### Backend (.env and Railway):
```bash
# MongoDB (current - active)
MONGO_URI=mongodb+srv://...

# Supabase (new - not used yet)
SUPABASE_URL=https://pxisouwccjbshnedykoj.supabase.co
SUPABASE_ANON_KEY=sb_publishable_4PhKezVN7N4OUMMP9fsZXg_tGd31ttr
SUPABASE_SERVICE_ROLE_KEY=sb_secret_cNhG67Jrv0mCieUTWmGS8A_opoXt0tN

# Other services
OPENAI_API_KEY=sk-proj-...
CLOUDINARY_CLOUD_NAME=...
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

### Frontend (Vercel):
```bash
VITE_API_BASE=https://your-backend.up.railway.app
# (no changes needed)
```

---

## Next Steps

1. ✅ **Now:** Add Supabase variables to Railway
2. 🔜 **Next:** Refactor backend code to use Supabase
3. 🔜 **Then:** Deploy refactored backend
4. 🔜 **Finally:** Test everything and monitor

---

## Need Help?

If you encounter issues:
- Check Railway deployment logs
- Verify all variable names match exactly
- Ensure no typos in Supabase credentials
- Let me know and I can help troubleshoot!
