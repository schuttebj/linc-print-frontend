/**
 * Dashboard Layout for Madagascar Driver's License System
 */

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  Collapse,
  Chip,
  Badge,
  Breadcrumbs,
  Skeleton,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Person,
  Search,
  Logout,
  AccountCircle,
  AdminPanelSettings,
  People,
  LocationOn,
  Assessment,
  Add as AddIcon,
  CreditCard,
  Assignment,
  Visibility,
  School,
  DirectionsCar,
  Refresh,
  FileCopy,
  LocalShipping,
  AccessTime,
  Public,
  FlightTakeoff,
  ExpandLess,
  ExpandMore,
  Apps,
  Payment,
  Receipt,
  PointOfSale,
  AttachMoney,
  Analytics,
  BarChart,
  KeyboardArrowDown,
  NavigateNext,
  CollectionsBookmark,
  Delete as DeleteIcon,
} from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';
import CommandPalette from '../components/CommandPalette';

const DRAWER_WIDTH = 300;

const DashboardLayout: React.FC = () => {
  const { user, logout, hasPermission, userDataLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [personsExpanded, setPersonsExpanded] = useState(false);
  const [applicationsExpanded, setApplicationsExpanded] = useState(false);
  const [createApplicationsExpanded, setCreateApplicationsExpanded] = useState(false);
  const [licensesExpanded, setLicensesExpanded] = useState(false);
  const [cardsPrintingExpanded, setCardsPrintingExpanded] = useState(false);
  const [transactionsExpanded, setTransactionsExpanded] = useState(false);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);
  const [administrationExpanded, setAdministrationExpanded] = useState(false);

  // Function to get user location display text
  const getUserLocationText = (): string => {
    if (!user) return '';
    
    switch (user.user_type) {
      case 'SYSTEM_USER':
        return 'All';
      case 'NATIONAL_ADMIN':
        return 'National';
      case 'PROVINCIAL_ADMIN':
        return user.scope_province || 'Provincial';
      case 'LOCATION_USER':
        // For now, show "Office" - can be enhanced to show actual office name later
        return 'Office';
      default:
        return '';
    }
  };

  // Function to generate breadcrumbs based on current route
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(segment => segment !== '');
    const breadcrumbs: { text: string; path?: string; icon?: React.ReactNode }[] = [];

    // Always start with Dashboard
    breadcrumbs.push({
      text: 'Dashboard',
      path: '/dashboard',
      icon: <Dashboard fontSize="small" />
    });

    // Route mapping for breadcrumbs
    const routeMap: Record<string, { text: string; icon?: React.ReactNode }> = {
      'persons': { text: 'Persons', icon: <People fontSize="small" /> },
      'manage': { text: 'Person Management', icon: <Person fontSize="small" /> },
      'search': { text: 'Person Search', icon: <Search fontSize="small" /> },
      'applications': { text: 'Applications', icon: <Apps fontSize="small" /> },
      'dashboard': { text: 'Dashboard' },
      'learners-license': { text: "Learner's License Application", icon: <School fontSize="small" /> },
      'driving-license': { text: 'Driving License Application', icon: <DirectionsCar fontSize="small" /> },
      'professional-license': { text: 'Professional License Application', icon: <DirectionsCar fontSize="small" /> },
      'temporary-license': { text: 'Temporary License Application', icon: <Assignment fontSize="small" /> },
      'renew-license': { text: 'Renew License', icon: <Refresh fontSize="small" /> },
      'duplicate-learners': { text: "Duplicate Learner's License", icon: <FileCopy fontSize="small" /> },
      'foreign-conversion': { text: 'Convert Foreign License', icon: <Assessment fontSize="small" /> },
      'international-permit': { text: 'International Driving Permit', icon: <CreditCard fontSize="small" /> },
      'driver-license-capture': { text: 'Driver License Capture', icon: <CreditCard fontSize="small" /> },
      'learner-permit-capture': { text: 'Learner Permit Capture', icon: <Assignment fontSize="small" /> },

      'create': { text: 'Create Application', icon: <AddIcon fontSize="small" /> },
      'licenses': { text: 'Licenses', icon: <CreditCard fontSize="small" /> },
      'list': { text: 'Search Licenses', icon: <Visibility fontSize="small" /> },
      'approval': { text: 'License Approval', icon: <Assessment fontSize="small" /> },
      'cards': { text: 'Cards', icon: <CreditCard fontSize="small" /> },
      'order': { text: 'Order Cards', icon: <Search fontSize="small" /> },
      'collection': { text: 'Card Collection', icon: <CollectionsBookmark fontSize="small" /> },
      'destruction': { text: 'Card Destruction', icon: <DeleteIcon fontSize="small" /> },
      'print-queue': { text: 'Print Queue', icon: <Assessment fontSize="small" /> },
      'quality-assurance': { text: 'Quality Assurance', icon: <AdminPanelSettings fontSize="small" /> },
      'transactions': { text: 'Transactions', icon: <Receipt fontSize="small" /> },
      'pos': { text: 'Point of Sale', icon: <PointOfSale fontSize="small" /> },
      'fee-management': { text: 'Fee Management', icon: <AttachMoney fontSize="small" /> },
      'analytics': { text: 'Analytics', icon: <BarChart fontSize="small" /> },
      'admin': { text: 'Admin', icon: <AdminPanelSettings fontSize="small" /> },
      'users': { text: 'User Management', icon: <People fontSize="small" /> },
      'locations': { text: 'Location Management', icon: <LocationOn fontSize="small" /> },
      'audit': { text: 'Audit Logs', icon: <Assessment fontSize="small" /> },
      'issues': { text: 'Issue Management', icon: <Assignment fontSize="small" /> }
    };

    // Build breadcrumbs based on path segments
    let currentPath = '';
    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      currentPath += `/${segment}`;
      
      const route = routeMap[segment];
      if (route) {
        // Don't add duplicate "Dashboard" breadcrumb
        if (!(segment === 'dashboard' && breadcrumbs.length === 1)) {
          breadcrumbs.push({
            text: route.text,
            path: i === pathSegments.length - 1 ? undefined : `/dashboard${currentPath}`, // No link for current page
            icon: route.icon
          });
        }
      }
    }

    return breadcrumbs;
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
    navigate('/login');
  };

  // Close all sections helper
  const closeAllSections = () => {
    setPersonsExpanded(false);
    setApplicationsExpanded(false);
    setCreateApplicationsExpanded(false);
    setLicensesExpanded(false);
    setCardsPrintingExpanded(false);
    setTransactionsExpanded(false);
    setAnalyticsExpanded(false);
    setAdministrationExpanded(false);
  };

  const handlePersonsToggle = () => {
    if (personsExpanded) {
      setPersonsExpanded(false);
    } else {
      closeAllSections();
      setPersonsExpanded(true);
    }
  };

  const handleApplicationsToggle = () => {
    if (applicationsExpanded) {
      setApplicationsExpanded(false);
      setCreateApplicationsExpanded(false); // Also close nested applications
    } else {
      closeAllSections();
      setApplicationsExpanded(true);
    }
  };

  const handleCreateApplicationsToggle = () => {
    setCreateApplicationsExpanded(!createApplicationsExpanded);
  };

  const handleLicensesToggle = () => {
    if (licensesExpanded) {
      setLicensesExpanded(false);
    } else {
      closeAllSections();
      setLicensesExpanded(true);
    }
  };

  const handleCardsPrintingToggle = () => {
    if (cardsPrintingExpanded) {
      setCardsPrintingExpanded(false);
    } else {
      closeAllSections();
      setCardsPrintingExpanded(true);
    }
  };

  const handleTransactionsToggle = () => {
    if (transactionsExpanded) {
      setTransactionsExpanded(false);
    } else {
      closeAllSections();
      setTransactionsExpanded(true);
    }
  };

  const handleAnalyticsToggle = () => {
    if (analyticsExpanded) {
      setAnalyticsExpanded(false);
    } else {
      closeAllSections();
      setAnalyticsExpanded(true);
    }
  };

  const handleAdministrationToggle = () => {
    if (administrationExpanded) {
      setAdministrationExpanded(false);
    } else {
      closeAllSections();
      setAdministrationExpanded(true);
    }
  };

  const handleOpenCommandPalette = () => {
    setCommandPaletteOpen(true);
  };

  const handleCloseCommandPalette = () => {
    setCommandPaletteOpen(false);
  };

  // Keyboard shortcut for command palette (Cmd+K)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Core navigation items (only Dashboard)
  const coreNavigationItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      permission: null,
    },
  ];

  // Person management items
  const personNavigationItems = [
    {
      text: 'Person Management',
      icon: <Person />,
      path: '/dashboard/persons/manage',
      permission: 'persons.create',
    },
    {
      text: 'Person Search',
      icon: <Search />,
      path: '/dashboard/persons/search',
      permission: 'persons.read',
    },
  ];

  // Application navigation items
  const applicationNavigationItems = [
    {
      text: 'Applications Dashboard',
      icon: <Apps />,
      path: '/dashboard/applications/dashboard',
      permission: 'applications.read',
    },
    {
      text: 'View Applications',
      icon: <Visibility />,
      path: '/dashboard/applications',
      permission: 'applications.read',
    },
  ];

  // Application dropdown items (organized by category)
  const applicationDropdownItems = [
    {
      category: 'New License Applications',
      items: [
        {
          text: 'Learner\'s License Application',
          icon: <School />,
          path: '/dashboard/applications/learners-license',
          permission: 'applications.create',
        },
        {
          text: 'Driving License Application',
          icon: <DirectionsCar />,
          path: '/dashboard/applications/driving-license',
          permission: 'applications.create',
        },
        {
          text: 'Professional License Application',
          icon: <DirectionsCar />,
          path: '/dashboard/applications/professional-license',
          permission: 'applications.create',
        },
        {
          text: 'Temporary License Application',
          icon: <Assignment />,
          path: '/dashboard/applications/temporary-license',
          permission: 'applications.create',
        },
      ]
    },
    {
      category: 'Renewals & Duplicates',
      items: [
        {
          text: 'Renew Driving License',
          icon: <Refresh />,
          path: '/dashboard/applications/renew-license',
          permission: 'applications.create',
        },
        {
          text: 'Duplicate Learner\'s License',
          icon: <FileCopy />,
          path: '/dashboard/applications/duplicate-learners',
          permission: 'applications.create',
        },
      ]
    },
    {
      category: 'Conversions & International',
      items: [
        {
          text: 'Convert Foreign License',
          icon: <Assessment />,
          path: '/dashboard/applications/foreign-conversion',
          permission: 'applications.create',
        },
        {
          text: 'International Driving Permit',
          icon: <CreditCard />,
          path: '/dashboard/applications/international-permit',
          permission: 'applications.create',
        },
      ]
    },
    {
      category: 'License Capture',
      items: [
        {
          text: 'Driver License Capture',
          icon: <CreditCard />,
          path: '/dashboard/applications/driver-license-capture',
          permission: 'applications.create',
        },
        {
          text: 'Learner Permit Capture',
          icon: <Assignment />,
          path: '/dashboard/applications/learner-permit-capture',
          permission: 'applications.create',
        },

      ]
    },
    {
      category: 'Other',
      items: [
        {
          text: 'Other Applications',
          icon: <AddIcon />,
          path: '/dashboard/applications/dashboard',
          permission: 'applications.create',
        },
      ]
    }
  ];

  // License management navigation items
  const licenseNavigationItems = [
    {
      text: 'License Dashboard',
      icon: <CreditCard />,
      path: '/dashboard/licenses',
      permission: 'licenses.read',
    },
    {
      text: 'Search Licenses',
      icon: <Visibility />,
      path: '/dashboard/licenses/list',
      permission: 'licenses.read',
    },
    {
      text: 'License Approval',
      icon: <Assessment />,
      path: '/dashboard/licenses/approval',
      permission: 'applications.authorize',
    },
  ];

  // Card management navigation items
  const cardNavigationItems = [
    {
      text: 'Card Management',
      icon: <CreditCard />,
      path: '/dashboard/cards',
      permission: 'cards.read',
    },
    {
      text: 'Order Cards by ID',
      icon: <Search />,
      path: '/dashboard/cards/order',
      permission: 'printing.create',
    },
    {
      text: 'Card Collection',
      icon: <CollectionsBookmark />,
      path: '/dashboard/cards/collection',
      permission: 'cards.collect',
    },
    {
      text: 'Card Destruction',
      icon: <DeleteIcon />,
      path: '/dashboard/cards/destruction',
      permission: 'cards.destroy',
    },
    {
      text: 'Print Queue',
      icon: <Assessment />,
      path: '/dashboard/cards/print-queue',
      permission: 'printing.read',
    },
    {
      text: 'Quality Assurance',
      icon: <AdminPanelSettings />,
      path: '/dashboard/cards/quality-assurance',
      permission: 'printing.read',
    },
  ];

  // Transaction navigation items
  const transactionNavigationItems = [
    {
      text: 'Point of Sale',
      icon: <PointOfSale />,
      path: '/dashboard/transactions/pos',
      permission: 'transactions.create',
    },
    {
      text: 'Transaction History',
      icon: <Receipt />,
      path: '/dashboard/transactions',
      permission: 'transactions.read',
    },
    {
      text: 'Fee Management',
      icon: <AttachMoney />,
      path: '/dashboard/transactions/fee-management',
      permission: 'transactions.manage',
    },
  ];


  // Admin navigation items
  const adminNavigationItems = [
    {
      text: 'Admin Dashboard',
      icon: <AdminPanelSettings />,
      path: '/dashboard/admin',
      permission: 'admin.read',
    },
    {
      text: 'User Management',
      icon: <People />,
      path: '/dashboard/admin/users',
      permission: 'admin.users',
    },
    {
      text: 'Location Management',
      icon: <LocationOn />,
      path: '/dashboard/admin/locations',
      permission: 'admin.locations',
    },
    {
      text: 'Audit Logs',
      icon: <Assessment />,
      path: '/dashboard/admin/audit',
      permission: 'admin.audit',
    },
    {
      text: 'Issue Management',
      icon: <Assignment />,
      path: '/dashboard/admin/issues',
      permission: 'admin.issues.read',
    },
  ];

  // Analytics navigation items
  const analyticsNavigationItems = [
    {
      text: 'Analytics Dashboard',
      icon: <BarChart />,
      path: '/dashboard/analytics',
      permission: 'analytics.read',
    },
  ];

  // Define all available application types from the applications folder
  const allApplicationTypes = [
    // New License Applications
    {
      category: 'New License Applications',
      applications: [
        {
          text: "Learner's License Application",
          icon: <School />,
          path: '/dashboard/applications/learners-license',
          permission: 'applications.create',
        },
        {
          text: 'Driving License Application',
          icon: <DirectionsCar />,
          path: '/dashboard/applications/driving-license',
          permission: 'applications.create',
        },
        {
          text: 'Professional License Application',
          icon: <DirectionsCar />,
          path: '/dashboard/applications/professional-license',
          permission: 'applications.create',
        },
        {
          text: 'Temporary License Application',
          icon: <Assignment />,
          path: '/dashboard/applications/temporary-license',
          permission: 'applications.create',
        },
      ]
    },
    // Renewals & Duplicates
    {
      category: 'Renewals & Duplicates',
      applications: [
        {
          text: 'Renew Driving License',
          icon: <Refresh />,
          path: '/dashboard/applications/renew-license',
          permission: 'applications.create',
        },
        {
          text: "Duplicate Learner's License",
          icon: <FileCopy />,
          path: '/dashboard/applications/duplicate-learners',
          permission: 'applications.create',
        },
      ]
    },
    // Conversions & International
    {
      category: 'Conversions & International',
      applications: [
        {
          text: 'Convert Foreign License',
          icon: <Assessment />,
          path: '/dashboard/applications/foreign-conversion',
          permission: 'applications.create',
        },
        {
          text: 'International Driving Permit',
          icon: <CreditCard />,
          path: '/dashboard/applications/international-permit',
          permission: 'applications.create',
        },
      ]
    },
    // License Capture
    {
      category: 'License Capture',
      applications: [
        {
          text: 'Driver License Capture',
          icon: <CreditCard />,
          path: '/dashboard/applications/driver-license-capture',
          permission: 'applications.create',
        },
        {
          text: 'Learner Permit Capture',
          icon: <Assignment />,
          path: '/dashboard/applications/learner-permit-capture',
          permission: 'applications.create',
        },

      ]
    }
  ];

  // Reorganized navigation sections for new collapsible structure
  const applicationsMainItems = applicationNavigationItems.filter(item => !item.permission || hasPermission(item.permission));
  const cardsPrintingItems = cardNavigationItems.filter(item => !item.permission || hasPermission(item.permission));
  const transactionsPaymentsItems = transactionNavigationItems.filter(item => !item.permission || hasPermission(item.permission));
  const analyticsReportsItems = analyticsNavigationItems.filter(item => !item.permission || hasPermission(item.permission));
  const administrationItems = adminNavigationItems.filter(item => !item.permission || hasPermission(item.permission));
  
  // Check if user has permission to create applications
  const canCreateApplications = hasPermission('applications.create');
  
  // Check permissions for each section
  const hasPersonsAccess = personNavigationItems.some(item => !item.permission || hasPermission(item.permission));
  const hasApplicationsAccess = applicationsMainItems.length > 0 || canCreateApplications;
  const hasLicensesAccess = licenseNavigationItems.some(item => !item.permission || hasPermission(item.permission));
  const hasCardsPrintingAccess = cardsPrintingItems.length > 0;
  const hasTransactionsAccess = transactionsPaymentsItems.length > 0;
  const hasAnalyticsAccess = analyticsReportsItems.length > 0;
  const hasAdministrationAccess = administrationItems.length > 0;

  const drawer = (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      bgcolor: '#fafafa'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid #e0e0e0',
        bgcolor: 'white'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 1.5
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Mobile menu toggle */}
            <IconButton
              size="small"
              onClick={handleDrawerToggle}
              sx={{ 
                display: { md: 'none' },
                color: '#666',
                p: 0.5
              }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600,
                color: '#1a1a1a',
                fontSize: '0.95rem'
              }}
            >
              LINC Print
            </Typography>
          </Box>
          <KeyboardArrowDown sx={{ color: '#666', fontSize: 18 }} />
        </Box>
        
        {/* Quick Actions Search Trigger */}
        <Box
          onClick={handleOpenCommandPalette}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1.5,
            backgroundColor: '#f5f5f5',
            borderRadius: '6px',
            border: '1px solid #e0e0e0',
            cursor: 'pointer',
            '&:hover': {
              borderColor: '#d0d0d0',
              backgroundColor: '#f0f0f0',
            },
          }}
        >
          <Search sx={{ color: '#666', fontSize: 18 }} />
          <Typography 
            variant="body2" 
            sx={{ 
              flex: 1, 
              color: '#999', 
                                    fontSize: '0.875rem'
                                  }} 
          >
            Quick actions
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: '#999', 
              fontSize: '0.7rem',
              backgroundColor: '#e8e8e8',
              px: 0.5,
              py: 0.25,
              borderRadius: '3px',
              fontFamily: 'monospace',
            }}
          >
            ⌘K
          </Typography>
                      </Box>
      </Box>

            {/* Navigation Items */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        <List dense sx={{ px: 1 }}>
          {/* Core Navigation - Dashboard */}
          {coreNavigationItems.map((item) => {
            if (item.permission && !hasPermission(item.permission)) return null;
              const isActive = location.pathname === item.path;

              return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => {
                      navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  sx={{
                    borderRadius: '6px',
                    minHeight: '36px',
                    py: 0.75,
                    px: 1.5,
                    '&.Mui-selected': {
                      backgroundColor: '#1976d2',
                      color: 'white',
                      '& .MuiListItemIcon-root': { color: 'white' },
                      '&:hover': { backgroundColor: '#1565c0' },
                    },
                    '&:hover': {
                      backgroundColor: isActive ? '#1565c0' : '#f0f0f0',
                    },
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: '32px',
                    color: isActive ? 'white' : '#666',
                    '& .MuiSvgIcon-root': { fontSize: '20px' },
                  }}>
                    {item.icon}
                  </ListItemIcon>
                    <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? 'white' : '#333',
                    }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}

          <Divider sx={{ my: 1 }} />

          {/* Persons Section */}
          {hasPersonsAccess && (
            <>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={handlePersonsToggle}
                  sx={{
                    borderRadius: '6px',
                    minHeight: '36px',
                    py: 0.75,
                    px: 1.5,
                    '&:hover': { backgroundColor: '#f0f0f0' },
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: '32px',
                    color: '#666',
                    '& .MuiSvgIcon-root': { fontSize: '20px' },
                  }}>
                    <People />
                    </ListItemIcon>
                  <ListItemText 
                    primary="Persons" 
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      color: '#333',
                    }}
                  />
                  {personsExpanded ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                
              <Collapse in={personsExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2 }}>
                  {personNavigationItems.map((item) => {
                    if (item.permission && !hasPermission(item.permission)) return null;
                          const isActive = location.pathname === item.path;

                          return (
                      <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                              <ListItemButton
                                selected={isActive}
                                onClick={() => {
                                  navigate(item.path);
                            if (isMobile) setMobileOpen(false);
                          }}
                          sx={{
                            borderRadius: '6px',
                            minHeight: '32px',
                            py: 0.5,
                            px: 1,
                            ml: 1,
                            '&.Mui-selected': {
                              backgroundColor: '#1976d2',
                              color: 'white',
                              '& .MuiListItemIcon-root': { color: 'white' },
                              '&:hover': { backgroundColor: '#1565c0' },
                            },
                            '&:hover': {
                              backgroundColor: isActive ? '#1565c0' : '#f0f0f0',
                            },
                          }}
                        >
                          <ListItemIcon sx={{ 
                            minWidth: '28px',
                            color: isActive ? 'white' : '#666',
                            '& .MuiSvgIcon-root': { fontSize: '18px' },
                          }}>
                                  {item.icon}
                                </ListItemIcon>
                                <ListItemText 
                                  primary={item.text} 
                                  primaryTypographyProps={{ 
                              fontSize: '0.8rem',
                              fontWeight: isActive ? 500 : 400,
                              color: isActive ? 'white' : '#333',
                                  }} 
                                />
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                  </List>
                </Collapse>
        </>
      )}

          <Divider sx={{ my: 1 }} />

          {/* Applications Section */}
          {hasApplicationsAccess && (
            <>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={handleApplicationsToggle}
                  sx={{
                    borderRadius: '6px',
                    minHeight: '36px',
                    py: 0.75,
                    px: 1.5,
                    '&:hover': { backgroundColor: '#f0f0f0' },
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: '32px',
                    color: '#666',
                    '& .MuiSvgIcon-root': { fontSize: '20px' },
                  }}>
                    <Apps />
                    </ListItemIcon>
                  <ListItemText 
                    primary="Applications" 
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      color: '#333',
                    }}
                  />
                  {applicationsExpanded ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                
              <Collapse in={applicationsExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2 }}>
                  {/* Application Dashboard and View Items */}
                  {applicationsMainItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          selected={isActive}
                          onClick={() => {
                            navigate(item.path);
                            if (isMobile) setMobileOpen(false);
                          }}
                          sx={{
                            borderRadius: '6px',
                            minHeight: '32px',
                            py: 0.5,
                            px: 1,
                            ml: 1,
                            '&.Mui-selected': {
                              backgroundColor: '#1976d2',
                              color: 'white',
                              '& .MuiListItemIcon-root': { color: 'white' },
                              '&:hover': { backgroundColor: '#1565c0' },
                            },
                            '&:hover': {
                              backgroundColor: isActive ? '#1565c0' : '#f0f0f0',
                            },
                          }}
                        >
                          <ListItemIcon sx={{ 
                            minWidth: '28px',
                            color: isActive ? 'white' : '#666',
                            '& .MuiSvgIcon-root': { fontSize: '18px' },
                          }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText 
                            primary={item.text} 
                            primaryTypographyProps={{ 
                              fontSize: '0.8rem',
                              fontWeight: isActive ? 500 : 400,
                              color: isActive ? 'white' : '#333',
                            }} 
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}

                  {/* Create Applications Nested Dropdown */}
                  {canCreateApplications && (
                    <>
                      <ListItem disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          onClick={handleCreateApplicationsToggle}
                          sx={{
                            borderRadius: '6px',
                            minHeight: '32px',
                            py: 0.5,
                            px: 1,
                            ml: 1,
                            '&:hover': { backgroundColor: '#f0f0f0' },
                          }}
                        >
                          <ListItemIcon sx={{ 
                            minWidth: '28px',
                            color: '#666',
                            '& .MuiSvgIcon-root': { fontSize: '18px' },
                          }}>
                            <AddIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Create Applications" 
                            primaryTypographyProps={{ 
                              fontSize: '0.8rem',
                              fontWeight: 400,
                              color: '#333',
                            }}
                          />
                          {createApplicationsExpanded ? <ExpandLess sx={{ fontSize: '18px' }} /> : <ExpandMore sx={{ fontSize: '18px' }} />}
                        </ListItemButton>
                      </ListItem>
                      
                      <Collapse in={createApplicationsExpanded} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding sx={{ pl: 3 }}>
                          {allApplicationTypes.map((categoryGroup) => 
                            categoryGroup.applications.map((app) => {
                              if (app.permission && !hasPermission(app.permission)) return null;
                              const isActive = location.pathname === app.path;

                              return (
                                <ListItem key={app.text} disablePadding sx={{ mb: 0.25 }}>
                                  <ListItemButton
                                    selected={isActive}
                                    onClick={() => {
                                      navigate(app.path);
                                      if (isMobile) setMobileOpen(false);
                                    }}
                                    sx={{
                                      borderRadius: '6px',
                                      minHeight: '28px',
                                      py: 0.25,
                                      px: 0.75,
                                      ml: 1,
                                      '&.Mui-selected': {
                                        backgroundColor: '#1976d2',
                                        color: 'white',
                                        '& .MuiListItemIcon-root': { color: 'white' },
                                        '&:hover': { backgroundColor: '#1565c0' },
                                      },
                                      '&:hover': {
                                        backgroundColor: isActive ? '#1565c0' : '#f0f0f0',
                                      },
                                    }}
                                  >
                                    <ListItemIcon sx={{ 
                                      minWidth: '24px',
                                      color: isActive ? 'white' : '#666',
                                      '& .MuiSvgIcon-root': { fontSize: '16px' },
                                    }}>
                                      {app.icon}
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          {app.text}
                                          {(app as any).isNew && (
                                            <Chip 
                                              label="NEW" 
                                              size="small" 
                                              color="warning" 
                                              sx={{ fontSize: '0.6rem', height: 16 }} 
                                            />
                                          )}
                                        </Box>
                                      }
                                      primaryTypographyProps={{
                                        fontSize: '0.75rem',
                                        fontWeight: isActive ? 500 : 400,
                                        color: isActive ? 'white' : '#333',
                                      }}
                                    />
                                  </ListItemButton>
                                </ListItem>
                              );
                            })
                          )}
                        </List>
                      </Collapse>
                    </>
                  )}
                </List>
              </Collapse>
        </>
      )}

          <Divider sx={{ my: 1 }} />

          {/* Licenses Section */}
          {hasLicensesAccess && (
            <>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={handleLicensesToggle}
                  sx={{
                    borderRadius: '6px',
                    minHeight: '36px',
                    py: 0.75,
                    px: 1.5,
                    '&:hover': { backgroundColor: '#f0f0f0' },
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: '32px',
                    color: '#666',
                    '& .MuiSvgIcon-root': { fontSize: '20px' },
                  }}>
                    <CreditCard />
                  </ListItemIcon>
              <ListItemText 
                    primary="Licenses" 
                primaryTypographyProps={{ 
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      color: '#333',
                    }}
                  />
                  {licensesExpanded ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
            </ListItem>

              <Collapse in={licensesExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2 }}>
                  {licenseNavigationItems.map((item) => {
                    if (item.permission && !hasPermission(item.permission)) return null;
              const isActive = location.pathname === item.path;

              return (
                      <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => {
                      navigate(item.path);
                            if (isMobile) setMobileOpen(false);
                          }}
                          sx={{
                            borderRadius: '6px',
                            minHeight: '32px',
                            py: 0.5,
                            px: 1,
                            ml: 1,
                            '&.Mui-selected': {
                              backgroundColor: '#1976d2',
                              color: 'white',
                              '& .MuiListItemIcon-root': { color: 'white' },
                              '&:hover': { backgroundColor: '#1565c0' },
                            },
                            '&:hover': {
                              backgroundColor: isActive ? '#1565c0' : '#f0f0f0',
                            },
                          }}
                        >
                          <ListItemIcon sx={{ 
                            minWidth: '28px',
                            color: isActive ? 'white' : '#666',
                            '& .MuiSvgIcon-root': { fontSize: '18px' },
                          }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText 
                            primary={item.text}
                            primaryTypographyProps={{
                              fontSize: '0.8rem',
                              fontWeight: isActive ? 500 : 400,
                              color: isActive ? 'white' : '#333',
                            }}
                          />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
              </Collapse>
        </>
      )}

          <Divider sx={{ my: 1 }} />

          {/* Cards & Printing Section */}
          {hasCardsPrintingAccess && (
            <>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={handleCardsPrintingToggle}
                  sx={{
                    borderRadius: '6px',
                    minHeight: '36px',
                    py: 0.75,
                    px: 1.5,
                    '&:hover': { backgroundColor: '#f0f0f0' },
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: '32px',
                    color: '#666',
                    '& .MuiSvgIcon-root': { fontSize: '20px' },
                  }}>
                    <CreditCard />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Cards & Printing" 
                    primaryTypographyProps={{ 
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      color: '#333',
                    }}
                  />
                  {cardsPrintingExpanded ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>
              
              <Collapse in={cardsPrintingExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2 }}>
                  {cardsPrintingItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          selected={isActive}
                          onClick={() => {
                            navigate(item.path);
                            if (isMobile) setMobileOpen(false);
                          }}
                          sx={{
                            borderRadius: '6px',
                            minHeight: '32px',
                            py: 0.5,
                            px: 1,
                            ml: 1,
                            '&.Mui-selected': {
                              backgroundColor: '#1976d2',
                              color: 'white',
                              '& .MuiListItemIcon-root': { color: 'white' },
                              '&:hover': { backgroundColor: '#1565c0' },
                            },
                            '&:hover': {
                              backgroundColor: isActive ? '#1565c0' : '#f0f0f0',
                            },
                          }}
                        >
                          <ListItemIcon sx={{ 
                            minWidth: '28px',
                            color: isActive ? 'white' : '#666',
                            '& .MuiSvgIcon-root': { fontSize: '18px' },
                          }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText 
                            primary={item.text} 
                            primaryTypographyProps={{ 
                              fontSize: '0.8rem',
                              fontWeight: isActive ? 500 : 400,
                              color: isActive ? 'white' : '#333',
                            }} 
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
            </>
          )}

          <Divider sx={{ my: 1 }} />

          {/* Transactions & Payments Section */}
          {hasTransactionsAccess && (
            <>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={handleTransactionsToggle}
                  sx={{
                    borderRadius: '6px',
                    minHeight: '36px',
                    py: 0.75,
                    px: 1.5,
                    '&:hover': { backgroundColor: '#f0f0f0' },
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: '32px',
                    color: '#666',
                    '& .MuiSvgIcon-root': { fontSize: '20px' },
                  }}>
                    <Payment />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Transactions & Payments" 
                    primaryTypographyProps={{ 
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      color: '#333',
                    }}
                  />
                  {transactionsExpanded ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>
              
              <Collapse in={transactionsExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2 }}>
                  {transactionsPaymentsItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          selected={isActive}
                          onClick={() => {
                            navigate(item.path);
                            if (isMobile) setMobileOpen(false);
                          }}
                          sx={{
                            borderRadius: '6px',
                            minHeight: '32px',
                            py: 0.5,
                            px: 1,
                            ml: 1,
                            '&.Mui-selected': {
                              backgroundColor: '#1976d2',
                              color: 'white',
                              '& .MuiListItemIcon-root': { color: 'white' },
                              '&:hover': { backgroundColor: '#1565c0' },
                            },
                            '&:hover': {
                              backgroundColor: isActive ? '#1565c0' : '#f0f0f0',
                            },
                          }}
                        >
                          <ListItemIcon sx={{ 
                            minWidth: '28px',
                            color: isActive ? 'white' : '#666',
                            '& .MuiSvgIcon-root': { fontSize: '18px' },
                          }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText 
                            primary={item.text} 
                            primaryTypographyProps={{ 
                              fontSize: '0.8rem',
                              fontWeight: isActive ? 500 : 400,
                              color: isActive ? 'white' : '#333',
                            }} 
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
            </>
          )}

          <Divider sx={{ my: 1 }} />

          {/* Analytics & Reports Section */}
          {hasAnalyticsAccess && (
            <>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={handleAnalyticsToggle}
                  sx={{
                    borderRadius: '6px',
                    minHeight: '36px',
                    py: 0.75,
                    px: 1.5,
                    '&:hover': { backgroundColor: '#f0f0f0' },
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: '32px',
                    color: '#666',
                    '& .MuiSvgIcon-root': { fontSize: '20px' },
                  }}>
                    <Analytics />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Analytics & Reports" 
                    primaryTypographyProps={{ 
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      color: '#333',
                    }}
                  />
                  {analyticsExpanded ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>
              
              <Collapse in={analyticsExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2 }}>
                  {analyticsReportsItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          selected={isActive}
                          onClick={() => {
                            navigate(item.path);
                            if (isMobile) setMobileOpen(false);
                          }}
                          sx={{
                            borderRadius: '6px',
                            minHeight: '32px',
                            py: 0.5,
                            px: 1,
                            ml: 1,
                            '&.Mui-selected': {
                              backgroundColor: '#1976d2',
                              color: 'white',
                              '& .MuiListItemIcon-root': { color: 'white' },
                              '&:hover': { backgroundColor: '#1565c0' },
                            },
                            '&:hover': {
                              backgroundColor: isActive ? '#1565c0' : '#f0f0f0',
                            },
                          }}
                        >
                          <ListItemIcon sx={{ 
                            minWidth: '28px',
                            color: isActive ? 'white' : '#666',
                            '& .MuiSvgIcon-root': { fontSize: '18px' },
                          }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText 
                            primary={item.text} 
                            primaryTypographyProps={{ 
                              fontSize: '0.8rem',
                              fontWeight: isActive ? 500 : 400,
                              color: isActive ? 'white' : '#333',
                            }} 
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
            </>
          )}

          <Divider sx={{ my: 1 }} />

          {/* Administration Section */}
          {hasAdministrationAccess && (
            <>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={handleAdministrationToggle}
                  sx={{
                    borderRadius: '6px',
                    minHeight: '36px',
                    py: 0.75,
                    px: 1.5,
                    '&:hover': { backgroundColor: '#f0f0f0' },
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: '32px',
                    color: '#666',
                    '& .MuiSvgIcon-root': { fontSize: '20px' },
                  }}>
                    <AdminPanelSettings />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Administration" 
                    primaryTypographyProps={{ 
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      color: '#333',
                    }}
                  />
                  {administrationExpanded ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>
              
              <Collapse in={administrationExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2 }}>
                  {administrationItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          selected={isActive}
                          onClick={() => {
                            navigate(item.path);
                            if (isMobile) setMobileOpen(false);
                          }}
                          sx={{
                            borderRadius: '6px',
                            minHeight: '32px',
                            py: 0.5,
                            px: 1,
                            ml: 1,
                            '&.Mui-selected': {
                              backgroundColor: '#1976d2',
                              color: 'white',
                              '& .MuiListItemIcon-root': { color: 'white' },
                              '&:hover': { backgroundColor: '#1565c0' },
                            },
                            '&:hover': {
                              backgroundColor: isActive ? '#1565c0' : '#f0f0f0',
                            },
                          }}
                        >
                          <ListItemIcon sx={{ 
                            minWidth: '28px',
                            color: isActive ? 'white' : '#666',
                            '& .MuiSvgIcon-root': { fontSize: '18px' },
                          }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText 
                            primary={item.text} 
                            primaryTypographyProps={{ 
                              fontSize: '0.8rem',
                              fontWeight: isActive ? 500 : 400,
                              color: isActive ? 'white' : '#333',
                            }} 
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
            </>
          )}
          </List>
      </Box>


    </Box>
  );

  return (
    <React.Fragment>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left Sidebar - Full Height */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: DRAWER_WIDTH,
              borderRight: '1px solid #e0e0e0',
              boxShadow: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: DRAWER_WIDTH,
              borderRight: '1px solid #e0e0e0',
              boxShadow: 'none',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Right Side Content Area */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }
      }}>
        {/* Top Header Bar - Fixed position spanning right side only */}
        <AppBar 
          position="fixed" 
          sx={{ 
            bgcolor: '#ffffff',
            borderBottom: '1px solid #e0e0e0',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            color: '#1a1a1a',
            left: { xs: 0, md: DRAWER_WIDTH },
            width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
        <Toolbar sx={{ minHeight: '64px !important', px: 2 }}>
          {/* Mobile Menu Toggle */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' }, color: '#666' }}
          >
            <MenuIcon />
          </IconButton>

          {/* Page Title and Breadcrumbs */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* Page Title */}
            <Typography
              variant="h6"
              sx={{
                color: '#1a1a1a',
                fontSize: '1.25rem',
                fontWeight: 600,
                lineHeight: 1.2,
                margin: 0
              }}
            >
              {(() => {
                const breadcrumbs = generateBreadcrumbs();
                const lastCrumb = breadcrumbs[breadcrumbs.length - 1];
                return lastCrumb ? lastCrumb.text : 'Dashboard';
              })()}
            </Typography>
            
            {/* Breadcrumbs */}
            <Breadcrumbs 
              separator={<NavigateNext fontSize="inherit" sx={{ color: '#999', fontSize: '0.75rem' }} />}
              aria-label="breadcrumb"
              sx={{
                '& .MuiBreadcrumbs-ol': {
                  alignItems: 'center'
                },
                fontSize: '0.75rem'
              }}
            >
              {generateBreadcrumbs().map((crumb, index) => {
                const isLast = index === generateBreadcrumbs().length - 1;
                
                if (crumb.path && !isLast) {
                  return (
                    <Box
                      key={crumb.text}
                      onClick={() => navigate(crumb.path!)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.25,
                        cursor: 'pointer',
                        color: '#888',
                        fontSize: '0.75rem',
                        '&:hover': {
                          color: '#1976d2'
                        }
                      }}
                    >
                      {crumb.text}
                    </Box>
                  );
                } else {
                  return (
                    <Box
                      key={crumb.text}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.25,
                        color: isLast ? '#666' : '#888',
                        fontSize: '0.75rem',
                        fontWeight: isLast ? 500 : 400
                      }}
                    >
                      {crumb.text}
                    </Box>
                  );
                }
              })}
            </Breadcrumbs>
          </Box>

          {/* User Profile */}
          {userDataLoading ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              p: 1,
            }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Box sx={{ minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
                <Skeleton variant="text" width={100} height={20} />
                <Skeleton variant="text" width={80} height={16} />
              </Box>
            </Box>
          ) : (
            <Box 
              onClick={handleProfileMenuOpen}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                cursor: 'pointer',
                p: 1,
                borderRadius: '6px',
                '&:hover': {
                  backgroundColor: '#f0f0f0',
                },
              }}
            >
              <Avatar sx={{ 
                width: 32, 
                height: 32, 
                backgroundColor: '#1976d2',
                fontSize: '0.875rem'
              }}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </Avatar>
              <Box sx={{ minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    color: '#1a1a1a',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {user?.first_name} {user?.last_name}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: '#666',
                    fontSize: '0.75rem',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {getUserLocationText()}
                </Typography>
              </Box>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
          paddingTop: '64px', // Account for fixed header
        }}
      >
        <Box sx={{ p: 2, height: 'calc(100vh - 64px)', overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  </Box>

  <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem onClick={handleProfileMenuClose} disabled>
          <AccountCircle sx={{ mr: 2 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 2 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Command Palette */}
      <CommandPalette 
        open={commandPaletteOpen} 
        onClose={handleCloseCommandPalette} 
      />
    </React.Fragment>
  );
};

export default DashboardLayout; 
