# 🚀 Catalyst Email Service - Deployment Guide

## ✅ **Standalone Edge Function Created**

Your email service is now a **separate Supabase Edge Function** named `email-service`.

### **Location:**
```
/supabase/functions/email-service/index.tsx
```

---

## 📋 **Deployment Steps**

### **1. Add Environment Variables to Supabase**

Go to: **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**

Add these **8 secrets** (based on your SpaceMail configuration):

```bash
SMTP_HOST=mail.spacemail.com
SMTP_PORT=465
SMTP_USERNAME=contact@catalystfinance.ai
SMTP_PASSWORD=your_actual_password_here
SMTP_SECURE=true
SMTP_FROM=contact@catalystfinance.ai
SMTP_FROM_NAME=Catalyst Finance
APP_URL=https://catalyst.finance
```

**⚠️ IMPORTANT:** Replace `SMTP_PASSWORD` with your actual email password!

### **2. Deploy the Edge Function**

#### **Option A: Supabase CLI (Recommended)**

```bash
# Deploy just the email-service function
supabase functions deploy email-service
```

#### **Option B: Supabase Dashboard**

1. Go to **Edge Functions** in Supabase Dashboard
2. Click **"Deploy new function"**
3. Upload `/supabase/functions/email-service/index.tsx`
4. Click **"Deploy"**

#### **Option C: GitHub Integration**

If you have GitHub integration enabled:
```bash
git add supabase/functions/email-service/
git commit -m "Add email service edge function"
git push
```

Supabase will auto-deploy.

---

## 🔍 **Verify Deployment**

### **Check Function Logs:**

1. Go to **Supabase Dashboard** → **Edge Functions** → **email-service**
2. Click **"Logs"** tab
3. Look for:
```
📧 Catalyst Email Service starting...
   SMTP Host: mail.spacemail.com:465
   SMTP Configured: ✅ Yes
   From: Catalyst Finance <contact@catalystfinance.ai>
```

### **Test the Health Endpoint:**

```bash
curl https://your-project-ref.supabase.co/functions/v1/email-service

# Expected response:
{
  "service": "Catalyst Email Service",
  "status": "healthy",
  "smtp": {
    "configured": true,
    "host": "mail.spacemail.com",
    "port": 465,
    "from": "contact@catalystfinance.ai"
  }
}
```

---

## 📧 **API Endpoints**

Your email service exposes these endpoints:

### **1. Health Check**
```
GET https://your-project-ref.supabase.co/functions/v1/email-service
```

### **2. Send Verification Email**
```
POST https://your-project-ref.supabase.co/functions/v1/email-service/verification

Body:
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "verificationUrl": "https://catalyst.finance/verify?token=abc123"
}
```

### **3. Send Password Reset Email**
```
POST https://your-project-ref.supabase.co/functions/v1/email-service/password-reset

Body:
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "resetUrl": "https://catalyst.finance/reset-password?token=xyz789"
}
```

### **4. Send Welcome Email**
```
POST https://your-project-ref.supabase.co/functions/v1/email-service/welcome

Body:
{
  "email": "user@example.com",
  "fullName": "John Doe"
}
```

### **5. Send Password Changed Confirmation**
```
POST https://your-project-ref.supabase.co/functions/v1/email-service/password-changed

Body:
{
  "email": "user@example.com",
  "fullName": "John Doe"
}
```

---

## 🧪 **Test Email Sending**

### **Quick Test:**

```bash
# Replace YOUR_PROJECT_REF with your Supabase project reference
# Replace YOUR_ANON_KEY with your Supabase anon key

curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/email-service/welcome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "your-test-email@example.com",
    "fullName": "Test User"
  }'
```

### **Expected Response:**

```json
{
  "success": true,
  "messageId": "<1234567890@mail.spacemail.com>"
}
```

### **Check Your Inbox!**

You should receive a beautifully branded welcome email from **Catalyst Finance <contact@catalystfinance.ai>**

---

## 🎨 **Email Templates**

All emails feature:
- ✅ Catalyst branding
- ✅ Black background (#0a0a0a)
- ✅ Green accent color (#00ff94)
- ✅ Mobile-responsive design
- ✅ Professional HTML + plain text fallback

### **Email Types:**

1. **Verification Email** - "Welcome to Catalyst!"
2. **Password Reset** - "Reset Your Password"
3. **Welcome Email** - "Welcome to Catalyst! 🎉"
4. **Password Changed** - "Password Changed Successfully"

---

## 📊 **Architecture**

```
┌─────────────────────────────────────────┐
│         CATALYST EMAIL SERVICE          │
├─────────────────────────────────────────┤
│                                         │
│  Supabase Edge Function:                │
│  /supabase/functions/email-service/     │
│                                         │
│  ├─ Health check endpoint (GET /)       │
│  ├─ Verification email (POST)           │
│  ├─ Password reset (POST)               │
│  ├─ Welcome email (POST)                │
│  └─ Password changed (POST)             │
│                                         │
│  SMTP Provider:                         │
│  SpaceMail (mail.spacemail.com:465)     │
│  contact@catalystfinance.ai             │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔐 **Security Notes**

✅ **SMTP credentials** stored in Supabase Edge Function Secrets  
✅ **Never committed** to version control  
✅ **SSL encryption** (port 465) for all email traffic  
✅ **No email provider** = Development mode (logs to console)  

---

## 🆘 **Troubleshooting**

### **"Invalid login credentials"**
→ Check `SMTP_PASSWORD` is correct  
→ Verify `SMTP_USERNAME` is full email address

### **"Connection timeout"**
→ Confirm port is `465`  
→ Verify `SMTP_SECURE=true`

### **"Failed to send email"**
→ Check Supabase function logs  
→ Verify all environment variables are set  
→ Test credentials in email client first

### **Email not received**
→ Check spam/junk folder  
→ Verify recipient email is valid  
→ Check logs for "✅ Email sent via SMTP"

---

## ✨ **What Happens Next**

Once deployed and configured:

1. **User signs up** → Verification email sent automatically
2. **Email verified** → Welcome email sent
3. **Password reset** → Reset link emailed
4. **Password changed** → Security confirmation sent

All fully automated! 🎉

---

## 📞 **Support**

**Supabase Edge Functions Docs:**  
https://supabase.com/docs/guides/functions

**Your Email Service:**  
`/supabase/functions/email-service/index.tsx`

**Status:** ✅ Ready to deploy!
