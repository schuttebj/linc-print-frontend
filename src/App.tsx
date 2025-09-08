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
import PersonDetailPage from './pages/persons/PersonDetailPage';
import PersonEditPage from './pages/persons/PersonEditPage';
import PersonFormTest from './pages/persons/PersonFormTest';

// Application Pages
import ApplicationsDashboard from './pages/applications/ApplicationsDashboard';
import ApplicationListPage from './pages/applications/ApplicationListPage';
import ApplicationFormPage from './pages/applications/ApplicationFormPage';
import ApplicationDetailPage from './pages/applications/ApplicationDetailPage';
import DriverLicenseCaptureFormPage from './pages/applications/DriverLicenseCaptureFormPage';
import LearnerPermitCaptureFormPage from './pages/applications/LearnerPermitCaptureFormPage';

import LearnersLicenseApplicationPage from './pages/applications/LearnersLicenseApplicationPage';
import DuplicateLearnersLicensePage from './pages/applications/DuplicateLearnersLicensePage';
import DrivingLicenseApplicationPage from './pages/applications/DrivingLicenseApplicationPage';
import RenewDrivingLicensePage from './pages/applications/RenewDrivingLicensePage';
import ProfessionalLicenseApplicationPage from './pages/applications/ProfessionalLicenseApplicationPage';
import TemporaryLicenseApplicationPage from './pages/applications/TemporaryLicenseApplicationPage';
import ForeignConversionApplicationPage from './pages/applications/ForeignConversionApplicationPage';
import InternationalPermitApplicationPage from './pages/applications/InternationalPermitApplicationPage';

// License Pages
import LicenseDashboard from './pages/licenses/LicenseDashboard';
import LicenseListPage from './pages/licenses/LicenseListPage';
import LicenseDetailPage from './pages/licenses/LicenseDetailPage';
import LicenseApprovalPage from './pages/licenses/LicenseApprovalPage';

// Card Pages
import CardListPage from './pages/cards/CardListPage';
import CardOrderingByIdPage from './pages/cards/CardOrderingByIdPage';
import CardCollectionPage from './pages/cards/CardCollectionPage';
import CardDestructionPage from './pages/cards/CardDestructionPage';
import PrintQueuePage from './pages/cards/PrintQueuePage';
import PrintJobPrintingPage from './pages/cards/PrintJobPrintingPage';
import QualityAssurancePage from './pages/cards/QualityAssurancePage';

// Transaction Pages
import TransactionPOSPage from './pages/transactions/TransactionPOSPage';
import TransactionListPage from './pages/transactions/TransactionListPage';
import FeeManagementPage from './pages/transactions/FeeManagementPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagementPage from './pages/admin/UserManagementPage';
import UserFormPage from './pages/admin/UserFormPage';
import LocationManagementPage from './pages/admin/LocationManagementPage';
import LocationFormPage from './pages/admin/LocationFormPage';
import AuditLogViewer from './pages/admin/AuditLogViewer';
import IssueManagementPage from './pages/admin/IssueManagementPage';

// Analytics Pages
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';

