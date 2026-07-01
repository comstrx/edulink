
ALTER TABLE public.training_items
  ADD COLUMN IF NOT EXISTS micro_assessment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cri_boost_value smallint NULL,
  ADD COLUMN IF NOT EXISTS cri_target smallint NULL;

COMMENT ON COLUMN public.training_items.micro_assessment IS 'Content metadata: indicates this item includes a micro assessment component';
COMMENT ON COLUMN public.training_items.cri_boost_value IS 'Content metadata: potential CRI contribution weight (advisory for CRI engine)';
COMMENT ON COLUMN public.training_items.cri_target IS 'Pathway metadata: target CRI readiness level (only meaningful when type = pathway)';
