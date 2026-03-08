-- Admin Dashboard V1 + Future Pipeline Compatibility Schema
-- Run this in Supabase SQL editor before enabling full admin controls in production.

ALTER TABLE vettingapplications
  ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'application_submitted',
  ADD COLUMN IF NOT EXISTS stage_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS resume_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS resume_decision TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS test_project_status TEXT DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS decision_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS decision_source TEXT DEFAULT 'algorithm',
  ADD COLUMN IF NOT EXISTS algorithm_decision TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS decision_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decision_updated_by TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vettingapplications_current_stage_check'
  ) THEN
    ALTER TABLE vettingapplications
      ADD CONSTRAINT vettingapplications_current_stage_check
      CHECK (current_stage IN (
        'application_submitted',
        'resume_screening',
        'test_project',
        'live_screening',
        'accepted',
        'rejected'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vettingapplications_stage_status_check'
  ) THEN
    ALTER TABLE vettingapplications
      ADD CONSTRAINT vettingapplications_stage_status_check
      CHECK (stage_status IN ('pending', 'accepted', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vettingapplications_resume_decision_check'
  ) THEN
    ALTER TABLE vettingapplications
      ADD CONSTRAINT vettingapplications_resume_decision_check
      CHECK (resume_decision IN ('pending', 'accepted', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vettingapplications_decision_status_check'
  ) THEN
    ALTER TABLE vettingapplications
      ADD CONSTRAINT vettingapplications_decision_status_check
      CHECK (decision_status IN ('pending', 'accepted', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vettingapplications_test_project_status_check'
  ) THEN
    ALTER TABLE vettingapplications
      ADD CONSTRAINT vettingapplications_test_project_status_check
      CHECK (test_project_status IN (
        'not_started',
        'assigned',
        'submitted',
        'under_review',
        'accepted',
        'rejected'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vettingapplications_decision_source_check'
  ) THEN
    ALTER TABLE vettingapplications
      ADD CONSTRAINT vettingapplications_decision_source_check
      CHECK (decision_source IN ('algorithm', 'admin_override'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS admin_algorithm_config (
  id INT PRIMARY KEY CHECK (id = 1),
  threshold INT NOT NULL CHECK (threshold >= 0 AND threshold <= 100),
  factors JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT NOT NULL
);

INSERT INTO admin_algorithm_config (id, threshold, factors, updated_by)
VALUES (
  1,
  75,
  '[
    {"key":"skills_depth","label":"Skills Depth","weight":0.24,"description":"Core technical skills and proficiency level"},
    {"key":"project_quality","label":"Project Quality","weight":0.22,"description":"Impact, complexity, and quality of submitted projects"},
    {"key":"work_experience","label":"Work Experience","weight":0.16,"description":"Relevant internships, freelancing, and prior roles"},
    {"key":"academic_performance","label":"Academic Performance","weight":0.14,"description":"CGPA and academic consistency"},
    {"key":"communication_signal","label":"Communication Signal","weight":0.12,"description":"Profile clarity and articulation"},
    {"key":"consistency_signal","label":"Consistency Signal","weight":0.12,"description":"Cross-field consistency and verification confidence"}
  ]'::jsonb,
  'system_seed'
)
ON CONFLICT (id) DO NOTHING;
