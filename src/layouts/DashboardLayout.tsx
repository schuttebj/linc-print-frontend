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
} from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';
import CommandPalette from '../components/CommandPalette';

const DRAWER_WIDTH = 240;

const DashboardLayout: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [applicationsExpanded, setApplicationsExpanded] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [createApplicationsExpanded, setCreateApplicationsExpanded] = useState(false);
  const [personsExpanded, setPersonsExpanded] = useState(false);
  const [licensesExpanded, setLicensesExpanded] = useState(false);

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

  const handleApplicationsToggle = () => {
    setApplicationsExpanded(!applicationsExpanded);
  };

  const handleCreateApplicationsToggle = () => {
    setCreateApplicationsExpanded(!createApplicationsExpanded);
  };

  const handlePersonsToggle = () => {
    setPersonsExpanded(!personsExpanded);
  };

  const handleLicensesToggle = () => {
    setLicensesExpanded(!licensesExpanded);
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
        {
          text: 'Learner Permit (Compact)',
          icon: <Assignment />,
          path: '/dashboard/applications/learner-permit-capture-compact',
          permission: 'applications.create',
          isNew: true,
        },
      ]
    },
    {
      category: 'Other',
      items: [
        {
          text: 'Other Applications',
          icon: <AddIcon />,
          path: '/dashboard/applications/create',
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

  // Check if user has permission to create applications
  const canCreateApplications = hasPermission('applications.create');

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
        {
          text: 'Learner Permit Capture (Compact)',
          icon: <Assignment />,
          path: '/dashboard/applications/learner-permit-capture-compact',
          permission: 'applications.create',
          isNew: true,
        },
      ]
    }
  ];

  // Main navigation items for sidebar (simplified)
  const mainNavigationItems = [
    // Core navigation  
    ...coreNavigationItems.filter(item => !item.permission || hasPermission(item.permission)),
    
    // Applications (only dashboard and view)
    ...applicationNavigationItems.filter(item => !item.permission || hasPermission(item.permission)),
    
    // Cards  
    ...cardNavigationItems.filter(item => !item.permission || hasPermission(item.permission)),
    
    // Transactions
    ...transactionNavigationItems.filter(item => !item.permission || hasPermission(item.permission)),
    
    // Analytics
    ...analyticsNavigationItems.filter(item => !item.permission || hasPermission(item.permission)),
    
    // Admin
    ...adminNavigationItems.filter(item => !item.permission || hasPermission(item.permission)),
  ];

  // Use main navigation items for sidebar
  const sidebarNavItems = mainNavigationItems;

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

          {/* Persons Dropdown */}
          {personNavigationItems.some(item => !item.permission || hasPermission(item.permission)) && (
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
          {applicationNavigationItems.some(item => !item.permission || hasPermission(item.permission)) && (
            applicationNavigationItems.map((item) => {
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
            })
          )}

          {/* Create Applications Dropdown */}
          {canCreateApplications && (
            <>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={handleCreateApplicationsToggle}
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
                    <AddIcon />
                  </ListItemIcon>
              <ListItemText 
                    primary="Create Applications" 
                primaryTypographyProps={{ 
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      color: '#333',
                    }}
                  />
                  {createApplicationsExpanded ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
            </ListItem>
              
              <Collapse in={createApplicationsExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2 }}>
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
                                fontSize: '0.8rem',
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

          <Divider sx={{ my: 1 }} />

          {/* Licenses Dropdown */}
          {licenseNavigationItems.some(item => !item.permission || hasPermission(item.permission)) && (
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

          {/* Cards, Transactions, Analytics, Admin */}
          {[...cardNavigationItems, ...transactionNavigationItems, ...analyticsNavigationItems, ...adminNavigationItems]
            .filter(item => !item.permission || hasPermission(item.permission))
            .map((item) => {
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
          </List>
      </Box>

      {/* User Profile Section */}
      <Box sx={{ 
        borderTop: '1px solid #e0e0e0',
        p: 2,
        bgcolor: 'white'
      }}>
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
              backgroundColor: '#f5f5f5',
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
          <Box sx={{ flex: 1, minWidth: 0 }}>
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
              {user?.email || `${user?.username}@system.local`}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Madagascar Driver's License System
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {user && (
              <>
                <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {user.first_name} {user.last_name}
                </Typography>
                {getUserLocationText() && (
                  <Chip
                    label={getUserLocationText()}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: '24px',
                      fontSize: '0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      '& .MuiChip-label': {
                        paddingLeft: '8px',
                        paddingRight: '8px',
                      },
                      display: { xs: 'none', sm: 'flex' }
                    }}
                  />
                )}
              </>
            )}
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

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

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Outlet />
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
    </Box>
  );
};

export default DashboardLayout; 
