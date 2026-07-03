import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { LoadingSpinner } from '../spinner/LoadingSpinner.tsx';

type DataTableRow = Record<string, unknown>;

export type DataTableProps<T extends DataTableRow = DataTableRow> = {
  headers: string[];
  data: T[];
  title?: string;
  isLoading?: boolean;
  emptyText?: string;
  showHighlight?: boolean;
  canCreate?: boolean | ((row: T) => boolean);
  onCreate?: () => void | Promise<void> | null;
  canAdd?: boolean | ((row: T) => boolean);
  onAdd?: () => void | Promise<void> | null;
  canDelete?: boolean | ((row: T) => boolean);
  onDelete?: (row: T) => void | Promise<void> | null;
  canEdit?: boolean | ((row: T) => boolean);
  onEdit?: (row: T) => void | Promise<void> | null;
  canCustom?: boolean | ((row: T) => boolean);
  onCustom?: (row: T) => void | Promise<void> | null;
  onCustomIcon?: React.ReactNode;
  customTooltip?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T, index: number) => React.Key;
};

const normalizeKey = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/^(.)/, (_, character: string) => character.toLowerCase());

const toCellContent = (value: unknown): React.ReactNode => {
  if (
    value == null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value ?? '—';
  }

  if (React.isValidElement(value)) {
    return value;
  }

  return '—';
};

const getCellValue = <T extends DataTableRow>(row: T, header: string) => {
  if (header in row) {
    return toCellContent(row[header]);
  }

  const normalizedHeader = normalizeKey(header);
  if (normalizedHeader in row) {
    return toCellContent(row[normalizedHeader]);
  }

  const matchingKey = Object.keys(row).find(
    (key) => key.toLowerCase() === header.toLowerCase()
  );

  if (matchingKey) {
    return toCellContent(row[matchingKey]);
  }

  return '—';
};

