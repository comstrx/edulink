ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS visa_status text DEFAULT NULL;

UPDATE public.teacher_profiles SET visa_status = 'requires_sponsorship' WHERE full_name = 'Priya Sharma';
UPDATE public.teacher_profiles SET visa_status = 'gcc_resident' WHERE full_name = 'Ahmed Hassan';
UPDATE public.teacher_profiles SET visa_status = 'no_visa_required' WHERE full_name = 'James Carter';
UPDATE public.teacher_profiles SET visa_status = 'transferable' WHERE full_name = 'Sarah Williams';
UPDATE public.teacher_profiles SET visa_status = 'requires_sponsorship' WHERE full_name = 'Maria Garcia';