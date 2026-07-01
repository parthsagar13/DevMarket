import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/LandingPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';

// Simple Auth Guard component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafafa]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#fafafa] font-sans antialiased">
        <Routes>
          {/* Public Visitor Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard activeTab="dashboard" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/templates"
            element={
              <ProtectedRoute>
                <AdminDashboard activeTab="templates" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/templates/upload"
            element={
              <ProtectedRoute>
                <AdminDashboard activeTab="upload" />
              </ProtectedRoute>
            }
          />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </div>
    </Router>
  );
}
