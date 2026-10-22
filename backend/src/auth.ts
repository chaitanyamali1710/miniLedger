import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { HttpError } from './errors.js';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: number;
  }
}

export function signToken(userId: number) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: '30d' });
}

// Reads "Authorization: Bearer <token>" and puts the user id on the request.
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    req.userId = Number(payload.sub);
    next();
  } catch {
    next(new HttpError(401, 'Please log in'));
  }
};
