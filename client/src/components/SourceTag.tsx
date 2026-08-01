// components/SourceTag.tsx — "User" vs "Agent" origin tag
import { cn } from '../lib/utils';

interface Props {
  source: 'manual' | 'whatsapp';
}

export function SourceTag({ source }: Props) {
  const isAgent = source === 'whatsapp';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
        isAgent
          ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
          : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
      )}
      title={isAgent ? 'Created by the agent (WhatsApp capture)' : 'Created by you'}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', isAgent ? 'bg-violet-400' : 'bg-cyan-400')} />
      {isAgent ? 'Agent' : 'User'}
    </span>
  );
}
