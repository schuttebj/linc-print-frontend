import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

// Authentication
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PersonManagementPage from './pages/persons/PersonManagementPage';

function App() {
  return (
    <AuthProvider>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Protected Dashboard routes with layout */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            
            {/* Person Management - requires person permissions */}
            <Route path="persons">
              <Route 
                path="manage" 
                element={
                  <ProtectedRoute requiredPermission="persons.create">
                    <PersonManagementPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="register" 
                element={
                  <ProtectedRoute requiredPermission="persons.create">
                    <PersonManagementPage />
                  </ProtectedRoute>
                } 
              />
            </Route>
          </Route>
          
          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Box>
    </AuthProvider>
  );
}

export default App; 