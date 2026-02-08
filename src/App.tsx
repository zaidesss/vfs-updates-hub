import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { UpdatesProvider } from "@/context/UpdatesContext";
import { DemoTourProvider } from "@/context/DemoTourContext";
import { PageDemoProvider } from "@/context/PageDemoContext";
import { ProfileCompletionProvider } from "@/context/ProfileCompletionContext";
import { DemoTourWrapper } from "@/components/DemoTourWrapper";
import { PageDemoGuideWrapper } from "@/components/PageDemoGuideWrapper";
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
import TeamStatusBoard from "./pages/TeamStatusBoard";
import TicketLogs from "./pages/TicketLogs";
import QAEvaluations from "./pages/QAEvaluations";
import QAEvaluationForm from "./pages/QAEvaluationForm";
import QAEvaluationDetail from "./pages/QAEvaluationDetail";
import QAEvaluationEdit from "./pages/QAEvaluationEdit";
import AgentReports from "./pages/AgentReports";
import TeamScorecard from "./pages/TeamScorecard";
import Revalida from "./pages/Revalida";
import RevalidaV2 from "./pages/RevalidaV2";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - prevents refetching fresh data
      gcTime: 10 * 60 * 1000, // 10 minutes - keeps cached data longer
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      retry: 1, // Faster failure feedback
    },
  },
});

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
      <Route
        path="/team-status"
        element={
          <ProtectedRoute>
            <TeamStatusBoard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-performance/ticket-logs"
        element={
          <ProtectedRoute>
            <TicketLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-performance/qa-evaluations"
        element={
          <ProtectedRoute>
            <QAEvaluations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-performance/qa-evaluations/new"
        element={
          <ProtectedRoute>
            <QAEvaluationForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-performance/qa-evaluations/edit/:id"
        element={
          <ProtectedRoute>
            <QAEvaluationEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-performance/qa-evaluations/:id"
        element={
          <ProtectedRoute>
            <QAEvaluationDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-performance/agent-reports"
        element={
          <ProtectedRoute>
            <AgentReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-performance/scorecard"
        element={
          <ProtectedRoute>
            <TeamScorecard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-performance/revalida"
        element={
          <ProtectedRoute>
            <Revalida />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-performance/revalida-v2"
        element={
          <ProtectedRoute>
            <RevalidaV2 />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-performance/revalida-v2/:batchId"
        element={
          <ProtectedRoute>
            <RevalidaV2 />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-performance/revalida-v2/:batchId/:section"
        element={
          <ProtectedRoute>
            <RevalidaV2 />
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
            <PageDemoProvider>
              <ProfileCompletionProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppRoutes />
                  <DemoTourWrapper />
                  <PageDemoGuideWrapper />
                  <ProfileCompletionWrapper />
                </BrowserRouter>
              </ProfileCompletionProvider>
            </PageDemoProvider>
          </DemoTourProvider>
        </UpdatesProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
