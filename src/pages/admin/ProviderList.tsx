import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Loader2 } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  rejected: "bg-destructive/10 text-destructive",
  suspended: "bg-orange-100 text-orange-800",
  inactive: "bg-muted text-muted-foreground",
};

const ProviderList = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin_providers", statusFilter, typeFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("providers")
        .select("id, display_name, legal_name, type, status, verification_status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (typeFilter !== "all") query = query.eq("type", typeFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Providers</h1>
        <p className="text-muted-foreground mt-1">Manage provider organizations and lifecycle.</p>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="training_provider">Training Provider</SelectItem>
            <SelectItem value="certification_body">Certification Body</SelectItem>
            <SelectItem value="mentor_org">Mentor Org</SelectItem>
            <SelectItem value="publisher_partner">Publisher Partner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !providers?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>No providers found.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.display_name}</TableCell>
                <TableCell className="capitalize">{p.type?.replace(/_/g, " ")}</TableCell>
                <TableCell>
                  <Badge className={statusColors[p.status] ?? ""}>{p.status?.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell className="capitalize">{p.verification_status}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(p.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/providers/${p.id}`}>Review</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default ProviderList;
