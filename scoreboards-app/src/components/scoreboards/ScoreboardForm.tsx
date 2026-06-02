import React, { useState, useEffect } from 'react';
import {
  Stack,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { ScoreboardsService } from '../../services/ScoreboardService';
import { PointCategoryService } from '../../services/PointCategoryService';
import type { Scoreboard } from '../../types/Scoreboard';
import './ScoreboardForm.css';

type PointCategoryFormData = {
  id?: string; // ID if it's an existing category
  name: string;
  color: string;
};

type ScoreboardFormProps = {
  scoreboardId?: string;
  initialName?: string;
  onSuccess?: (scoreboard: Scoreboard) => void;
};

export const ScoreboardForm: React.FC<ScoreboardFormProps> = ({
  scoreboardId,
  initialName = '',
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const isEditing = !!scoreboardId;

  const [name, setName] = useState(initialName);
  const [pointCategories, setPointCategories] = useState<
    PointCategoryFormData[]
  >([{ name: '', color: '#38a14f' }]);
  const [errors, setErrors] = useState<{
    name?: string;
    pointCategories?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    if (isEditing && scoreboardId) {
      const loadScoreboard = async () => {
        try {
          setLoading(true);
          const token = await getAccessTokenSilently();
          const [scoreboard, categories] = await Promise.all([
            ScoreboardsService.getScoreboardById(scoreboardId, token),
            PointCategoryService.getPointCategoriesByScoreboard(
              scoreboardId,
              token
            ),
          ]);
          if (scoreboard) {
            setName(scoreboard.name);
            // Load existing point categories
            if (categories && categories.length > 0) {
              setPointCategories(
                categories.map((cat) => ({
                  id: cat.id,
                  name: cat.name,
                  color: cat.color,
                }))
              );
            } else {
              // If no categories exist, start with one empty category
              setPointCategories([{ name: '', color: '#38a14f' }]);
            }
          }
        } catch (error) {
          console.error('Error loading scoreboard:', error);
          setSubmitError('Failed to load scoreboard');
        } finally {
          setLoading(false);
        }
      };
      loadScoreboard();
    }
  }, [scoreboardId, isEditing, getAccessTokenSilently]);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    if (errors.name) {
      setErrors({ ...errors, name: undefined });
    }
  };

  const handleAddPointCategory = () => {
    if (pointCategories.length >= 20) {
      return;
    }
    setPointCategories([...pointCategories, { name: '', color: '#38a14f' }]);
  };

  const handleRemovePointCategory = (index: number) => {
    if (pointCategories.length <= 1) {
      return;
    }
    const updated = pointCategories.filter((_, i) => i !== index);
    setPointCategories(updated);
    if (errors.pointCategories) {
      setErrors({ ...errors, pointCategories: undefined });
    }
  };

  const handlePointCategoryChange = (
    index: number,
    field: keyof PointCategoryFormData,
    value: string
  ) => {
    const updated = [...pointCategories];
    updated[index] = { ...updated[index], [field]: value };
    setPointCategories(updated);
    if (errors.pointCategories) {
      setErrors({ ...errors, pointCategories: undefined });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string; pointCategories?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Scoreboard name is required';
    }

    const validCategories = pointCategories.filter(
      (cat) => cat.name.trim() && cat.color.trim()
    );

    if (validCategories.length === 0) {
      newErrors.pointCategories =
        'At least one point category with a name and color is required';
    }

    const invalidCategories = pointCategories.filter(
      (cat) =>
        (cat.name.trim() && !cat.color.trim()) ||
        (!cat.name.trim() && cat.color.trim())
    );

    if (invalidCategories.length > 0) {
      newErrors.pointCategories =
        'All point categories must have both a name and color';
    }

    // Check if any category is missing a name
    const categoriesMissingName = pointCategories.filter(
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
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const token = await getAccessTokenSilently();

      if (isEditing && scoreboardId) {
        // Update existing scoreboard
        const updated = await ScoreboardsService.updateScoreboard(
          scoreboardId,
          { name: name.trim() },
          token
        );
        if (updated) {
          if (onSuccess) {
            onSuccess(updated);
          } else {
            navigate(`/scoreboards/${scoreboardId}`);
          }
        }
      } else {
        // Create new scoreboard
        // Filter out empty categories
        const validCategories = pointCategories
          .filter((cat) => cat.name.trim() && cat.color.trim())
          .map((cat) => ({
            name: cat.name.trim(),
            color: cat.color.trim(),
          }));

        const createdScoreboard = await ScoreboardsService.createScoreboard(
          name.trim(),
          validCategories,
          token
        );

        if (onSuccess) {
          onSuccess(createdScoreboard);
        } else {
          navigate(`/scoreboards/${createdScoreboard.id}`);
        }
      }
    } catch (error) {
      console.error(
        `Error ${isEditing ? 'updating' : 'creating'} scoreboard:`,
        error
      );
      setSubmitError(
        error instanceof Error
          ? error.message
          : `Failed to ${isEditing ? 'update' : 'create'} scoreboard. Please try again.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

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
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddPointCategory}
                  disabled={pointCategories.length >= 20 || submitting}
                  size="small"
                  sx={{
                    backgroundColor: '#38a14f',
                    color: '#ffffff',
                    ':hover': { backgroundColor: '#2d7f3d' },
                  }}
                >
                  Add Category
                </Button>
              </Stack>

              {errors.pointCategories && (
                <Alert severity="error">{errors.pointCategories}</Alert>
              )}

              <Stack spacing={2}>
                {pointCategories.map((category, index) => (
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
                          disabled={pointCategories.length <= 1 || submitting}
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

              <Typography variant="caption" sx={{ color: '#666' }}>
                {pointCategories.length} of 20 categories (minimum 1 required)
              </Typography>
            </Stack>

            {submitError && <Alert severity="error">{submitError}</Alert>}

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="flex-end"
              sx={{ width: '100%' }}
            >
              <Button
                onClick={() => navigate('/scoreboards')}
                disabled={submitting}
                variant="outlined"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={
                  submitting ||
                  !name.trim() ||
                  pointCategories.filter(
                    (cat) => cat.name.trim() && cat.color.trim()
                  ).length === 0 ||
                  pointCategories.some(
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
                  <CircularProgress size={24} sx={{ color: '#ffffff' }} />
                ) : isEditing ? (
                  'Update Scoreboard'
                ) : (
                  'Create Scoreboard'
                )}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};
