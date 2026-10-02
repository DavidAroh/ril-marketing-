export default function WorkspaceLoading() {
  return <div className="workspace-page" role="status" aria-label="Loading workspace page" aria-busy="true"><div className="skeleton-sweep h-8 w-64 max-w-full rounded-lg"/><div className="skeleton-sweep h-4 w-96 max-w-full rounded-lg"/><div className="workspace-panel p-6" aria-hidden="true">{[0,1,2,3].map(i=><div key={i} className="skeleton-sweep my-4 h-14 rounded-lg"/>)}</div><span className="sr-only">Loading your workspace…</span></div>;
}
