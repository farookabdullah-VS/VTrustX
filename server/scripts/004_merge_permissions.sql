-- =========================================================
-- MERGE PERMISSIONS TABLES
-- Move SMM Permission System to Public Schema
-- =========================================================
BEGIN;

-- 1. Move Permission Definitions
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'smm' AND table_name = 'permission') THEN
        ALTER TABLE smm.permission SET SCHEMA public;
        ALTER TABLE public.permission RENAME TO permissions;
    END IF;
END $$;

-- 2. Move Role-Permission Mappings
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'smm' AND table_name = 'role_permission') THEN
        ALTER TABLE smm.role_permission SET SCHEMA public;
        ALTER TABLE public.role_permission RENAME TO role_permissions;
    END IF;
END $$;

-- 3. Fix Constraints for Role Permissions
-- Renaming schema/table might keep constraints pointing correctly, but let's verify/enforce naming conventions.

-- Drop old constraints if they have specific SMM names or to be safe
ALTER TABLE public.role_permissions 
  DROP CONSTRAINT IF EXISTS role_permission_role_id_fkey,
  DROP CONSTRAINT IF EXISTS role_permission_permission_id_fkey;

-- Add new consistent constraints
ALTER TABLE public.role_permissions
  ADD CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES public.permissions(permission_id) ON DELETE CASCADE;

-- 4. Seed Basic Application Permissions (if not present)
-- Example: general access, admin access
INSERT INTO public.permissions (permission_id, perm_code, perm_name, module, description)
SELECT gen_random_uuid(), 'APP.ACCESS', 'Access Application', 'CORE', 'General access to login'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE perm_code = 'APP.ACCESS');

INSERT INTO public.permissions (permission_id, perm_code, perm_name, module, description)
SELECT gen_random_uuid(), 'APP.ADMIN', 'Admin Access', 'CORE', 'Full system administration'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE perm_code = 'APP.ADMIN');

-- 5. Assign Basic Permissions to Roles
-- Give Admin everything
INSERT INTO public.role_permissions (rp_id, role_id, permission_id)
SELECT 
  gen_random_uuid(),
  r.role_id,
  p.permission_id
FROM public.roles r, public.permissions p
WHERE r.role_code = 'admin'
AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id);

-- Give Standard User basic access
INSERT INTO public.role_permissions (rp_id, role_id, permission_id)
SELECT 
  gen_random_uuid(),
  r.role_id,
  p.permission_id
FROM public.roles r
JOIN public.permissions p ON p.perm_code = 'APP.ACCESS'
WHERE r.role_code = 'user'
AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id);

COMMIT;
