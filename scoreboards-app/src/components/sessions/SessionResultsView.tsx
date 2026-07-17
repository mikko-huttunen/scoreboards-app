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

  const [data, setData] = useState<{
    loading: boolean;
    session: SessionData | null;
    users: User[];
    pointCategories: PointCategory[];
    resultEntries: ResultEntry[];
  }>({
    loading: true,
    session: null,
    users: [],
    pointCategories: [],
    resultEntries: [],
  });

  const { showErrorMessage } = useMessageSnackbar();

  useEffect(() => {
    if (!scoreboardId || !sessionId) return;

    const fetchAll = async () => {
      try {
        setData((prev) => ({ ...prev, loading: true }));

        const [sessionData, usersData] = await Promise.all([
          SessionService.getSessionById(sessionId),
          UserService.getScoreboardUsers(scoreboardId),
        ]);

        setData({
          loading: false,
          session: sessionData,
          users: usersData,
          pointCategories: sessionData!.pointCategoryDetails,
          resultEntries: sessionData!.resultEntryDetails,
        });
      } catch (e) {
        showErrorMessage('Failed to load results');
        navigate(`/scoreboards`);
      }
    };

    fetchAll();
  }, [scoreboardId, sessionId, navigate, showErrorMessage]);

  const participants = useMemo(() => {
    if (!data.session) return [];

    const participantIds = new Set<string>(
      Array.from(data.session.participants ?? [])
    );

    return data.users
      .filter((u) => participantIds.has(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
      }));
  }, [data.session, data.users]);

  const filteredResults = useMemo(() => {
    const participantIds = new Set<string>(participants.map((p) => p.id));
    return (data.resultEntries ?? []).filter((re) =>
      participantIds.has(re.userId)
    );
  }, [data.resultEntries, participants]);

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
          {data.loading ? (
            <Box
              sx={{
                width: '100%',
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
                results={filteredResults}
                pointCategories={data.pointCategories}
              />
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );
};
