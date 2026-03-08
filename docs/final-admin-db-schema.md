# Final Admin Dashboard DB Schema (V1 + Future-Compatible)

## Table: `vettingapplications`

Core identity/profile fields (existing) plus the following pipeline fields:

| Column | Type | Allowed Values | Purpose |
|---|---|---|---|
| `current_stage` | `text` | `application_submitted`, `resume_screening`, `test_project`, `live_screening`, `accepted`, `rejected` | Current pipeline stage |
| `stage_status` | `text` | `pending`, `accepted`, `rejected` | Stage-level status for current stage |
| `resume_score` | `numeric(5,2)` | `0..100` | Automated resume screening score |
| `resume_decision` | `text` | `pending`, `accepted`, `rejected` | Automated stage-1 decision output |
| `test_project_status` | `text` | `not_started`, `assigned`, `submitted`, `under_review`, `accepted`, `rejected` | Future stage-2 tracking |
| `decision_status` | `text` | `pending`, `accepted`, `rejected` | Effective final decision state |
| `decision_source` | `text` | `algorithm`, `admin_override` | Tracks whether decision was algorithmic or manually overridden |
| `algorithm_decision` | `text` | `pending`, `accepted`, `rejected` | Snapshot of pre-override algorithm outcome |
| `decision_updated_at` | `timestamptz` | ISO timestamp | Last decision update timestamp |
| `decision_updated_by` | `text` | email/id | Who performed latest decision update |

Notes:
- Keep existing legacy fields (`status`, `currentStage`, etc.) during transition for backward compatibility.
- Admin UI now reads compatibility fields when available and gracefully falls back to legacy fields.

## Table: `admin_algorithm_config`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `int` | PK, must be `1` | Enforces single active config row |
| `threshold` | `int` | `0..100` | Resume screening threshold for future applicants |
| `factors` | `jsonb` | not null | Factor list + weights |
| `updated_at` | `timestamptz` | default now | Last update timestamp |
| `updated_by` | `text` | not null | Admin who changed config |

## V1 Behavior Guarantee

- Threshold/weights updates apply only to **future applicants**.
- Existing applicants are not auto-recomputed.
- Manual overrides set `decision_source = 'admin_override'`.

## SQL Migration

Use:

- `sql/2026-03-08_admin_dashboard_schema.sql`
