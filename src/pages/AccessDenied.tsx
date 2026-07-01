import { Link } from "react-router-dom";

const AccessDenied = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">You don't have permission to view this page.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Go Home</Link>
      </div>
    </div>
  );
};

export default AccessDenied;
