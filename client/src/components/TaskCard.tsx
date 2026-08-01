// components/TaskCard.tsx — task card (MUI) with source tag, badges, blocked state
import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BlockIcon from '@mui/icons-material/Block';
import type { Task } from '../api/client';
import { formatDue } from '../lib/utils';
import { SourceTag } from './SourceTag';

interface Props {
  task: Task;
  children?: Task[];
  onToggle: (t: Task) => void;
  onDelete: (t: Task) => void;
  onAddSubtask: (parent: Task) => void;
}

export function TaskCard({ task, children = [], onToggle, onDelete, onAddSubtask }: Props) {
  const [expanded, setExpanded] = useState(false);
  const blocked = (task.blocked_by || []).filter((b) => b.status !== 'completed');
  const completed = task.status === 'completed';
  const hasChildren = children.length > 0;

  return (
      <Card variant="outlined" sx={{ opacity: completed ? 0.6 : 1, bgcolor: 'surfaceContainer', border: 0 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Tooltip title={blocked.length > 0 ? `Blocked by ${blocked[0].title}` : completed ? 'Reopen' : 'Complete'}>
            <span>
              <Checkbox
                checked={completed}
                disabled={blocked.length > 0}
                onChange={() => onToggle(task)}
                size="small"
                sx={{ p: 0.5, mt: 0.25 }}
                icon={blocked.length > 0 ? <BlockIcon fontSize="small" color="warning" /> : undefined}
              />
            </span>
          </Tooltip>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography
                variant="body1"
                sx={{ fontWeight: 500, textDecoration: completed ? 'line-through' : 'none', color: completed ? 'text.disabled' : 'text.primary' }}
              >
                {task.title}
              </Typography>
              {hasChildren && (
                <IconButton
                  size="small"
                  onClick={() => setExpanded(!expanded)}
                  sx={{
                    transform: expanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                  aria-label={expanded ? 'Collapse' : 'Expand'}
                >
                  <ExpandMoreIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>

            {task.context && !completed && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                {task.context}
              </Typography>
            )}

            <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.75 }}>
              <SourceTag source={task.source} />
              <Chip label={task.urgency} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize' }} />
              {task.priority !== task.urgency && (
                <Chip label={`${task.priority} priority`} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
              )}
              {task.dueDate && (
                <Chip label={formatDue(task.dueDate)} size="small" color="warning" variant="outlined" />
              )}
              {blocked.length > 0 && (
                <Chip
                  label={`Blocked by ${blocked[0].title}${blocked.length > 1 ? ` +${blocked.length - 1}` : ''}`}
                  size="small"
                  color="warning"
                  icon={<BlockIcon />}
                />
              )}
            </Stack>
          </Box>

          <Stack direction="row" spacing={0.25}>
            <Tooltip title="Add subtask">
              <IconButton size="small" onClick={() => onAddSubtask(task)}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => onDelete(task)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>

      {hasChildren && (
        <Collapse in={expanded}>
          <Box sx={{ pl: 4, pr: 2, pb: 1.5, borderTop: 1, borderColor: 'divider', pt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {children.map((c) => (
              <TaskCard key={c.id} task={c} onToggle={onToggle} onDelete={onDelete} onAddSubtask={onAddSubtask} />
            ))}
          </Box>
        </Collapse>
      )}
    </Card>
  );
}
