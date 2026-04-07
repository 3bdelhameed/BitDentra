-- Run this in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS payables (
    id            bigserial PRIMARY KEY,
    creditor_name text        NOT NULL,
    category      text        DEFAULT 'Supplier',
    amount        numeric     NOT NULL DEFAULT 0,
    paid_amount   numeric     NOT NULL DEFAULT 0,
    due_date      date,
    note          text,
    status        text        NOT NULL DEFAULT 'unpaid',
    date          date        NOT NULL DEFAULT CURRENT_DATE,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payables_creditor_name
    ON payables (creditor_name);

CREATE INDEX IF NOT EXISTS idx_payables_status
    ON payables (status);

CREATE INDEX IF NOT EXISTS idx_payables_due_date
    ON payables (due_date);

ALTER TABLE payables DISABLE ROW LEVEL SECURITY;
