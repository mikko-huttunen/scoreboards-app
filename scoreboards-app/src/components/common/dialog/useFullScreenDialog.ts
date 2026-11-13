import { useMediaQuery, useTheme } from '@mui/material';

/**
 * Modals take over the whole screen on phones, where a windowed dialog leaves too little room,
 * and stay windowed from tablets up. Shared so every dialog breaks at the same width.
 */
export const useFullScreenDialog = (): boolean => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
};
