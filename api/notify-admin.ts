import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hello@cloudforex.club';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { deposit } = req.body;
  if (!deposit) return res.status(400).json({ error: 'Missing deposit data' });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"iPrime" <${process.env.SMTP_USER}>`,
    to: ADMIN_EMAIL,
    subject: `Deposit Confirmed: ${deposit.id}`,
    html: `
      <h2>Deposit Confirmed</h2>
      <p>User: ${deposit.user_id}</p>
      <p>Amount: $${deposit.amount}</p>
      <p>Crypto: ${deposit.crypto_symbol} (${deposit.crypto_name})</p>
      <p>Status: ${deposit.status}</p>
      <p>Time: ${deposit.created_at}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email' });
  }
}
