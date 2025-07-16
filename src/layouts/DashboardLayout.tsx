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
} from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';

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

  // Navigation items
  const navigationItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      permission: null,
    },
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

  // Check if user has permission to create applications
  const canCreateApplications = hasPermission('applications.create');

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Madagascar DLS
        </Typography>
      </Toolbar>
      <Divider />
      
      {/* Main Navigation */}
      <List>
        {navigationItems.map((item) => {
          // Check permissions
          if (item.permission && !hasPermission(item.permission)) {
            return null;
          }

          const isActive = location.pathname === item.path;

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={isActive}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) {
                    setMobileOpen(false);
                  }
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Applications Section */}
      {(applicationNavigationItems.some(item => !item.permission || hasPermission(item.permission)) || canCreateApplications) && (
        <>
          <Divider />
          <List>
            <ListItem>
              <ListItemText 
                primary="Applications" 
                primaryTypographyProps={{ 
                  variant: 'caption', 
                  color: 'textSecondary',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }} 
              />
            </ListItem>
            
            {/* View Applications */}
            {applicationNavigationItems.map((item) => {
              // Check permissions
              if (item.permission && !hasPermission(item.permission)) {
                return null;
              }

              const isActive = location.pathname === item.path;

              return (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) {
                        setMobileOpen(false);
                      }
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              );
            })}

            {/* Create Applications Dropdown */}
            {canCreateApplications && (
              <>
                <ListItem disablePadding>
                  <ListItemButton onClick={handleApplicationsToggle}>
                    <ListItemIcon>
                      <Apps />
                    </ListItemIcon>
                    <ListItemText primary="Create Applications" />
                    {applicationsExpanded ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                
                <Collapse in={applicationsExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {applicationDropdownItems.map((categoryGroup) => (
                      <Box key={categoryGroup.category}>
                        {/* Category Header */}
                        <ListItem sx={{ pl: 4, py: 0.5 }}>
                          <Chip 
                            label={categoryGroup.category} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: '20px' }}
                          />
                        </ListItem>
                        
                        {/* Category Items */}
                        {categoryGroup.items.map((item) => {
                          // Check permissions
                          if (item.permission && !hasPermission(item.permission)) {
                            return null;
                          }

                          const isActive = location.pathname === item.path;

                          return (
                            <ListItem key={item.text} disablePadding>
                              <ListItemButton
                                selected={isActive}
                                sx={{ pl: 6 }}
                                onClick={() => {
                                  navigate(item.path);
                                  if (isMobile) {
                                    setMobileOpen(false);
                                  }
                                }}
                              >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                  {item.icon}
                                </ListItemIcon>
                                <ListItemText 
                                  primary={item.text} 
                                  primaryTypographyProps={{ 
                                    variant: 'body2',
                                    fontSize: '0.875rem'
                                  }} 
                                />
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                      </Box>
                    ))}
                  </List>
                </Collapse>
              </>
            )}
          </List>
        </>
      )}

      {/* License Management Section */}
      {licenseNavigationItems.some(item => !item.permission || hasPermission(item.permission)) && (
        <>
          <Divider />
          <List>
            <ListItem>
              <ListItemText 
                primary="Licenses" 
                primaryTypographyProps={{ 
                  variant: 'caption', 
                  color: 'textSecondary',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }} 
              />
            </ListItem>
            {licenseNavigationItems.map((item) => {
              // Check permissions
              if (item.permission && !hasPermission(item.permission)) {
                return null;
              }

              const isActive = location.pathname === item.path;

              return (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) {
                        setMobileOpen(false);
                      }
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </>
      )}

      {/* Card Management Section */}
      {cardNavigationItems.some(item => !item.permission || hasPermission(item.permission)) && (
        <>
          <Divider />
          <List>
            <ListItem>
              <ListItemText 
                primary="Cards" 
                primaryTypographyProps={{ 
                  variant: 'caption', 
                  color: 'textSecondary',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }} 
              />
            </ListItem>
            {cardNavigationItems.map((item) => {
              // Check permissions
              if (item.permission && !hasPermission(item.permission)) {
                return null;
              }

              const isActive = location.pathname === item.path;

              return (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) {
                        setMobileOpen(false);
                      }
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </>
      )}

      {/* Admin Section */}
      {adminNavigationItems.some(item => !item.permission || hasPermission(item.permission)) && (
        <>
          <Divider />
          <List>
            <ListItem>
              <ListItemText 
                primary="Administration" 
                primaryTypographyProps={{ 
                  variant: 'caption', 
                  color: 'textSecondary',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }} 
              />
            </ListItem>
            {adminNavigationItems.map((item) => {
              // Check permissions
              if (item.permission && !hasPermission(item.permission)) {
                return null;
              }

              const isActive = location.pathname === item.path;

              return (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) {
                        setMobileOpen(false);
                      }
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </>
      )}
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
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
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
    </Box>
  );
};

export default DashboardLayout; 
