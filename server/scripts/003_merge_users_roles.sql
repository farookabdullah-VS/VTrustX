-- =========================================================
-- MERGE USERS and ROLES TABLES (v2)
-- Consolidate on public.users (extended) and public.roles
-- =========================================================
BEGIN;

-- 1. Ensure Default Organization Exists (Required for Roles)
DO $$ 
DECLARE 
    v_org_id uuid;
BEGIN
    SELECT org_id INTO v_org_id FROM smm.org WHERE org_code = 'DEFAULT';
    
    IF v_org_id IS NULL THEN
        INSERT INTO smm.org (org_id, org_code, org_name, created_at, updated_at)
        VALUES (gen_random_uuid(), 'DEFAULT', 'Default Organization', now(), now())
        RETURNING org_id INTO v_org_id;
    END IF;
    
    -- Store for later use if needed, but we can query it again
END $$;

-- 2. Extend public.users with UUID to support SMM requirements
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'uuid') THEN
        ALTER TABLE public.users ADD COLUMN uuid uuid DEFAULT gen_random_uuid() NOT NULL;
        ALTER TABLE public.users ADD CONSTRAINT uq_users_uuid UNIQUE (uuid);
    END IF;
END $$;

-- 3. Move SMM Roles to Public (Common Table)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'smm' AND table_name = 'role') THEN
        ALTER TABLE smm.role SET SCHEMA public;
        ALTER TABLE public.role RENAME TO roles;
    END IF;
END $$;

-- 4. Move SMM User_Role to Public (Common Table)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'smm' AND table_name = 'user_role') THEN
        ALTER TABLE smm.user_role SET SCHEMA public;
        ALTER TABLE public.user_role RENAME TO user_roles;
    END IF;
END $$;

-- 5. Drop redundant smm.user table
-- We cascade to drop old FKs from user_role to smm.user
DROP TABLE IF EXISTS smm.user CASCADE;

-- 6. Fix Foreign Keys in public.user_roles
-- Drop old constraint causing issues (referencing dropped smm.user)
ALTER TABLE public.user_roles 
  DROP CONSTRAINT IF EXISTS user_role_user_id_fkey,
  DROP CONSTRAINT IF EXISTS user_role_role_id_fkey;

-- Add new constraints linking to public.users and public.roles
ALTER TABLE public.user_roles
  ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES public.users(uuid) ON DELETE CASCADE,
  ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE CASCADE;

-- 7. Migrate Legacy Roles
-- Create Admin Role
INSERT INTO public.roles (role_id, org_id, role_code, role_name, created_at, updated_at)
SELECT 
  gen_random_uuid(), 
  (SELECT org_id FROM smm.org WHERE org_code = 'DEFAULT' LIMIT 1),
  'admin', 
  'Administrator',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE role_code = 'admin');

-- Map Users to Admin Role
INSERT INTO public.user_roles (ur_id, user_id, role_id)
SELECT 
  gen_random_uuid(),
  u.uuid,
  r.role_id
FROM public.users u
JOIN public.roles r ON r.role_code = 'admin'
WHERE (u.role = 'admin' OR u.role = 'Administrator')
AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.uuid AND ur.role_id = r.role_id);

-- Create Standard Role
INSERT INTO public.roles (role_id, org_id, role_code, role_name, created_at, updated_at)
SELECT 
  gen_random_uuid(), 
  (SELECT org_id FROM smm.org WHERE org_code = 'DEFAULT' LIMIT 1),
  'user', 
  'Standard User',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE role_code = 'user');

-- Map Users to Standard Role
INSERT INTO public.user_roles (ur_id, user_id, role_id)
SELECT 
  gen_random_uuid(),
  u.uuid,
  r.role_id
FROM public.users u
JOIN public.roles r ON r.role_code = 'user'
WHERE (u.role IS NULL OR (u.role != 'admin' AND u.role != 'Administrator'))
AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.uuid);

COMMIT;