// Temporary Test Pages
import FingerprintTestPage from './pages/admin/FingerprintTestPage';
import FingerprintTemplateTestPage from './pages/admin/FingerprintTemplateTestPage';
import ProductionBiometricTestPage from './pages/admin/ProductionBiometricTestPage';
import DocumentTemplatesPage from './pages/admin/DocumentTemplatesPage';


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
                path="detail/:personId" 
                element={
                  <ProtectedRoute requiredPermission="persons.read">
                    <PersonDetailPage />
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

            {/* Applications - requires application permissions */}
            <Route path="applications">
              <Route 
                index 
                element={
                  <ProtectedRoute requiredPermission="applications.read">
                    <ApplicationListPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="dashboard" 
                element={
                  <ProtectedRoute requiredPermission="applications.read">
                    <ApplicationsDashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* New License Applications */}
              <Route 
                path="learners-license" 
                element={
                  <ProtectedRoute requiredPermission="applications.create">
                    <LearnersLicenseApplicationPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="driving-license" 
                element={
                  <ProtectedRoute requiredPermission="applications.create">
                    <DrivingLicenseApplicationPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="professional-license" 
                element={
                  <ProtectedRoute requiredPermission="applications.create">
                    <ProfessionalLicenseApplicationPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="temporary-license" 
                element={
                  <ProtectedRoute requiredPermission="applications.create">
                    <TemporaryLicenseApplicationPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Renewal and Duplicates */}
              <Route 
                path="renew-license" 
                element={
                  <ProtectedRoute requiredPermission="applications.create">
                    <RenewDrivingLicensePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="duplicate-learners" 
                element={
                  <ProtectedRoute requiredPermission="applications.create">
                    <DuplicateLearnersLicensePage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Conversions & International */}
              <Route 
                path="foreign-conversion" 
                element={
                  <ProtectedRoute requiredPermission="applications.create">
                    <ForeignConversionApplicationPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="international-permit" 
                element={
                  <ProtectedRoute requiredPermission="applications.create">
                    <InternationalPermitApplicationPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* License Capture (for existing licenses) */}
              <Route 
                path="driver-license-capture" 
                element={
                  <ProtectedRoute requiredPermission="applications.create">
                    <DriverLicenseCaptureFormPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="learner-permit-capture" 
                element={
                  <ProtectedRoute requiredPermission="applications.create">
                    <LearnerPermitCaptureFormPage />
                  </ProtectedRoute>
                } 
              />

              

              
              {/* Application details and editing */}
              <Route 
                path="edit/:applicationId" 
                element={
                  <ProtectedRoute requiredPermission="applications.update">
                    <ApplicationFormPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":applicationId" 
                element={
                  <ProtectedRoute requiredPermission="applications.read">
                    <ApplicationDetailPage />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* License Management - requires license permissions */}
            <Route path="licenses">
              <Route 
                index 
                element={
                  <ProtectedRoute requiredPermission="licenses.read">
                    <LicenseDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="list" 
                element={
                  <ProtectedRoute requiredPermission="licenses.read">
                    <LicenseListPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="approval" 
                element={
                  <ProtectedRoute requiredPermission="applications.authorize">
                    <LicenseApprovalPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":licenseId" 
                element={
                  <ProtectedRoute requiredPermission="licenses.read">
                    <LicenseDetailPage />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Card Management - requires card permissions */}
            <Route path="cards">
              <Route 
                index 
                element={
                  <ProtectedRoute requiredPermission="cards.read">
                    <CardListPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="order" 
                element={
                  <ProtectedRoute requiredPermission="printing.create">
                    <CardOrderingByIdPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="collection" 
                element={
                  <ProtectedRoute requiredPermission="cards.collect">
                    <CardCollectionPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="destruction" 
                element={
                  <ProtectedRoute requiredPermission="cards.destroy">
                    <CardDestructionPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="print-queue" 
                element={
                  <ProtectedRoute requiredPermission="printing.read">
                    <PrintQueuePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="print-job/:jobId" 
                element={
                  <ProtectedRoute requiredPermission="printing.print">
                    <PrintJobPrintingPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="quality-assurance" 
                element={
                  <ProtectedRoute requiredPermission="printing.read">
                    <QualityAssurancePage />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Transaction Management - requires transaction permissions */}
            <Route path="transactions">
              <Route 
                index 
                element={
                  <ProtectedRoute requiredPermission="transactions.read">
                    <TransactionListPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="pos" 
                element={
                  <ProtectedRoute requiredPermission="transactions.create">
                    <TransactionPOSPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="fee-management" 
                element={
                  <ProtectedRoute requiredPermission="transactions.manage">
                    <FeeManagementPage />
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
                path="users/create" 
                element={
                  <ProtectedRoute requiredPermission="users.create">
                    <UserFormPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="users/edit/:userId" 
                element={
                  <ProtectedRoute requiredPermission="users.update">
                    <UserFormPage />
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
                path="locations/create" 
                element={
                  <ProtectedRoute requiredPermission="admin.locations">
                    <LocationFormPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="locations/edit/:locationId" 
                element={
                  <ProtectedRoute requiredPermission="admin.locations">
                    <LocationFormPage />
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
              <Route 
                path="issues" 
                element={
                  <ProtectedRoute requiredPermission="admin.issues.read">
                    <IssueManagementPage />
                  </ProtectedRoute>
                } 
              />
              
                            {/* Temporary Test Routes - Remove after testing */}
              <Route 
                path="fingerprint-test" 
                element={
                  <ProtectedRoute requiredPermission="admin.read">
                    <FingerprintTestPage />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="fingerprint-templates" 
                element={
                  <ProtectedRoute requiredPermission="admin.read">
                    <FingerprintTemplateTestPage />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="production-biometric" 
                element={
                  <ProtectedRoute requiredPermission="admin.read">
                    <ProductionBiometricTestPage />
                  </ProtectedRoute>
                }
              />
                                  <Route 
                      path="document-templates"
                      element={
                        <ProtectedRoute requiredPermission="admin.read">
                          <DocumentTemplatesPage />
                        </ProtectedRoute>
                      }
                    />

            </Route>

            {/* Analytics Dashboard - requires analytics permissions */}
            <Route path="analytics">
              <Route 
                index 
                element={
                  <ProtectedRoute requiredPermission="analytics.read">
                    <AnalyticsDashboard />
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