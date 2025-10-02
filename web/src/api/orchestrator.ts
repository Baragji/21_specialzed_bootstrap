import type { TaskRequest, TaskStatusResponse } from '../types';

const BASE = (globalThis as any).ORCHESTRATOR_BASE || '';

function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('request timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function doFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}

export async function createTask(req: TaskRequest): Promise<{ issue_number: number; issue_url: string }> {
  const url = `${BASE}/tasks`;
  const res = await withTimeout(doFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req)
  }));
  if (res.status === 201) return res.json();
  if (res.status === 400) throw new Error('validation error');
  throw new Error(`unexpected ${res.status}`);
}

export async function getTaskStatus(id: number): Promise<TaskStatusResponse> {
  const url = `${BASE}/tasks/${id}`;
  let lastErr: any;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await withTimeout(doFetch(url));
      if (res.ok) return res.json();
      lastErr = new Error(`status ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('unknown error');
}
