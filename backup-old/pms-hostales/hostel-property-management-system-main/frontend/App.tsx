import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CheckInPage } from './pages/CheckInPage';
import { CheckOutPage } from './pages/CheckOutPage';
import { RoomsPage } from './pages/RoomsPage';
import { GuestsPage } from './pages/GuestsPage';
import { POSPage } from './pages/POSPage';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function AppInner() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/check-in" element={<CheckInPage />} />
                  <Route path="/check-out" element={<CheckOutPage />} />
                  <Route path="/rooms" element={<RoomsPage />} />
                  <Route path="/guests" element={<GuestsPage />} />
                  <Route path="/pos" element={<POSPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <div className="dark">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppInner />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </div>
  );
}
