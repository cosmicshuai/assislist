// components/SwipeRow.tsx — swipe left to reveal actions (mobile)
import { useRef, useState, type ReactNode } from 'react';

interface Props {
  onComplete?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export function SwipeRow({ onComplete, onDelete, disabled, children }: Props) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const startOffset = useRef(0);

  const ACTIONS_WIDTH = onComplete && onDelete ? 144 : onComplete || onDelete ? 72 : 0;

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startOffset.current = offset;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const next = Math.min(0, Math.max(-ACTIONS_WIDTH, startOffset.current + dx));
    setOffset(next);
  }

  function onTouchEnd() {
    startX.current = null;
    // snap open if more than half revealed
    setOffset(offset < -ACTIONS_WIDTH / 2 ? -ACTIONS_WIDTH : 0);
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Actions behind */}
      <div className="absolute inset-y-0 right-0 flex">
        {onComplete && (
          <button
            onClick={() => { setOffset(0); onComplete(); }}
            disabled={disabled}
            className="flex w-[72px] items-center justify-center bg-emerald-600 text-sm font-medium text-white disabled:bg-slate-700 disabled:text-slate-500"
          >
            ✓
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => { setOffset(0); onDelete(); }}
            className="flex w-[72px] items-center justify-center bg-red-600 text-sm font-medium text-white"
          >
            ✕
          </button>
        )}
      </div>
      {/* Foreground card */}
      <div
        className="relative bg-transparent transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
