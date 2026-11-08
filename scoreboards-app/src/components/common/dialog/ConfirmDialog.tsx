import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import { LoadingSpinner } from '../spinner/LoadingSpinner.tsx';

export type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  text: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  confirmColor?: 'error' | 'warning' | 'primary' | 'secondary' | 'success';
  loading?: boolean;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  text,
  confirmLabel = 'Confirm',
  onCancel,
  onConfirm,
  confirmColor = 'error',
  loading = false,
  confirmDisabled = false,
  cancelDisabled = false,
}) => {
  const handleCancel = () => {
    onCancel();
  };

  const [typedValue, setTypedValue] = useState('');

  const requireTypingToConfirm = useMemo(() => {
    return (
      confirmLabel.trim().toLowerCase() === 'delete' ||
      confirmLabel.trim().toLowerCase() === 'remove'
    );
  }, [confirmLabel]);

  const isTypingCorrect =
    typedValue.trim().toLowerCase() === confirmLabel.trim().toLowerCase();

  useEffect(() => {
    if (!open) {
      setTypedValue('');
      return;
    }
    setTypedValue('');
  }, [open]);

  const handleConfirm = async () => {
    await onConfirm();
  };

  const confirmButtonDisabled =
    loading || confirmDisabled || (requireTypingToConfirm && !isTypingCorrect);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!loading) onCancel();
      }}
    >
      {title ? <DialogTitle>{title}</DialogTitle> : null}

      <DialogContent>
        <DialogContentText component="div">
          <Box>{text}</Box>
        </DialogContentText>

        {requireTypingToConfirm ? (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              label={`Type ${confirmLabel.trim().toLowerCase()} to confirm`}
              disabled={loading}
              autoFocus
            />
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel} disabled={cancelDisabled || loading}>
          Cancel
        </Button>

        <Button
          onClick={handleConfirm}
          variant="contained"
          color={confirmColor}
          autoFocus={!requireTypingToConfirm}
          disabled={confirmButtonDisabled}
        >
          {loading ? <LoadingSpinner size={24} /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
