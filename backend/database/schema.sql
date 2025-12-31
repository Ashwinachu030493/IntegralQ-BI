-- IntegralQ-BI Database Schema
-- Supabase/PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations (multi-tenant root)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    row_quota INTEGER DEFAULT 10000,
    rows_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users (linked to organizations)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Reports (analysis results)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    file_names TEXT[] NOT NULL,
    row_count INTEGER,
    column_count INTEGER,
    summary TEXT,
    charts_json JSONB,
    stats_json JSONB,
    forecast_json JSONB,
    cleaning_log TEXT[],
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs (compliance)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Organizations: users can only see their own org
CREATE POLICY "Users can view own organization"
    ON organizations FOR SELECT
    USING (id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Users: can view users in same org
CREATE POLICY "Users can view org members"
    ON users FOR SELECT
    USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Reports: can view org reports
CREATE POLICY "Users can view org reports"
    ON reports FOR SELECT
    USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create org reports"
    ON reports FOR INSERT
    WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Audit logs: admins can view org logs
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM users 
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Indexes for performance
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_reports_org ON reports(org_id);
CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Trigger to update organization updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
