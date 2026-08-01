// App.tsx — root view switch: Kanban board ↔ project detail
import { useState } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { ProjectDetail } from './components/ProjectDetail';

export default function App() {
  const [projectId, setProjectId] = useState<number | null>(null);

  return (
    <div className="mx-auto min-h-full max-w-6xl p-4 pb-16">
      {projectId === null ? (
        <KanbanBoard onOpenProject={setProjectId} />
      ) : (
        <ProjectDetail projectId={projectId} onBack={() => setProjectId(null)} />
      )}
    </div>
  );
}
