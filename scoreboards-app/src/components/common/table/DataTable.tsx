import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
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

export type DataTablePermission =
  | 'Author'
  | 'Create'
  | 'Add'
  | 'Edit'
  | 'Delete';

type DataTableRow = Record<string, unknown>;

export type DataTableProps<T extends DataTableRow = DataTableRow> = {
  headers: string[];
  data: T[];
  title?: string;
  isLoading?: boolean;
  emptyText?: string;
  showBadge?: boolean;
  permissions?: DataTablePermission[];
  disableCreate?: boolean | ((row: T) => boolean);
  onCreate?: () => void | Promise<void>;
  disableAdd?: boolean | ((row: T) => boolean);
  onAdd?: () => void | Promise<void>;
  disableDelete?: boolean | ((row: T) => boolean);
  onDelete?: (row: T) => void | Promise<void>;
  disableEdit?: boolean | ((row: T) => boolean);
  onEdit?: (row: T) => void | Promise<void>;
  disableCustom?: boolean | ((row: T) => boolean);
  onCustom?: (row: T) => void | Promise<void>;
  onCustomIcon?: React.ReactNode;
  onCustomPermissions?: DataTablePermission[];
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
  showBadge = false,
  permissions = [],
  onCreate,
  disableCreate = false,
  onAdd,
  disableAdd = false,
  onDelete,
  disableDelete = false,
  onEdit,
  disableEdit = false,
  onCustom,
  disableCustom = false,
  onCustomIcon,
  onCustomPermissions = [],
  pageSize = 10,
  onRowClick,
  getRowId,
}: DataTableProps<T>) => {
  const [page, setPage] = useState(0);

  const canCreate = permissions.includes('Create') && Boolean(onCreate);
  const canAdd = permissions.includes('Add') && Boolean(onAdd);
  const canEdit = permissions.includes('Edit') && Boolean(onEdit);
  const canDelete = permissions.includes('Delete') && Boolean(onDelete);
  const canCustom =
    Boolean(onCustom) &&
    onCustomPermissions.every((permission) => permissions.includes(permission));

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
              showBadge ? (
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="h6" sx={{ color: '#38a14f' }}>
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
                disabled={Boolean(disableCreate)}
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
                disabled={Boolean(disableAdd)}
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
                    <CircularProgress />
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
                        <TableCell
                          align="right"
                          onClick={(event) => event.stopPropagation()}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="flex-end"
                            flexWrap="nowrap"
                          >
                            {canEdit && (
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  disabled={isEditDisabled}
                                  onClick={() => onEdit?.(row)}
                                  aria-label="edit row"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            {canDelete && (
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={isDeleteDisabled}
                                  onClick={() => onDelete?.(row)}
                                  aria-label="delete row"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}

                            {canCustom && (
                              <Tooltip title="Custom action">
                                <IconButton
                                  size="small"
                                  color="secondary"
                                  disabled={isCustomDisabled}
                                  onClick={() => onCustom?.(row)}
                                  aria-label="custom row action"
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

  /*
  const renderHighlightedContent = () => {
    return (
      <Box
        sx={{
          border: '2px solid #38a14f',
          backgroundColor: '#f1f8f4',
          borderRadius: 1,
          p: 2,
          animation:
            'pulse 2s ease-in-out infinite, lightPulse 3s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': {
              opacity: 1,
            },
            '50%': {
              opacity: 0.95,
            },
          },
          '@keyframes lightPulse': {
            '0%, 100%': {
              backgroundColor: '#f1f8f4',
              borderColor: '#38a14f',
            },
            '50%': {
              backgroundColor: '#e8f5e9',
              borderColor: '#4caf50',
            },
          },
        }}
      >
        {renderContent()}
      </Box>
    );
  };
  */

  return (
    <Stack sx={{ width: '100%' }} spacing={2}>
      {renderContent()}
    </Stack>
  );
};
