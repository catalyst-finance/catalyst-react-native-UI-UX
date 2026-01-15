# MongoDB Connection Guide for Catalyst

## ✅ Connection String Fixed

Your MongoDB connection improvements are now deployed!

## 🔧 What Was Updated

### 1. **Enhanced Connection Logic** (`mongodb-service.tsx`)
- **Retry Logic**: 3 automatic retry attempts with 2-second delays
- **Extended Timeouts**: 30-second timeouts (up from 15s) for better reliability
- **Connection Health Checks**: Ping test before using cached connections
- **Optimal Parameters**: Automatically adds best-practice connection parameters

### 2. **Connection Parameters Auto-Added**
The code now automatically enhances your connection string with:
```
serverSelectionTimeoutMS=30000
connectTimeoutMS=30000
socketTimeoutMS=30000
directConnection=false
retryWrites=true
w=majority
tls=true
```

### 3. **Database Name Fixed**
- Changed default from `catalyst` → `raw_data`
- This is where your institutional ownership data lives

### 4. **Better Logging**
- Shows connection attempt numbers (1/3, 2/3, 3/3)
- Displays hostname for debugging
- Logs database and collection names being queried

---

## ⚠️ CRITICAL: Fix DigitalOcean Firewall

Your connection still needs this fix in **DigitalOcean Dashboard**:

### Steps:
1. Go to: [DigitalOcean Dashboard](https://cloud.digitalocean.com/) → **Databases** → **catalyst-db**
2. Click **Settings** tab
3. Under **Trusted Sources**, click **Edit**
4. **For Testing**: Add `0.0.0.0/0` (allows all IPs temporarily)
5. Click **Save**
6. Wait 30 seconds for changes to apply

### For Production:
Contact Supabase support to get their Edge Function IP ranges, then whitelist those specific IPs instead of `0.0.0.0/0`.

---

## 📝 Your Correct Connection String Format

```
mongodb://doadmin:YOUR_PASSWORD@catalyst-db-7902fbf9.mongo.ondigitalocean.com:27017/raw_data?authSource=admin&replicaSet=catalyst-db&tls=true&retryWrites=true
```

**Key Points:**
- ✅ Hostname: `catalyst-db-7902fbf9` (correct)
- ✅ Database: `/raw_data` (where your data is)
- ✅ Replica Set: `catalyst-db`
- ✅ Auth Source: `admin`
- ✅ TLS: `true`

---

## 🧪 Testing After Firewall Fix

1. **Update the firewall** as described above
2. **Wait 30 seconds**
3. **Ask in AI chat**: "What institutions changed their TMC stock holdings recently?"
4. **Expected result**: Should work consistently, not just 1 out of 5 times

---

## 📊 What the Code Does Now

### Connection Flow:
1. **Attempt 1**: Try to connect (30s timeout)
2. **If fails**: Wait 2 seconds, try again
3. **Attempt 2**: Second try (30s timeout)
4. **If fails**: Wait 2 seconds, try again
5. **Attempt 3**: Final try (30s timeout)
6. **If all fail**: Returns error with details

### Query Flow:
1. Checks cached connection health with ping
2. If unhealthy, reconnects automatically
3. Uses `raw_data` database by default
4. Searches `institutional_ownership` collection
5. Filters by ticker (e.g., TMC)
6. Returns top 10 holders + significant changes (>20%)

---

## 🔍 Troubleshooting

### If you still see timeouts after firewall fix:

1. **Check DigitalOcean Status**: Database might be restarting
2. **Check Logs**: Look for `MongoDB: Found X ownership records`
3. **Verify Connection String**: Make sure it has `/raw_data` in the path
4. **Contact Support**: DigitalOcean support can verify firewall settings

### Error Messages:
- `getaddrinfo ENOTFOUND` = Wrong hostname
- `Server selection timed out` = Firewall blocking connection
- `Authentication failed` = Wrong username/password
- `No data found` = Database/collection name mismatch

---

## 🎯 Expected Behavior After Fix

**Before firewall fix:**
```
❌ MongoDB connection failed: Server selection timed out
```

**After firewall fix:**
```
✅ MongoDB connected successfully on attempt 1
MongoDB: Database name: raw_data
MongoDB: Found 6 ownership records in institutional_ownership
✅ MongoDB context fetched successfully
```

---

## 📞 Next Steps

1. **Fix firewall** in DigitalOcean (2 minutes)
2. **Test connection** with TMC query (30 seconds)
3. **Verify data returns** consistently (not intermittently)
4. **Celebrate** 🎉

Your MongoDB integration is production-ready once the firewall is fixed!
