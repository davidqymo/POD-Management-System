-- Cleanup all test data from database
-- Run this manually via psql or database client when database is available
-- This clears all transactional data but keeps reference data (cost_centers, skills, holidays, users)

-- Delete in correct order (respecting foreign keys)
DELETE FROM activity_dependencies;
DELETE FROM activities;
DELETE FROM allocations;
DELETE FROM audit_log;
DELETE FROM notifications;
DELETE FROM projects;
DELETE FROM resources;
DELETE FROM rates;
DELETE FROM filter_configs;
DELETE FROM scroll_notices;
DELETE FROM filter_options;

-- Keep these reference tables intact:
-- cost_centers, skills, holidays, users