import CircularProgress from '@mui/material/CircularProgress';

export type LoadingSpinnerProps = {
  size?: number;
  label?: string;
};

export const LoadingSpinner = ({ label, size = 40 }: LoadingSpinnerProps) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label={label}
      role="status"
    >
      <CircularProgress size={size} thickness={4} color="success" />
    </div>
  );
};
