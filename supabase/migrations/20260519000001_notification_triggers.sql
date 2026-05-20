-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 20260519000001_notification_triggers
-- Purpose  : DB-level triggers that fire Edge Function calls asynchronously
--            via pg_net so emails are sent even when the mobile app is closed.
--
-- REQUIRED SETUP — run once before deploying (Supabase SQL Editor or CLI):
--
--   ALTER DATABASE postgres
--     SET "app.supabase_url" TO 'https://<your-ref>.supabase.co';
--
--   ALTER DATABASE postgres
--     SET "app.service_role_key" TO '<your-service-role-key>';
--
--   (For production, store the key in Supabase Vault and read it via
--    SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
-- ════════════════════════════════════════════════════════════════════════════

-- Enable pg_net for async HTTP calls from trigger functions
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Helper: fire an Edge Function without blocking the DB transaction ────────

CREATE OR REPLACE FUNCTION public.call_edge_function(
    p_function_name TEXT,
    p_payload       JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_url         TEXT := current_setting('app.supabase_url',      true);
    v_service_key TEXT := current_setting('app.service_role_key',  true);
BEGIN
    IF v_url IS NULL OR v_url = '' THEN
        RAISE WARNING '[trigger] app.supabase_url not configured — skipping % call', p_function_name;
        RETURN;
    END IF;
    IF v_service_key IS NULL OR v_service_key = '' THEN
        RAISE WARNING '[trigger] app.service_role_key not configured — skipping % call', p_function_name;
        RETURN;
    END IF;

    PERFORM net.http_post(
        url     := v_url || '/functions/v1/' || p_function_name,
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || v_service_key
        ),
        body    := p_payload::text
    );

EXCEPTION WHEN OTHERS THEN
    -- Swallow errors so the original INSERT/UPDATE always succeeds
    RAISE WARNING '[trigger] call_edge_function(%) failed: %', p_function_name, SQLERRM;
END;
$$;

-- ── Trigger 1: Critical robot incident → send-robot-alert ───────────────────
-- Fires after INSERT on robot_incidents when severity = 'critical' and the
-- incident has not already triggered an email (email_sent = false).

CREATE OR REPLACE FUNCTION public.trigger_critical_incident_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Guard: only act on critical, unsent incidents
    IF NEW.severity <> 'critical' THEN RETURN NEW; END IF;
    IF COALESCE(NEW.email_sent, false) THEN RETURN NEW; END IF;

    PERFORM public.call_edge_function(
        'send-robot-alert',
        jsonb_build_object(
            'robotId',    NEW.robot_id,
            'alertType',  'critical',
            'incidentId', NEW.id,
            'details',    NEW.description
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_critical_incident_inserted ON public.robot_incidents;
CREATE TRIGGER on_critical_incident_inserted
    AFTER INSERT ON public.robot_incidents
    FOR EACH ROW
    WHEN (NEW.severity = 'critical' AND COALESCE(NEW.email_sent, false) = false)
    EXECUTE FUNCTION public.trigger_critical_incident_alert();

-- ── Trigger 2: Cleaning session completed → send-session-notification ────────
-- Fires after UPDATE on cleaning_sessions when status transitions to 'completed'.
-- Only fires once (OLD.status != 'completed' guard).

CREATE OR REPLACE FUNCTION public.trigger_session_completed_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
    IF OLD.status = 'completed'  THEN RETURN NEW; END IF;  -- already completed, skip
    IF COALESCE(NEW.email_sent, false) THEN RETURN NEW; END IF;

    PERFORM public.call_edge_function(
        'send-session-notification',
        jsonb_build_object(
            'sessionId', NEW.id,
            'notifType', 'completed'
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_session_completed ON public.cleaning_sessions;
CREATE TRIGGER on_session_completed
    AFTER UPDATE OF status ON public.cleaning_sessions
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
    EXECUTE FUNCTION public.trigger_session_completed_notification();

-- Also handle direct INSERT with status='completed' (e.g. from Edge Functions)
CREATE OR REPLACE FUNCTION public.trigger_session_inserted_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
    IF COALESCE(NEW.email_sent, false) THEN RETURN NEW; END IF;

    PERFORM public.call_edge_function(
        'send-session-notification',
        jsonb_build_object(
            'sessionId', NEW.id,
            'notifType', 'completed'
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_session_inserted_completed ON public.cleaning_sessions;
CREATE TRIGGER on_session_inserted_completed
    AFTER INSERT ON public.cleaning_sessions
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND COALESCE(NEW.email_sent, false) = false)
    EXECUTE FUNCTION public.trigger_session_inserted_completed();

-- ── Trigger 3: Robot goes offline → send-robot-alert ────────────────────────
-- Fires after UPDATE on robot_status when is_online flips from true → false.

CREATE OR REPLACE FUNCTION public.trigger_robot_went_offline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Transition: was online, now offline
    IF COALESCE(OLD.is_online, false) = false THEN RETURN NEW; END IF;
    IF COALESCE(NEW.is_online, false) = true  THEN RETURN NEW; END IF;

    PERFORM public.call_edge_function(
        'send-robot-alert',
        jsonb_build_object(
            'robotId',   NEW.robot_id,
            'alertType', 'offline'
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_robot_went_offline ON public.robot_status;
CREATE TRIGGER on_robot_went_offline
    AFTER UPDATE OF is_online ON public.robot_status
    FOR EACH ROW
    WHEN (OLD.is_online = true AND NEW.is_online = false)
    EXECUTE FUNCTION public.trigger_robot_went_offline();

-- ── Trigger 4: Battery drops below 20% → send-low-battery ───────────────────
-- Fires when battery_level crosses the 20% threshold downward on an online robot.
-- The send-low-battery Edge Function enforces its own 6-hour per-robot rate limit
-- so this trigger fires freely on every transition.

CREATE OR REPLACE FUNCTION public.trigger_robot_low_battery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only fire on downward threshold crossing (>= 20 → < 20)
    IF COALESCE(OLD.battery_level, 100) < 20 THEN RETURN NEW; END IF;   -- was already low
    IF COALESCE(NEW.battery_level, 100) >= 20 THEN RETURN NEW; END IF;  -- still not low
    IF NOT COALESCE(NEW.is_online, false) THEN RETURN NEW; END IF;       -- offline, skip

    PERFORM public.call_edge_function(
        'send-low-battery',
        jsonb_build_object(
            'robotId',      NEW.robot_id,
            'batteryLevel', NEW.battery_level
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_robot_low_battery ON public.robot_status;
CREATE TRIGGER on_robot_low_battery
    AFTER UPDATE OF battery_level ON public.robot_status
    FOR EACH ROW
    WHEN (
        COALESCE(OLD.battery_level, 100) >= 20 AND
        COALESCE(NEW.battery_level, 100) <  20 AND
        COALESCE(NEW.is_online, false) = true
    )
    EXECUTE FUNCTION public.trigger_robot_low_battery();

-- ── Trigger 5: Session failed → send-session-notification ───────────────────

CREATE OR REPLACE FUNCTION public.trigger_session_failed_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status <> 'failed' THEN RETURN NEW; END IF;
    IF OLD.status = 'failed'  THEN RETURN NEW; END IF;
    IF COALESCE(NEW.email_sent, false) THEN RETURN NEW; END IF;

    PERFORM public.call_edge_function(
        'send-session-notification',
        jsonb_build_object(
            'sessionId', NEW.id,
            'notifType', 'failed'
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_session_failed ON public.cleaning_sessions;
CREATE TRIGGER on_session_failed
    AFTER UPDATE OF status ON public.cleaning_sessions
    FOR EACH ROW
    WHEN (NEW.status = 'failed' AND OLD.status IS DISTINCT FROM 'failed')
    EXECUTE FUNCTION public.trigger_session_failed_notification();

-- ── Trigger 6: 100-session maintenance check ─────────────────────────────────
-- Updates total_sessions_since_maintenance on each completed session.
-- When it reaches 100, fires send-maintenance-reminder.

CREATE OR REPLACE FUNCTION public.trigger_maintenance_session_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
    IF OLD.status = 'completed'  THEN RETURN NEW; END IF;
    IF NEW.robot_id IS NULL THEN RETURN NEW; END IF;

    -- Increment counter; if it hits 100, send reminder
    UPDATE public.robots
    SET total_sessions_since_maintenance = total_sessions_since_maintenance + 1
    WHERE id = NEW.robot_id;

    -- Check if we just crossed the 100-session threshold
    DECLARE
        v_count INT;
    BEGIN
        SELECT total_sessions_since_maintenance
        INTO v_count
        FROM public.robots
        WHERE id = NEW.robot_id;

        IF v_count >= 100 AND (v_count - 1) < 100 THEN
            PERFORM public.call_edge_function(
                'send-maintenance-reminder',
                jsonb_build_object(
                    'robotId',       NEW.robot_id,
                    'triggerReason', '100_sessions'
                )
            );
        END IF;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_session_maintenance_check ON public.cleaning_sessions;
CREATE TRIGGER on_session_maintenance_check
    AFTER UPDATE OF status ON public.cleaning_sessions
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
    EXECUTE FUNCTION public.trigger_maintenance_session_count();

-- ── Grant execute on trigger functions to postgres role ──────────────────────
GRANT EXECUTE ON FUNCTION public.call_edge_function(TEXT, JSONB)   TO postgres;
GRANT EXECUTE ON FUNCTION public.trigger_critical_incident_alert() TO postgres;
GRANT EXECUTE ON FUNCTION public.trigger_session_completed_notification() TO postgres;
GRANT EXECUTE ON FUNCTION public.trigger_session_inserted_completed() TO postgres;
GRANT EXECUTE ON FUNCTION public.trigger_robot_went_offline()       TO postgres;
GRANT EXECUTE ON FUNCTION public.trigger_robot_low_battery()        TO postgres;
GRANT EXECUTE ON FUNCTION public.trigger_session_failed_notification() TO postgres;
GRANT EXECUTE ON FUNCTION public.trigger_maintenance_session_count() TO postgres;
