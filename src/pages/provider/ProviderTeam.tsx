import { useProviderMembership } from "@/hooks/useProviderProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Loader2 } from "lucide-react";
import ProviderStatusBanner from "@/components/provider/ProviderStatusBanner";

const ProviderTeam = () => {
  const { data: membership, isLoading: membershipLoading } = useProviderMembership();

  const providerId = membership?.provider?.id;

  const { data: members, isLoading } = useQuery({
    queryKey: ["provider_team", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_members")
        .select("id, user_id, role, status, joined_at, invited_by")
        .eq("provider_id", providerId!)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (membershipLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!membership) {
    return <div className="p-8"><p className="text-muted-foreground">No provider found.</p></div>;
  }

  const currentUserId = membership.user_id;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-muted-foreground mt-1">Members of your provider organization.</p>
      </div>

      <ProviderStatusBanner status={membership.provider.status} rejectionReason={membership.provider.rejection_reason} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !members?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>No team members found.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{m.user_id}</span>
                    {m.user_id === currentUserId && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{m.role}</Badge></TableCell>
                <TableCell><Badge variant={m.status === "active" ? "default" : "secondary"} className="capitalize">{m.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default ProviderTeam;
