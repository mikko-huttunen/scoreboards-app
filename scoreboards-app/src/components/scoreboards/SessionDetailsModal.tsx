import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import type { Session } from '../../types/Session';
import type { User } from '../../types/User';
import type { PointCategory } from '../../types/PointCategory';
import { ResultEntryService } from '../../services/ResultEntryService';
import type { Result } from '../../types/Result.ts';
import {
  ScoreBarChart,
  type ScoreBarSeries,
} from '../common/charts/ScoreBarChart.tsx';
import { useDateFormat } from '../../utils/useDateFormat.ts';

type SessionDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  session: Session;
  users: User[];
  pointCategories: PointCategory[];
};

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  open,
  onClose,
  session,
  users,
  pointCategories,
}) => {
  const [loading, setLoading] = useState(true);
  const [resultMap, setResultMap] = useState<Map<string, Result[]>>(new Map());
  const { format_date } = useDateFormat();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const resultEntriesData =
          await ResultEntryService.getResultEntriesBySession(session.id);

        let results: Result[] = [];
        for (const entry of resultEntriesData) {
          const resultsData =
            await ResultEntryService.getResultsByResultEntryId(entry.id);
          results = [...results, ...resultsData];
        }

        if (!users || !results.length) {
          return;
        }

        const resultMapData = new Map<string, Result[]>();
        for (const user of users) {
          const userResults = results.filter((r) => r.userId === user.id);
          if (userResults.length) resultMapData.set(user.name, userResults);
        }
        setResultMap(resultMapData);
      } catch (err) {
        console.error('Error fetching session data:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [open, session.id, users]);

  const chartData = useMemo(() => {
    const usedPointCategories = pointCategories.filter((pc) =>
      Array.from(session.pointCategories).includes(pc.id)
    );

    const data = [];

    for (const [name, results] of resultMap) {
      const obj: { [key: string]: string | number } = {
        name: name,
      };

      usedPointCategories.forEach((pg: PointCategory) => {
        obj[pg.name] =
          results.find((result) => result.pointCategoryId === pg.id)?.points ||
          0;
      });

      data.push(obj);
    }

    return data;
  }, [resultMap]);

  const usedPointCategories = pointCategories.filter((pc) =>
    Array.from(session.pointCategories).includes(pc.id)
  );

  const series: ScoreBarSeries[] = usedPointCategories.map((pc) => ({
    key: pc.name,
    title: pc.name,
    color: pc.color,
  }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Session Details - {session?.scoreboardName}
        {session?.created && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {format_date(session.created)}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <ScoreBarChart
            loading={false}
            data={chartData}
            barTitle="Points"
            chartTitle="Participant Scores"
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
