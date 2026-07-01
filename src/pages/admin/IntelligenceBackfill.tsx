import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { runIntelligenceBackfill, type BackfillResult, type BackfillSummary } from "@/intelligence/backfill/intelligence-backfill";
import { CheckCircle2, XCircle, Loader2, Play } from "lucide-react";

type Status = "idle" | "running" | "done" | "error";

const IntelligenceBackfill = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [summary, setSummary] = useState<BackfillSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setStatus("running");
    setError(null);
    setSummary(null);
    try {
      const result = await runIntelligenceBackfill();
      setSummary(result);
      setStatus("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  const successCount = summary?.results.filter((r) => r.errors.length === 0).length ?? 0;
  const totalCount = summary?.totalTeachers ?? 0;
  const progress = status === "running" ? undefined : status === "done" ? 100 : 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>Intelligence Backfill</CardTitle>
          <CardDescription>
            Trigger a full intelligence refresh for all teachers. This populates CRI, Gap, Match,
            Recommendation, Verified State snapshots and Talent Profiles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleRun} disabled={status === "running"}>
            {status === "running" ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
            ) : (
              <><Play className="h-4 w-4" /> Run Backfill</>
            )}
          </Button>

          {status === "running" && <Progress className="h-2" />}

          {error && (
            <p className="text-sm text-destructive">Error: {error}</p>
          )}

          {summary && (
            <>
              <p className="text-sm text-muted-foreground">
                Completed at {summary.completedAt} — {successCount}/{totalCount} teachers fully successful
              </p>
              {progress !== undefined && <Progress value={progress} className="h-2" />}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>CRI</TableHead>
                    <TableHead>Gaps</TableHead>
                    <TableHead>Matches</TableHead>
                    <TableHead>Recs</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Talent</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.results.map((r: BackfillResult) => (
                    <TableRow key={r.teacherId}>
                      <TableCell className="font-medium">{r.teacherName}</TableCell>
                      <TableCell><StatusIcon ok={r.cri} /></TableCell>
                      <TableCell><StatusIcon ok={r.gaps} /></TableCell>
                      <TableCell>{r.matches}</TableCell>
                      <TableCell><StatusIcon ok={r.recommendations} /></TableCell>
                      <TableCell><StatusIcon ok={r.verifiedState} /></TableCell>
                      <TableCell><StatusIcon ok={r.talentProfile} /></TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                        {r.errors.length > 0 ? r.errors.join("; ") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StatusIcon = ({ ok }: { ok: boolean }) =>
  ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />;

export default IntelligenceBackfill;
