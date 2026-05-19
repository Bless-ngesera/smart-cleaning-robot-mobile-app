-- Email notification system tables and schema updates
-- Migration: 20260519000000_email_system

-- ── email_logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_logs (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    email_type    text NOT NULL,
    recipient     text NOT NULL,
    status        text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
    sent_at       timestamptz NOT NULL DEFAULT now(),
    error_message text,
    resend_id     text,
    metadata      jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own email logs"
    ON public.email_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON public.email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);

-- ── email_preferences ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_preferences (
    user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cleaning_complete    boolean NOT NULL DEFAULT true,
    schedule_reminders   boolean NOT NULL DEFAULT true,
    robot_offline        boolean NOT NULL DEFAULT true,
    error_alerts         boolean NOT NULL DEFAULT true,
    weekly_report        boolean NOT NULL DEFAULT false,
    invite_received      boolean NOT NULL DEFAULT true,
    maintenance_reminder boolean NOT NULL DEFAULT true,
    unsubscribed_all     boolean NOT NULL DEFAULT false,
    updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own preferences"
    ON public.email_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON public.email_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON public.email_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Auto-create email_preferences row on new user signup
CREATE OR REPLACE FUNCTION public.create_email_preferences_for_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.email_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_email_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_email_prefs
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_email_preferences_for_user();

-- ── email_rate_limits ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_rate_limits (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_type text NOT NULL,
    sent_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_rate_limits_user_type_sent
    ON public.email_rate_limits(user_id, email_type, sent_at DESC);

-- Cleanup old rate limit entries (older than 24h) — called from Edge Functions
CREATE OR REPLACE FUNCTION public.cleanup_email_rate_limits()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM public.email_rate_limits WHERE sent_at < now() - interval '24 hours';
END;
$$;

-- ── invite_tokens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invite_tokens (
    token         text PRIMARY KEY DEFAULT encode(gen_random_bytes(32), 'hex'),
    robot_id      uuid NOT NULL REFERENCES public.robots(id) ON DELETE CASCADE,
    inviter_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invitee_email text NOT NULL,
    role          text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'operator', 'admin')),
    expires_at    timestamptz NOT NULL DEFAULT now() + interval '7 days',
    accepted_at   timestamptz,
    declined_at   timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviters can manage their own invites"
    ON public.invite_tokens FOR ALL
    USING (auth.uid() = inviter_id);

CREATE POLICY "Invitees can view invites by token lookup"
    ON public.invite_tokens FOR SELECT
    USING (true);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_robot_id ON public.invite_tokens(robot_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_invitee_email ON public.invite_tokens(invitee_email);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires_at ON public.invite_tokens(expires_at);

-- ── robot_incidents ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.robot_incidents (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    robot_id     uuid NOT NULL REFERENCES public.robots(id) ON DELETE CASCADE,
    severity     text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    incident_type text NOT NULL,
    description  text NOT NULL,
    resolved_at  timestamptz,
    email_sent   boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.robot_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read incidents for their robots"
    ON public.robot_incidents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.robots r
            WHERE r.id = robot_incidents.robot_id
              AND r.user_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_robot_incidents_robot_id ON public.robot_incidents(robot_id);
CREATE INDEX IF NOT EXISTS idx_robot_incidents_created_at ON public.robot_incidents(created_at DESC);

-- ── robot_members ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.robot_members (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    robot_id   uuid NOT NULL REFERENCES public.robots(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role       text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'operator', 'admin')),
    invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (robot_id, user_id)
);

ALTER TABLE public.robot_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Robot owners can manage members"
    ON public.robot_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.robots r
            WHERE r.id = robot_members.robot_id
              AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can view their own membership"
    ON public.robot_members FOR SELECT
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_robot_members_robot_id ON public.robot_members(robot_id);
CREATE INDEX IF NOT EXISTS idx_robot_members_user_id ON public.robot_members(user_id);

-- ── Schema extensions ────────────────────────────────────────────────────────
ALTER TABLE public.robot_status
    ADD COLUMN IF NOT EXISTS battery_level int DEFAULT 100 CHECK (battery_level BETWEEN 0 AND 100);

ALTER TABLE public.cleaning_sessions
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'failed', 'cancelled')),
    ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS failure_reason text,
    ADD COLUMN IF NOT EXISTS robot_id uuid REFERENCES public.robots(id) ON DELETE SET NULL;

ALTER TABLE public.robots
    ADD COLUMN IF NOT EXISTS firmware_version text,
    ADD COLUMN IF NOT EXISTS total_sessions_since_maintenance int NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_maintenance_date timestamptz;
