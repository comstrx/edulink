import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, ChevronDown } from "lucide-react";
import { VisibilityTrustIndicator } from "./VisibilityTrustIndicator";

const SHELL_LABELS: Record<string, string> = {
  teacher: "Teacher",
  school: "School",
  provider: "Provider",
  admin: "Admin",
};

interface ShellTopbarProps {
  shellArea: string;
}

export function ShellTopbar({ shellArea }: ShellTopbarProps) {
  const { account, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const displayName = account?.display_name || account?.email || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const shellLabel = SHELL_LABELS[shellArea] || "EduLink";

  return (
    <>
      {/* Left: shell label */}
      <span className="text-sm text-muted-foreground font-medium tracking-wide uppercase">
        {shellLabel}
      </span>

      {/* Center: visibility/trust indicator */}
      <div className="ml-auto mr-2">
        <VisibilityTrustIndicator />
      </div>

      {/* Right: account identity + sign out */}
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 h-9">
              <Avatar className="h-7 w-7">
                {account?.avatar_url && (
                  <AvatarImage src={account.avatar_url} alt={displayName} />
                )}
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground max-w-[140px] truncate hidden sm:inline">
                {displayName}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium truncate">{displayName}</p>
              {account?.email && (
                <p className="text-xs text-muted-foreground truncate">{account.email}</p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
