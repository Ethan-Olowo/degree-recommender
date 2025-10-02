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
import ManageDegrees from "./pages/ManageDegrees";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/explore" element={<ExploreDegrees />} />
            <Route path="/degree/:programId" element={<DegreeDetails />} />
            <Route path="/compare" element={<ComparePrograms />} />
            <Route path="/profile/create" element={<ProfileCreate />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/degrees" element={<ManageDegrees />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
