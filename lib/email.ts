// ========================================================
// StayDesk CRM / HotelFlow CRM Email Utility (Resend)
// Location: lib/email.ts
// ========================================================

/**
 * Sends transactional emails via Resend.
 * All calls should be wrapped in try/catch — email failure must never block provisioning.
 *
 * Required env vars:
 *   RESEND_API_KEY  — Resend API key (starts with re_)
 *   EMAIL_FROM      — Verified sender address e.g. noreply@yourdomain.com
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'StayDesk <noreply@staydesk.in>';

// ---- Internal helper: POST to Resend REST API ----
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY || RESEND_API_KEY.includes('re_xxxx') || RESEND_API_KEY === 'undefined') {
    console.warn('[Email] RESEND_API_KEY is not configured — skipping email send.');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Email] Resend API error ${res.status}:`, body);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Email] Failed to send email:', err);
    return false;
  }
}

// ---- Welcome email for new hotel owners ----
export async function sendWelcomeEmail(params: {
  to: string;
  hotelName: string;
  ownerName: string;
  loginEmail: string;
  loginPassword: string;
}): Promise<boolean> {
  const { to, hotelName, ownerName, loginEmail, loginPassword } = params;

  const subject = `Welcome to StayDesk — Your Hotel Account is Ready 🏨`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to StayDesk</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);border:1px solid #E2E8F0;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0F4C45 0%,#1a6b61 100%);padding:32px 36px;text-align:center;">
      <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.3px;">StayDesk</h1>
      <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:6px 0 0;">India's Simplest Hotel Management Platform</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 36px;">
      <h2 style="font-size:18px;font-weight:700;color:#0F172A;margin:0 0 8px;">Welcome aboard, ${ownerName}! 👋</h2>
      <p style="font-size:14px;color:#64748B;line-height:1.6;margin:0 0 24px;">
        Your StayDesk account for <strong style="color:#0F172A;">${hotelName}</strong> has been provisioned and is ready to use. Below are your login credentials — please keep them safe.
      </p>

      <!-- Credentials Card -->
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
        <p style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Your Login Credentials</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-size:12px;font-weight:600;color:#64748B;width:100px;">Email</td>
            <td style="padding:6px 0;font-size:13px;font-weight:700;color:#0F172A;">${loginEmail}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:12px;font-weight:600;color:#64748B;">Password</td>
            <td style="padding:6px 0;font-size:13px;font-weight:700;color:#0F172A;font-family:monospace;">${loginPassword}</td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.staydesk.in'}/login"
           style="display:inline-block;background:#0F4C45;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 28px;border-radius:10px;letter-spacing:0.2px;">
          Sign In to StayDesk →
        </a>
      </div>

      <!-- Steps -->
      <div style="border-top:1px solid #F1F5F9;padding-top:20px;">
        <p style="font-size:12px;font-weight:700;color:#0F172A;margin:0 0 10px;">Getting started in 3 steps:</p>
        <ol style="margin:0;padding:0 0 0 18px;font-size:13px;color:#64748B;line-height:1.8;">
          <li>Sign in with the credentials above</li>
          <li>Add your rooms under <strong>Room Management</strong></li>
          <li>Start checking in guests with one click</li>
        </ol>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 36px;text-align:center;">
      <p style="font-size:11px;color:#94A3B8;margin:0;">
        This email was sent by <strong>StayDesk</strong> · Powered by Humble Goats<br/>
        If you did not request this account, please contact support immediately.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();

  return sendEmail(to, subject, html);
}

// ---- Password reset notification ----
export async function sendPasswordResetEmail(params: {
  to: string;
  hotelName: string;
  ownerName: string;
  newPassword: string;
}): Promise<boolean> {
  const { to, hotelName, ownerName, newPassword } = params;

  const subject = `StayDesk — Your Password Has Been Reset`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);border:1px solid #E2E8F0;">
    <div style="background:linear-gradient(135deg,#0F4C45 0%,#1a6b61 100%);padding:28px 36px;">
      <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0;">Password Reset</h1>
      <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:4px 0 0;">StayDesk · ${hotelName}</p>
    </div>
    <div style="padding:28px 36px;">
      <p style="font-size:14px;color:#64748B;line-height:1.6;margin:0 0 20px;">
        Hi <strong style="color:#0F172A;">${ownerName}</strong>, your StayDesk password has been reset by the system administrator.
      </p>
      <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Your New Password</p>
        <code style="font-size:16px;font-weight:700;color:#0F172A;letter-spacing:1px;">${newPassword}</code>
      </div>
      <p style="font-size:12px;color:#94A3B8;margin:0;">
        Please log in and change this password immediately from your account settings.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail(to, subject, html);
}
