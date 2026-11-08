import React, { useEffect, useRef, useState } from 'react';
import {
  Stack,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useNavigate } from 'react-router-dom';
import {
  type ScoreboardData,
  ScoreboardsService,
} from '../../services/ScoreboardService';
import type { Scoreboard } from '../../types/Scoreboard';
import './ScoreboardForm.css';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';
import { ConfirmDialog } from '../common/dialog/ConfirmDialog.tsx';
import { STAT_TYPES } from '../../constants.ts';

type PointCategoryFormData = {
  id?: string;
  name: string;
  color: string;
  index?: number;
};

type ScoreboardFormProps = {
  scoreboard?: Scoreboard | null;
  pointCategories?: PointCategoryFormData[] | null;

  onSuccess?: (scoreboard: Scoreboard) => void;
};

export const ScoreboardForm: React.FC<ScoreboardFormProps> = ({
  scoreboard,
  pointCategories,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const isEditing = !!scoreboard;

  const [name, setName] = useState('');
  const [pointCategoryForms, setPointCategoryForms] = useState<
    PointCategoryFormData[]
  >([{ name: '', color: '#38a14f', index: 0 }]);
  const [selectedStatTypes, setSelectedStatTypes] = useState<
    (typeof STAT_TYPES)[keyof typeof STAT_TYPES][]
  >([STAT_TYPES.TOTAL, STAT_TYPES.AVERAGE]);

  const [defaultStatType, setDefaultStatType] = useState<
    (typeof STAT_TYPES)[keyof typeof STAT_TYPES]
  >(STAT_TYPES.TOTAL);

  const [errors, setErrors] = useState<{
    name?: string;
    pointCategories?: string;
    leaderboardStatistics?: string;
    defaultStatType?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const { showErrorMessage, showSuccessMessage } = useMessageSnackbar();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<ScoreboardData | null>(
    null
  );

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const touchDragIndexRef = useRef<number | null>(null);

  const MAX_NAME_LENGTH = 20;
  const MAX_POINT_CATEGORIES = 10;

  const isNameTooLong = name.trim().length > MAX_NAME_LENGTH;

  const reindexCategories = (categories: PointCategoryFormData[]) =>
    categories.map((category, index) => ({
      ...category,
      index,
    }));

  const reorderPointCategories = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    setPointCategoryForms((prev) => {
      const updated = [...prev];
      const [movedCategory] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedCategory);
      return reindexCategories(updated);
    });

    if (errors.pointCategories) {
      setErrors((current) => ({
        ...current,
        pointCategories: undefined,
      }));
    }
  };

  useEffect(() => {
    setName(scoreboard?.name ?? '');

    setPointCategoryForms(
      pointCategories && pointCategories.length > 0
        ? reindexCategories(
            [...pointCategories].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
          )
        : [{ name: '', color: '#38a14f', index: 0 }]
    );

    const scoreboardStatTypes = scoreboard?.settings?.statTypes ?? [
      STAT_TYPES.TOTAL,
      STAT_TYPES.AVERAGE,
    ];

    setSelectedStatTypes(scoreboardStatTypes);

    const nextDefault =
      scoreboard?.settings?.defaultStatType &&
      scoreboardStatTypes.includes(scoreboard.settings.defaultStatType)
        ? scoreboard.settings.defaultStatType
        : (scoreboardStatTypes[0] ?? STAT_TYPES.TOTAL);

    setDefaultStatType(nextDefault);

    setErrors({});
  }, [scoreboard, pointCategories]);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    if (errors.name) setErrors({ ...errors, name: undefined });
  };

  const handleStatTypeToggle = (
    statType: (typeof STAT_TYPES)[keyof typeof STAT_TYPES]
  ) => {
    setSelectedStatTypes((prev) => {
      const next = prev.includes(statType)
        ? prev.filter((type) => type !== statType)
        : [...prev, statType];

      if (next.length > 0 && !next.includes(defaultStatType)) {
        setDefaultStatType(next[0]);
      }

      if (errors.leaderboardStatistics) {
        setErrors((current) => ({
          ...current,
          leaderboardStatistics: undefined,
        }));
      }
      if (errors.defaultStatType) {
        setErrors((current) => ({
          ...current,
          defaultStatType: undefined,
        }));
      }

      return next;
    });
  };

  const handleAddPointCategory = () => {
    if (pointCategoryForms.length >= MAX_POINT_CATEGORIES) return;
    setPointCategoryForms(
      reindexCategories([...pointCategoryForms, { name: '', color: '#38a14f' }])
    );
  };

  const handleRemovePointCategory = (index: number) => {
    if (pointCategoryForms.length <= 1) return;
    const updated = pointCategoryForms.filter((_, i) => i !== index);
    setPointCategoryForms(reindexCategories(updated));
    if (errors.pointCategories)
      setErrors({ ...errors, pointCategories: undefined });
  };

  const handlePointCategoryChange = (
    index: number,
    field: keyof PointCategoryFormData,
    value: string
  ) => {
    const updated = [...pointCategoryForms];
    updated[index] = { ...updated[index], [field]: value };
    setPointCategoryForms(updated);
    if (errors.pointCategories)
      setErrors({ ...errors, pointCategories: undefined });
  };

  const handleDragStart = (index: number) => {
    if (submitting) return;
    setDraggedIndex(index);
    setDragOverIndex(index);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLElement>,
    index: number
  ) => {
    event.preventDefault();
    if (submitting || draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (submitting || draggedIndex === null) return;
    reorderPointCategories(draggedIndex, index);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleTouchStart = (index: number) => {
    if (submitting) return;
    touchDragIndexRef.current = index;
    setDraggedIndex(index);
    setDragOverIndex(index);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    if (submitting || touchDragIndexRef.current === null) return;

    const touch = event.touches[0];
    const target = document.elementFromPoint(
      touch.clientX,
      touch.clientY
    ) as HTMLElement | null;

    const dropTarget = target?.closest(
      '[data-category-index]'
    ) as HTMLElement | null;

    if (!dropTarget) return;

    const targetIndex = Number(dropTarget.dataset.categoryIndex);

    if (!Number.isNaN(targetIndex) && targetIndex !== dragOverIndex) {
      setDragOverIndex(targetIndex);
    }
  };

  const handleTouchEnd = () => {
    if (
      submitting ||
      touchDragIndexRef.current === null ||
      dragOverIndex === null
    ) {
      touchDragIndexRef.current = null;
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    reorderPointCategories(touchDragIndexRef.current, dragOverIndex);
    touchDragIndexRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const validateForm = (): boolean => {
    const newErrors: {
      name?: string;
      pointCategories?: string;
      leaderboardStatistics?: string;
      defaultStatType?: string;
    } = {};

    if (!name.trim()) newErrors.name = 'Scoreboard name is required';
    if (isNameTooLong)
      newErrors.name = `Scoreboard name cannot be longer than ${MAX_NAME_LENGTH} characters`;

    const validCategories = pointCategoryForms.filter(
      (cat) => cat.name.trim() && cat.color.trim()
    );

    if (validCategories.length === 0) {
      newErrors.pointCategories =
        'At least one point category with a name and color is required';
    }

    const invalidCategories = pointCategoryForms.filter(
      (cat) =>
        (cat.name.trim() && !cat.color.trim()) ||
        (!cat.name.trim() && cat.color.trim())
    );

    if (invalidCategories.length > 0) {
      newErrors.pointCategories =
        'All point categories must have both a name and color';
    }

    const categoriesMissingName = pointCategoryForms.filter(
      (cat) => !cat.name.trim() && cat.color.trim()
    );

    if (categoriesMissingName.length > 0) {
      newErrors.pointCategories = 'All point categories must have a name';
    }

    const tooLongCategoryNames = pointCategoryForms.filter(
      (cat) => cat.name.trim().length > MAX_NAME_LENGTH
    );

    if (tooLongCategoryNames.length > 0) {
      newErrors.pointCategories = `Point category names cannot be longer than ${MAX_NAME_LENGTH} characters`;
    }

    if (selectedStatTypes.length === 0) {
      newErrors.leaderboardStatistics =
        'Select at least one leaderboard statistic';
    }

    if (selectedStatTypes.length > 1 && !defaultStatType) {
      newErrors.defaultStatType = 'Default stat type is required';
    }

    if (
      selectedStatTypes.length > 1 &&
      defaultStatType &&
      !selectedStatTypes.includes(defaultStatType)
    ) {
      newErrors.defaultStatType = 'Default stat type must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    const validCategories = pointCategoryForms
      .filter((cat) => cat.name.trim() && cat.color.trim())
      .map((cat, index) => ({
        id: cat.id,
        name: cat.name.trim(),
        color: cat.color.trim(),
        index,
      }));

    const payload: ScoreboardData = {
      name: name.trim(),
      pointCategories: validCategories,
      settings: {
        statTypes: selectedStatTypes,
        defaultStatType,
      },
    };

    if (isEditing && scoreboard) {
      setPendingPayload(payload);
      setConfirmOpen(true);
      return;
    }

    setSubmitting(true);

    try {
      const created = await ScoreboardsService.createScoreboard(payload);
      showSuccessMessage('Scoreboard created');
      onSuccess ? onSuccess(created) : navigate('/scoreboards');
    } catch (error) {
      showErrorMessage('Failed to create scoreboard');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmUpdate = async () => {
    if (!pendingPayload || !scoreboard) return;

    setSubmitting(true);
    try {
      const updated = await ScoreboardsService.updateScoreboard(
        scoreboard.id,
        pendingPayload
      );

      showSuccessMessage('Scoreboard updated');
      if (updated) {
        onSuccess ? onSuccess(updated) : navigate(`/scoreboards/${updated.id}`);
      }
    } catch (error) {
      showErrorMessage('Failed to update scoreboard');
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
      setPendingPayload(null);
    }
  };

  const hasTooLongCategoryName = pointCategoryForms.some(
    (cat) => cat.name.trim().length > MAX_NAME_LENGTH
  );

  const isSubmitDisabled =
    submitting ||
    !name.trim() ||
    isNameTooLong ||
    hasTooLongCategoryName ||
    selectedStatTypes.length === 0 ||
    pointCategoryForms.filter((cat) => cat.name.trim() && cat.color.trim())
      .length === 0 ||
    pointCategoryForms.some((cat) => cat.color.trim() && !cat.name.trim()) ||
    (selectedStatTypes.length > 1 && !defaultStatType);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <Paper
        elevation={1}
        sx={{
          p: { xs: 2, sm: 3 },
          width: '100%',
          maxWidth: { xs: '100%', sm: 'min(1200px, 100%)' },
        }}
      >
        <ConfirmDialog
          open={confirmOpen}
          onCancel={() => {
            if (!submitting) {
              setConfirmOpen(false);
              setPendingPayload(null);
            }
          }}
          title="Update Scoreboard"
          text="Please note that deleting point categories will delete the associated results.
          Are you sure you want to save these changes to the scoreboard?"
          confirmLabel="Update"
          confirmColor="success"
          loading={submitting}
          confirmDisabled={submitting}
          onConfirm={handleConfirmUpdate}
        />
        <form onSubmit={handleSubmit}>
          <Stack spacing={3} sx={{ width: '100%' }}>
            <TextField
              label="Scoreboard Name"
              value={name}
              onChange={handleNameChange}
              error={!!errors.name || isNameTooLong}
              helperText={
                isNameTooLong
                  ? `Scoreboard name cannot be longer than ${MAX_NAME_LENGTH} characters.`
                  : (errors.name ?? undefined)
              }
              required
              fullWidth
              disabled={submitting}
            />

            <Stack spacing={2}>
              <Typography variant="h6" sx={{ color: '#1b5e20' }}>
                Leaderboard statistics
              </Typography>

              {errors.leaderboardStatistics && (
                <Alert severity="error">{errors.leaderboardStatistics}</Alert>
              )}

              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedStatTypes.includes(STAT_TYPES.TOTAL)}
                      onChange={() => handleStatTypeToggle(STAT_TYPES.TOTAL)}
                      disabled={submitting}
                    />
                  }
                  label="Total scores"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedStatTypes.includes(STAT_TYPES.AVERAGE)}
                      onChange={() => handleStatTypeToggle(STAT_TYPES.AVERAGE)}
                      disabled={submitting}
                    />
                  }
                  label="Average scores"
                />
              </FormGroup>

              {selectedStatTypes.length > 1 && (
                <FormControl
                  fullWidth
                  size="small"
                  error={!!errors.defaultStatType}
                  disabled={submitting}
                >
                  <InputLabel id="default-stat-type-label">
                    Default stat type
                  </InputLabel>
                  <Select
                    labelId="default-stat-type-label"
                    label="Default stat type"
                    value={defaultStatType}
                    onChange={(e) =>
                      setDefaultStatType(
                        e.target
                          .value as (typeof STAT_TYPES)[keyof typeof STAT_TYPES]
                      )
                    }
                  >
                    {selectedStatTypes.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t === STAT_TYPES.TOTAL ? 'Total' : 'Average'}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.defaultStatType && (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ mt: 0.5 }}
                    >
                      {errors.defaultStatType}
                    </Typography>
                  )}
                </FormControl>
              )}
            </Stack>

            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={2}
              >
                <Typography variant="h6" sx={{ color: '#1b5e20' }}>
                  Point Categories
                </Typography>
              </Stack>

              <Typography variant="body2" sx={{ color: '#666' }}>
                Drag and drop the category cards to change their display order.
              </Typography>

              {errors.pointCategories && (
                <Alert severity="error">{errors.pointCategories}</Alert>
              )}

              <Stack spacing={1.5}>
                {pointCategoryForms.map((category, index) => {
                  const isCategoryNameTooLong =
                    category.name.trim().length > MAX_NAME_LENGTH;

                  return (
                    <Paper
                      key={category.id ?? `category-${index}`}
                      elevation={0}
                      data-category-index={index}
                      draggable={!submitting}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(event) => handleDragOver(event, index)}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={() => handleTouchStart(index)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className={`point-category-card${
                        draggedIndex === index ? ' dragging' : ''
                      }${dragOverIndex === index ? ' drag-over' : ''}`}
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        backgroundColor: '#f5f5f5',
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ minWidth: 0 }}
                          >
                            <Box
                              className="drag-handle"
                              aria-label="Drag category"
                            >
                              <DragIndicatorIcon fontSize="small" />
                            </Box>

                            <Typography
                              variant="body2"
                              sx={{ color: '#666', fontWeight: 600 }}
                            >
                              #{index + 1}
                            </Typography>
                          </Stack>

                          <IconButton
                            onClick={() => handleRemovePointCategory(index)}
                            disabled={
                              pointCategoryForms.length <= 1 || submitting
                            }
                            sx={{ color: '#38a14f' }}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>

                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          alignItems={{ xs: 'stretch', sm: 'center' }}
                        >
                          <TextField
                            label="Category Name"
                            value={category.name}
                            onChange={(e) =>
                              handlePointCategoryChange(
                                index,
                                'name',
                                e.target.value
                              )
                            }
                            required
                            fullWidth
                            disabled={submitting}
                            size="small"
                            error={isCategoryNameTooLong}
                            helperText={
                              isCategoryNameTooLong
                                ? `Category name cannot be longer than ${MAX_NAME_LENGTH} characters.`
                                : undefined
                            }
                          />

                          <input
                            id={`color-input-${index}`}
                            type="color"
                            value={category.color}
                            onChange={(e) =>
                              handlePointCategoryChange(
                                index,
                                'color',
                                e.target.value
                              )
                            }
                            disabled={submitting}
                            className="color-input"
                          />
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>

              <Button
                startIcon={<AddIcon />}
                onClick={handleAddPointCategory}
                disabled={
                  pointCategoryForms.length >= MAX_POINT_CATEGORIES ||
                  submitting
                }
                size="small"
                sx={{
                  backgroundColor: '#38a14f',
                  color: '#ffffff',
                  ':hover': { backgroundColor: '#2d7f3d' },
                  alignSelf: 'flex-start',
                }}
              >
                Add Category
              </Button>

              <Typography variant="caption" sx={{ color: '#666' }}>
                {pointCategoryForms.length} of {MAX_POINT_CATEGORIES} categories
                (minimum 1 required)
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="flex-end"
                sx={{ width: '100%' }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitDisabled}
                  sx={{
                    backgroundColor: '#38a14f',
                    color: '#ffffff',
                    ':hover': { backgroundColor: '#2d7f3d' },
                  }}
                >
                  {submitting ? (
                    <LoadingSpinner size={24} />
                  ) : isEditing ? (
                    'Update Scoreboard'
                  ) : (
                    'Create Scoreboard'
                  )}
                </Button>

                <Button
                  onClick={() =>
                    navigate(
                      isEditing && scoreboard
                        ? `/scoreboards/${scoreboard.id}`
                        : '/scoreboards'
                    )
                  }
                  disabled={submitting}
                  variant="outlined"
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};
