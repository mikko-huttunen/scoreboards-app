import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { DataTable } from '../common/table/DataTable.tsx';
import { HistoryEventService } from '../../services/HistoryEventService.ts';
import type { HistoryEvent } from '../../types/HistoryEvent.ts';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography as MuiTypography,
} from '@mui/material';
import { useDateFormat } from '../../utils/Utils.ts';

type HistoryViewProps = {
  scoreboardId: string;
};

type HistoryRow = {
  id: string;
  created: string;
  user: string;
  action: string;
  entity: string;
};

const PAGE_SIZE = 10;

const formatAction = (action: HistoryEvent['action']): string =>
  action
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const isChangeTuple = (value: unknown): value is [unknown, unknown] => {
  return Array.isArray(value) && value.length === 2;
};

const formatDetailValue = (value: unknown): string => {
  if (value == null || value === '') return '-';

  if (isChangeTuple(value)) {
    // Never directly render tuples here; they are handled by the renderer.
    return `${formatDetailValue(value[0])} → ${formatDetailValue(value[1])}`;
  }

  if (Array.isArray(value)) {
    return value.map(formatDetailValue).join(', ');
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '-';
    }
  }

  return String(value);
};

const renderOldToNew = (oldValue: unknown, newValue: unknown) => {
  const oldText = formatDetailValue(oldValue);
  const newText = formatDetailValue(newValue);
  return `${oldText} → ${newText}`;
};

type ChangeItem = {
  path: string;
  oldValue: unknown;
  newValue: unknown;
};

const collectChanges = (
  value: unknown,
  pathSegments: string[] = []
): ChangeItem[] => {
  if (isChangeTuple(value)) {
    return [
      {
        path: pathSegments.join('.'),
        oldValue: value[0],
        newValue: value[1],
      },
    ];
  }

  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.flatMap((v, idx) =>
      collectChanges(v, [...pathSegments, String(idx)])
    );
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      collectChanges(v, [...pathSegments, k])
    );
  }

  return [];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const formatLabel = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());

const renderColorValue = (value: string) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Box
      sx={{
        width: 18,
        height: 18,
        borderRadius: '4px',
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: value,
        flexShrink: 0,
      }}
    />
  </Box>
);

const renderDetailValueNode = (
  key: string,
  value: unknown
): React.ReactNode => {
  if (typeof value === 'string' && key.toLowerCase() === 'color') {
    return renderColorValue(value);
  }

  return (
    <MuiTypography
      variant="body2"
      sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
    >
      {formatDetailValue(value)}
    </MuiTypography>
  );
};

const renderOldToNewNode = (
  key: string,
  oldValue: unknown,
  newValue: unknown
): React.ReactNode => {
  if (
    key.toLowerCase() === 'color' &&
    typeof oldValue === 'string' &&
    typeof newValue === 'string'
  ) {
    return (
      <Stack direction="row" alignItems="center" spacing={1}>
        {renderColorValue(oldValue)}
        <MuiTypography variant="body2">→</MuiTypography>
        {renderColorValue(newValue)}
      </Stack>
    );
  }

  if (
    key === 'statTypes' &&
    Array.isArray(oldValue) &&
    Array.isArray(newValue)
  ) {
    return (
      <MuiTypography
        variant="body2"
        sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
      >
        {`${oldValue.map(formatDetailValue).join(', ')} → ${newValue
          .map(formatDetailValue)
          .join(', ')}`}
      </MuiTypography>
    );
  }

  return (
    <MuiTypography
      variant="body2"
      sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
    >
      {renderOldToNew(oldValue, newValue)}
    </MuiTypography>
  );
};

