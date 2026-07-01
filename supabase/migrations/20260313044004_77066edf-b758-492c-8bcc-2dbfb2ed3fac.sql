
DROP VIEW IF EXISTS public.school_training_progress_view;

CREATE VIEW public.school_training_progress_view
WITH (security_invoker = true)
AS
SELECT
  ta.school_id,
  ta.assigned_item_id AS item_id,
  ta.assigned_item_type AS item_type,
  ti.title AS item_title,
  COUNT(*) FILTER (WHERE ta.status != 'cancelled') AS assigned_count,
  COUNT(*) FILTER (WHERE ta.status = 'in_progress') AS started_count,
  COUNT(*) FILTER (WHERE ta.status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE ta.status = 'certified') AS certified_count,
  COUNT(*) FILTER (WHERE ta.status = 'cancelled') AS cancelled_count
FROM public.training_assignments ta
JOIN public.training_items ti ON ti.id = ta.assigned_item_id
GROUP BY ta.school_id, ta.assigned_item_id, ta.assigned_item_type, ti.title;
