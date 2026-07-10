import React, { useMemo, useEffect, useState } from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import type { User } from '../../types/User.ts';
import type { PointCategory } from '../../types/PointCategory.ts';
import type { ResultEntry } from '../../types/ResultEntry.ts';
import {
  type SessionData,
  SessionService,
} from '../../services/SessionService.ts';
import { ResultBarChart } from '../common/charts/ResultBarChart.tsx';
import { useNavigationSpacing } from '../navigation/Navigation';
import { UserService } from '../../services/UserService.ts';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export const SessionResultsView: React.FC = () => {
  const navigate = useNavigate();
  const navigationSpacing = useNavigationSpacing();
  const { scoreboardId, sessionId } = useParams<{
    scoreboardId: string;
    sessionId: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pointCategories, setPointCategories] = useState<PointCategory[]>([]);
  const [resultEntries, setResultEntries] = useState<ResultEntry[]>([]);

  const { showErrorMessage } = useMessageSnackbar();

  useEffect(() => {
    if (!scoreboardId || !sessionId) return;

    const fetchAll = async () => {
      try {
        setLoading(true);

        const [sessionData, usersData] = await Promise.all([
          SessionService.getSessionById(sessionId),
          UserService.getScoreboardUsers(scoreboardId),
        ]);

        setSession(sessionData);
        setPointCategories(sessionData!.pointCategoryDetails);
        setResultEntries(sessionData!.resultEntryDetails);
        setUsers(usersData);
      } catch (e) {
        showErrorMessage('Failed to load results');
        navigate(`/scoreboards`);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [scoreboardId, sessionId]);

  const participants = useMemo(() => {
    if (!session) return [];

    const participantIds = new Set<string>(
      Array.from(session.participants ?? [])
    );
    return users
      .filter((u) => participantIds.has(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
      }));
  }, [session, users]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          px: 2,
          pt: 2,
          ...navigationSpacing,
        }}
      >
        <Stack
          spacing={2}
          alignItems="flex-start"
          sx={{
            width: '100%',
            minHeight: 0,
            boxSizing: 'border-box',
          }}
        >
          {loading ? (
            <Box
              sx={{
                width: '100%',
                //minHeight: { xs: 360, sm: 420 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LoadingSpinner />
            </Box>
          ) : (
            <Stack spacing={2} sx={{ width: '100%', height: 'auto' }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <IconButton
                  onClick={() => navigate(`/scoreboards/${scoreboardId}`)}
                  sx={{ color: '#1b5e20' }}
                  aria-label="back to scoreboards"
                >
                  <ArrowBackIcon />
                </IconButton>
                <Typography
                  variant="h4"
                  sx={{
                    color: '#1b5e20',
                    fontSize: { xs: '1.5rem', sm: '2rem' },
                  }}
                >
                  Session results
                </Typography>
              </Stack>
              <ResultBarChart
                participants={participants}
                results={resultEntries}
                pointCategories={pointCategories}
              />
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );
};
