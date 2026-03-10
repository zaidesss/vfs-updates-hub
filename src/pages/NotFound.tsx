import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { FileQuestion } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <EmptyState
        icon={<FileQuestion className="h-7 w-7" />}
        title="404 — Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={
          <a href="/" className="text-primary text-sm underline hover:text-primary/90">
            Return to Home
          </a>
        }
      />
    </div>
  );
};

export default NotFound;
