// components/AddTaskForm.tsx — quick add task (MUI)
import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import { api } from '../api/client';

interface Props {
  onCreated: () => void;
  parentId?: number | null;
}

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export function AddTaskForm({ onCreated, parentId = null }: Props) {
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createTask({
        title: title.trim(),
        context: context.trim(),
        priority,
        parentId,
      });
      setTitle('');
      setContext('');
      setPriority('medium');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box component="form" onSubmit={submit} noValidate>
        <Stack spacing={1.5}>
          <TextField
            size="small"
            fullWidth
            label="Task title"
            placeholder="e.g. Plan Italy trip"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <TextField
            size="small"
            fullWidth
            label="Context (optional)"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            multiline
            minRows={1}
            maxRows={3}
          />
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <TextField
              select
              size="small"
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              sx={{ minWidth: 140 }}
            >
              {PRIORITIES.map((p) => (
                <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>
              ))}
            </TextField>
            <Button type="submit" variant="contained" disabled={submitting || !title.trim()}>
              {submitting ? 'Adding…' : 'Add'}
            </Button>
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </Box>
    </Paper>
  );
}
