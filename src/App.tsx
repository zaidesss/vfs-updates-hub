import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { UpdatesProvider } from "@/context/UpdatesContext";
import { DemoTourProvider } from "@/context/DemoTourContext";
import { ProfileCompletionProvider } from "@/context/ProfileCompletionContext";
import { DemoTourWrapper } from "@/components/DemoTourWrapper";
import { ProfileCompletionWrapper } from "@/components/ProfileCompletionWrapper";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import Updates from "./pages/Updates";
import UpdateDetail from "./pages/UpdateDetail";
import Activity from "./pages/Activity";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Requests from "./pages/Requests";
import LeaveRequest from "./pages/LeaveRequest";
import OutageReport from "./pages/OutageReport";
import OutageStats from "./pages/OutageStats";
import Calendar from "./pages/Calendar";
import AgentProfile from "./pages/AgentProfile";
import ManageProfiles from "./pages/ManageProfiles";
import MasterDirectory from "./pages/MasterDirectory";
import KnowledgeBase from "./pages/KnowledgeBase";
import CategoryArticles from "./pages/CategoryArticles";
import PlaybookArticle from "./pages/PlaybookArticle";
import NotificationSettings from "./pages/NotificationSettings";
import HelpCenter from "./pages/HelpCenter";
import AgentDashboard from "./pages/AgentDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/updates" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/updates" replace />} />
      <Route
        path="/updates"
        element={
          <ProtectedRoute>
            <Updates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/updates/:id"
        element={
          <ProtectedRoute>
            <UpdateDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute>
            <Activity />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <Requests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave-request"
        element={
          <ProtectedRoute>
            <LeaveRequest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/outage-report"
        element={
          <ProtectedRoute>
            <OutageReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/outage-stats"
        element={
          <ProtectedRoute>
            <OutageStats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AgentProfile />
          </ProtectedRoute>
        }
        />
      <Route
        path="/manage-profiles"
        element={
          <ProtectedRoute>
            <ManageProfiles />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master-directory"
        element={
          <ProtectedRoute>
            <MasterDirectory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge-base"
        element={
          <ProtectedRoute>
            <KnowledgeBase />
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge-base/:category"
        element={
          <ProtectedRoute>
            <CategoryArticles />
          </ProtectedRoute>
        }
      />
      <Route
        path="/people/:profileId/dashboard"
        element={
          <ProtectedRoute>
            <AgentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge-base/:category/:id"
        element={
          <ProtectedRoute>
            <PlaybookArticle />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notification-settings"
        element={
          <ProtectedRoute>
            <NotificationSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/help-center"
        element={
          <ProtectedRoute>
            <HelpCenter />
          </ProtectedRoute>
        }
      />
      {/* Redirects for old routes */}
      <Route path="/user-guide" element={<Navigate to="/help-center" replace />} />
      <Route path="/announcements" element={<Navigate to="/help-center" replace />} />
      <Route path="/changelog" element={<Navigate to="/help-center" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <UpdatesProvider>
          <DemoTourProvider>
            <ProfileCompletionProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
                <DemoTourWrapper />
                <ProfileCompletionWrapper />
              </BrowserRouter>
            </ProfileCompletionProvider>
          </DemoTourProvider>
        </UpdatesProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
