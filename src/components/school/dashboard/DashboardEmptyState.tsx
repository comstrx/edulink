import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, GraduationCap, UserPlus, Rocket } from "lucide-react";

interface Props {
  canUseHiring: boolean;
  canUseTraining: boolean;
}

const DashboardEmptyState = ({ canUseHiring, canUseTraining }: Props) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Rocket className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">Your school is ready to go</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Start by posting a job, assigning training to your team, or inviting staff members.
        </p>
        <div className="flex flex-wrap gap-3 mt-6 justify-center">
          {canUseHiring && (
            <Button onClick={() => navigate("/app/school/hiring/jobs")} variant="default">
              <Plus className="mr-2 h-4 w-4" /> Post Your First Job
            </Button>
          )}
          {canUseTraining && (
            <Button onClick={() => navigate("/app/school/training/assign")} variant="outline">
              <GraduationCap className="mr-2 h-4 w-4" /> Assign Training
            </Button>
          )}
          <Button onClick={() => navigate("/app/school/team")} variant="outline">
            <UserPlus className="mr-2 h-4 w-4" /> Invite Team
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardEmptyState;
