-- ========================================================================
-- SORA — MULTI-AI PERSONAL VOICE ASSISTANT
-- Supabase Complete Database Schema & Security Migration
-- Version: 1.0.0
-- Platform: Supabase PostgreSQL
-- ========================================================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user'::user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create AI Provider Configurations Table (10 AI Providers)
CREATE TABLE IF NOT EXISTS public.provider_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false NOT NULL,
    api_key_encrypted TEXT,
    default_model TEXT NOT NULL,
    base_url TEXT,
    priority INT DEFAULT 10 NOT NULL,
    supports_bengali BOOLEAN DEFAULT true NOT NULL,
    system_prompt TEXT,
    temperature NUMERIC DEFAULT 0.7 NOT NULL,
    max_tokens INT DEFAULT 2048 NOT NULL,
    last_tested_at TIMESTAMPTZ,
    last_successful_request_at TIMESTAMPTZ,
    last_status TEXT DEFAULT 'untested', -- 'operational', 'error', 'untested'
    last_error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Upgrade-safe addition for projects that already created provider_configs.
ALTER TABLE public.provider_configs
    ADD COLUMN IF NOT EXISTS last_successful_request_at TIMESTAMPTZ;

-- 4. Create Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    language TEXT DEFAULT 'bn' NOT NULL, -- 'bn' or 'en'
    pinned BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    provider_used TEXT,
    model_used TEXT,
    latency_ms INT,
    audio_duration_sec NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Create System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_provider_configs_enabled ON public.provider_configs(enabled, priority ASC);

-- 8. Row Level Security (RLS) Enablement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 9. Security Definer Function: Check if current authenticated user is an Admin
-- This function runs with the privileges of the creator and bypasses RLS safely
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Prevent ordinary users from changing their own role or email.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.email IS DISTINCT FROM OLD.email)
       AND NOT public.is_admin()
       AND COALESCE(auth.role(), '') <> 'service_role'
       AND session_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Only an administrator can change a profile role or email';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- 10. RLS Policies

-- PROFILES Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile name/avatar" ON public.profiles;
CREATE POLICY "Users can update own profile name/avatar"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id); -- Role changes are blocked by the trigger below

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin());

-- PROVIDER_CONFIGS Policies (Only admins can view or change API configs)
DROP POLICY IF EXISTS "Admins can manage provider configs" ON public.provider_configs;
CREATE POLICY "Admins can manage provider configs"
    ON public.provider_configs FOR ALL
    USING (public.is_admin());

-- CONVERSATIONS Policies
DROP POLICY IF EXISTS "Users can manage own conversations" ON public.conversations;
CREATE POLICY "Users can manage own conversations"
    ON public.conversations FOR ALL
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- MESSAGES Policies
DROP POLICY IF EXISTS "Users can manage own messages" ON public.messages;
CREATE POLICY "Users can manage own messages"
    ON public.messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = messages.conversation_id 
            AND (c.user_id = auth.uid() OR public.is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = messages.conversation_id 
            AND (c.user_id = auth.uid() OR public.is_admin())
        )
        AND (messages.user_id = auth.uid() OR public.is_admin())
    );

-- SYSTEM_SETTINGS Policies
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings"
    ON public.system_settings FOR ALL
    USING (public.is_admin());

-- 11. Automatic Profile Creation Trigger on Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        'user'::user_role -- Always default to normal user, never allow arbitrary role injection
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for accounts that already existed before this migration.
-- Existing accounts are always created as normal users; assign admin explicitly only if needed.
INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
SELECT u.id,
       COALESCE(u.email, ''),
       COALESCE(u.raw_user_meta_data->>'full_name', split_part(COALESCE(u.email, ''), '@', 1)),
       COALESCE(u.raw_user_meta_data->>'avatar_url', ''),
       'user'::user_role
FROM auth.users AS u
ON CONFLICT (id) DO NOTHING;

-- 12. Seed Default AI Provider Configurations (10 AI Providers)
INSERT INTO public.provider_configs 
(id, name, display_name, enabled, default_model, base_url, priority, supports_bengali, system_prompt)
VALUES
('openai', 'OpenAI', 'OpenAI (GPT-4o)', false, 'gpt-4o', 'https://api.openai.com/v1', 1, true, 'You are SORA, an advanced bilingual voice assistant. Answer concisely and naturally in Bengali or English.'),
('gemini', 'Google Gemini', 'Google Gemini (Flash/Pro)', true, 'gemini-2.5-flash', 'https://generativelanguage.googleapis.com', 2, true, 'You are SORA, an advanced bilingual voice assistant. Answer concisely and naturally in Bengali or English.'),
('claude', 'Anthropic Claude', 'Anthropic Claude 3.5', false, 'claude-3-5-sonnet-20241022', 'https://api.anthropic.com/v1', 3, true, 'You are SORA, an advanced bilingual voice assistant. Answer concisely and naturally in Bengali or English.'),
('deepseek', 'DeepSeek', 'DeepSeek AI (V3/R1)', false, 'deepseek-chat', 'https://api.deepseek.com/v1', 4, true, 'You are SORA, an advanced bilingual voice assistant. Answer concisely and naturally in Bengali or English.'),
('grok', 'xAI Grok', 'xAI Grok 2', false, 'grok-2', 'https://api.x.ai/v1', 5, true, 'You are SORA, an advanced bilingual voice assistant. Answer concisely and naturally in Bengali or English.'),
('mistral', 'Mistral AI', 'Mistral Large', false, 'mistral-large-latest', 'https://api.mistral.ai/v1', 6, true, 'You are SORA, an advanced bilingual voice assistant. Answer concisely and naturally in Bengali or English.'),
('cohere', 'Cohere', 'Cohere Command R+', false, 'command-r-plus', 'https://api.cohere.ai/v2', 7, false, 'You are SORA, an advanced bilingual voice assistant. Answer concisely and naturally in Bengali or English.'),
('perplexity', 'Perplexity', 'Perplexity Sonar', false, 'sonar-pro', 'https://api.perplexity.ai', 8, true, 'You are SORA, an advanced bilingual voice assistant. Answer concisely and naturally in Bengali or English.'),
('qwen', 'Alibaba Qwen', 'Alibaba Qwen Max', false, 'qwen-max', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', 9, true, 'You are SORA, an advanced bilingual voice assistant. Answer concisely and naturally in Bengali or English.'),
('llama', 'Meta Llama', 'Meta Llama 3.3 (Groq/Direct)', false, 'llama-3.3-70b-versatile', 'https://api.groq.com/openai/v1', 10, true, 'You are SORA, an advanced bilingual voice assistant. Answer concisely and naturally in Bengali or English.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    display_name = EXCLUDED.display_name,
    default_model = EXCLUDED.default_model;

-- 13. Seed Default Application Settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
('auto_router', '{"strategy": "priority_with_fallback", "preferred_language": "bn", "timeout_ms": 12000}'::jsonb, 'Global AI routing and fallback configuration'),
('voice_synthesis', '{"default_pitch": 1.0, "default_rate": 1.0, "prefer_female_voice": true}'::jsonb, 'Voice synthesis parameters')
ON CONFLICT (key) DO NOTHING;

-- ========================================================================
-- End of Migration
-- ========================================================================