const formatSettingsDetails = (details: Record<string, unknown>) => {
  const settingsValue = details.settings;

  if (!isPlainObject(settingsValue)) return null;

  const settingsEntries = Object.entries(settingsValue);
  if (settingsEntries.length === 0) return null;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        padding: 1,
      }}
    >
      <MuiTypography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: 'none', mb: 1 }}
      >
        Settings
      </MuiTypography>

      <Stack spacing={1}>
        {settingsEntries.map(([settingName, value]) => (
          <Box
            key={settingName}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              padding: 1,
            }}
          >
            <MuiTypography variant="caption" color="text.secondary">
              {formatLabel(settingName)}
            </MuiTypography>

            {isChangeTuple(value)
              ? renderOldToNewNode(settingName, value[0], value[1])
              : renderDetailValueNode(settingName, value)}
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

const formatNamedItemsDetails = (
  title: string,
  value: Record<string, unknown>
): React.ReactNode => {
  const items = Object.entries(value);

  if (items.length === 0) return null;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        padding: 1,
      }}
    >
      <MuiTypography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: 'none', mb: 1 }}
      >
        {title}
      </MuiTypography>

      <Stack spacing={1}>
        {items.map(([label]) => (
          <Box
            key={label}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              padding: 1,
            }}
          >
            <MuiTypography
              variant="body2"
              sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
            >
              {label}
            </MuiTypography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

const formatPointCategoriesDetails = (details: Record<string, unknown>) => {
  const pointCategoriesValue = details.pointCategories;

  if (!isPlainObject(pointCategoriesValue)) return null;

  const allEntries = Object.entries(pointCategoriesValue);
  if (allEntries.length === 0) return null;

  const isNamedCollection = allEntries.every(
    ([, value]) => !isPlainObject(value) || typeof value === 'boolean'
  );

  if (isNamedCollection) {
    return formatNamedItemsDetails('Point categories', pointCategoriesValue);
  }

  const categories = allEntries.filter(([, value]) => isPlainObject(value));

  if (categories.length === 0) return null;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        padding: 1,
      }}
    >
      <MuiTypography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: 'none', mb: 1 }}
      >
        Point categories
      </MuiTypography>

      <Stack spacing={2}>
        {categories.map(([pointCategoryId, fieldValue]) => {
          const categoryFields = fieldValue as Record<string, unknown>;
          const { changeType, displayName, ...restFields } = categoryFields;
          const fields = Object.entries(restFields);

          return (
            <Box
              key={pointCategoryId}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                padding: 1,
              }}
            >
              <MuiTypography variant="subtitle2" sx={{ mb: 0.5 }}>
                {typeof displayName === 'string' && displayName.trim() !== ''
                  ? displayName
                  : pointCategoryId}
              </MuiTypography>

              {typeof changeType === 'string' && (
                <MuiTypography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 1 }}
                >
                  {formatLabel(changeType)}
                </MuiTypography>
              )}

              <Stack spacing={1}>
                {fields.map(([fieldName, value]) => (
                  <Box key={`${pointCategoryId}-${fieldName}`}>
                    <MuiTypography variant="caption" color="text.secondary">
                      {formatLabel(fieldName)}
                    </MuiTypography>

                    {isChangeTuple(value)
                      ? renderOldToNewNode(fieldName, value[0], value[1])
                      : renderDetailValueNode(fieldName, value)}
                  </Box>
                ))}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

const formatParticipantsDetails = (details: Record<string, unknown>) => {
  const participantsValue = details.participants;

  if (!isPlainObject(participantsValue)) return null;

  return formatNamedItemsDetails('Participants', participantsValue);
};

