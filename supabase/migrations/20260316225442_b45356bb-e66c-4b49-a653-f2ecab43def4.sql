
-- Security fix: Remove the dangerous user self-insert policy on account_verifications.
-- Verification records must only be created by admins (already covered by the admin FOR ALL policy).
-- Users should only be able to READ their own verifications, never create/modify them.
DROP POLICY IF EXISTS "Users can insert own verifications" ON public.account_verifications;
