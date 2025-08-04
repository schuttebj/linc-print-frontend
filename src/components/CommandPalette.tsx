/**
 * Command Palette Component
 * Quick actions search modal similar to modern command palettes
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Chip,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Search,
  Home,
  Dashboard,
  Person,
  Apps,
  Assignment,
  CreditCard,
  Visibility,
  BarChart,
  AdminPanelSettings,
  People,
  LocationOn,
  Assessment,
  Receipt,
  PointOfSale,
  AttachMoney,
  School,
  DirectionsCar,
  Refresh,
  FileCopy,
  Star,
  PersonAdd,
  Link,
  LightMode,
  DarkMode,
  Logout,
  ContentCopy,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  category: 'navigation' | 'actions' | 'settings' | 'admin';
  keywords?: string[];
  permission?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Define all available commands
  const allCommands: CommandAction[] = [
    // Navigation Commands
    {
      id: 'nav-home',
      label: 'Go to Dashboard',
      description: 'Navigate to main dashboard',
      icon: <Dashboard />,
      action: () => navigate('/dashboard'),
      shortcut: 'G D',
      category: 'navigation',
      keywords: ['dashboard', 'home', 'main'],
    },
    {
      id: 'nav-person-manage',
      label: 'Go to Person Management',
      description: 'Create and manage persons',
      icon: <Person />,
      action: () => navigate('/dashboard/persons/manage'),
      shortcut: 'G P',
      category: 'navigation',
      keywords: ['person', 'people', 'create', 'manage'],
      permission: 'persons.create',
    },
    {
      id: 'nav-person-search',
      label: 'Go to Person Search',
      description: 'Search for existing persons',
      icon: <Search />,
      action: () => navigate('/dashboard/persons/search'),
      shortcut: 'G S',
      category: 'navigation',
      keywords: ['person', 'search', 'find'],
      permission: 'persons.read',
    },
    {
      id: 'nav-applications',
      label: 'Go to Applications',
      description: 'View all applications',
      icon: <Apps />,
      action: () => navigate('/dashboard/applications'),
      shortcut: 'G A',
      category: 'navigation',
      keywords: ['applications', 'apps'],
      permission: 'applications.read',
    },
    {
      id: 'nav-licenses',
      label: 'Go to Licenses',
      description: 'View license dashboard',
      icon: <CreditCard />,
      action: () => navigate('/dashboard/licenses'),
      shortcut: 'G L',
      category: 'navigation',
      keywords: ['licenses', 'cards'],
      permission: 'licenses.read',
    },
    {
      id: 'nav-transactions',
      label: 'Go to Transactions',
      description: 'View transaction history',
      icon: <Receipt />,
      action: () => navigate('/dashboard/transactions'),
      shortcut: 'G T',
      category: 'navigation',
      keywords: ['transactions', 'payments', 'history'],
      permission: 'transactions.read',
    },
    {
      id: 'nav-analytics',
      label: 'Go to Analytics',
      description: 'View analytics dashboard',
      icon: <BarChart />,
      action: () => navigate('/dashboard/analytics'),
      shortcut: 'G N',
      category: 'navigation',
      keywords: ['analytics', 'reports', 'statistics'],
      permission: 'analytics.read',
    },

    // Quick Actions
    {
      id: 'action-learner-permit',
      label: 'Create Learner Permit Capture',
      description: 'Quick capture for learner permits',
      icon: <Assignment />,
      action: () => navigate('/dashboard/applications/learner-permit-capture-compact'),
      shortcut: 'C L',
      category: 'actions',
      keywords: ['learner', 'permit', 'capture', 'create'],
      permission: 'applications.create',
    },
    {
      id: 'action-pos',
      label: 'Open Point of Sale',
      description: 'Process transactions',
      icon: <PointOfSale />,
      action: () => navigate('/dashboard/transactions/pos'),
      shortcut: 'C P',
      category: 'actions',
      keywords: ['pos', 'point of sale', 'payment', 'transaction'],
      permission: 'transactions.create',
    },

    // Utility Actions
    {
      id: 'util-refresh',
      label: 'Refresh Page',
      description: 'Reload current page',
      icon: <Refresh />,
      action: () => window.location.reload(),
      shortcut: 'R',
      category: 'actions',
      keywords: ['refresh', 'reload'],
    },
    {
      id: 'util-copy-url',
      label: 'Copy Current URL',
      description: 'Copy current page URL to clipboard',
      icon: <ContentCopy />,
      action: () => {
        navigator.clipboard.writeText(window.location.href);
        // Could add a toast notification here
      },
      category: 'actions',
      keywords: ['copy', 'url', 'link', 'clipboard'],
    },

    // Admin Commands
    {
      id: 'admin-dashboard',
      label: 'Go to Admin Dashboard',
      description: 'System administration',
      icon: <AdminPanelSettings />,
      action: () => navigate('/dashboard/admin'),
      shortcut: 'G M',
      category: 'admin',
      keywords: ['admin', 'administration'],
      permission: 'admin.read',
    },
    {
      id: 'admin-users',
      label: 'Go to User Management',
      description: 'Manage system users',
      icon: <People />,
      action: () => navigate('/dashboard/admin/users'),
      category: 'admin',
      keywords: ['users', 'management', 'admin'],
      permission: 'admin.users',
    },
    {
      id: 'admin-locations',
      label: 'Go to Location Management',
      description: 'Manage system locations',
      icon: <LocationOn />,
      action: () => navigate('/dashboard/admin/locations'),
      category: 'admin',
      keywords: ['locations', 'management', 'admin'],
      permission: 'admin.locations',
    },

    // Settings
    {
      id: 'settings-logout',
      label: 'Logout',
      description: 'Sign out of the system',
      icon: <Logout />,
      action: () => {
        logout();
        navigate('/login');
      },
      category: 'settings',
      keywords: ['logout', 'sign out', 'exit'],
    },
  ];

  // Filter commands based on permissions and search query
  const filteredCommands = allCommands.filter(command => {
    // Check permissions
    if (command.permission && !hasPermission(command.permission)) {
      return false;
    }

    // Filter by search query
    if (searchQuery.trim() === '') {
      return true;
    }

    const query = searchQuery.toLowerCase();
    const searchableText = [
      command.label,
      command.description || '',
      ...(command.keywords || [])
    ].join(' ').toLowerCase();

    return searchableText.includes(query);
  });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((groups, command) => {
    const category = command.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(command);
    return groups;
  }, {} as Record<string, CommandAction[]>);

  // Category labels
  const categoryLabels = {
    navigation: 'Navigation',
    actions: 'Quick Actions',
    admin: 'Administration',
    settings: 'Settings',
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredCommands, selectedIndex, onClose]);

  // Reset search and selection when opened with auto focus
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedIndex(0);
      // Auto focus with a small delay to ensure modal is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select(); // Select any existing text
      }, 150);
    }
  }, [open]);

  // Update selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleCommandClick = (command: CommandAction) => {
    command.action();
    onClose();
  };

  const renderCommandList = () => {
    let commandIndex = 0;
    
    return Object.entries(groupedCommands).map(([category, commands]) => (
      <Box key={category}>
        {/* Category Header */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              fontWeight: 600,
              textTransform: 'uppercase',
              fontSize: '0.75rem'
            }}
          >
            {categoryLabels[category as keyof typeof categoryLabels]}
          </Typography>
        </Box>

        {/* Commands in Category */}
        <List dense sx={{ py: 0 }}>
          {commands.map((command) => {
            const isSelected = commandIndex === selectedIndex;
            const currentIndex = commandIndex++;
            
            return (
              <ListItem key={command.id} disablePadding>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handleCommandClick(command)}
                  sx={{
                    py: 1,
                    px: 2,
                    '&.Mui-selected': {
                      backgroundColor: '#f0f7ff',
                      borderLeft: '3px solid #1976d2',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {command.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={command.label}
                    secondary={command.description}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                    }}
                  />
                  {command.shortcut && (
                    <Chip
                      label={command.shortcut}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        bgcolor: '#f5f5f5',
                        border: '1px solid #e0e0e0',
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        
        {/* Divider between categories */}
        {Object.keys(groupedCommands).indexOf(category) < Object.keys(groupedCommands).length - 1 && (
          <Divider sx={{ my: 1 }} />
        )}
      </Box>
    ));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          maxHeight: '80vh',
          mt: '10vh',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Search Input */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <TextField
            ref={searchInputRef}
            fullWidth
            variant="outlined"
            placeholder="Type a command or search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: '#666', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                '& fieldset': {
                  border: 'none',
                },
                backgroundColor: '#f8f9fa',
              },
            }}
          />
        </Box>

        {/* Commands List */}
        <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          {filteredCommands.length > 0 ? (
            renderCommandList()
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No commands found for "{searchQuery}"
              </Typography>
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid #e0e0e0',
          bgcolor: '#f8f9fa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip label="↑↓" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
              <Typography variant="caption" color="text.secondary">to navigate</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip label="↵" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
              <Typography variant="caption" color="text.secondary">to select</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="esc" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
            <Typography variant="caption" color="text.secondary">to close</Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;