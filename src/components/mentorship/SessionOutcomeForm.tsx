/**
 * SessionOutcomeForm — Mentor fills in session outcome details when completing a session.
 * Supports competency_term_ids via multi-select taxonomy picker with search,
 * collapsible groups, and soft limit hint.
 */
import { useState, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, Loader2, X, Search, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { useCompetencyTerms } from "@/hooks/useCompetencyTerms";
import type { SessionOutcome } from "@/contracts/training/mentorship-evidence.contracts";

const OUTCOME_OPTIONS: { value: SessionOutcome; label: string }[] = [
  { value: "guidance_session", label: "Guidance Session" },
  { value: "skill_feedback", label: "Skill Feedback" },
  { value: "lesson_review", label: "Lesson Review" },
  { value: "career_advice", label: "Career Advice" },
  { value: "practice_coaching", label: "Practice Coaching" },
  { value: "remediation_support", label: "Remediation Support" },
];

const SOFT_LIMIT = 6;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (outcome: {
    session_outcome: SessionOutcome;
    mentor_summary: string;
    recommended_next_step?: string;
    competency_term_ids?: string[];
  }) => Promise<void>;
  isPending?: boolean;
}

export default function SessionOutcomeForm({ open, onOpenChange, onSubmit, isPending }: Props) {
  const [outcome, setOutcome] = useState<SessionOutcome>("guidance_session");
  const [summary, setSummary] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Skills: true,
    "Competency Domains": true,
  });

  const { data: competencyTerms, isLoading: termsLoading } = useCompetencyTerms();

  const toggleTerm = (termId: string) => {
    setSelectedTermIds((prev) =>
      prev.includes(termId) ? prev.filter((id) => id !== termId) : [...prev, termId]
    );
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const handleSubmit = async () => {
    if (!summary.trim() || summary.trim().length < 5) {
      return; // Button is already disabled when !summary, but guard against edge cases
    }
    try {
      await onSubmit({
        session_outcome: outcome,
        mentor_summary: summary.trim(),
        recommended_next_step: nextStep.trim() || undefined,
        competency_term_ids: selectedTermIds.length > 0 ? selectedTermIds : undefined,
      });
      setSummary("");
      setNextStep("");
      setOutcome("guidance_session");
      setSelectedTermIds([]);
      setSearchTerm("");
    } catch {
      // Error handling is done by the parent via onSubmit rejection;
      // do NOT reset form state on failure
    }
  };

  // Group and filter terms
  const groupedTerms = useMemo(() => {
    const terms = competencyTerms ?? [];
    const filtered = searchTerm
      ? terms.filter((t) => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : terms;

    return filtered.reduce<Record<string, typeof terms>>((acc, term) => {
      if (!term) return acc;
      const group = term.vocabulary === "skills" ? "Skills" : "Competency Domains";
      if (!acc[group]) acc[group] = [];
      acc[group]!.push(term);
      return acc;
    }, {});
  }, [competencyTerms, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Complete Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session Outcome */}
          <div>
            <label className="text-sm font-medium text-foreground">Session Outcome</label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as SessionOutcome)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div>
            <label className="text-sm font-medium text-foreground">Session Summary</label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Summarize what was covered in this session..."
              className="mt-1 min-h-[80px]"
            />
          </div>

          {/* Next Step */}
          <div>
            <label className="text-sm font-medium text-foreground">Recommended Next Step (optional)</label>
            <Textarea
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="What should the teacher focus on next?"
              className="mt-1"
            />
          </div>

          {/* Competency Tags Picker */}
          <div>
            <label className="text-sm font-medium text-foreground">Competency Tags (optional)</label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              Tag skills or competency domains discussed in this session.
            </p>

            {/* Selected tags area */}
            {selectedTermIds.length > 0 && (
              <div className="mb-2 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Selected ({selectedTermIds.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTermIds.map((id) => {
                    const term = (competencyTerms ?? []).find((t) => t.id === id);
                    return (
                      <Badge key={id} variant="default" className="text-xs gap-1 pr-1">
                        {term?.name ?? id}
                        <button
                          type="button"
                          onClick={() => toggleTerm(id)}
                          className="ml-0.5 rounded-full hover:bg-primary-foreground/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
                {selectedTermIds.length > SOFT_LIMIT && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Consider focusing on the most relevant competencies.
                  </div>
                )}
              </div>
            )}

            {termsLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading terms…
              </div>
            ) : (
              <div className="border border-border rounded-md overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border bg-muted/30">
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search competencies..."
                    className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  {searchTerm && (
                    <button type="button" onClick={() => setSearchTerm("")} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Collapsible groups */}
                <div className="max-h-40 overflow-y-auto p-2 space-y-1">
                  {Object.entries(groupedTerms).map(([group, terms]) => (
                    <Collapsible
                      key={group}
                      open={expandedGroups[group] ?? true}
                      onOpenChange={() => toggleGroup(group)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-1 w-full text-left py-1 hover:bg-muted/50 rounded px-1 transition-colors">
                        {expandedGroups[group] ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {group}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {(terms ?? []).length}
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="flex flex-wrap gap-1 pt-1 pb-2 pl-4">
                          {(terms ?? []).map((term) => {
                            const isSelected = selectedTermIds.includes(term.id);
                            return (
                              <button
                                key={term.id}
                                type="button"
                                onClick={() => toggleTerm(term.id)}
                                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                                }`}
                              >
                                {term.name}
                              </button>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                  {Object.keys(groupedTerms).length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      {searchTerm ? "No competencies match your search." : "No competency terms available."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !summary.trim() || summary.trim().length < 5}>
            {isPending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Completing…</>
            ) : (
              "Mark Complete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
