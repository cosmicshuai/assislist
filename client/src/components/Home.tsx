// components/Home.tsx — curated agent suggestions: do-next + long-term impact
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Fab from '@mui/material/Fab';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { Recommendations } from '../api/client';
import { api } from '../api/client';
import { SourceTag } from './SourceTag';
import { AddTaskForm } from './AddTaskForm';
import { formatDue } from '../lib/utils';

interface Props {
  onOpenProject: (id: number) => void;
}

export function Home({ onOpenProject }: Props) {
  const [data, setData] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await api.getRecommendations());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  const next = data?.top_next || [];
  const term = data?.long_term || [];

  function Tile({ rec }: { rec: { task: Recommendations['top_next'][0]['task']; reason: string } }) {
    const { task, reason } = rec;
    const done = task.status === 'completed';
    return (
      <Card
        elevation={0}
        onClick={() => onOpenProject(task.parentId ?? task.id)}
        sx={{
          bgcolor: 'surfaceContainer',
          transition: 'transform 0.18s cubic-bezier(.2,.8,.4,1), box-shadow 0.2s, background-color 0.2s',
          '&:hover': { transform: 'translateY(-3px)', boxShadow: 8, bgcolor: 'surfaceContainerHigh' },
          opacity: done ? 0.55 : 1,
        }}
      >
        <CardActionArea>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Avatar sx={{ width: 40, height: 40, bgcolor: 'primaryContainer', color: 'onPrimaryContainer', fontSize: 20 }}>
                {task.title.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 650, lineHeight: 1.3, textDecoration: done ? 'line-through' : 'none' }}>
                  {task.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.8rem' }}>
                  {reason}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.75 }}>
              <SourceTag source={task.source} />
              <Chip label={task.urgency} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize' }} />
              {task.dueDate && !done && (
                <Chip label={formatDue(task.dueDate)} size="small" color="warning" variant="outlined" />
              )}
              {task.parentId && <Chip label="subtask" size="small" variant="outlined" />}
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>
    );
  }

  return (
    <Box>
      {showAdd && <Box sx={{ mb: 2 }}><AddTaskForm onCreated={() => { setShowAdd(false); load(); }} /></Box>}

      {/* Top things from Agents */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'tertiaryContainer', color: 'onTertiaryContainer' }}>
            <AutoAwesomeIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>Top things from Agents</Typography>
            <Typography variant="caption" color="text.secondary">
              The 3 things to do next, ranked
            </Typography>
          </Box>
        </Stack>
        {next.length === 0 ? (
          <Empty hint="Add a task and the agent will suggest what to do next." />
        ) : (
          <Stack spacing={1.5}>
            {next.map((rec, i) => (
              <Box key={rec.task.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: 'tertiaryContainer', color: 'onTertiaryContainer', fontSize: 14, fontWeight: 700 }}>
                    {i + 1}
                  </Avatar>
                  {i < next.length - 1 && <Box sx={{ width: 2, flexGrow: 1, bgcolor: 'divider' }} />}
                </Box>
                <Box sx={{ flexGrow: 1, pb: i < next.length - 1 ? 1.5 : 0 }}>
                  <Tile rec={rec} />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Things in mind */}
      <Box>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondaryContainer', color: 'onSecondaryContainer' }}>
            <LightbulbIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>Things in mind</Typography>
            <Typography variant="caption" color="text.secondary">
              The 3 projects with the most long-term impact
            </Typography>
          </Box>
        </Stack>
        {term.length === 0 ? (
          <Empty hint="Long-running projects will surface here." />
        ) : (
          <Stack spacing={1.5}>
            {term.map((rec) => (
              <Tile key={rec.task.id} rec={rec} />
            ))}
          </Stack>
        )}
      </Box>

      <Fab
        color="primary"
        aria-label="Add task"
        onClick={() => setShowAdd(true)}
        sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1000 }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}

function Empty({ hint }: { hint: string }) {
  return (
    <Card elevation={0} sx={{ bgcolor: 'surfaceContainerLow', p: 3, textAlign: 'center' }}>
      <BoltIcon sx={{ color: 'text.disabled', mb: 0.5 }} />
      <Typography variant="body2" color="text.disabled">{hint}</Typography>
    </Card>
  );
}
