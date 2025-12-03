import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Login } from "@/components/Login";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import History from "./pages/History";
import YearOverYear from "./pages/YearOverYear";
import DemoComodatos from "./pages/DemoComodatos";
import ParetoProdutos from "./pages/ParetoProdutos";
import Index from "./pages/Index";
import LeadsCRM from "./pages/LeadsCRM";
import Unauthorized from "./pages/Unauthorized";
import CurvaCrescimento from "./pages/CurvaCrescimento";
import RecenciaRecorrencia from "./pages/RecenciaRecorrencia";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute allowedRoles={["admin","gerente","vendedor"]}>
                  <Home />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pareto-produtos" 
              element={
                <ProtectedRoute allowedRoles={["admin","gerente","vendedor"]}>
                  <ParetoProdutos />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/history" 
              element={
                <ProtectedRoute allowedRoles={["admin","gerente","vendedor"]}>
                  <History />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/year-over-year" 
              element={
                <ProtectedRoute allowedRoles={["admin","gerente","vendedor"]}>
                  <YearOverYear />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/curva-crescimento" 
              element={
                <ProtectedRoute allowedRoles={["admin","gerente","vendedor"]}>
                  <CurvaCrescimento />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recencia-recorrencia" 
              element={
                <ProtectedRoute allowedRoles={["admin","gerente","vendedor"]}>
                  <RecenciaRecorrencia />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/demo-comodatos" 
              element={
                <ProtectedRoute allowedRoles={["admin","gerente","vendedor"]}>
                  <DemoComodatos />
                </ProtectedRoute>
              } 
            />
            <Route path="/pareto-clientes" 
              element={
                <ProtectedRoute allowedRoles={["admin","gerente","vendedor"]}>
                  <Index />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/leads" 
              element={
                <ProtectedRoute allowedRoles={["admin","gerente","vendedor","marketing"]}>
                  <LeadsCRM />
                </ProtectedRoute>
              } 
            />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
