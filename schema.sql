-- ============================================================================
-- Watershed Insight - Full PostgreSQL Database Schema
-- ============================================================================
-- Execute on PostgreSQL instance:
--   psql -U postgres -d watershed_insight -f schema.sql
-- ============================================================================

-- Enable PostGIS if installed (Optional, fallbacks to Standard GeoJSON JSONB)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'auditor',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Watersheds Table
CREATE TABLE IF NOT EXISTS watersheds (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    state VARCHAR(100),
    area_ha DOUBLE PRECISION,
    boundary_geojson JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_watersheds_code ON watersheds(code);

-- 3. Interventions Table
CREATE TABLE IF NOT EXISTS interventions (
    id VARCHAR(50) PRIMARY KEY,
    watershed_id VARCHAR(50) NOT NULL REFERENCES watersheds(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'operational',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    cost_inr DOUBLE PRECISION,
    installation_date VARCHAR(20),
    commissioned_on VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interventions_watershed ON interventions(watershed_id);
CREATE INDEX IF NOT EXISTS idx_interventions_type ON interventions(type);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);

-- 4. Field Inspections Table
CREATE TABLE IF NOT EXISTS field_inspections (
    id SERIAL PRIMARY KEY,
    inspection_id VARCHAR(50) UNIQUE NOT NULL,
    watershed_id VARCHAR(50) NOT NULL,
    intervention_id VARCHAR(50) NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    inspector_name VARCHAR(100) NOT NULL,
    inspector_role VARCHAR(50) NOT NULL DEFAULT 'field_officer',
    inspection_date VARCHAR(20) NOT NULL,
    overall_condition VARCHAR(50) NOT NULL,
    water_presence_observed BOOLEAN DEFAULT FALSE,
    vegetation_growth_observed BOOLEAN DEFAULT FALSE,
    structural_integrity VARCHAR(50),
    notes TEXT,
    photos_attached JSONB DEFAULT '[]'::jsonb,
    gps_latitude DOUBLE PRECISION,
    gps_longitude DOUBLE PRECISION,
    status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inspections_id ON field_inspections(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspections_watershed ON field_inspections(watershed_id);
CREATE INDEX IF NOT EXISTS idx_inspections_intervention ON field_inspections(intervention_id);

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    log_id VARCHAR(50) UNIQUE NOT NULL,
    timestamp VARCHAR(30) NOT NULL,
    user_id VARCHAR(50),
    username VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    details_json JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_id ON audit_logs(log_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_username ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- 6. Photos Metadata Table
CREATE TABLE IF NOT EXISTS photos (
    id VARCHAR(50) PRIMARY KEY,
    watershed_id VARCHAR(50),
    intervention_id VARCHAR(50),
    file_name VARCHAR(255) NOT NULL,
    phase VARCHAR(50) DEFAULT 'after',
    type VARCHAR(50) DEFAULT 'uploaded',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    timestamp VARCHAR(30),
    quality VARCHAR(50) DEFAULT 'verified',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_photos_watershed ON photos(watershed_id);
CREATE INDEX IF NOT EXISTS idx_photos_intervention ON photos(intervention_id);
