import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import ExploreDegrees from "./pages/ExploreDegrees";
import DegreeDetails from "./pages/DegreeDetails";
import ComparePrograms from "./pages/ComparePrograms";
import ProfileCreate from "./pages/ProfileCreate";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import { useContext } from "react";
import { AuthContext } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";
import ManageDegrees from "./pages/ManageDegrees";
import EditDegree from "./pages/EditDegree";
import NotFound from "./pages/NotFound";
import RecommendationDetails from "./pages/RecommendationDetails";
import RecommendationsAlgorithmsReports from "./pages/RecommendationsAlgorithmsReports";
import DegreesIndustriesReports from "./pages/DegreesIndustriesReports";
import UsersDemographicsReports from "./pages/UsersDemographicsReports";
import ManageSubjects from "./pages/ManageSubjects";
import ManageIndustries from "./pages/ManageIndustries";
import ManageAlgorithms from "./pages/ManageAlgorithms";

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
      <Route path="/admin/degrees/edit/:programId" element={<EditDegree />} />
      <Route path="/admin/subjects" element={<ManageSubjects />} />
      <Route path="/admin/industries" element={<ManageIndustries />} />
      <Route path="/admin/algorithms" element={<ManageAlgorithms />} />
      <Route path="/admin/reports/recommendations" element={<RecommendationsAlgorithmsReports />} />
      <Route path="/admin/reports/degrees" element={<DegreesIndustriesReports />} />
      <Route path="/admin/reports/users" element={<UsersDemographicsReports />} />

      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
