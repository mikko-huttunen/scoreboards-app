import React from 'react';
import { Box, Stack, Typography, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import { useNavigationSpacing } from '../navigation/Navigation';
import { ScoreboardForm } from './ScoreboardForm';
import { ScoreboardsService } from '../../services/ScoreboardService';
import { useEffect, useState } from 'react';
import type { Scoreboard } from '../../types/Scoreboard';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import type { PointCategory } from '../../types/PointCategory.ts';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';

export const EditScoreboard: React.FC = () => {
  const navigate = useNavigate();
  const { scoreboardId } = useParams<{ scoreboardId: string }>();
  const navigationSpacing = useNavigationSpacing();
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  const [pointCategories, setPointCategories] = useState<PointCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { showErrorMessage } = useMessageSnackbar();
  const { user } = useCurrentUser();
  let isCreator = false;

  useEffect(() => {
    const loadData = async () => {
      if (!scoreboardId || !user) {
        return;
      }

      try {
        const scoreboardData =
          await ScoreboardsService.getScoreboardById(scoreboardId);

        isCreator = scoreboardData?.createdBy === user.id;
        if (!isCreator) {
          navigate(`/scoreboards/${scoreboardId}`);
          return;
        }
        isCreator = true;

        const hasPendingSessions = scoreboardData?.sessions.find(
          (s) => s.isPending
        );
        if (hasPendingSessions) {
          showErrorMessage('Cannot edit scoreboard with pending sessions');
          navigate(`/scoreboards/${scoreboardId}`);
          return;
        }

        setScoreboard(scoreboardData);

        setPointCategories(scoreboardData!.pointCategories);
      } catch (err) {
        showErrorMessage('Failed to load scoreboard');
        navigate('/scoreboards');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [scoreboardId, user]);

  if (loading || !isCreator) {
    return <LoadingSpinner />;
  }

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
            scoreboard={scoreboard}
            pointCategories={pointCategories}
            onSuccess={(updated) => {
              navigate(`/scoreboards/${updated.id}`);
            }}
          />
        </Stack>
      </Box>
    </Box>
  );
};