export const DataTable = <T extends DataTableRow = DataTableRow>({
  headers,
  data,
  title,
  isLoading = false,
  emptyText = 'No data',
  showHighlight = false,
  onCreate,
  canCreate = false,
  onAdd,
  canAdd = false,
  onDelete,
  canDelete = false,
  onEdit,
  canEdit = false,
  onCustom,
  canCustom = false,
  onCustomIcon,
  customTooltip,
  pageSize = 10,
  onRowClick,
  getRowId,
}: DataTableProps<T>) => {
  const [page, setPage] = useState(0);

  const hasActions = canEdit || canDelete || canCustom;

  const firstHeader = headers[0];

  const sortedData = useMemo(() => {
    if (!firstHeader || data.length <= 1) return data;

    const isDateLike =
      typeof firstHeader === 'string' &&
      firstHeader.toLowerCase().includes('date');

    const parseCustomDateToMs = (value: unknown): number | null => {
      // Expected format: 'd/M/yyyy HH:mm'
      if (value == null) return null;
      const str = String(value).trim();
      if (!str) return null;

      const [datePart, timePart] = str.split(' ');
      if (!datePart || !timePart) return null;

      const [dStr, mStr, yStr] = datePart.split('/');
      const [hhStr, mmStr] = timePart.split(':');

      const day = Number(dStr);
      const month = Number(mStr);
      const year = Number(yStr);
      const hour = Number(hhStr);
      const minute = Number(mmStr);

      if (
        !Number.isFinite(day) ||
        !Number.isFinite(month) ||
        !Number.isFinite(year) ||
        !Number.isFinite(hour) ||
        !Number.isFinite(minute)
      ) {
        return null;
      }

      // JS Date months are 0-based
      const dt = new Date(year, month - 1, day, hour, minute, 0, 0);
      const ms = dt.getTime();

      // Guard against invalid dates
      if (!Number.isFinite(ms)) return null;
      return ms;
    };

    const getSortableValue = (row: T) => {
      const record = row as unknown as Record<string, unknown>;
      const raw = record[firstHeader] ?? record[normalizeKey(firstHeader)];

      if (raw == null) return null;

      if (isDateLike) {
        // raw is typically a formatted string like 'd/M/yyyy HH:mm'
        if (raw instanceof Date) {
          const ms = raw.getTime();
          return Number.isFinite(ms) ? ms : null;
        }

        const ms = parseCustomDateToMs(raw);
        return ms;
      }

      if (typeof raw === 'number') return raw;
      if (typeof raw === 'boolean') return raw ? 1 : 0;

      const s = String(raw).trim();
      const n = Number(s);

      // If it's a valid numeric string, sort numerically.
      if (s !== '' && !Number.isNaN(n) && String(n) === s) return n;

      return s.toLowerCase();
    };

    const withIndex = data.map((row, idx) => ({ row, idx }));

    withIndex.sort((a, b) => {
      const av = getSortableValue(a.row);
      const bv = getSortableValue(b.row);

      // Date sort: latest first (descending by ms)
      if (isDateLike) {
        const aMs = typeof av === 'number' ? av : -Infinity;
        const bMs = typeof bv === 'number' ? bv : -Infinity;
        if (aMs !== bMs) return bMs - aMs;
        return a.idx - b.idx;
      }

      // Numeric sort
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av !== bv) return av - bv;
        return a.idx - b.idx;
      }

      const aStr = String(av ?? '');
      const bStr = String(bv ?? '');

      if (aStr !== bStr) return aStr.localeCompare(bStr);
      return a.idx - b.idx;
    });

    return withIndex.map(({ row }) => row);
  }, [data, firstHeader]);

  const visibleRows = useMemo(() => {
    if (pageSize <= 0) {
      return sortedData;
    }

    const start = page * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const columnCount = headers.length + (hasActions ? 1 : 0);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const renderContent = () => {
    return (
      <>
        {(title || canCreate || canAdd) && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ width: '100%' }}
          >
            {title ? (
              showHighlight ? (
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="h6" sx={{ color: '#1b5e20' }}>
                    {title}
                  </Typography>
                  {data.length > 0 && (
                    <Badge
                      badgeContent={data.length}
                      color="success"
                      sx={{
                        '& .MuiBadge-badge': {
                          backgroundColor: '#38a14f',
                          color: '#fff',
                        },
                      }}
                    />
                  )}
                </Stack>
              ) : (
                <Typography variant="h6" sx={{ color: '#1b5e20' }}>
                  {title}
                </Typography>
              )
            ) : (
              <span />
            )}

            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => onCreate?.()}
                sx={{
                  backgroundColor: '#38a14f',
                  color: '#ffffff',
                  ':hover': { backgroundColor: '#2d7f3d' },
                }}
              >
                Create new
              </Button>
            )}

            {canAdd && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => onAdd?.()}
                sx={{
                  backgroundColor: '#38a14f',
                  color: '#ffffff',
                  ':hover': { backgroundColor: '#2d7f3d' },
                }}
              >
                Add
              </Button>
            )}
          </Stack>
        )}

        <TableContainer component={Paper} elevation={1}>
          <Table size="small" aria-label={`${title ?? 'data'} table`}>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableCell key={header}>{header}</TableCell>
                ))}
                {hasActions && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
                    sx={{ py: 4, textAlign: 'center' }}
                  >
                    <LoadingSpinner size={30} />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
                    sx={{ color: '#666', textAlign: 'center' }}
                  >
                    {emptyText}
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((row, index) => {
                  const rowKey = getRowId
                    ? getRowId(row, index)
                    : ((row.id as React.Key | undefined) ?? index);

                  const showEdit =
                    typeof canEdit === 'function' ? canEdit(row) : canEdit;
                  const showDelete =
                    typeof canDelete === 'function'
                      ? canDelete(row)
                      : canDelete;
                  const showCustom =
                    typeof canCustom === 'function'
                      ? canCustom(row)
                      : canCustom;

                  return (
                    <TableRow
                      key={rowKey}
                      hover
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    >
                      {headers.map((header) => (
                        <TableCell
                          key={header}
                          sx={{
                            whiteSpace: { xs: 'normal', sm: 'nowrap' },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {getCellValue(row, header)}
                        </TableCell>
                      ))}

                      {hasActions && (
                        <TableCell
                          align="right"
                          onClick={(event) => event.stopPropagation()}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          <Stack
                            direction="row"
                            spacing={0}
                            justifyContent="flex-end"
                            flexWrap="nowrap"
                          >
                            {showEdit && (
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={() => onEdit?.(row)}
                                  aria-label="edit row"
                                  sx={{
                                    color: '#38a14f',
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            {showDelete && (
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  onClick={() => onDelete?.(row)}
                                  aria-label="delete row"
                                  sx={{
                                    color: '#38a14f',
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}

                            {showCustom && (
                              <Tooltip title={customTooltip ?? null}>
                                <IconButton
                                  size="small"
                                  onClick={() => onCustom?.(row)}
                                  aria-label="custom row action"
                                  sx={{
                                    color: '#38a14f',
                                  }}
                                >
                                  {onCustomIcon ?? (
                                    <EditIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {!isLoading && pageSize > 0 && data.length > pageSize && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <TablePagination
                component="div"
                count={data.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={pageSize}
                rowsPerPageOptions={[pageSize]}
              />
            </Box>
          )}
        </TableContainer>
      </>
    );
  };

  return (
    <Stack
      sx={{ width: '100%' }}
      spacing={2}
      border={showHighlight ? 'solid 3px greenyellow' : 'none'}
      borderRadius={showHighlight ? '4px' : 'none'}
    >
      {renderContent()}
    </Stack>
  );
};
