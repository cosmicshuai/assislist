// components/AddFab.tsx — global Add button: choose New project or New task (MUI)
import { useState } from 'react';
import Fab from '@mui/material/Fab';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import TaskAltIcon from '@mui/icons-material/TaskAlt';

interface Props {
  onAddProject: () => void;
  onAddTask: () => void;
}

export function AddFab({ onAddProject, onAddTask }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  function choose(handler: () => void) {
    setAnchorEl(null);
    handler();
  }

  return (
    <>
      <Fab
        color="primary"
        aria-label="Add"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1000 }}
      >
        <AddIcon />
      </Fab>
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => choose(onAddProject)}>
          <ListItemIcon><FolderOpenIcon fontSize="small" /></ListItemIcon>
          <ListItemText>New project</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => choose(onAddTask)}>
          <ListItemIcon><TaskAltIcon fontSize="small" /></ListItemIcon>
          <ListItemText>New task</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
