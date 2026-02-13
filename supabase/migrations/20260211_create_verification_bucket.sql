-- Create verification-documents bucket (Private for security)
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies

-- 1. Allow authenticated users to upload their own verification documents
CREATE POLICY "Users can upload own verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification-documents' AND (storage.foldername(name))[1]::uuid = auth.uid());

-- 2. Users can view their own documents (for UI feedback)
CREATE POLICY "Users can view own verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'verification-documents' AND (storage.foldername(name))[1]::uuid = auth.uid());

-- 3. Admins can view all verification documents (for review process)
-- Assuming there is an 'admin' role or similar check. 
-- For now, relying on row level security being restrictive. 
-- Ideally: AND auth.role() = 'service_role' or user metadata check.
-- But standard practice often relies on service_role key for admin tasks in backend functions.
-- If frontend admin panel needs access, we need a policy for admins.
-- Let's check if there is an 'is_admin' or role in public.users to link to.
-- Previous context showed 'role' column in public.users.

CREATE POLICY "Admins can view all verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents' 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);
