// components/ThemeToggle.tsx — light/dark switcher
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
