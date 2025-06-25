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
import PersonSearchPage from './pages/persons/PersonSearchPage';
import PersonEditPage from './pages/persons/PersonEditPage';
import PersonFormTest from './pages/persons/PersonFormTest';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagementPage from './pages/admin/UserManagementPage';
import LocationManagementPage from './pages/admin/LocationManagementPage';
import AuditLogViewer from './pages/admin/AuditLogViewer';

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
              <Route 
                path="search" 
                element={
                  <ProtectedRoute requiredPermission="persons.read">
                    <PersonSearchPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="edit/:personId" 
                element={
                  <ProtectedRoute requiredPermission="persons.update">
                    <PersonEditPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="test-form" 
                element={
                  <ProtectedRoute requiredPermission="persons.create">
                    <PersonFormTest />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Admin Management - requires admin permissions */}
            <Route path="admin">
              <Route 
                index 
                element={
                  <ProtectedRoute requiredPermission="admin.read">
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="users" 
                element={
                  <ProtectedRoute requiredPermission="admin.users">
                    <UserManagementPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="locations" 
                element={
                  <ProtectedRoute requiredPermission="admin.locations">
                    <LocationManagementPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="audit" 
                element={
                  <ProtectedRoute requiredPermission="admin.audit">
                    <AuditLogViewer />
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