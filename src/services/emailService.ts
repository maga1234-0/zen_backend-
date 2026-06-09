import { Resend } from 'resend';
import { pool } from '../config/database';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Verify configuration at startup
if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is missing!');
} else {
  console.log('✅ Resend Email Service initialized');
}

/**
 * Interface pour l'envoi d'email
 */
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  userId?: string;
  bookingId?: string;
  guestId?: string;
  type?: string;
}

/**
 * Fonction principale d'envoi d'email avec Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const {
    to,
    subject,
    html,
    text,
    userId,
    bookingId,
    guestId,
    type = 'general',
  } = options;

  try {
    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const fromName = process.env.EMAIL_FROM_NAME || 'ZENITHpms';

    console.log('📧 Sending email via Resend:', {
      to,
      subject,
      from: `${fromName} <${from}>`,
      type,
    });

    // Envoyer l'email via Resend API
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${from}>`,
      to: [to],
      subject,
      html,
      text: text || '',
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      
      // Enregistrer l'erreur dans la base de données
      await logEmail({
        userId,
        bookingId,
        guestId,
        type,
        recipientEmail: to,
        subject,
        status: 'failed',
        errorMessage: error.message || JSON.stringify(error),
      });

      return false;
    }

    // Log succès
    console.log('✅ Email sent successfully via Resend:', data?.id);

    // Enregistrer dans la base de données
    await logEmail({
      userId,
      bookingId,
      guestId,
      type,
      recipientEmail: to,
      subject,
      status: 'sent',
      sentAt: new Date(),
    });

    return true;
  } catch (error: any) {
    console.error('❌ Email sending failed:', error);

    // Enregistrer l'erreur dans la base de données
    try {
      await logEmail({
        userId,
        bookingId,
        guestId,
        type,
        recipientEmail: to,
        subject,
        status: 'failed',
        errorMessage: error.message,
      });
    } catch (dbError) {
      console.error('Failed to log email error to database:', dbError);
    }

    return false;
  }
}

/**
 * Enregistrer l'email dans la base de données
 */
async function logEmail(data: {
  userId?: string;
  bookingId?: string;
  guestId?: string;
  type: string;
  recipientEmail: string;
  subject: string;
  status: 'sent' | 'failed';
  sentAt?: Date;
  errorMessage?: string;
}) {
  try {
    await pool.query(
      `INSERT INTO email_logs 
       (user_id, booking_id, guest_id, type, recipient_email, subject, status, sent_at, error_message) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        data.userId || null,
        data.bookingId || null,
        data.guestId || null,
        data.type,
        data.recipientEmail,
        data.subject,
        data.status,
        data.sentAt || null,
        data.errorMessage || null,
      ]
    );
  } catch (error) {
    console.error('Failed to log email to database:', error);
  }
}

/**
 * Envoyer un code de réinitialisation de mot de passe
 */
export async function sendPasswordResetCode(
  email: string,
  code: string,
  userName: string
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code de réinitialisation</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f7fa;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .code-container {
      text-align: center;
      margin: 40px 0;
    }
    .code-box {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px 40px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    .code {
      font-size: 36px;
      font-weight: bold;
      color: white;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
    }
    .expiry {
      text-align: center;
      font-size: 14px;
      color: #999;
      margin-top: 20px;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 30px 0;
      border-radius: 4px;
    }
    .warning-text {
      color: #856404;
      font-size: 14px;
      margin: 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    .footer-text {
      font-size: 14px;
      color: #6c757d;
      margin: 5px 0;
    }
    .branding {
      font-size: 24px;
      font-weight: bold;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Réinitialisation de mot de passe</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Bonjour <strong>${userName}</strong>,</p>
      
      <p class="message">
        Vous avez demandé à réinitialiser votre mot de passe pour votre compte ZENITH PMS.
      </p>
      
      <p class="message">
        Veuillez utiliser le code de vérification ci-dessous pour continuer:
      </p>
      
      <div class="code-container">
        <div class="code-box">
          <div class="code">${code}</div>
        </div>
      </div>
      
      <p class="expiry">
        ⏱️ Ce code expire dans <strong>15 minutes</strong>
      </p>
      
      <div class="warning">
        <p class="warning-text">
          <strong>⚠️ Important:</strong> Si vous n'avez pas demandé cette réinitialisation, 
          veuillez ignorer cet email. Votre mot de passe actuel reste inchangé.
        </p>
      </div>
    </div>
    
    <div class="footer">
      <div class="branding">ZENITH PMS</div>
      <p class="footer-text">Property Management System</p>
      <p class="footer-text">
        Cet email a été envoyé automatiquement, merci de ne pas y répondre.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Bonjour ${userName},

Vous avez demandé à réinitialiser votre mot de passe.

Votre code de vérification est: ${code}

Ce code expire dans 15 minutes.

Si vous n'avez pas fait cette demande, ignorez cet email.

Cordialement,
L'équipe ZENITH PMS
  `;

  return await sendEmail({
    to: email,
    subject: '🔐 Code de réinitialisation de mot de passe',
    html,
    text,
    type: 'password_reset',
  });
}

/**
 * Générer un code aléatoire à 6 chiffres
 */
export function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
