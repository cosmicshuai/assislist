// components/BottomNav.tsx — M3 navigation bar, mobile only.
//
// M3's navigation bar marks the active destination with a filled pill behind
// the icon, not by recolouring the icon alone — the pill is what makes the
// selection legible at a glance and at small sizes. MUI's BottomNavigation
// has no such indicator, so it is drawn here as a pseudo-element that grows
// from the icon's centre.
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import HomeIcon from '@mui/icons-material/Home';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import { DURATION, EASING } from '../theme/motion';

export type View = 'home' | 'board';

interface Props {
  view: View;
  onChange: (view: View) => void;
}

/** Height of the bar itself, before safe-area padding. */
export const BOTTOM_NAV_HEIGHT = 64;

const indicatorSx = {
  '& .MuiBottomNavigationAction-label': { mt: 0.5 },
  // The pill. Sized to M3's 64x32 active indicator and centred on the icon.
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 10,
    left: '50%',
    width: 64,
    height: 32,
    borderRadius: 16,
    transform: 'translateX(-50%) scaleX(0.4)',
    bgcolor: 'secondaryContainer',
    opacity: 0,
    transition: `opacity ${DURATION.short3}ms ${EASING.standard}, transform ${DURATION.medium2}ms ${EASING.emphasizedDecelerate}`,
  },
  '&.Mui-selected::before': { opacity: 1, transform: 'translateX(-50%) scaleX(1)' },
};

export function BottomNav({ view, onChange }: Props) {
  return (
    <Paper
      elevation={0}
      square
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (t) => t.zIndex.appBar,
        borderTop: 1,
        borderColor: 'divider',
        // Keep the bar clear of the iOS home indicator.
        pb: 'env(safe-area-inset-bottom, 0px)',
        display: { xs: 'block', sm: 'none' },
      }}
    >
      <BottomNavigation
        value={view}
        onChange={(_, v) => v && onChange(v as View)}
        showLabels
      >
        <BottomNavigationAction
          value="home"
          label="Home"
          icon={view === 'home' ? <HomeIcon /> : <HomeOutlinedIcon />}
          sx={indicatorSx}
        />
        <BottomNavigationAction
          value="board"
          label="Board"
          icon={view === 'board' ? <DashboardIcon /> : <DashboardOutlinedIcon />}
          sx={indicatorSx}
        />
      </BottomNavigation>
    </Paper>
  );
}
