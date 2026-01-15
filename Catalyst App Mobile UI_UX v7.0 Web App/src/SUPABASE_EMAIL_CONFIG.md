# 🚀 CATALYST EMAIL - SUPABASE CONFIGURATION

## ✅ CORRECT Setup (Supabase, NOT DigitalOcean)

Your email service is running on **Supabase Edge Functions**, so environment variables need to be added to **Supabase**, not DigitalOcean.

---

## 🔥 ADD TO SUPABASE

### Method 1: Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard
2. Select your Catalyst project
3. Click **"Settings"** (gear icon in sidebar)
4. Click **"Edge Functions"**
5. Scroll to **"Secrets"** section
6. Click **"Add secret"** for each variable below:

```bash
SMTP_HOST=mail.spacemail.com
SMTP_PORT=465
SMTP_USERNAME=contact@catalystfinance.ai
SMTP_PASSWORD=your_email_password_here
SMTP_SECURE=true
SMTP_FROM=contact@catalystfinance.ai
SMTP_FROM_NAME=Catalyst Finance
APP_URL=https://catalyst.finance
```

**⚠️ Add each variable separately:**
- Name: `SMTP_HOST` → Value: `mail.spacemail.com`
- Name: `SMTP_PORT` → Value: `465`
- Name: `SMTP_USERNAME` → Value: `contact@catalystfinance.ai`
- etc...

### Method 2: Supabase CLI

If you have Supabase CLI installed:

```bash
# Set each secret
supabase secrets set SMTP_HOST=mail.spacemail.com
supabase secrets set SMTP_PORT=465
supabase secrets set SMTP_USERNAME=contact@catalystfinance.ai
supabase secrets set SMTP_PASSWORD=your_password_here
supabase secrets set SMTP_SECURE=true
supabase secrets set SMTP_FROM=contact@catalystfinance.ai
supabase secrets set "SMTP_FROM_NAME=Catalyst Finance"
supabase secrets set APP_URL=https://catalyst.finance
```

---

## 🔄 Redeploy Edge Functions

After adding the secrets, you need to redeploy your edge functions:

### Option A: Supabase Dashboard
1. Go to **"Edge Functions"** in Supabase dashboard
2. Click on your `server` function
3. Click **"Deploy"** or **"Redeploy"**

### Option B: Supabase CLI
```bash
supabase functions deploy server
```

### Option C: Automatic (if connected to GitHub)
- Just push to your repository
- Supabase will auto-deploy if you have GitHub integration

---

## ✅ Verification

After deployment, check your Supabase Edge Function logs:

1. Go to **Supabase Dashboard** → **Edge Functions** → **server**
2. Click **"Logs"** tab
3. You should see:
```
✅ Email service configured
   Using SMTP: mail.spacemail.com
```

---

## 🧪 Test Your Email Service

### Test from your app:
```javascript
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-fe0a490e/email/welcome`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({
      email: 'your-test@email.com',
      fullName: 'Test User'
    })
  }
);

const data = await response.json();
console.log(data); // Should show: {success: true, messageId: "..."}
```

### Test with curl:
```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/make-server-fe0a490e/email/welcome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-anon-key" \
  -d '{"email":"test@example.com","fullName":"Test User"}'
```

---

## 📋 Architecture Clarification

```
┌─────────────────────────────────────────┐
│         CATALYST ARCHITECTURE           │
├─────────────────────────────────────────┤
│                                         │
│  DigitalOcean App Platform:             │
│  └─ AI Chat Function (MongoDB)          │
│                                         │
│  Supabase:                              │
│  ├─ Authentication                      │
│  ├─ Database (PostgreSQL)               │
│  ├─ Edge Functions (Hono server)        │
│  │  ├─ Stock data endpoints             │
│  │  ├─ Event data endpoints             │
│  │  ├─ Plaid integration                │
│  │  └─ EMAIL SERVICE ← You are here     │
│  └─ Storage                             │
│                                         │
└─────────────────────────────────────────┘
```

**Email Service Location:**  
`/supabase/functions/server/email-service.tsx` runs on **Supabase Edge Functions**

**Environment Variables Go In:**  
**Supabase Dashboard** → Settings → Edge Functions → Secrets

---

## 🎯 Quick Checklist

- [ ] Go to Supabase Dashboard (not DigitalOcean)
- [ ] Navigate to Settings → Edge Functions → Secrets
- [ ] Add all 8 SMTP environment variables
- [ ] Replace `SMTP_PASSWORD` with your actual password
- [ ] Redeploy your edge functions
- [ ] Check logs for "Email service configured"
- [ ] Test by signing up a new user
- [ ] Check email inbox (and spam folder)

---

## 🆘 Finding Your Supabase Project

If you're not sure where your Supabase project is:

1. Go to: https://supabase.com/dashboard
2. Look for your Catalyst project
3. The URL will be: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
4. Click **Settings** (gear icon)
5. Click **Edge Functions**
6. Scroll to **Secrets**

---

## ✨ What Happens After Setup

Once configured, your Supabase Edge Functions will automatically send emails:

✅ **User signs up** → Verification email sent  
✅ **Email verified** → Welcome email sent  
✅ **Password reset requested** → Reset link sent  
✅ **Password changed** → Security confirmation sent  

All emails sent from: **Catalyst Finance <contact@catalystfinance.ai>**

---

## 📞 Need Help?

**Supabase Secrets Documentation:**  
https://supabase.com/docs/guides/functions/secrets

**Your email service file:**  
`/supabase/functions/server/email-service.tsx`

**Your email endpoints:**  
`/supabase/functions/server/index.tsx` (lines with `/email/` routes)

You're all set! Just add those secrets to Supabase and your email service will be live! 🚀
