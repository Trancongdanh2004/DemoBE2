-- Enable pgcrypto for UUID generation if not available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name                VARCHAR(255) NOT NULL,
  cccd                     VARCHAR(12)  NOT NULL UNIQUE,
  cccd_issue_date          DATE         NOT NULL,
  avatar_url               TEXT,
  avatar_public_id         TEXT,

  bachelor_major           VARCHAR(255) NOT NULL,
  bachelor_issue_date      DATE         NOT NULL,
  bachelor_serial_number   VARCHAR(100) NOT NULL,
  bachelor_file_url        TEXT         NOT NULL,
  bachelor_file_public_id  TEXT         NOT NULL,

  master_major             VARCHAR(255) NOT NULL,
  master_issue_date        DATE         NOT NULL,
  master_serial_number     VARCHAR(100) NOT NULL,
  master_file_url          TEXT         NOT NULL,
  master_file_public_id    TEXT         NOT NULL,

  summary_pdf_url          TEXT         NOT NULL,
  summary_pdf_public_id    TEXT         NOT NULL,

  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Indices for fast searching and sorting
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_full_name  ON applications (lower(full_name));
CREATE INDEX IF NOT EXISTS idx_applications_cccd       ON applications (cccd);
