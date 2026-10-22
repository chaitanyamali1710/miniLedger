import cors from 'cors';
import express from 'express';
import { errorHandler } from './errors.js';
import { authRouter } from './routes/auth.js';
import { loansRouter } from './routes/loans.js';
import { summaryRouter } from './routes/summary.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/auth', authRouter);
  app.use('/loans', loansRouter);
  app.use('/summary', summaryRouter);
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use(errorHandler);
  return app;
}
