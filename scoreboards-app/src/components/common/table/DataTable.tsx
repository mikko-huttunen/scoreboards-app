import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
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
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { LoadingSpinner } from '../spinner/LoadingSpinner.tsx';
import RefreshIcon from '@mui/icons-material/Refresh';

type DataTableRow = Record<string, unknown>;

// One row action, rendered either as an icon button or as an entry in the overflow menu.
type RowAction = {
  key: string;
  label: string;
  ariaLabel: string;
  icon: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
};

// Beyond this many actions the icons are collapsed behind a single overflow button, so the
// column cannot keep growing wider as actions are added.
const MAX_INLINE_ACTIONS = 3;

// Tight hit area and a smaller glyph than the default, which keeps the actions column narrow.
// The descendant selector also covers caller supplied custom icons.
const ACTION_ICON_BUTTON_SX = {
  color: '#38a14f',
  p: 0.25,
  '& .MuiSvgIcon-root': { fontSize: 18 },
};

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
  page?: number;
  totalCount?: number;
  serverPagination?: boolean;
  onPageChange?: (page: number) => void;
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
  page,
  totalCount,
  serverPagination = false,
  onPageChange,
  onRowClick,
  getRowId,
  refresh,
}: DataTableProps<T>) => {
  const [internalPage, setInternalPage] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionsMenu, setActionsMenu] = useState<{
    anchorEl: HTMLElement;
    row: T;
  } | null>(null);

  const hasActions = canEdit || canDelete || canCustom;
  const currentPage = serverPagination ? (page ?? 0) : internalPage;
  const paginationCount = serverPagination
    ? (totalCount ?? data.length)
    : data.length;

  const visibleRows = useMemo(() => {
    if (serverPagination || pageSize <= 0) {
      return data;
    }

    const start = currentPage * pageSize;
    return data.slice(start, start + pageSize);
  }, [currentPage, data, pageSize, serverPagination]);

  const columnCount = headers.length + (hasActions ? 1 : 0);

  const handleChangePage = (_event: unknown, newPage: number) => {
    if (serverPagination) {
      onPageChange?.(newPage);
      return;
    }

    setInternalPage(newPage);
    onPageChange?.(newPage);
  };

  return (
    <Stack sx={{ width: '100%' }} spacing={2}>
      {renderContent()}
    </Stack>
  );

  // The actions a single row offers, in the order they have always been shown.
  function getRowActions(row: T): RowAction[] {
    const actions: RowAction[] = [];

    const showEdit = typeof canEdit === 'function' ? canEdit(row) : canEdit;
    const showDelete =
      typeof canDelete === 'function' ? canDelete(row) : canDelete;
    const showCustom =
      typeof canCustom === 'function' ? canCustom(row) : canCustom;

    if (showEdit) {
      actions.push({
        key: 'edit',
        label: editTooltip ?? 'Edit',
        ariaLabel: 'edit row',
        icon: <EditIcon />,
        disabled:
          typeof disableEdit === 'function' ? disableEdit(row) : disableEdit,
        onClick: () => onEdit?.(row),
      });
    }

    if (showDelete) {
      actions.push({
        key: 'delete',
        label: deleteTooltip ?? 'Delete',
        ariaLabel: 'delete row',
        icon: <DeleteIcon />,
        disabled:
          typeof disableDelete === 'function'
            ? disableDelete(row)
            : disableDelete,
        onClick: () => onDelete?.(row),
      });
    }

    if (showCustom) {
      actions.push({
        key: 'custom',
        label: customTooltip ?? 'Action',
        ariaLabel: 'custom row action',
        icon: onCustomIcon ?? <EditIcon />,
        disabled:
          typeof disableCustom === 'function'
            ? disableCustom(row)
            : disableCustom,
        onClick: () => onCustom?.(row),
      });
    }

    return actions;
  }

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

                  const rowActions = getRowActions(row);
                  const collapseActions =
                    rowActions.length > MAX_INLINE_ACTIONS;

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
                          // The 1% width shrinks the column to its content, leaving the rest of
                          // the table width to the data columns.
                          sx={{ whiteSpace: 'nowrap', px: 1, width: '1%' }}
                        >
                          <Stack
                            direction="row"
                            spacing={0.25}
                            justifyContent="flex-end"
                            flexWrap="nowrap"
                            sx={{
                              minHeight: 32,
                              alignItems: 'center',
                            }}
                          >
                            {collapseActions ? (
                              <Tooltip title="Actions">
                                <IconButton
                                  size="small"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setActionsMenu({
                                      anchorEl: event.currentTarget,
                                      row,
                                    });
                                  }}
                                  aria-label="row actions"
                                  sx={ACTION_ICON_BUTTON_SX}
                                >
                                  <MoreVertIcon />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              rowActions.map((action) => (
                                <Tooltip key={action.key} title={action.label}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        action.onClick();
                                      }}
                                      disabled={action.disabled}
                                      aria-label={action.ariaLabel}
                                      sx={ACTION_ICON_BUTTON_SX}
                                    >
                                      {action.icon}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              ))
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

          {!isLoading && pageSize > 0 && paginationCount > pageSize && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <TablePagination
                component="div"
                count={paginationCount}
                page={currentPage}
                onPageChange={handleChangePage}
                rowsPerPage={pageSize}
                rowsPerPageOptions={[pageSize]}
              />
            </Box>
          )}
        </TableContainer>

        {/* Shared by every collapsed row; the row it was opened from is held in state. */}
        <Menu
          anchorEl={actionsMenu?.anchorEl ?? null}
          open={!!actionsMenu}
          onClose={() => setActionsMenu(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {(actionsMenu ? getRowActions(actionsMenu.row) : []).map((action) => (
            <MenuItem
              key={action.key}
              disabled={action.disabled}
              onClick={(event) => {
                event.stopPropagation();
                setActionsMenu(null);
                action.onClick();
              }}
            >
              <ListItemIcon sx={{ color: '#38a14f', minWidth: 32 }}>
                {action.icon}
              </ListItemIcon>
              <ListItemText primary={action.label} />
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }
};
