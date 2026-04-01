import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/layout/AppLayout";
import DashboardScreen from "./pages/DashboardScreen";
import MonitoringScreen from "./pages/MonitoringScreen";
import CameraScreen from "./pages/CameraScreen";
import LogsScreen from "./pages/LogsScreen";
import HealthScreen from "./pages/HealthScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/monitor" element={<MonitoringScreen />} />
            <Route path="/camera" element={<CameraScreen />} />
            <Route path="/logs" element={<LogsScreen />} />
            <Route path="/health" element={<HealthScreen />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
