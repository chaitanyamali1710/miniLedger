import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../auth.js';
import { config } from '../config.js';
import { pool } from '../db.js';
import { HttpError } from '../errors.js';
import { createLoanSchema, idParamSchema } from '../validation.js';

export const loansRouter = Router();
loansRouter.use(requireAuth);

const allowedTypes: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};

fs.mkdirSync(config.uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + allowedTypes[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedTypes[file.mimetype]) cb(null, true);
    else cb(new HttpError(400, 'Receipt must be a JPG, PNG, WEBP or HEIC image'));
  },
});

const loanColumns = `
  id, friend_name, amount_cents, due_date::text AS due_date, repaid_at, receipt_file, created_at,
  (repaid_at IS NULL AND due_date < CURRENT_DATE) AS is_overdue`;

type LoanRow = {
  id: number;
  friend_name: string;
  amount_cents: string;
  due_date: string;
  repaid_at: Date | null;
  receipt_file: string | null;
  created_at: Date;
  is_overdue: boolean;
};

// Turns a database row into the JSON shape the app uses.
function toLoan(row: LoanRow) {
  return {
    id: row.id,
    friendName: row.friend_name,
    amount: Number(row.amount_cents) / 100,
    dueDate: row.due_date,
    repaid: row.repaid_at !== null,
    repaidAt: row.repaid_at,
    isOverdue: row.is_overdue,
    hasReceipt: row.receipt_file !== null,
    createdAt: row.created_at,
  };
}

function removeFile(file?: Express.Multer.File) {
  if (file) fs.rm(file.path, { force: true }, () => {});
}

async function findLoan(userId: number, id: number) {
  const { rows } = await pool.query<LoanRow>(`SELECT ${loanColumns} FROM loans WHERE id = $1 AND user_id = $2`, [
    id,
    userId,
  ]);
  if (!rows[0]) throw new HttpError(404, 'Loan not found');
  return rows[0];
}

// List: unpaid first (overdue at the very top), then by due date.
loansRouter.get('/', async (req, res) => {
  const { rows } = await pool.query<LoanRow>(
    `SELECT ${loanColumns} FROM loans WHERE user_id = $1
     ORDER BY (repaid_at IS NOT NULL), (due_date < CURRENT_DATE) DESC, due_date, id`,
    [req.userId],
  );
  res.json(rows.map(toLoan));
});

// Add a loan. Send JSON, or multipart form data with an optional "receipt" photo.
loansRouter.post('/', upload.single('receipt'), async (req, res) => {
  try {
    const input = createLoanSchema.parse(req.body);
    const { rows } = await pool.query<LoanRow>(
      `INSERT INTO loans (user_id, friend_name, amount_cents, due_date, receipt_file)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${loanColumns}`,
      [req.userId, input.friendName, Math.round(input.amount * 100), input.dueDate, req.file?.filename ?? null],
    );
    res.status(201).json(toLoan(rows[0]));
  } catch (err) {
    removeFile(req.file);
    throw err;
  }
});

loansRouter.patch('/:id/repaid', async (req, res) => {
  const id = idParamSchema.parse(req.params.id);
  await findLoan(req.userId!, id);
  const { rows } = await pool.query<LoanRow>(
    `UPDATE loans SET repaid_at = COALESCE(repaid_at, now()) WHERE id = $1 RETURNING ${loanColumns}`,
    [id],
  );
  res.json(toLoan(rows[0]));
});

// Add or replace the receipt photo of an existing loan.
loansRouter.post('/:id/receipt', upload.single('receipt'), async (req, res) => {
  try {
    const id = idParamSchema.parse(req.params.id);
    if (!req.file) throw new HttpError(400, 'Attach a photo in the "receipt" field');
    const old = await findLoan(req.userId!, id);
    const { rows } = await pool.query<LoanRow>(
      `UPDATE loans SET receipt_file = $1 WHERE id = $2 RETURNING ${loanColumns}`,
      [req.file.filename, id],
    );
    if (old.receipt_file) fs.rm(path.join(config.uploadDir, old.receipt_file), { force: true }, () => {});
    res.json(toLoan(rows[0]));
  } catch (err) {
    removeFile(req.file);
    throw err;
  }
});

loansRouter.get('/:id/receipt', async (req, res) => {
  const id = idParamSchema.parse(req.params.id);
  const loan = await findLoan(req.userId!, id);
  if (!loan.receipt_file) throw new HttpError(404, 'No receipt for this loan');
  res.sendFile(path.join(config.uploadDir, loan.receipt_file));
});
