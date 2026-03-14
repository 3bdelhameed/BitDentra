-- ══════════════════════════════════════════════════════
--  روح Supabase → SQL Editor → New Query
--  والصق الكود ده كله واضغط Run
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS session_payments (
    id           bigserial    PRIMARY KEY,
    treatment_id bigint       NOT NULL,
    patient_id   bigint       NOT NULL,
    session_num  int          NOT NULL DEFAULT 1,
    amount       numeric      NOT NULL DEFAULT 0,
    notes        text,
    paid_at      date         NOT NULL DEFAULT CURRENT_DATE,
    created_at   timestamptz  DEFAULT now()
);

-- Index عشان الـ queries تبقى سريعة
CREATE INDEX IF NOT EXISTS idx_sp_treatment ON session_payments(treatment_id);
CREATE INDEX IF NOT EXISTS idx_sp_patient   ON session_payments(patient_id);

-- Disable RLS (أو فعّله مع policy لو عندك auth)
ALTER TABLE session_payments DISABLE ROW LEVEL SECURITY;