const formatScoresDetails = (details: Record<string, unknown>) => {
  const scoresValue = details.scores;

  if (!isPlainObject(scoresValue)) return null;

  const entries = Object.entries(scoresValue);
  if (entries.length === 0) return null;

  const isFlatScores = entries.every(([, value]) => !isPlainObject(value));

  if (isFlatScores) {
    return (
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          padding: 1,
        }}
      >
        <MuiTypography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: 'none', mb: 1 }}
        >
          Scores
        </MuiTypography>

        <Stack spacing={1}>
          {entries.map(([label, value]) => (
            <Box
              key={label}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                padding: 1,
              }}
            >
              <MuiTypography variant="subtitle2" sx={{ mb: 0.5 }}>
                {label}
              </MuiTypography>
              <MuiTypography
                variant="body2"
                sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
              >
                {formatDetailValue(value)}
              </MuiTypography>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  }

  const users = entries;

  if (users.length === 0) return null;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        padding: 1,
      }}
    >
      <MuiTypography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: 'none', mb: 1 }}
      >
        Scores
      </MuiTypography>

      <Stack spacing={2}>
        {users.map(([username, userScoresValue]) => {
          if (!isPlainObject(userScoresValue)) return null;

          const categories = Object.entries(userScoresValue);

          return (
            <Box
              key={username}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                padding: 1,
              }}
            >
              <MuiTypography variant="subtitle1" sx={{ mb: 1 }}>
                {username}
              </MuiTypography>

              <Stack spacing={1}>
                {categories.map(([pointCategoryName, tupleValue]) => {
                  if (isChangeTuple(tupleValue)) {
                    return (
                      <Box key={`${username}-${pointCategoryName}`}>
                        <MuiTypography variant="subtitle2">
                          {pointCategoryName}
                        </MuiTypography>
                        <MuiTypography
                          variant="body2"
                          sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                        >
                          {renderOldToNew(tupleValue[0], tupleValue[1])}
                        </MuiTypography>
                      </Box>
                    );
                  }

                  return (
                    <Box
                      key={`${username}-${pointCategoryName}`}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        padding: 1,
                      }}
                    >
                      <MuiTypography variant="subtitle2" sx={{ mb: 0.5 }}>
                        {pointCategoryName}
                      </MuiTypography>
                      <MuiTypography
                        variant="body2"
                        sx={{
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                        }}
                      >
                        {formatDetailValue(tupleValue)}
                      </MuiTypography>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

const formatDetailsForOtherFields = (
  detailsWithoutScores: Record<string, unknown>
) => {
  const entries = Object.entries(detailsWithoutScores ?? {});

  if (entries.length === 0) return null;

  return (
    <Stack spacing={1}>
      {entries.map(([key, value]) => {
        return (
          <Stack
            key={key}
            spacing={0.5}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              padding: 1,
            }}
          >
            <MuiTypography variant="caption" color="text.secondary">
              {formatLabel(key)}
            </MuiTypography>
            {isChangeTuple(value)
              ? renderOldToNewNode(key, value[0], value[1])
              : renderDetailValueNode(key, value)}
          </Stack>
        );
      })}
    </Stack>
  );
};

const formatDetails = (event: HistoryEvent): React.ReactNode => {
  const details = (event.details ?? {}) as Record<string, unknown>;

  const { scores, pointCategories, participants, settings, ...rest } = details;

  const scoresUi =
    scores !== undefined
      ? formatScoresDetails({ scores } as Record<string, unknown>)
      : null;

  const pointCategoriesUi =
    pointCategories !== undefined
      ? formatPointCategoriesDetails({
          pointCategories,
        } as Record<string, unknown>)
      : null;

  const participantsUi =
    participants !== undefined
      ? formatParticipantsDetails({
          participants,
        } as Record<string, unknown>)
      : null;

  const settingsUi =
    settings !== undefined
      ? formatSettingsDetails({ settings } as Record<string, unknown>)
      : null;

  const otherFieldsUi = formatDetailsForOtherFields(rest);

  if (
    !scoresUi &&
    !pointCategoriesUi &&
    !participantsUi &&
    !settingsUi &&
    !otherFieldsUi
  ) {
    const entries = Object.entries(details);
    if (entries.length === 0) {
      return (
        <MuiTypography variant="body2" color="text.secondary">
          No field changes
        </MuiTypography>
      );
    }
    return (
      <MuiTypography variant="body2" color="text.secondary">
        No field changes
      </MuiTypography>
    );
  }

  return (
    <Stack spacing={2}>
      {otherFieldsUi}
      {participantsUi}
      {settingsUi}
      {pointCategoriesUi}
      {scoresUi}
    </Stack>
  );
};

export const HistoryView: React.FC<HistoryViewProps> = ({ scoreboardId }) => {
  // Every page fetched so far, keyed by its page index. Paging back to a page that is already
  // in here costs no request; only refreshing throws the whole thing away.
  const [eventsByPage, setEventsByPage] = useState<Map<number, HistoryEvent[]>>(
    () => new Map()
  );
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { showErrorMessage, showSuccessMessage } = useMessageSnackbar();
  const { format_date } = useDateFormat();

  const [selectedEvent, setSelectedEvent] = useState<HistoryEvent | null>(null);

  const fetchHistoryPage = useCallback(
    async (targetPage: number, showRefreshMessage = false) => {
      if (!scoreboardId) return;

      try {
        setIsLoading(true);

        const response =
          await HistoryEventService.getHistoryEventsByScoreboardId(
            scoreboardId,
            targetPage
          );

        const sorted = [...(response.content ?? [])].sort(
          (a, b) =>
            new Date(b.created).getTime() - new Date(a.created).getTime()
        );

        const loadedPage = response.number ?? targetPage;

        setEventsByPage((prev) => new Map(prev).set(loadedPage, sorted));
        setTotalElements(response.totalElements ?? 0);
        setPage(loadedPage);

        if (showRefreshMessage) {
          showSuccessMessage('History refreshed');
        }
      } catch (error) {
        showErrorMessage(
          error instanceof Error
            ? error.message
            : 'Failed to load history events'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [scoreboardId, showErrorMessage, showSuccessMessage]
  );

  // Pages already held in state are shown straight away; only unseen ones hit the API.
  const showHistoryPage = useCallback(
    (targetPage: number) => {
      if (eventsByPage.has(targetPage)) {
        setPage(targetPage);
        return;
      }

      void fetchHistoryPage(targetPage);
    },
    [eventsByPage, fetchHistoryPage]
  );

  // Refreshing has to ignore the cache, otherwise it would show the same events back.
  const refreshHistory = useCallback(async () => {
    setEventsByPage(new Map());
    setPage(0);
    await fetchHistoryPage(0, true);
  }, [fetchHistoryPage]);

  useEffect(() => {
    setEventsByPage(new Map());
    setPage(0);
    fetchHistoryPage(0);
  }, [fetchHistoryPage]);

  const historyEvents = useMemo(
    () => eventsByPage.get(page) ?? [],
    [eventsByPage, page]
  );

  const rows = useMemo<HistoryRow[]>(
    () =>
      historyEvents.map((event) => ({
        id: event.id,
        created: format_date(event.created) || '-',
        user: event.createdByName || '-',
        action: formatAction(event.action),
        entity: event.entityName
          ? `${event.entity}: ${event.entityName}`
          : event.entity || '-',
      })),
    [historyEvents]
  );

  return (
    <>
      <DataTable<HistoryRow>
        headers={['Created', 'User', 'Action', 'Entity']}
        data={rows}
        title="History"
        isLoading={isLoading}
        emptyText="No history events found"
        pageSize={PAGE_SIZE}
        serverPagination
        page={page}
        totalCount={totalElements}
        onPageChange={showHistoryPage}
        onRowClick={(row) => {
          const event = historyEvents.find((e) => e.id === row.id);
          if (event) setSelectedEvent(event);
        }}
        refresh={refreshHistory}
      />

      <Dialog
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>History event</DialogTitle>

        <DialogContent dividers>
          {selectedEvent ? (
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                useFlexGap
                flexWrap="wrap"
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexBasis: { xs: '100%', sm: '50%' } }}
                >
                  <MuiTypography
                    variant="caption"
                    color="text.secondary"
                    sx={{ minWidth: 92 }}
                  >
                    Created
                  </MuiTypography>
                  <Typography variant="body2">
                    {format_date(selectedEvent.created)}
                  </Typography>
                </Stack>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexBasis: { xs: '100%', sm: '50%' } }}
                >
                  <MuiTypography
                    variant="caption"
                    color="text.secondary"
                    sx={{ minWidth: 92 }}
                  >
                    User
                  </MuiTypography>
                  <Typography variant="body2">
                    {selectedEvent.createdByName || '-'}
                  </Typography>
                </Stack>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexBasis: { xs: '100%', sm: '50%' } }}
                >
                  <MuiTypography
                    variant="caption"
                    color="text.secondary"
                    sx={{ minWidth: 92 }}
                  >
                    Action
                  </MuiTypography>
                  <Typography variant="body2">
                    {formatAction(selectedEvent.action)}
                  </Typography>
                </Stack>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexBasis: { xs: '100%', sm: '50%' } }}
                >
                  <MuiTypography
                    variant="caption"
                    color="text.secondary"
                    sx={{ minWidth: 92 }}
                  >
                    Entity
                  </MuiTypography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                    {selectedEvent.entityName
                      ? `${selectedEvent.entity}: ${selectedEvent.entityName}`
                      : selectedEvent.entity || '-'}
                  </Typography>
                </Stack>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexBasis: { xs: '100%', sm: '50%' } }}
                >
                  <MuiTypography
                    variant="caption"
                    color="text.secondary"
                    sx={{ minWidth: 92 }}
                  >
                    ID
                  </MuiTypography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                    {selectedEvent.entityId || '-'}
                  </Typography>
                </Stack>
              </Stack>

              <Divider />
              <Stack spacing={1}>{formatDetails(selectedEvent)}</Stack>
            </Stack>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSelectedEvent(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
