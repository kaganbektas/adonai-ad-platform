import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import DashboardLayout from "./components/dashboard/DashboardLayout.tsx";
import DashboardHome from "./pages/DashboardHome.tsx";
import AnalysesList from "./pages/AnalysesList.tsx";
import AnalysisRunning from "./pages/AnalysisRunning.tsx";
import AnalysisResults from "./pages/AnalysisResults.tsx";
import CreativesPage from "./pages/CreativesPage.tsx";
import ReportsPage from "./pages/ReportsPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import InsightsPage from "./pages/InsightsPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <I18nProvider>
  <AuthProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardHome />} />
            <Route path="analyses" element={<AnalysesList />} />
            <Route path="analysis/new" element={<AnalysisRunning />} />
            <Route path="analysis/:id" element={<AnalysisRunning />} />
            <Route path="analysis/:id/results" element={<AnalysisResults />} />
            <Route path="creatives" element={<CreativesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </AuthProvider>
  </I18nProvider>
);

export default App;
