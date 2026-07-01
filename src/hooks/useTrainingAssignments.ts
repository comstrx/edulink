import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";

// ── Types ──

export type AssignmentStatus = "assigned" | "in_progress" | "completed" | "certified" | "cancelled";

export interface TrainingAssignment {
  id: string;
  school_id: string;
  assigned_item_id: string;
  assigned_item_type: string;
  assigned_to_teacher_id: string;
  assigned_by_user_id: string;
  assigned_at: string;
  due_date: string | null;
  status: AssignmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentWithDetails extends TrainingAssignment {
  item_title: string;
  item_slug: string;
  teacher_name: string;
}

export interface CreateAssignmentPayload {
  assigned_item_id: string;
  assigned_item_type: "course" | "pathway";
  assigned_to_teacher_id: string;
  due_date?: string | null;
  notes?: string | null;
}

// ── Hook: Fetch school's assignments ──

export function useSchoolAssignments() {
  const { workspace, isLoading: wsLoading } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;

  return useQuery({
    queryKey: ["training_assignments", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from("training_assignments")
        .select("*")
        .eq("school_id", schoolId)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Batch-resolve item titles and teacher names
      const itemIds = [...new Set(data.map((a) => a.assigned_item_id))];
      const teacherIds = [...new Set(data.map((a) => a.assigned_to_teacher_id))];

      const [itemsRes, teachersRes] = await Promise.all([
        supabase.from("training_items").select("id, title, slug").in("id", itemIds),
        supabase.from("teacher_profiles").select("id, full_name").in("id", teacherIds),
      ]);

      const itemMap: Record<string, { title: string; slug: string }> = {};
      itemsRes.data?.forEach((i) => (itemMap[i.id] = { title: i.title, slug: i.slug }));

      const teacherMap: Record<string, string> = {};
      teachersRes.data?.forEach((t) => (teacherMap[t.id] = t.full_name));

      return data.map((a) => ({
        ...a,
        status: a.status as AssignmentStatus,
        item_title: itemMap[a.assigned_item_id]?.title ?? "Unknown",
        item_slug: itemMap[a.assigned_item_id]?.slug ?? "",
        teacher_name: teacherMap[a.assigned_to_teacher_id] ?? "Unknown",
      })) as AssignmentWithDetails[];
    },
    enabled: !!schoolId && !wsLoading,
  });
}

// ── Hook: Fetch teacher's own assignments ──

export function useTeacherAssignments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["teacher_assignments", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tp) return [];

      const { data, error } = await supabase
        .from("training_assignments")
        .select("*")
        .eq("assigned_to_teacher_id", tp.id)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const itemIds = [...new Set(data.map((a) => a.assigned_item_id))];
      const { data: items } = await supabase
        .from("training_items")
        .select("id, title, slug")
        .in("id", itemIds);

      const itemMap: Record<string, { title: string; slug: string }> = {};
      items?.forEach((i) => (itemMap[i.id] = { title: i.title, slug: i.slug }));

      return data.map((a) => ({
        ...a,
        status: a.status as AssignmentStatus,
        item_title: itemMap[a.assigned_item_id]?.title ?? "Unknown",
        item_slug: itemMap[a.assigned_item_id]?.slug ?? "",
        teacher_name: "",
      })) as AssignmentWithDetails[];
    },
    enabled: !!user,
  });
}

// ── Hook: Create assignment ──

export function useCreateAssignment() {
  const { user, roles } = useAuth();
  const { workspace } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAssignmentPayload) => {
      if (!user) throw new Error("Not authenticated");

      // Role check: only school_admin or school_training_manager
      const canAssign = roles.some((r) => ["school_admin", "school_training_manager", "admin"].includes(r));
      if (!canAssign) throw new Error("You do not have permission to assign training");

      // B. Validate allowed item type
      if (!["course", "pathway"].includes(payload.assigned_item_type)) {
        throw new Error(`Cannot assign item of type "${payload.assigned_item_type}". Only course and pathway are allowed.`);
      }

      if (!schoolId) throw new Error("No school workspace found");

      // A + E. Verify item exists and type matches
      const { data: item } = await supabase
        .from("training_items")
        .select("id, type")
        .eq("id", payload.assigned_item_id)
        .maybeSingle();

      if (!item) throw new Error("Training item does not exist");
      if (item.type !== payload.assigned_item_type) {
        throw new Error(`Type mismatch: item is "${item.type}" but assignment says "${payload.assigned_item_type}"`);
      }

      // C. Verify teacher belongs to school team
      const { data: membership } = await supabase
        .from("school_team_members")
        .select("id")
        .eq("school_id", schoolId!)
        .eq("teacher_id", payload.assigned_to_teacher_id)
        .maybeSingle();

      if (!membership) throw new Error("Teacher is not a member of your school team");

      // D. Check for duplicate active assignment (also enforced by partial unique index)
      const { data: existing } = await supabase
        .from("training_assignments")
        .select("id")
        .eq("school_id", schoolId!)
        .eq("assigned_to_teacher_id", payload.assigned_to_teacher_id)
        .eq("assigned_item_id", payload.assigned_item_id)
        .neq("status", "cancelled")
        .maybeSingle();

      if (existing) throw new Error("This teacher already has an active assignment for this training item");

      const { data, error } = await supabase
        .from("training_assignments")
        .insert({
          school_id: schoolId!,
          assigned_item_id: payload.assigned_item_id,
          assigned_item_type: payload.assigned_item_type,
          assigned_to_teacher_id: payload.assigned_to_teacher_id,
          assigned_by_user_id: user.id,
          due_date: payload.due_date ?? null,
          notes: payload.notes ?? null,
          status: "assigned",
        })
        .select()
        .single();

      if (error) {
        // Handle partial unique index violation
        if (error.code === "23505") throw new Error("Duplicate active assignment already exists");
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_assignments"] });
    },
  });
}

