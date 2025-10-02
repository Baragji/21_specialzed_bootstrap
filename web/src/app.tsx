import React from 'react';
import ReactDOM from 'react-dom/client';
import NewTask from './pages/NewTask';
import TaskStatus from './pages/TaskStatus';

export type Route = { name: 'new' } | { name: 'status'; issueNumber: number };

function parseHash(): Route {
  const h = (globalThis.location?.hash || '').replace(/^#/, '');
  const parts = h.split('/').filter(Boolean);
  if (parts[0] === 'status' && parts[1]) {
    const n = Number(parts[1]);
    if (!Number.isNaN(n)) return { name: 'status', issueNumber: n };
  }
  return { name: 'new' };
}

export function App() {
  const [route, setRoute] = React.useState<Route>(() => parseHash());

  React.useEffect(() => {
    const onHash = () => setRoute(parseHash());
    globalThis.addEventListener('hashchange', onHash);
    return () => globalThis.removeEventListener('hashchange', onHash);
  }, []);

  const onNavigate = (path: string) => {
    globalThis.location.hash = path.replace(/^\//, '');
  };

  if (route.name === 'status') {
    return <TaskStatus issueNumber={route.issueNumber} />;
  }
  return <NewTask onNavigate={onNavigate} />;
}

// Mount only when running in browser (not in tests that import App)
if (typeof document !== 'undefined') {
  const el = document.getElementById('root');
  if (el) {
    const root = ReactDOM.createRoot(el);
    root.render(<App />);
  }
}
