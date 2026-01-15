/**
 * Catalyst Email Service - Standalone Edge Function
 * Handles all transactional emails via SMTP (SpaceMail)
 */

import { Hono } from "npm:hono@4.6.14";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

const app = new Hono();

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// ============================================================================
// EMAIL CONFIGURATION
// ============================================================================

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// SMTP Configuration from environment
const SMTP_CONFIG = {
  host: Deno.env.get("SMTP_HOST") || "mail.spacemail.com",
  port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
  username: Deno.env.get("SMTP_USERNAME") || "",
  password: Deno.env.get("SMTP_PASSWORD") || "",
  from: Deno.env.get("SMTP_FROM") || "contact@catalystfinance.ai",
  fromName: Deno.env.get("SMTP_FROM_NAME") || "Catalyst Finance",
  secure: Deno.env.get("SMTP_SECURE") === "true" || Deno.env.get("SMTP_PORT") === "465",
};

// App configuration
const APP_CONFIG = {
  appName: "Catalyst",
  appUrl: Deno.env.get("APP_URL") || "https://catalyst.finance",
  supportEmail: "contact@catalystfinance.ai",
};

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

/**
 * Send email via SMTP
 */
async function sendViaSMTP(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<EmailResult> {
  try {
    // Using nodemailer for SMTP support
    const { default: nodemailer } = await import("npm:nodemailer@6.9.7");

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure, // true for 465, false for other ports
      auth: {
        user: SMTP_CONFIG.username,
        pass: SMTP_CONFIG.password,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `${SMTP_CONFIG.fromName} <${SMTP_CONFIG.from}>`,
      to: to,
      subject: subject,
      text: textBody,
      html: htmlBody,
    });

    console.log("✅ Email sent via SMTP:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("SMTP error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send email (tries SMTP first, falls back to development mode)
 */
async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<EmailResult> {
  try {
    // Check for SMTP credentials
    if (SMTP_CONFIG.host && SMTP_CONFIG.username && SMTP_CONFIG.password) {
      return await sendViaSMTP(to, subject, htmlBody, textBody);
    }

    // Fallback: log email (for development)
    console.log("📧 Email would be sent (no SMTP configured):");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Body:", textBody);

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
      error: "No SMTP provider configured. Email logged to console.",
    };
  } catch (error) {
    console.error("Email sending failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

function getEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_CONFIG.appName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0a0a0a;
      color: #ffffff;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 1px solid #1f1f1f;
    }
    .logo {
      font-size: 24px;
      font-weight: 600;
      color: #00ff94;
      letter-spacing: 1px;
    }
    .content {
      padding: 40px 0;
      line-height: 1.6;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #00ff94 0%, #00cc76 100%);
      color: #0a0a0a;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding: 30px 0;
      border-top: 1px solid #1f1f1f;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">CATALYST</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>${APP_CONFIG.appName} - AI-Powered Market Intelligence</p>
      <p>Questions? Email us at <a href="mailto:${APP_CONFIG.supportEmail}" style="color: #00ff94;">${APP_CONFIG.supportEmail}</a></p>
      <p style="color: #444; margin-top: 20px;">
        © ${new Date().getFullYear()} ${APP_CONFIG.appName}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Health check
app.get("/", (c) => {
  return c.json({
    service: "Catalyst Email Service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    smtp: {
      configured: !!(SMTP_CONFIG.username && SMTP_CONFIG.password),
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      from: SMTP_CONFIG.from,
    },
  });
});

// Send verification email
app.post("/verification", async (c) => {
  try {
    const { email, fullName, verificationUrl } = await c.req.json();

    if (!email || !verificationUrl) {
      return c.json({ error: "Email and verificationUrl are required" }, 400);
    }

    const name = fullName || email.split("@")[0];

    const content = `
      <h2 style="color: #00ff94;">Welcome to ${APP_CONFIG.appName}!</h2>
      <p>Hi ${name},</p>
      <p>Thanks for signing up! We're excited to have you on board.</p>
      <p>To get started, please verify your email address by clicking the button below:</p>
      <p style="text-align: center;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="color: #00ff94; word-break: break-all;">${verificationUrl}</p>
      <p style="color: #666; margin-top: 30px;">
        This verification link will expire in 24 hours.
      </p>
    `;

    const textBody = `
Welcome to ${APP_CONFIG.appName}!

Hi ${name},

Thanks for signing up! We're excited to have you on board.

To get started, please verify your email address by visiting this link:
${verificationUrl}

This verification link will expire in 24 hours.

Questions? Email us at ${APP_CONFIG.supportEmail}

© ${new Date().getFullYear()} ${APP_CONFIG.appName}. All rights reserved.
    `;

    const result = await sendEmail(
      email,
      `Verify your ${APP_CONFIG.appName} account`,
      getEmailTemplate(content),
      textBody
    );

    if (result.success) {
      return c.json({ success: true, messageId: result.messageId });
    } else {
      return c.json({ error: "Failed to send email", details: result.error }, 500);
    }
  } catch (error) {
    console.error("Verification email error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Send password reset email
app.post("/password-reset", async (c) => {
  try {
    const { email, fullName, resetUrl } = await c.req.json();

    if (!email || !resetUrl) {
      return c.json({ error: "Email and resetUrl are required" }, 400);
    }

    const name = fullName || email.split("@")[0];

    const content = `
      <h2 style="color: #00ff94;">Reset Your Password</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your ${APP_CONFIG.appName} password.</p>
      <p>Click the button below to choose a new password:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="color: #00ff94; word-break: break-all;">${resetUrl}</p>
      <p style="color: #ff6b6b; margin-top: 30px;">
        <strong>Didn't request this?</strong> You can safely ignore this email. Your password won't change.
      </p>
      <p style="color: #666;">
        This password reset link will expire in 1 hour.
      </p>
    `;

    const textBody = `
Reset Your Password

Hi ${name},

We received a request to reset your ${APP_CONFIG.appName} password.

Click the link below to choose a new password:
${resetUrl}

This password reset link will expire in 1 hour.

Didn't request this? You can safely ignore this email. Your password won't change.

Questions? Email us at ${APP_CONFIG.supportEmail}

© ${new Date().getFullYear()} ${APP_CONFIG.appName}. All rights reserved.
    `;

    const result = await sendEmail(
      email,
      `Reset your ${APP_CONFIG.appName} password`,
      getEmailTemplate(content),
      textBody
    );

    if (result.success) {
      return c.json({ success: true, messageId: result.messageId });
    } else {
      return c.json({ error: "Failed to send email", details: result.error }, 500);
    }
  } catch (error) {
    console.error("Password reset email error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Send welcome email
app.post("/welcome", async (c) => {
  try {
    const { email, fullName } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    const name = fullName || email.split("@")[0];

    const content = `
      <h2 style="color: #00ff94;">Welcome to ${APP_CONFIG.appName}! 🎉</h2>
      <p>Hi ${name},</p>
      <p>Your account has been verified and you're all set!</p>
      <p><strong>What's next?</strong></p>
      <ul style="line-height: 2;">
        <li>📈 Connect your brokerage account for personalized insights</li>
        <li>🎯 Add stocks to your watchlist</li>
        <li>🤖 Chat with our AI copilot for market analysis</li>
        <li>⚡ Get real-time alerts on market-moving events</li>
      </ul>
      <p style="text-align: center;">
        <a href="${APP_CONFIG.appUrl}" class="button">Get Started</a>
      </p>
      <p style="color: #666; margin-top: 30px;">
        Need help? Check out our <a href="${APP_CONFIG.appUrl}/help" style="color: #00ff94;">Help Center</a> or reply to this email.
      </p>
    `;

    const textBody = `
Welcome to ${APP_CONFIG.appName}! 🎉

Hi ${name},

Your account has been verified and you're all set!

What's next?
- Connect your brokerage account for personalized insights
- Add stocks to your watchlist
- Chat with our AI copilot for market analysis
- Get real-time alerts on market-moving events

Get started: ${APP_CONFIG.appUrl}

Need help? Email us at ${APP_CONFIG.supportEmail}

© ${new Date().getFullYear()} ${APP_CONFIG.appName}. All rights reserved.
    `;

    const result = await sendEmail(
      email,
      `Welcome to ${APP_CONFIG.appName}! 🎉`,
      getEmailTemplate(content),
      textBody
    );

    if (result.success) {
      return c.json({ success: true, messageId: result.messageId });
    } else {
      return c.json({ error: "Failed to send email", details: result.error }, 500);
    }
  } catch (error) {
    console.error("Welcome email error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Send password change confirmation
app.post("/password-changed", async (c) => {
  try {
    const { email, fullName } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    const name = fullName || email.split("@")[0];

    const content = `
      <h2 style="color: #00ff94;">Password Changed Successfully</h2>
      <p>Hi ${name},</p>
      <p>This is a confirmation that your ${APP_CONFIG.appName} password was just changed.</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString("en-US", {
        timeZone: "America/New_York",
        dateStyle: "full",
        timeStyle: "long",
      })}</p>
      <p style="color: #ff6b6b; margin-top: 30px;">
        <strong>Didn't make this change?</strong> Please contact us immediately at 
        <a href="mailto:${APP_CONFIG.supportEmail}" style="color: #ff6b6b;">${APP_CONFIG.supportEmail}</a>
      </p>
    `;

    const textBody = `
Password Changed Successfully

Hi ${name},

This is a confirmation that your ${APP_CONFIG.appName} password was just changed.

Time: ${new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "full",
      timeStyle: "long",
    })}

Didn't make this change? Please contact us immediately at ${APP_CONFIG.supportEmail}

© ${new Date().getFullYear()} ${APP_CONFIG.appName}. All rights reserved.
    `;

    const result = await sendEmail(
      email,
      `Your ${APP_CONFIG.appName} password was changed`,
      getEmailTemplate(content),
      textBody
    );

    if (result.success) {
      return c.json({ success: true, messageId: result.messageId });
    } else {
      return c.json({ error: "Failed to send email", details: result.error }, 500);
    }
  } catch (error) {
    console.error("Password change confirmation error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ============================================================================
// START SERVER
// ============================================================================

// Verify configuration on startup
const smtpConfigured = !!(SMTP_CONFIG.username && SMTP_CONFIG.password);
console.log("📧 Catalyst Email Service starting...");
console.log(`   SMTP Host: ${SMTP_CONFIG.host}:${SMTP_CONFIG.port}`);
console.log(`   SMTP Configured: ${smtpConfigured ? "✅ Yes" : "⚠️  No (dev mode)"}`);
console.log(`   From: ${SMTP_CONFIG.fromName} <${SMTP_CONFIG.from}>`);

Deno.serve(app.fetch);
