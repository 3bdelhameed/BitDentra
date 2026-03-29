-- Run this in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS audit_logs (
    id                 bigserial PRIMARY KEY,
    actor_user_id      text,
    actor_username     text,
    actor_display_name text,
    actor_role         text,
    action_type        text NOT NULL,
    entity_table       text,
    entity_id          text,
    entity_label       text,
    view_name          text,
    summary            text,
    details            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_username
    ON audit_logs (actor_username);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_table
    ON audit_logs (entity_table);

ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
