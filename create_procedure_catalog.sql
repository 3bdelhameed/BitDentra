-- Run this in Supabase SQL Editor to create the procedure catalog table for cloud sync.

CREATE TABLE IF NOT EXISTS procedure_catalog (
    id          bigserial PRIMARY KEY,
    name        text NOT NULL,
    price       numeric NOT NULL DEFAULT 0,
    category    text NOT NULL DEFAULT 'general',
    notes       text,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procedure_catalog_name
    ON procedure_catalog (name);

CREATE INDEX IF NOT EXISTS idx_procedure_catalog_category
    ON procedure_catalog (category);

ALTER TABLE procedure_catalog DISABLE ROW LEVEL SECURITY;
