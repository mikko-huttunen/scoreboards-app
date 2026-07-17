import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import type { Session } from '../../types/Session.ts';
import type { User } from '../../types/User.ts';
import type { PointCategory } from '../../types/PointCategory.ts';
import type { ResultEntry } from '../../types/ResultEntry.ts';
import type { Result } from '../../types/Result.ts';
import {
  ScoreBarChart,
  type ScoreBarSeries,
} from '../common/charts/ScoreBarChart.tsx';
import { useDateFormat } from '../../utils/Utils.ts';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';

type SessionDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  session: Session;
  users: User[];
  pointCategories: PointCategory[];
  resultEntries: ResultEntry[];
};

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  open,
  onClose,
  session,
  users,
  pointCategories,
  resultEntries,
}) => {
  const { format_date } = useDateFormat();

  const avatarByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users ?? []) {
      if (u?.name) map.set(u.name, u.avatar ?? '');
    }
    return map;
  }, [users]);

  const usedPointCategories = useMemo(() => {
    return pointCategories.filter((pc) =>
      Array.from(session.pointCategories).includes(pc.id)
    );
  }, [pointCategories, session.pointCategories]);

  const series: ScoreBarSeries[] = useMemo(
    () =>
      usedPointCategories.map((pc) => ({
        key: pc.name,
        title: pc.name,
        color: pc.color,
      })),
    [usedPointCategories]
  );

  const chartData = useMemo(() => {
    // Build per-user point totals for this session using only the provided props.
    const entriesForSession = (resultEntries ?? []).filter(
      (re) => re.sessionId === session.id && re.isActive && !re.isPending
    );

    const userById = new Map<string, User>(users.map((u) => [u.id, u]));

    // Only include results that belong to users in the provided `users` list
    const memberEntriesForSession = entriesForSession.filter((entry) =>
      userById.has(entry.userId)
    );

    const resultsByUserName = new Map<string, Result[]>();

    for (const entry of memberEntriesForSession) {
      const user = userById.get(entry.userId);
      const name = user?.name || user?.email || '[Removed user]';
      const resultsArray = entry.results;

      if (!resultsByUserName.has(name)) resultsByUserName.set(name, []);
      resultsByUserName.set(name, [
        ...(resultsByUserName.get(name) ?? []),
        ...resultsArray,
      ]);
    }

    return Array.from(resultsByUserName.entries()).map(([name, results]) => {
      const obj: { name: string; avatar: string } & Record<
        string,
        number | string
      > = {
        name,
        avatar: avatarByName.get(name) ?? '',
      };

      for (const pc of usedPointCategories) {
        obj[pc.name] =
          results.find((r) => r.pointCategoryId === pc.id)?.points ?? 0;
      }

      return obj;
    });
  }, [resultEntries, session.id, users, avatarByName, usedPointCategories]);

  const hasEnoughData =
    open && !!session && !!users?.length && !!pointCategories?.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {`${session?.name} - Session Results`}
        {session?.created && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {format_date(session.created)}
          </Typography>
        )}
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {session?.comment}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {!hasEnoughData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <LoadingSpinner />
          </Box>
        ) : (
          <ScoreBarChart
            loading={false}
            data={chartData}
            barTitle="Points"
            direction="vertical"
            series={series}
            animationDurationMs={200}
            showAvatars
            legendToggleEnabled
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
