import CircularProgress from '@mui/material/CircularProgress';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { useNavigationSpacing } from '../../navigation/Navigation.tsx';

export type LoadingSpinnerProps = {
  size?: number;
  label?: string;
  screenCentered?: boolean;
};

export const LoadingSpinner = ({
  label,
  size = 40,
  screenCentered = false,
}: LoadingSpinnerProps) => {
  const navigationSpacing = useNavigationSpacing();

  if (screenCentered) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100vh',
          ...navigationSpacing,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        role="status"
      >
        <Typography variant="h6" sx={{ color: '#1b5e20', paddingBottom: 2 }}>
          {label}
        </Typography>
        <CircularProgress size={size} thickness={4} color="success" />
      </Box>
    );
  }

  return (
    <Box
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="status"
    >
      <Typography variant="h6" sx={{ color: '#1b5e20', paddingBottom: 2 }}>
        {label}
      </Typography>
      <CircularProgress size={size} thickness={4} color="success" />
    </Box>
  );
};
