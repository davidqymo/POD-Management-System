-- V2: Audit Triggers — capture entity changes into audit_log partition per month.
-- Uses a single trigger function that reads TG_OP and NEW/OLD row.
-- Creates per-table triggers (resources, rates, projects, activities, allocations, users, holidays).

-- ========== Trigger function ==========
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_operation VARCHAR(3);
    v_row JSONB;
    v_changed_by_user_id BIGINT;
    v_change_reason TEXT;
BEGIN
    -- Determine operation and row content
    IF (TG_OP = 'DELETE') THEN
        v_operation := 'DEL';
        v_row := row_to_json(OLD)::jsonb;
        v_changed_by_user_id := COALESCE(
            current_setting('audit.user_id', true)::BIGINT,
            NULL
        );
        v_change_reason := current_setting('audit.change_reason', true);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_operation := 'MOD';
        v_row := jsonb_build_object('old', row_to_json(OLD)::jsonb, 'new', row_to_json(NEW)::jsonb);
        v_changed_by_user_id := COALESCE(
            current_setting('audit.user_id', true)::BIGINT,
            NULL
        );
        v_change_reason := current_setting('audit.change_reason', true);
    ELSE -- INSERT
        v_operation := 'ADD';
        v_row := row_to_json(NEW)::jsonb;
        v_changed_by_user_id := COALESCE(
            current_setting('audit.user_id', true)::BIGINT,
            NULL
        );
        v_change_reason := current_setting('audit.change_reason', true);
    END IF;

    -- Insert audit record into appropriate monthly partition
    EXECUTE format(
        'INSERT INTO audit_log (entity_type, entity_id, field_name, old_value, new_value, changed_by_user_id, revision_type, change_reason) ' ||
        'VALUES ($1, $2, NULL, $3, $4, $5, $6, $7)',
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE v_operation WHEN 'DEL' THEN v_row ELSE NULL END,
        CASE v_operation WHEN 'ADD' THEN v_row ELSE NULL END,
        v_changed_by_user_id,
        v_operation,
        v_change_reason
    );

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each core auditable entity.
-- They call the shared trigger function; function reads current_setting('audit.*')
-- which the backend sets per transaction via AuditContextHolder.

CREATE TRIGGER audit_resources
AFTER INSERT OR UPDATE OR DELETE ON resources
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_rates
AFTER INSERT OR UPDATE OR DELETE ON rates
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_users
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_projects
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_activities
AFTER INSERT OR UPDATE OR DELETE ON activities
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_allocations
AFTER INSERT OR UPDATE OR DELETE ON allocations
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_holidays
AFTER INSERT OR UPDATE OR DELETE ON holidays
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
