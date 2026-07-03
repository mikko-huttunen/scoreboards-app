import React, { useEffect, useState } from 'react';
import {
  Stack,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  Alert,
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import {
  type ScoreboardData,
  ScoreboardsService,
} from '../../services/ScoreboardService';
import type { Scoreboard } from '../../types/Scoreboard';
import './ScoreboardForm.css';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';

type PointCategoryFormData = {
  id?: string;
  name: string;
  color: string;
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
  >([{ name: '', color: '#38a14f' }]);

  const [errors, setErrors] = useState<{
    name?: string;
    pointCategories?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const { showErrorMessage, showSuccessMessage } = useMessageSnackbar();

  useEffect(() => {
    setName(scoreboard?.name ?? '');

    setPointCategoryForms(
      pointCategories && pointCategories.length > 0
        ? pointCategories
        : [{ name: '', color: '#38a14f' }]
    );

    setErrors({});
  }, [scoreboard, pointCategories]);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    if (errors.name) setErrors({ ...errors, name: undefined });
  };

  const handleAddPointCategory = () => {
    if (pointCategoryForms.length >= 20) return;
    setPointCategoryForms([
      ...pointCategoryForms,
      { name: '', color: '#38a14f' },
    ]);
  };

  const handleRemovePointCategory = (index: number) => {
    if (pointCategoryForms.length <= 1) return;
    const updated = pointCategoryForms.filter((_, i) => i !== index);
    setPointCategoryForms(updated);
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

  const validateForm = (): boolean => {
    const newErrors: { name?: string; pointCategories?: string } = {};

    if (!name.trim()) newErrors.name = 'Scoreboard name is required';

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const validCategories = pointCategoryForms
        .filter((cat) => cat.name.trim() && cat.color.trim())
        .map((cat) => ({
          id: cat.id,
          name: cat.name.trim(),
          color: cat.color.trim(),
        }));

      const payload: ScoreboardData = {
        name: name.trim(),
        pointCategories: validCategories,
      };

      if (isEditing && scoreboard) {
        const updated = await ScoreboardsService.updateScoreboard(
          scoreboard.id,
          payload
        );

        showSuccessMessage('Scoreboard updated');
        if (updated) {
          onSuccess
            ? onSuccess(updated)
            : navigate(`/scoreboards/${updated.id}`);
        }
      } else {
        const created = await ScoreboardsService.createScoreboard(payload);
        showSuccessMessage('Scoreboard created');
        onSuccess ? onSuccess(created) : navigate('/scoreboards');
      }
    } catch (error) {
      showErrorMessage(
        isEditing
          ? 'Failed to update scoreboard'
          : 'Failed to create scoreboard'
      );
    } finally {
      setSubmitting(false);
    }
  };

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
        <form onSubmit={handleSubmit}>
          <Stack spacing={3} sx={{ width: '100%' }}>
            <TextField
              label="Scoreboard Name"
              value={name}
              onChange={handleNameChange}
              error={!!errors.name}
              helperText={errors.name}
              required
              fullWidth
              disabled={submitting}
            />

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

              {errors.pointCategories && (
                <Alert severity="error">{errors.pointCategories}</Alert>
              )}

              <Stack spacing={2}>
                {pointCategoryForms.map((category, index) => (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{ p: { xs: 1.5, sm: 2 }, backgroundColor: '#f5f5f5' }}
                  >
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={{ xs: 1.5, sm: 2 }}
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
                      />

                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          justifyContent: {
                            xs: 'space-between',
                            sm: 'flex-start',
                          },
                        }}
                      >
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

                        <IconButton
                          onClick={() => handleRemovePointCategory(index)}
                          disabled={
                            pointCategoryForms.length <= 1 || submitting
                          }
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>

              <Button
                startIcon={<AddIcon />}
                onClick={handleAddPointCategory}
                disabled={pointCategoryForms.length >= 20 || submitting}
                size="small"
                sx={{
                  backgroundColor: '#38a14f',
                  color: '#ffffff',
                  ':hover': { backgroundColor: '#2d7f3d' },
                }}
              >
                Add Category
              </Button>

              <Typography variant="caption" sx={{ color: '#666' }}>
                {pointCategoryForms.length} of 20 categories (minimum 1
                required)
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="flex-end"
              sx={{ width: '100%' }}
            >
              <Button
                type="submit"
                variant="contained"
                disabled={
                  submitting ||
                  !name.trim() ||
                  pointCategoryForms.filter(
                    (cat) => cat.name.trim() && cat.color.trim()
                  ).length === 0 ||
                  pointCategoryForms.some(
                    (cat) => cat.color.trim() && !cat.name.trim()
                  )
                }
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
        </form>
      </Paper>
    </Box>
  );
};
