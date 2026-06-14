import React from 'react';
import { Box, Stack, Typography, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useNavigationSpacing } from '../navigation/Navigation';
import { ScoreboardForm } from './ScoreboardForm';

export const CreateScoreboard: React.FC = () => {
  const navigate = useNavigate();
  const navigationSpacing = useNavigationSpacing();

  return (
    <Box
      sx={{
        backgroundColor: '#ffffff',
        position: 'relative',
        pb: { xs: 10, sm: 4 },
      }}
    >
      <Box sx={{ px: 2, py: 4, ...navigationSpacing }}>
        <Stack
          spacing={4}
          alignItems="flex-start"
          sx={{ width: 'min(1200px, 100%)' }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ width: '100%' }}
          >
            <IconButton
              onClick={() => navigate('/scoreboards')}
              sx={{ color: '#1b5e20' }}
              aria-label="back to scoreboards"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography
              variant="h4"
              sx={{ color: '#1b5e20', fontSize: { xs: '1.5rem', sm: '2rem' } }}
            >
              Create New Scoreboard
            </Typography>
          </Stack>
          <ScoreboardForm />
        </Stack>
      </Box>
    </Box>
  );
};
