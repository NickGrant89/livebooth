-- Open public signup. Runs once on deploy. Admin can close it again later.
UPDATE "PlatformStats"
SET value = jsonb_set(value::jsonb, '{signupEnabled}', 'true'::jsonb, true)::text
WHERE id = 'platform_settings';