// ── Hook: Update assignment status ──

export function useUpdateAssignmentStatus() {
  const { roles } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AssignmentStatus }) => {
      const canManage = roles.some((r) => ["school_admin", "school_training_manager", "admin"].includes(r));
      if (!canManage) throw new Error("You do not have permission to update assignments");

      // Validate transition
      const VALID_ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
        assigned: ["in_progress", "cancelled"],
        in_progress: ["completed", "cancelled"],
        completed: ["certified"],
        certified: [],
        cancelled: [],
      };

      const { data: current, error: fetchErr } = await supabase
        .from("training_assignments")
        .select("status")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      const currentStatus = current.status as AssignmentStatus;
      const allowed = VALID_ASSIGNMENT_TRANSITIONS[currentStatus] ?? [];
      if (!allowed.includes(status)) {
        throw new Error(`Invalid assignment transition: ${currentStatus} → ${status}`);
      }

      const { error } = await supabase
        .from("training_assignments")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_assignments"] });
      // Cross-domain: assignment status affects school dashboard KPIs
      qc.invalidateQueries({ queryKey: ["school_training_progress"] });
      qc.invalidateQueries({ queryKey: ["school_overdue_count"] });
      qc.invalidateQueries({ queryKey: ["school_overdue_assignments"] });
    },
  });
}

// ── Hook: Cancel assignment ──

export function useCancelAssignment() {
  const { roles } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const canManage = roles.some((r) => ["school_admin", "school_training_manager", "admin"].includes(r));
      if (!canManage) throw new Error("You do not have permission to cancel assignments");

      const { error } = await supabase
        .from("training_assignments")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_assignments"] });
      // Cancel cascades to enrollments/executions via DB triggers — invalidate those too
      qc.invalidateQueries({ queryKey: ["teacher_enrollments"] });
      qc.invalidateQueries({ queryKey: ["teacher_executions"] });
      qc.invalidateQueries({ queryKey: ["enrollment_status"] });
      // School dashboard KPIs
      qc.invalidateQueries({ queryKey: ["school_training_progress"] });
      qc.invalidateQueries({ queryKey: ["school_overdue_count"] });
      qc.invalidateQueries({ queryKey: ["school_overdue_assignments"] });
    },
  });
}

// ── Hook: Fetch assignable teachers (school's team roster) ──

export function useAssignableTeachers() {
  const { workspace, isLoading: wsLoading } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;

  return useQuery({
    queryKey: ["assignable_teachers", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      // Get team member teacher IDs
      const { data: members, error: membersError } = await supabase
        .from("school_team_members")
        .select("teacher_id")
        .eq("school_id", schoolId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const teacherIds = members.map((m) => m.teacher_id);

      const { data, error } = await supabase
        .from("teacher_profiles")
        .select("id, full_name, contact_email")
        .in("id", teacherIds)
        .order("full_name");

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!schoolId && !wsLoading,
  });
}

// ── Hook: Fetch assignable training items (course + pathway only) ──

export interface AssignableItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  duration: string | null;
  duration_hours: number | null;
  credential_eligible: boolean;
  cri_target: number | null;
  competency_domain_term_ids: string[] | null;
}

export function useAssignableItems() {
  return useQuery({
    queryKey: ["assignable_training_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_items")
        .select("id, title, slug, type, duration, duration_hours, credential_eligible, cri_target, competency_domain_term_ids")
        .in("type", ["course", "pathway"])
        .eq("status", "published")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;

      // Batch-resolve competency domain names
      const allTermIds = new Set<string>();
      (data ?? []).forEach((item) => {
        item.competency_domain_term_ids?.forEach((id: string) => allTermIds.add(id));
      });

      let termMap: Record<string, string> = {};
      if (allTermIds.size > 0) {
        const { data: terms } = await supabase
          .from("taxonomy_terms")
          .select("id, name")
          .in("id", Array.from(allTermIds));
        terms?.forEach((t) => (termMap[t.id] = t.name));
      }

      return (data ?? []).map((item) => ({
        ...item,
        _competencyNames: (item.competency_domain_term_ids ?? [])
          .map((id: string) => termMap[id])
          .filter(Boolean) as string[],
      }));
    },
  });
}
