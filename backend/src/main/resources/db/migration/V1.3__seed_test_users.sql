-- V1.3 — Test user seed
-- Provides perf-test and dev-login accounts.
--
-- Default password for all test accounts: "Test@2026" (unsalted — DO NOT USE IN PROD)
-- These accounts are is_active=true but locked to integration-test subnet via application-security.yml
-- The integration test suite (`AbstractIntegrationTest`) uses these credentials.

INSERT INTO users (email, display_name, roles, password_hash, is_active) VALUES
  ('admin@pod.internal',  'System Administrator',      '["ADMIN","PM","POD_MANAGER","VIEWER"]', 'unsalted-hash-not-prod', true),
  ('pm@pod.internal',     'Product Manager Alice',     '["PM","VIEWER"]',                      'unsalted-hash-not-prod', true),
  ('pod@pod.internal',    'POD Manager Bob',           '["POD_MANAGER","VIEWER"]',             'unsalted-hash-not-prod', true),
  ('viewer@pod.internal', 'Read-Only Viewer Carol',    '["VIEWER"]',                          'unsalted-hash-not-prod', true),
  ('qa@pod.internal',     'QA Engineer David',         '["QA","VIEWER"]',                     'unsalted-hash-not-prod', true)
ON CONFLICT (email) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  roles = EXCLUDED.roles,
  is_active = EXCLUDED.is_active;
