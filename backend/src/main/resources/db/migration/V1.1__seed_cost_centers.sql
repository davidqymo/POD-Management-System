-- V1.1 — Cost Center seed
-- Inserts 12 standard cost centers per org chart.
-- Run after core schema (resources, etc.) exists — Flyway orders by version number.

INSERT INTO cost_centers (cost_center_id, description, is_active) VALUES
  ('ENG-CC1', 'Engineering — Backend', true),
  ('ENG-CC2', 'Engineering — Frontend', true),
  ('ENG-CC3', 'Engineering — DevOps', true),
  ('ENG-CC4', 'Engineering — QA', true),
  ('FIN-CC1', 'Finance — Billing', true),
  ('FIN-CC2', 'Finance — Accounts', true),
  ('PM-CC1',  'Product Management', true),
  ('PM-CC2',  'Program Management', true),
  ('OPS-CC1', 'Operations — Support', true),
  ('OPS-CC2', 'Operations — IT', true),
  ('HR-CC1',  'Human Resources', true),
  ('HR-CC2',  'Talent Acquisition', true)
ON CONFLICT (cost_center_id) DO NOTHING;
