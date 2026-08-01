// App.tsx — root view switch: Kanban board ↔ project detail
import { useState } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { ProjectDetail } from './components/ProjectDetail';
import { ThemeToggle } from './components/ThemeToggle';

export default function App() {
  const [projectId, setProjectId] = useState<number | null>(null);

  return (
    <div className="mx-auto min-h-full max-w-6xl p-4 pb-16">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400">
          Todo System
        </span>
        <ThemeToggle />
      </div>
      {projectId === null ? (
        <KanbanBoard onOpenProject={setProjectId} />
      ) : (
        <ProjectDetail projectId={projectId} onBack={() => setProjectId(null)} />
      )}
    </div>
  );
}
