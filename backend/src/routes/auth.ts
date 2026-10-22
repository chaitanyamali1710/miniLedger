import crypto from 'node:crypto';
import { Router } from 'express';
import { signToken } from '../auth.js';
import { config } from '../config.js';
import { pool } from '../db.js';
import { HttpError } from '../errors.js';
import { requestOtpSchema, verifyOtpSchema } from '../validation.js';

export const authRouter = Router();

// Step 1: make a 6 digit code and print it in the server log (mock SMS).
authRouter.post('/request-otp', async (req, res) => {
  const { phone } = requestOtpSchema.parse(req.body);
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

  await pool.query(
    `INSERT INTO otps (phone, code, expires_at, attempts)
     VALUES ($1, $2, now() + make_interval(mins => $3), 0)
     ON CONFLICT (phone) DO UPDATE SET code = $2, expires_at = EXCLUDED.expires_at, attempts = 0`,
    [phone, code, config.otpTtlMinutes],
  );

  console.log(`[mock SMS] OTP for ${phone} is ${code}`);
  if (config.showOtpInResponse) {
    res.json({ message: 'Demo mode: your OTP is shown on screen.', demoOtp: code });
  } else {
    res.json({ message: 'OTP sent. Check the server log.' });
  }
});

// Step 2: check the code, create the user if new, and return a login token.
authRouter.post('/verify-otp', async (req, res) => {
  const { phone, otp } = verifyOtpSchema.parse(req.body);

  const { rows } = await pool.query(
    `UPDATE otps SET attempts = attempts + 1 WHERE phone = $1
     RETURNING code, attempts, expires_at < now() AS expired`,
    [phone],
  );
  const row = rows[0];
  if (!row) throw new HttpError(400, 'Request an OTP first');
  if (row.expired) throw new HttpError(400, 'OTP expired. Request a new one');
  if (row.attempts > config.otpMaxAttempts) throw new HttpError(429, 'Too many tries. Request a new OTP');
  if (row.code !== otp) throw new HttpError(400, 'Wrong OTP');

  await pool.query('DELETE FROM otps WHERE phone = $1', [phone]);
  const user = await pool.query(
    `INSERT INTO users (phone) VALUES ($1)
     ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
     RETURNING id, phone`,
    [phone],
  );

  res.json({ token: signToken(user.rows[0].id), user: user.rows[0] });
});
