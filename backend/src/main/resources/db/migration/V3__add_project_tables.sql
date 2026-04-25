-- V3__add_project_tables.sql
-- Project Schedule Engine schema: projects, activities, activity_dependencies

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(20),
    clarity_id VARCHAR(20),
    name VARCHAR(200) NOT NULL,
    description VARCHAR(2000),
    budget_total_k DECIMAL(10, 2) NOT NULL DEFAULT 0,
    budget_monthly_breakdown JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    start_date DATE,
    end_date DATE,
    owner_user_id BIGINT,
    created_by_user_id BIGINT,
    version BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_project_request_id ON projects(request_id) WHERE request_id IS NOT NULL;

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id),
    name VARCHAR(200) NOT NULL,
    description VARCHAR(1000),
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    estimated_hours DECIMAL(8, 2) DEFAULT 0,
    actual_hours DECIMAL(8, 2) DEFAULT 0,
    is_milestone BOOLEAN NOT NULL DEFAULT FALSE,
    milestone_status VARCHAR(20),
    sequence INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_project ON activities(project_id);

-- Activity dependencies table (M:N relationship)
CREATE TABLE IF NOT EXISTS activity_dependencies (
    predecessor_id BIGINT NOT NULL REFERENCES activities(id),
    successor_id BIGINT NOT NULL REFERENCES activities(id),
    dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS',
    lag_days INTEGER DEFAULT 0,
    PRIMARY KEY (predecessor_id, successor_id)
);

CREATE INDEX idx_activity_dep_predecessor ON activity_dependencies(predecessor_id);
CREATE INDEX idx_activity_dep_successor ON activity_dependencies(successor_id);