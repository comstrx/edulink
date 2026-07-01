/**
 * MentorEvidenceQueue — Filterable, searchable evidence review queue for mentors.
 * Supports status tabs, search, sorting, pagination, and status badges.
 * Pure UI component — no changes to RPC/schema/events.
 */
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Eye, Search, FileText, Loader2 } from "lucide-react";
import type { MentorshipEvidence } from "@/hooks/useMentorshipEvidence";

type EvidenceItem = MentorshipEvidence & { teacher_name?: string; session_date?: string };

const PAGE_SIZE = 50;

const STATUS_BADGE: Record<string, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  submitted: { label: "Submitted", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

interface Props {
  evidence: EvidenceItem[];
  isLoading: boolean;
  onReview: (evidenceId: string) => void;
}

export default function MentorEvidenceQueue({ evidence, isLoading, onReview }: Props) {
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let items = evidence;

    // Status filter
    if (statusFilter !== "all") {
      items = items.filter((e) => e.status === statusFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (e) =>
          (e.teacher_name ?? "").toLowerCase().includes(q) ||
          e.evidence_type.replace(/_/g, " ").toLowerCase().includes(q)
      );
    }

    // Sort
    items = [...items].sort((a, b) => {
      const da = new Date(a.submitted_at).getTime();
      const db = new Date(b.submitted_at).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });

    return items;
  }, [evidence, statusFilter, searchQuery, sortOrder]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const counts = useMemo(() => ({
    submitted: evidence.filter((e) => e.status === "submitted").length,
    approved: evidence.filter((e) => e.status === "approved").length,
    rejected: evidence.filter((e) => e.status === "rejected").length,
    all: evidence.length,
  }), [evidence]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status filter tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setVisibleCount(PAGE_SIZE); }}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="submitted" className="gap-1.5 text-xs">
            Submitted
            {counts.submitted > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{counts.submitted}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1.5 text-xs">
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1.5 text-xs">
            Rejected
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1.5 text-xs">
            All
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search + sort bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teacher or evidence type..."
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "newest" | "oldest")}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Evidence list */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <FileText className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">
            {searchQuery ? "No evidence matches your search." : "No evidence in this category."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((ev) => {
            const badge = STATUS_BADGE[ev.status] ?? { label: ev.status, variant: "secondary" as const };
            return (
              <Card key={ev.id} className={ev.status === "submitted" ? "border-primary/20 bg-primary/5" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {ev.teacher_name ?? "Teacher"}
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {ev.evidence_type.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant={badge.variant} className="text-[10px] capitalize">
                          {badge.label}
                        </Badge>
                      </div>
                      {ev.reflection_text && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{ev.reflection_text}</p>
                      )}
                      {ev.session_date && (
                        <p className="text-xs text-muted-foreground">
                          Session: {new Date(ev.session_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {ev.status === "submitted" && (
                      <Button size="sm" onClick={() => onReview(ev.id)} className="shrink-0">
                        <Eye className="h-3.5 w-3.5 mr-1" /> Review
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            Load More ({filtered.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
