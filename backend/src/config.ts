import 'dotenv/config';
import path from 'node:path';

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/miniledger',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  port: Number(process.env.PORT ?? 4000),
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? 'uploads'),
  otpTtlMinutes: 5,
  otpMaxAttempts: 5,
};
