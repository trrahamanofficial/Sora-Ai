-- Run in Supabase SQL Editor after the Admin account has been created.
UPDATE public.profiles
SET role = 'admin'
WHERE lower(email) = lower('trrahaman.official0.2@gmail.com');

-- Verify the role:
SELECT id, email, role
FROM public.profiles
WHERE lower(email) = lower('trrahaman.official0.2@gmail.com');
