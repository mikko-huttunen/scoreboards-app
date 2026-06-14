import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

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

  const handleConfirm = async () => {
    await onConfirm();
  };

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
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel} disabled={cancelDisabled || loading}>
          Cancel
        </Button>

        <Button
          onClick={handleConfirm}
          variant="contained"
          color={confirmColor}
          autoFocus
          disabled={confirmDisabled || loading}
        >
          {loading ? <CircularProgress size={24} /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
