/**
 * Chart Widget Component
 * Generic container for charts with title, actions, and loading states
 */

import React from 'react';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Skeleton
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  GetApp as DownloadIcon,
  Fullscreen as FullscreenIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface ChartWidgetProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  height?: number;
  actions?: boolean;
  onExport?: () => void;
  onFullscreen?: () => void;
  onRefresh?: () => void;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({
  title,
  subtitle,
  children,
  loading = false,
  height = 300,
  actions = true,
  onExport,
  onFullscreen,
  onRefresh
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleExport = () => {
    handleMenuClose();
    onExport?.();
  };

  const handleFullscreen = () => {
    handleMenuClose();
    onFullscreen?.();
  };

  const handleRefresh = () => {
    handleMenuClose();
    onRefresh?.();
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        height: '100%',
        bgcolor: 'white',
        borderRadius: 2,
        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography 
            variant="body2" 
            component="h3" 
            sx={{ 
              fontWeight: 600, 
              fontSize: '0.85rem', 
              lineHeight: 1.2,
              color: 'primary.main'
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                fontSize: '0.7rem',
                display: 'block',
                mt: 0.25
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, ml: 1 }}>
            {loading && <CircularProgress size={16} />}
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{ 
                p: 0.5,
                '& .MuiSvgIcon-root': {
                  fontSize: 18
                }
              }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Chart Content */}
      <Box sx={{ height: height, position: 'relative', flex: 1, minHeight: 0 }}>
        {loading ? (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Skeleton variant="rectangular" height="60%" />
            <Skeleton variant="rectangular" height="20%" />
            <Skeleton variant="rectangular" height="20%" />
          </Box>
        ) : (
          children
        )}
      </Box>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {onRefresh && (
          <MenuItem onClick={handleRefresh}>
            <RefreshIcon sx={{ mr: 1, fontSize: 20 }} />
            Refresh
          </MenuItem>
        )}
        {onExport && (
          <MenuItem onClick={handleExport}>
            <DownloadIcon sx={{ mr: 1, fontSize: 20 }} />
            Export
          </MenuItem>
        )}
        {onFullscreen && (
          <MenuItem onClick={handleFullscreen}>
            <FullscreenIcon sx={{ mr: 1, fontSize: 20 }} />
            Fullscreen
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
};

export default ChartWidget;