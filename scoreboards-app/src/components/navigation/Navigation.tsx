import React, { useState, createContext, useContext } from 'react';
import {
  Drawer,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  Stack,
  Box,
} from '@mui/material';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import PersonIcon from '@mui/icons-material/Person';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../../resources/scoreboards_logo_black.png';

const DrawerContext = createContext<{
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
} | null>(null);

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width:900px)');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const drawerWidth = 220;

  return (
    <DrawerContext.Provider value={{ drawerOpen, setDrawerOpen }}>
      {isDesktop ? (
        <>
          <Drawer
            variant="persistent"
            anchor="left"
            open={drawerOpen}
            PaperProps={{
              sx: { width: drawerWidth, boxSizing: 'border-box', px: 1 },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: 2, py: 2 }}
            >
              <Box
                component="img"
                src={logo}
                alt="Scoreboards"
                onClick={() => navigate('/scoreboards')}
                sx={{
                  height: { xs: 32, sm: 40 },
                  width: 'auto',
                  cursor: 'pointer',
                  maxWidth: '100%',
                  objectFit: 'contain',
                }}
              />
            </Stack>
            <List>
              <ListItemButton
                selected={location.pathname === '/scoreboards'}
                onClick={() => navigate('/scoreboards')}
              >
                <ListItemIcon>
                  <SportsScoreIcon
                    sx={{
                      color:
                        location.pathname === '/scoreboards'
                          ? '#38a14f'
                          : undefined,
                    }}
                  />
                </ListItemIcon>
                <ListItemText primary="Scoreboards" />
              </ListItemButton>
              <ListItemButton
                selected={location.pathname === '/profile'}
                onClick={() => navigate('/profile')}
              >
                <ListItemIcon>
                  <PersonIcon
                    sx={{
                      color:
                        location.pathname === '/profile'
                          ? '#38a14f'
                          : undefined,
                    }}
                  />
                </ListItemIcon>
                <ListItemText primary="Profile" />
              </ListItemButton>
            </List>
          </Drawer>
        </>
      ) : (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#38a14f',
            zIndex: 1300,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <BottomNavigation
            showLabels
            value={location.pathname}
            sx={{
              backgroundColor: '#38a14f',
              '& .Mui-selected': { color: '#ffffff' },
              '& .MuiBottomNavigationAction-label': { color: '#ffffff' },
              '& .MuiSvgIcon-root': { color: '#ffffff' },
              width: '100%',
            }}
          >
            <BottomNavigationAction
              label="Scoreboards"
              value="/scoreboards"
              icon={<SportsScoreIcon />}
              onClick={() => navigate('/scoreboards')}
              sx={{ color: '#ffffff' }}
            />
            <BottomNavigationAction
              label="Profile"
              value="/profile"
              icon={<PersonIcon />}
              onClick={() => navigate('/profile')}
              sx={{ color: '#ffffff' }}
            />
          </BottomNavigation>
        </Paper>
      )}
    </DrawerContext.Provider>
  );
};

export const useNavigationSpacing = () => {
  const isDesktop = useMediaQuery('(min-width:900px)');
  const drawerWidth = 220;
  const drawerContext = useContext(DrawerContext);
  const drawerOpen = drawerContext?.drawerOpen ?? true;

  return {
    pl:
      isDesktop && drawerOpen
        ? `${drawerWidth + 24}px`
        : isDesktop
          ? `24px`
          : 2,
    pb: isDesktop ? 4 : 10,
    minHeight: isDesktop ? 'auto' : 'calc(100vh - 64px)', // Ensure content doesn't overlap bottom nav
    transition: 'padding-left 200ms ease',
    ml: 0,
  };
};
