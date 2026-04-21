-- V1.4 — Skills lookup seed
-- Core skill catalog (level bands implicit 1–10 used by allocation engine).
-- Each row defines a skill name and its functional category.
--
-- Order: ENGINEERING first, then PRODUCT, OPERATIONS, DATA, SECURITY, MANAGEMENT.

INSERT INTO skills (skill_name, category, is_active) VALUES
  -- ENGINEERING
  ('java',             'Backend',         true),
  ('kotlin',           'Backend',         true),
  ('python',           'Backend',         true),
  ('javascript',       'Frontend',        true),
  ('typescript',       'Frontend',        true),
  ('react',            'Frontend',        true),
  ('vue',              'Frontend',        true),
  ('ios',              'Mobile',          true),
  ('android',          'Mobile',          true),
  ('flutter',          'Mobile',          true),
  ('kubernetes',       'DevOps',          true),
  ('docker',           'DevOps',          true),
  ('terraform',        'DevOps',          true),
  ('aws',              'Cloud',           true),
  ('gcp',              'Cloud',           true),
  ('dbt',              'Data',            true),
  ('sql',              'Data',            true),
  ('postgresql',       'Database',        true),
  ('mongodb',          'Database',        true),
  ('redis',            'Database/Cache',  true),
  ('product',          'Product',         true),
  ('project-management', 'PM',          true),
  ('scrum-master',     'Agile',           true),
  ('security',         'Security',        true),
  ('infosec',          'Security',        true)
ON CONFLICT (skill_name) DO NOTHING;
