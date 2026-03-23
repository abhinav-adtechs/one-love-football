-- 008: Create ledger table (append-only transaction log)
-- ======================================================

CREATE TABLE ledger (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES profiles(id),
  match_id         UUID REFERENCES matches(id),
  entry_type       ledger_entry_type NOT NULL,
  amount           INTEGER NOT NULL,
  running_balance  INTEGER,
  method           payment_method,
  proof_url        TEXT,
  transaction_ref  TEXT,
  description      TEXT,
  approval_status  ledger_approval_status NOT NULL DEFAULT 'pending_approval',
  approved_by      UUID REFERENCES profiles(id),
  approved_at      TIMESTAMPTZ,
  submitted_by     UUID NOT NULL REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No updated_at trigger — ledger entries are immutable.
-- Corrections are handled by inserting new adjustment entries.
