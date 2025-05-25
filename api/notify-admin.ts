import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const buffers: Uint8Array[] = [];
    for await (const chunk of req) buffers.push(chunk);
    const rawBody = Buffer.concat(buffers).toString('utf-8');

    const parsed = JSON.parse(rawBody);
    const deposit = parsed.deposit;

    if (!deposit) {
      console.error('Deposit not found in body:', rawBody);
      return res.status(400).json({ error: 'Missing deposit data' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"CloudForex" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || 'hello@cloudforex.club',
      subject: `✅ Deposit Confirmed - ${deposit.crypto_symbol} - $${deposit.amount}`,
      html: `
        <h2>New Deposit Confirmed</h2>
        <p><strong>User ID:</strong> ${deposit.user_id}</p>
        <p><strong>Amount:</strong> $${deposit.amount}</p>
        <p><strong>Crypto:</strong> ${deposit.crypto_symbol} (${deposit.crypto_name})</p>
        <p><strong>Status:</strong> ${deposit.status}</p>
        <p><strong>Confirmed At:</strong> ${deposit.created_at}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Admin notified via email');
    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('❌ Admin notify error:', error);
    return res.status(500).json({ error: error.message || 'Unexpected error' });
  }
}
