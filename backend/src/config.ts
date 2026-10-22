import 'dotenv/config';
import path from 'node:path';

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/miniledger',
  // Hosted databases (Render, Neon, Cloud SQL public IP) usually need SSL.
  databaseSsl: process.env.DATABASE_SSL === 'true',
  // Demo mode: also send the OTP back to the app so it can show it on screen.
  showOtpInResponse: process.env.SHOW_OTP_IN_RESPONSE === 'true',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  port: Number(process.env.PORT ?? 4000),
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? 'uploads'),
  otpTtlMinutes: 5,
  otpMaxAttempts: 5,
};
