import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Alert, Snackbar } from '@mui/material';

type MessageSnackbarSeverity = 'success' | 'error';

type ShowMessageOptions = {
  message: string;
  severity: MessageSnackbarSeverity;
};

type MessageSnackbarContextValue = {
  showMessage: (options: ShowMessageOptions) => void;
  showSuccessMessage: (message: string) => void;
  showErrorMessage: (message: string) => void;
};

type SnackbarState = {
  open: boolean;
  message: string;
  severity: MessageSnackbarSeverity;
};

const MessageSnackbarContext = createContext<
  MessageSnackbarContextValue | undefined
>(undefined);

export const MessageSnackbarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [snackbarState, setSnackbarState] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleClose = useCallback(() => {
    setSnackbarState((prevState) => ({
      ...prevState,
      open: false,
    }));
  }, []);

  const showMessage = useCallback(
    ({ message, severity }: ShowMessageOptions) => {
      setSnackbarState({
        open: true,
        message,
        severity,
      });
    },
    []
  );

  const showSuccessMessage = useCallback(
    (message: string) => {
      showMessage({ message, severity: 'success' });
    },
    [showMessage]
  );

  const showErrorMessage = useCallback(
    (message: string) => {
      showMessage({ message, severity: 'error' });
    },
    [showMessage]
  );

  const contextValue = useMemo<MessageSnackbarContextValue>(
    () => ({
      showMessage,
      showSuccessMessage,
      showErrorMessage,
    }),
    [showMessage, showSuccessMessage, showErrorMessage]
  );

  return (
    <MessageSnackbarContext.Provider value={contextValue}>
      {children}
      <Snackbar
        open={snackbarState.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={snackbarState.severity}
          variant="filled"
          sx={{ width: '100%', alignItems: 'center' }}
        >
          {snackbarState.message}
        </Alert>
      </Snackbar>
    </MessageSnackbarContext.Provider>
  );
};

export const useMessageSnackbar = (): MessageSnackbarContextValue => {
  const context = useContext(MessageSnackbarContext);

  if (!context) {
    throw new Error(
      'useMessageSnackbar must be used within a MessageSnackbarProvider'
    );
  }

  return context;
};
