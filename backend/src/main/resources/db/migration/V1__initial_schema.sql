-- V1: Initial Schema — Core tables for POD Team Management
-- All DDL follows TDD §4 entity definitions with explicit column definitions.
-- Constraints and indexes named per spec to ease future migrations.
-- Schema name default 'public'; owner 'pod_user' (set externally by infra).

-- ========== resources ==========
CREATE TABLE IF NOT EXISTS resources (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    cost_center_id VARCHAR(20) NOT NULL,
    billable_team_code VARCHAR(20) NOT NULL,
    category VARCHAR(20) NOT NULL,
    skill VARCHAR(100),
    level INTEGER,
    status VARCHAR(20) NOT NULL,
    is_billable BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT chk_resource_status CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'TERMINATED'))
);

CREATE INDEX idx_resources_cost_center_team
    ON resources (cost_center_id, billable_team_code)
    WHERE is_active = TRUE;

CREATE INDEX idx_resources_skill
    ON resources (skill)
    WHERE is_active = TRUE AND is_billable = TRUE;

-- ========== cost_centers ==========
CREATE TABLE IF NOT EXISTS cost_centers (
    id BIGSERIAL PRIMARY KEY,
    cost_center_id VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========== skills ==========
CREATE TABLE IF NOT EXISTS skills (
    id BIGSERIAL PRIMARY KEY,
    skill_name VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(30) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========== rates ==========
CREATE TABLE IF NOT EXISTS rates (
    id BIGSERIAL PRIMARY KEY,
    cost_center_id VARCHAR(20) NOT NULL,
    billable_team_code VARCHAR(20) NOT NULL,
    monthly_rate_k DECIMAL(10,2) NOT NULL,
    effective_from VARCHAR(6) NOT NULL,
    effective_to VARCHAR(6),
    is_billable BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_rate_period_active UNIQUE (cost_center_id, billable_team_code, effective_from)
);

CREATE INDEX idx_rates_lookup_active
    ON rates (cost_center_id, billable_team_code)
    WHERE is_active = TRUE AND effective_to IS NULL;

-- ========== users ==========
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    roles JSONB NOT NULL DEFAULT '["VIEWER"]'::jsonb,
    password_hash VARCHAR(255) NOT NULL,
    resource_id BIGINT REFERENCES resources(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_active ON users (is_active);

-- ========== projects ==========
CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(50) UNIQUE,
    billable_product_id VARCHAR(50),
    clarity_id VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    budget_k DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    start_date DATE,
    end_date DATE,
    created_by BIGINT NOT NULL REFERENCES users(id),
    owner_id BIGINT REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT chk_project_status CHECK (status IN ('REQUESTED', 'EXECUTING', 'ON_HOLD', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX idx_projects_status ON projects (status);
CREATE INDEX idx_projects_owner ON projects (owner_id);

-- ========== activities ==========
CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    estimated_hours DECIMAL(6,2) NOT NULL,
    is_milestone BOOLEAN NOT NULL DEFAULT FALSE,
    milestone_status VARCHAR(20),
    sequence INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_project ON activities (project_id);
CREATE INDEX idx_activities_dates ON activities (planned_start_date, planned_end_date);

-- ========== activity_dependencies ==========
CREATE TABLE IF NOT EXISTS activity_dependencies (
    id BIGSERIAL PRIMARY KEY,
    predecessor_id BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    successor_id BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (predecessor_id, successor_id)
);

CREATE INDEX idx_dep_successor ON activity_dependencies (successor_id);

-- ========== allocations ==========
CREATE TABLE IF NOT EXISTS allocations (
    id BIGSERIAL PRIMARY KEY,
    resource_id BIGINT NOT NULL REFERENCES resources(id),
    project_id BIGINT NOT NULL REFERENCES projects(id),
    activity_id BIGINT REFERENCES activities(id),
    week_start_date DATE NOT NULL,
    hours DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    version INTEGER NOT NULL DEFAULT 1,
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT chk_allocation_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'LOCKED'))
);

CREATE INDEX idx_allocations_resource_week ON allocations (resource_id, week_start_date)
    WHERE is_active = TRUE;

-- For allocation constraint validator: monthly hour sums + project spread per resource/month
CREATE INDEX idx_allocations_resource_month_active
    ON allocations (resource_id, week_start_date)
    WHERE is_active = TRUE AND status = 'APPROVED';

CREATE INDEX idx_allocations_project ON allocations (project_id)
    WHERE is_active = TRUE AND status = 'APPROVED';

-- ========== holidays ==========
CREATE TABLE IF NOT EXISTS holidays (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    holiday_date DATE NOT NULL,
    cost_center_filter VARCHAR(50),
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_holiday_unique ON holidays (holiday_date, cost_center_filter);

-- ========== audit_log ==========
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_by_user_id BIGINT REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    change_reason TEXT,
    revision_type VARCHAR(10) NOT NULL CHECK (revision_type IN ('ADD', 'MOD', 'DEL'))
);

CREATE INDEX idx_audit_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_changed_at ON audit_log (changed_at DESC);

-- ========== notifications ==========
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, created_at DESC)
    WHERE is_read = FALSE;
