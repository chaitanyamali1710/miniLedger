CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  phone       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One pending OTP per phone number. A new request replaces the old code.
CREATE TABLE IF NOT EXISTS otps (
  phone       TEXT PRIMARY KEY,
  code        TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INT NOT NULL DEFAULT 0
);

-- Amounts are stored in cents (paise) so totals never have rounding errors.
CREATE TABLE IF NOT EXISTS loans (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_name   TEXT NOT NULL,
  amount_cents  BIGINT NOT NULL CHECK (amount_cents > 0),
  due_date      DATE NOT NULL,
  repaid_at     TIMESTAMPTZ,
  receipt_file  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loans_user_id_idx ON loans(user_id);
