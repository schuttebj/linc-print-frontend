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
        p: 2,
        height: '100%',
        bgcolor: 'white',
        borderRadius: 2,
        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        {actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {loading && <CircularProgress size={20} />}
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{ ml: 1 }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Chart Content */}
      <Box sx={{ height: height, position: 'relative' }}>
        {loading ? (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
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