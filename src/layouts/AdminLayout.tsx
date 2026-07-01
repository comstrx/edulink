import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/sidebars/AdminSidebar";
import { ShellTopbar } from "@/components/shell/ShellTopbar";

const AdminLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AdminSidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border flex items-center px-4">
            <SidebarTrigger className="mr-4" />
            <ShellTopbar shellArea="admin" />
          </header>

          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
