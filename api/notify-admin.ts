import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hello@cloudforex.club';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { deposit } = req.body;
  if (!deposit) {
    console.error('Missing deposit data in request body');
    return res.status(400).json({ error: 'Missing deposit data' });
  }

  console.log('Sending deposit notification for:', deposit);

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.zoho.in',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"CloudForex" <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject: `✅ Deposit Confirmed - ${deposit.crypto_symbol} - $${deposit.amount}`,
      html: `
        <h2>🪙 New Deposit Confirmed</h2>
        <p><strong>User ID:</strong> ${deposit.user_id}</p>
        <p><strong>Amount:</strong> $${deposit.amount}</p>
        <p><strong>Crypto:</strong> ${deposit.crypto_symbol} (${deposit.crypto_name})</p>
        <p><strong>Status:</strong> ${deposit.status}</p>
        <p><strong>Confirmed At:</strong> ${new Date(deposit.created_at).toLocaleString()}</p>
        <hr/>
        <p>CloudForex Admin Notification</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent to admin');
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('❌ Failed to send email:', err);
    res.status(500).json({ error: err.message || 'Email sending failed' });
  }
}
