import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/Student/StudentDashboard";
import ExploreDegrees from "./pages/Student/ExploreDegrees";
import DegreeDetails from "./pages/Student/DegreeDetails";
import ComparePrograms from "./pages/Student/ComparePrograms";
import ProfileCreate from "./pages/Student/ProfileCreate";
import Profile from "./pages/Student/Profile";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import { useAuth } from "./contexts/AuthContext";
import ManageDegrees from "./pages/Admin/ManageDegrees";
import NotFound from "./pages/NotFound";
import RecommendationDetails from "./pages/Student/RecommendationDetails";
import RecommendationsAlgorithmsReports from "./pages/Admin/RecommendationsAlgorithmsReports";
import MarketInsightsReports from "./pages/Admin/MarketInsightsReports";
import DegreesIndustriesReports from "./pages/Admin/DegreesIndustriesReports";
import UsersDemographicsReports from "./pages/Admin/UsersDemographicsReports";
import ManageSubjects from "./pages/Admin/ManageSubjects";
import ManageIndustries from "./pages/Admin/ManageIndustries";
import ManageAlgorithms from "./pages/Admin/ManageAlgorithms";
import APIPerformanceReports from "./pages/Admin/APIPerformanceReports";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isAdmin } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/dashboard"
        element={isAdmin ? <AdminDashboard /> : <StudentDashboard />}
      />
      <Route path="/explore" element={<ExploreDegrees />} />
      <Route path="/degree/:programId" element={<DegreeDetails />} />
      <Route path="/compare" element={<ComparePrograms />} />
      <Route path="/profile/create" element={<ProfileCreate />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/recommendation/:recommendationId" element={<RecommendationDetails />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/degrees" element={<ManageDegrees />} />
      <Route path="/admin/subjects" element={<ManageSubjects />} />
      <Route path="/admin/industries" element={<ManageIndustries />} />
      <Route path="/admin/algorithms" element={<ManageAlgorithms />} />
  <Route path="/admin/reports/recommendations" element={<RecommendationsAlgorithmsReports />} />
  <Route path="/admin/reports/market" element={<MarketInsightsReports />} />
  <Route path="/admin/reports/degrees" element={<DegreesIndustriesReports />} />
  <Route path="/admin/reports/users" element={<UsersDemographicsReports />} />
  <Route path="/admin/reports/api-performance" element={<APIPerformanceReports />} />

      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
