import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
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
import { CommentSection } from '../comments/CommentSection.tsx';
import type { Comment } from '../../types/Comment.ts';
import {
  getSessionTotalsByUserId,
  getSessionWinnerIds,
  getTopScorerIds,
} from '../../utils/TieBreaker.ts';

type SessionDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  session: Session;
  users: User[];
  pointCategories: PointCategory[];
  resultEntries: ResultEntry[];
  comments: Comment[];
  onCreateComment: (sessionId: string, comment: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onRefreshComments?: () => Promise<void> | void;
  isScoreboardOwner: boolean;
};

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  open,
  onClose,
  session,
  users,
  pointCategories,
  resultEntries,
  comments,
  onCreateComment,
  onDeleteComment,
  onRefreshComments,
  isScoreboardOwner,
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
    return pointCategories
      .filter((pc) => Array.from(session.pointCategories).includes(pc.id))
      .sort((a, b) => a.index - b.index);
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
    const entriesForSession = (resultEntries ?? []).filter(
      (re) => re.sessionId === session.id && re.isActive && !re.isPending
    );

    const userById = new Map<string, User>(users.map((u) => [u.id, u]));
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

    const rows = Array.from(resultsByUserName.entries()).map(
      ([name, results]) => {
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
      }
    );

    rows.sort((a, b) => {
      const totalA = usedPointCategories.reduce((sum, pc) => {
        const v = a[pc.name];
        return sum + (typeof v === 'number' ? v : Number(v ?? 0));
      }, 0);

      const totalB = usedPointCategories.reduce((sum, pc) => {
        const v = b[pc.name];
        return sum + (typeof v === 'number' ? v : Number(v ?? 0));
      }, 0);

      if (totalB !== totalA) return totalB - totalA;
      return String(a.name).localeCompare(String(b.name));
    });

    return rows;
  }, [resultEntries, session.id, users, avatarByName, usedPointCategories]);

  const nameForUserId = useCallback(
    (userId: string) => {
      const u = users.find((candidate) => candidate.id === userId);
      return u?.name || u?.email || '[Removed user]';
    },
    [users]
  );

  // A tie settled by the tie breaker has a single winner; an unresolved or split tie keeps every
  // tied player a winner. Either way the chart crowns exactly these players.
  const winnerIds = useMemo(
    () => getSessionWinnerIds(session, resultEntries ?? [], session.id),
    [session, resultEntries]
  );

  const winnerNames = useMemo(
    () => winnerIds.map(nameForUserId),
    [winnerIds, nameForUserId]
  );

  // A tie is called out either way: unresolved so it is clear the win is still shared, resolved
  // so the single crown on the chart is explained rather than looking like an outright win.
  const tieStatus = useMemo(() => {
    const totals = getSessionTotalsByUserId(
      resultEntries ?? [],
      session.id,
      new Set(Array.from(session.participants ?? []))
    );

    const topScorerIds = getTopScorerIds(totals);
    if (topScorerIds.length <= 1) return null;

    const points = totals.get(topScorerIds[0]) ?? 0;
    const tieWinner = session.tieWinner;

    if (tieWinner && topScorerIds.includes(tieWinner)) {
      return {
        resolved: true,
        title: '🏆 Tie resolved',
        text: `${nameForUserId(tieWinner)} won the tie breaker.`,
      };
    }

    return {
      resolved: false,
      title: '⚖️ Unresolved tie',
      text: `Tie at ${points} points.`,
    };
  }, [session, resultEntries, nameForUserId]);

  const hasEnoughData =
    open && !!session && !!users?.length && !!pointCategories?.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen>
      <DialogTitle>
        {`${session?.name} - Session Results`}
        {session?.created && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {format_date(session.created)}
          </Typography>
        )}
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            wordBreak: 'break-word',
            mt: 0.5,
          }}
        >
          {`ID: ${session?.id}`}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {session?.description}
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{
          overflowX: 'hidden',
        }}
      >
        {!hasEnoughData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <LoadingSpinner />
          </Box>
        ) : (
          <Stack spacing={3}>
            {tieStatus && (
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderRadius: 3,
                  background: tieStatus.resolved
                    ? 'linear-gradient(135deg, rgba(232,245,233,0.95) 0%, rgba(241,248,242,1) 100%)'
                    : 'linear-gradient(135deg, rgba(255,237,213,0.95) 0%, rgba(255,243,224,1) 100%)',
                  border: tieStatus.resolved
                    ? '1px solid rgba(56,161,79,0.32)'
                    : '1px solid rgba(255,179,0,0.32)',
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    color: tieStatus.resolved ? '#1b5e20' : '#8a5a00',
                  }}
                >
                  {tieStatus.title}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {tieStatus.text}
                </Typography>
              </Box>
            )}

            <ScoreBarChart
              loading={false}
              data={chartData}
              barTitle="Points"
              direction="vertical"
              series={series}
              animationDurationMs={200}
              leaderLabels={winnerNames}
              showAvatars
              legendToggleEnabled
              pagination
              pageSize={10}
            />

            <CommentSection
              title="Comments"
              comments={comments}
              isScoreboardOwner={isScoreboardOwner}
              maxLength={100}
              placeholder="Add a comment to this session..."
              onCreateComment={(comment) =>
                onCreateComment(session.id, comment)
              }
              onDeleteComment={onDeleteComment}
              refresh={onRefreshComments}
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
