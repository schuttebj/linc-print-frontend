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
      text: 'View Applications',
      icon: <Visibility />,
      path: '/dashboard/applications',
      permission: 'applications.read',
    },
    // New License Applications
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
    // Renewal and Duplicates
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
    // License Capture (for existing licenses)
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
    // Generic application form (fallback)
    {
      text: 'Other Applications',
      icon: <AddIcon />,
      path: '/dashboard/applications/create',
      permission: 'applications.create',
    },
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
      {applicationNavigationItems.some(item => !item.permission || hasPermission(item.permission)) && (
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
      {/* App Bar */}
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

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.username}
            </Typography>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="profile-menu"
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

      {/* Profile Menu */}
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleProfileMenuClose}>
          <AccountCircle sx={{ mr: 2 }} />
          Profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 2 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
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

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default DashboardLayout; 