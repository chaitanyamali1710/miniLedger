import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { pool } from '../db.js';

export const summaryRouter = Router();
summaryRouter.use(requireAuth);

// Totals for the logged in user. "Overdue" means not repaid and the due date has passed.
summaryRouter.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(amount_cents), 0) AS lent,
       COALESCE(SUM(amount_cents) FILTER (WHERE repaid_at IS NOT NULL), 0) AS repaid,
       COALESCE(SUM(amount_cents) FILTER (WHERE repaid_at IS NULL AND due_date < CURRENT_DATE), 0) AS overdue,
       COUNT(*) FILTER (WHERE repaid_at IS NULL AND due_date < CURRENT_DATE) AS overdue_count
     FROM loans WHERE user_id = $1`,
    [req.userId],
  );
  const r = rows[0];
  const lent = Number(r.lent) / 100;
  const repaid = Number(r.repaid) / 100;
  res.json({
    totalLent: lent,
    totalRepaid: repaid,
    outstanding: Math.round((lent - repaid) * 100) / 100,
    overdueAmount: Number(r.overdue) / 100,
    overdueCount: Number(r.overdue_count),
  });
});
