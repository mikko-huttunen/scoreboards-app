import React from 'react';
import {
  Box,
  Stack,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigation, useNavigationSpacing } from '../navigation/Navigation';
import { ScoreboardForm } from './ScoreboardForm';
import { ScoreboardsService } from '../../services/ScoreboardService';
import { useEffect, useState } from 'react';
import type { Scoreboard } from '../../types/Scoreboard';

export const EditScoreboard: React.FC = () => {
  const navigate = useNavigate();
  const { scoreboardId } = useParams<{ scoreboardId: string }>();
  const { getAccessTokenSilently } = useAuth0();
  const navigationSpacing = useNavigationSpacing();
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadScoreboard = async () => {
      if (!scoreboardId) {
        setError('Scoreboard ID is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const token = await getAccessTokenSilently();
        const data = await ScoreboardsService.getScoreboardById(
          scoreboardId,
          token
        );
        if (data) {
          setScoreboard(data);
        } else {
          setError('Scoreboard not found');
        }
      } catch (err) {
        console.error('Error loading scoreboard:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load scoreboard'
        );
      } finally {
        setLoading(false);
      }
    };

    loadScoreboard();
  }, [scoreboardId, getAccessTokenSilently]);

  if (loading) {
    return (
      <Box
        sx={{
          backgroundColor: '#ffffff',
          position: 'relative',
          pb: { xs: 10, sm: 4 },
        }}
      >
        <Navigation />
        <Box
          sx={{
            px: 2,
            py: 4,
            ...navigationSpacing,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error || !scoreboard) {
    return (
      <Box
        sx={{
          backgroundColor: '#ffffff',
          position: 'relative',
          pb: { xs: 10, sm: 4 },
        }}
      >
        <Navigation />
        <Box sx={{ px: 2, py: 4, ...navigationSpacing }}>
          <Typography variant="h6" sx={{ color: '#d32f2f' }}>
            {error || 'Scoreboard not found'}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: '#ffffff',
        position: 'relative',
        pb: { xs: 10, sm: 4 },
      }}
    >
      <Navigation />
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
              onClick={() => navigate(`/scoreboards/${scoreboardId}`)}
              sx={{ color: '#1b5e20' }}
              aria-label="back to scoreboard"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography
              variant="h4"
              sx={{ color: '#1b5e20', fontSize: { xs: '1.5rem', sm: '2rem' } }}
            >
              Edit Scoreboard
            </Typography>
          </Stack>
          <ScoreboardForm
            scoreboardId={scoreboardId}
            initialName={scoreboard.name}
            onSuccess={(updated) => {
              navigate(`/scoreboards/${updated.id}`);
            }}
          />
        </Stack>
      </Box>
    </Box>
  );
};
