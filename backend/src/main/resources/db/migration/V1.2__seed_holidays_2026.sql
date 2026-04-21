-- V1.2 — Holiday calendar seed (2026)
-- Public holidays + major observances for global team.
-- Insert records only if not already present (idempotent seed).
-- Scope: Global unless cost_center_filter is set.

INSERT INTO holidays (name, holiday_date, cost_center_filter, description, is_active) VALUES
  ('New Year''s Day',      '2026-01-01', NULL, 'Global', true),
  ('Spring Festival',      '2026-02-10', NULL, 'Chinese New Year — observed', true),
  ('Qingming Festival',    '2026-04-05', NULL, 'Tomb Sweeping Day (CN)', true),
  ('Labor Day',            '2026-05-01', 'ENG-CC1', 'International Workers Day', true),
  ('Dragon Boat Festival', '2026-06-01', NULL, 'Duanwu Festival', true),
  ('Mid-Autumn Festival',  '2026-10-06', NULL, 'Moon Festival', true),
  ('National Day',         '2026-10-01', NULL, 'China National Day', true),
  ('Christmas Day',        '2026-12-25', NULL, 'Global holiday', true),
  ('Thanksgiving',         '2026-11-26', NULL, 'US Holiday', true),
  ('Independence Day',     '2026-07-04', NULL, 'US Holiday', true)
ON CONFLICT DO NOTHING;
