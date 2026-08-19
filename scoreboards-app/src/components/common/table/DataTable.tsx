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
import RefreshIcon from '@mui/icons-material/Refresh';

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
  disableCreate?: boolean | (() => boolean);
  createTooltip?: string;
  canAdd?: boolean | ((row: T) => boolean);
  onAdd?: () => void | Promise<void> | null;
  disableAdd?: boolean | (() => boolean);
  addTooltip?: string;
  canDelete?: boolean | ((row: T) => boolean);
  onDelete?: (row: T) => void | Promise<void> | null;
  disableDelete?: boolean | ((row: T) => boolean);
  deleteTooltip?: string;
  canEdit?: boolean | ((row: T) => boolean);
  onEdit?: (row: T) => void | Promise<void> | null;
  disableEdit?: boolean | ((row: T) => boolean);
  editTooltip?: string;
  canCustom?: boolean | ((row: T) => boolean);
  onCustom?: (row: T) => void | Promise<void> | null;
  disableCustom?: boolean | ((row: T) => boolean);
  onCustomIcon?: React.ReactNode;
  customTooltip?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T, index: number) => React.Key;
  refresh?: () => Promise<void> | void;
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
  disableCreate = false,
  createTooltip,
  onAdd,
  canAdd = false,
  disableAdd = false,
  addTooltip,
  onDelete,
  canDelete = false,
  disableDelete = false,
  deleteTooltip,
  onEdit,
  canEdit = false,
  disableEdit = false,
  editTooltip,
  onCustom,
  canCustom = false,
  disableCustom = false,
  onCustomIcon,
  customTooltip,
  pageSize = 10,
  onRowClick,
  getRowId,
  refresh,
}: DataTableProps<T>) => {
  const [page, setPage] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const hasActions = canEdit || canDelete || canCustom;

  const visibleRows = useMemo(() => {
    if (pageSize <= 0) {
      return data;
    }

    const start = page * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const columnCount = headers.length + (hasActions ? 1 : 0);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  return (
    <Stack sx={{ width: '100%' }} spacing={2}>
      {renderContent()}
    </Stack>
  );

  function renderContent() {
    const isCreateDisabled =
      typeof disableCreate === 'function' ? disableCreate() : disableCreate;
    const isAddDisabled =
      typeof disableAdd === 'function' ? disableAdd() : disableAdd;

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
              <Stack direction="row" alignItems="center" spacing={1}>
                {showHighlight ? (
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
                )}
                {refresh && (
                  <Tooltip title="Refresh">
                    <span
                      style={{
                        marginLeft:
                          showHighlight && data.length > 0 ? '10px' : '0',
                      }}
                    >
                      <IconButton
                        onClick={async () => {
                          if (isRefreshing) return;
                          try {
                            setIsRefreshing(true);
                            await refresh();
                          } finally {
                            setIsRefreshing(false);
                          }
                        }}
                        disabled={isLoading || isRefreshing}
                        aria-label="refresh table"
                        sx={{ color: '#38a14f' }}
                      >
                        {isRefreshing ? (
                          <LoadingSpinner size={20} />
                        ) : (
                          <RefreshIcon />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Stack>
            ) : (
              <span />
            )}

            {canCreate && (
              <Tooltip title={createTooltip}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => onCreate?.()}
                  disabled={isCreateDisabled}
                  sx={{
                    backgroundColor: '#38a14f',
                    color: '#ffffff',
                    ':hover': { backgroundColor: '#2d7f3d' },
                  }}
                >
                  Create new
                </Button>
              </Tooltip>
            )}

            {canAdd && (
              <Tooltip title={addTooltip}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => onAdd?.()}
                  disabled={isAddDisabled}
                  sx={{
                    backgroundColor: '#38a14f',
                    color: '#ffffff',
                    ':hover': { backgroundColor: '#2d7f3d' },
                  }}
                >
                  Add
                </Button>
              </Tooltip>
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
                    <Stack
                      direction="row"
                      spacing={0}
                      justifyContent="center"
                      flexWrap="nowrap"
                      sx={{
                        minHeight: 32,
                        alignItems: 'center',
                      }}
                    >
                      {emptyText}
                    </Stack>
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

                  const isEditDisabled =
                    typeof disableEdit === 'function'
                      ? disableEdit(row)
                      : disableEdit;
                  const isDeleteDisabled =
                    typeof disableDelete === 'function'
                      ? disableDelete(row)
                      : disableDelete;
                  const isCustomDisabled =
                    typeof disableCustom === 'function'
                      ? disableCustom(row)
                      : disableCustom;

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
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Stack
                            direction="row"
                            spacing={0}
                            justifyContent="flex-end"
                            flexWrap="nowrap"
                            sx={{
                              minHeight: 32,
                              alignItems: 'center',
                            }}
                          >
                            {hasActions ? (
                              <>
                                {showEdit && (
                                  <Tooltip title={editTooltip ?? 'Edit'}>
                                    <span>
                                      <IconButton
                                        size="small"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          onEdit?.(row);
                                        }}
                                        disabled={isEditDisabled}
                                        aria-label="edit row"
                                        sx={{ color: '#38a14f' }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                )}

                                {showDelete && (
                                  <Tooltip title={deleteTooltip ?? 'Delete'}>
                                    <span>
                                      <IconButton
                                        size="small"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          onDelete?.(row);
                                        }}
                                        disabled={isDeleteDisabled}
                                        aria-label="delete row"
                                        sx={{ color: '#38a14f' }}
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                )}

                                {showCustom && (
                                  <Tooltip title={customTooltip ?? null}>
                                    <span>
                                      <IconButton
                                        size="small"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          onCustom?.(row);
                                        }}
                                        disabled={isCustomDisabled}
                                        aria-label="custom row action"
                                        sx={{ color: '#38a14f' }}
                                      >
                                        {onCustomIcon ?? (
                                          <EditIcon fontSize="small" />
                                        )}
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                )}
                              </>
                            ) : null}
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
  }
};
