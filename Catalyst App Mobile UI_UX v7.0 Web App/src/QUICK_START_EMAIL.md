# 🚀 Catalyst Email Service - Quick Start

## ✅ **3-Minute Setup**

### **Step 1: Add Secrets to Supabase (2 minutes)**

1. Go to: https://supabase.com/dashboard
2. Select your Catalyst project
3. Click **Settings** (⚙️) → **Edge Functions** → **Secrets**
4. Click **"Add secret"** and add each of these:

```
Name: SMTP_HOST
Value: mail.spacemail.com

Name: SMTP_PORT
Value: 465

Name: SMTP_USERNAME
Value: contact@catalystfinance.ai

Name: SMTP_PASSWORD
Value: [YOUR EMAIL PASSWORD HERE]

Name: SMTP_SECURE
Value: true

Name: SMTP_FROM
Value: contact@catalystfinance.ai

Name: SMTP_FROM_NAME
Value: Catalyst Finance

Name: APP_URL
Value: https://catalyst.finance
```

**⚠️ CRITICAL:** Replace `SMTP_PASSWORD` with your actual password!

---

### **Step 2: Deploy Function (1 minute)**

**Option A: Supabase CLI**
```bash
supabase functions deploy email-service
```

**Option B: Supabase Dashboard**
1. Go to **Edge Functions** → **Deploy new function**
2. Select `/supabase/functions/email-service/index.tsx`
3. Click **Deploy**

---

### **Step 3: Test It (30 seconds)**

```bash
# Replace with your values:
# - YOUR_PROJECT_REF (find in Supabase Dashboard → Settings → API → Project URL)
# - YOUR_ANON_KEY (find in Supabase Dashboard → Settings → API → Project API keys)
# - your-email@example.com (your test email)

curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/email-service/welcome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "your-email@example.com",
    "fullName": "Test User"
  }'
```

**Expected response:**
```json
{"success": true, "messageId": "<1234567890@mail.spacemail.com>"}
```

**Check your inbox!** You should receive a welcome email from Catalyst Finance.

---

## ✅ **That's It!**

Your email service is now live! 🎉

### **What Works Now:**
✅ Signup verification emails  
✅ Password reset emails  
✅ Welcome emails  
✅ Security confirmation emails  

### **All Automated:**
When users interact with your auth system, emails are sent automatically from **contact@catalystfinance.ai** with beautiful Catalyst branding.

---

## 📧 **API Endpoints**

```
Base URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/email-service

GET  /                  - Health check
POST /verification      - Send verification email
POST /password-reset    - Send password reset email
POST /welcome          - Send welcome email
POST /password-changed - Send password changed confirmation
```

---

## 🆘 **Troubleshooting**

### Email not sent?
1. Check Supabase logs: **Edge Functions** → **email-service** → **Logs**
2. Look for "✅ Email sent via SMTP"
3. If error, verify SMTP_PASSWORD is correct

### Email not received?
1. Check spam/junk folder
2. Verify recipient email is valid
3. Wait up to 5 minutes for delivery

### SMTP error?
1. Verify all 8 secrets are set in Supabase
2. Double-check SMTP_PASSWORD
3. Confirm contact@catalystfinance.ai is active in Spaceship.com

---

## 📚 **More Info**

- **Full Guide:** `/EMAIL_SERVICE_DEPLOYMENT.md`
- **Summary:** `/CATALYST_EMAIL_SUMMARY.md`
- **Test Script:** `/test-email-service.sh`
- **Function Code:** `/supabase/functions/email-service/index.tsx`

---

## 🎊 **You're Live!**

Your email service is production-ready and will automatically send beautiful, branded emails for all authentication flows! 

**From:** Catalyst Finance <contact@catalystfinance.ai>  
**Design:** Professional black & green branding  
**Delivery:** Reliable SMTP via SpaceMail  

🚀 **Happy emailing!**
