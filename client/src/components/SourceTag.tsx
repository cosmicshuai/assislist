// components/SourceTag.tsx — "User" vs "Agent" origin tag (MUI Chip)
import Chip from '@mui/material/Chip';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SmartToyIcon from '@mui/icons-material/SmartToy';

interface Props {
  source: 'manual' | 'whatsapp';
}

export function SourceTag({ source }: Props) {
  const isAgent = source === 'whatsapp';
  return (
    <Chip
      size="small"
      icon={isAgent ? <SmartToyIcon /> : <PersonOutlineIcon />}
      label={isAgent ? 'Agent' : 'User'}
      color={isAgent ? 'secondary' : 'primary'}
      variant="outlined"
      title={isAgent ? 'Created by the agent (WhatsApp capture)' : 'Created by you'}
    />
  );
}
