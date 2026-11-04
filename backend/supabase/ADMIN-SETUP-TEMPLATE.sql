-- Run this only AFTER the intended admin has signed up in Supabase Auth.
-- Replace the email below with the exact email used for that signup.
-- This promotes exactly one existing profile; it does not create an Auth user.

DO $$
DECLARE
  target_email TEXT := 'REPLACE_WITH_YOUR_SIGNUP_EMAIL';
  updated_count INTEGER;
BEGIN
  IF target_email = 'REPLACE_WITH_YOUR_SIGNUP_EMAIL' OR position('@' in target_email) < 2 THEN
    RAISE EXCEPTION 'Set target_email to the exact existing Supabase Auth signup email first.';
  END IF;

  UPDATE public.profiles
     SET role = 'admin'::user_role, updated_at = NOW()
   WHERE lower(email) = lower(target_email);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one matching profile; updated % rows. Check signup email and ensure the profile trigger has run.', updated_count;
  END IF;
END $$;

-- Verify the result. It must return exactly the intended email with role=admin.
SELECT id, email, role FROM public.profiles
WHERE lower(email) = lower('REPLACE_WITH_YOUR_SIGNUP_EMAIL');
