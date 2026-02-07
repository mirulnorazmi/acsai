-- Auth Module Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- USERS TABLE (PROFILES)
-- ============================================
-- Stores public user information linked to auth.users
CREATE TABLE IF NOT EXISTS x_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER SECRETS TABLE (API KEYS)
-- ============================================
-- Stores encrypted API keys for external services (Slack, Jira, etc.)
-- Note: In a production environment, use Supabase Vault.
-- For this MVP, we store them here. Supabase manages encryption at rest.
CREATE TABLE IF NOT EXISTS x_user_secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES x_users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- e.g., 'slack', 'jira', 'openai'
  api_key TEXT NOT NULL, -- The API Key/Token
  api_secret TEXT, -- Optional secret/client_secret
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional config
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform) -- One key per platform per user
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON x_users(email);
CREATE INDEX IF NOT EXISTS idx_user_secrets_user_id ON x_user_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_secrets_platform ON x_user_secrets(platform);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE x_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_user_secrets ENABLE ROW LEVEL SECURITY;

-- Users Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON x_users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON x_users FOR UPDATE
  USING (auth.uid() = id);

-- System/Triggers can insert users (handled by Supabase Auth trigger usually, but for API insert we allow authenticated user to insert matching ID)
CREATE POLICY "Users can insert own profile"
  ON x_users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User Secrets Policies
-- Users can view their own secrets
CREATE POLICY "Users can view own secrets"
  ON x_user_secrets FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert/update their own secrets
CREATE POLICY "Users can insert own secrets"
  ON x_user_secrets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own secrets"
  ON x_user_secrets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own secrets"
  ON x_user_secrets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp for x_users
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON x_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at timestamp for x_user_secrets
CREATE TRIGGER update_user_secrets_updated_at
  BEFORE UPDATE ON x_user_secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE x_users IS 'Public user profiles linked to auth.users';
COMMENT ON TABLE x_user_secrets IS 'Storage for user API keys for external services';
