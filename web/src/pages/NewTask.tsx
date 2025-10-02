import React from 'react';
import { createTask } from '../api/orchestrator';
import { TaskRequest } from '../types';
import FormArray from '../components/FormArray';

export function NewTask({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [form, setForm] = React.useState<TaskRequest>({ owner: '', repo: '', title: '', objective: '' });
  const [error, setError] = React.useState<string | null>(null);
  const [issueUrl, setIssueUrl] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await createTask(form);
      setIssueUrl(res.issue_url);
      onNavigate(`/status/${res.issue_number}`);
    } catch (err: any) {
      setError(err?.message || 'failed');
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>New Task</h1>
      {error && <div role="alert">{error}</div>}
      {issueUrl && <a href={issueUrl}>Issue</a>}
      <label>Owner<input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} required /></label>
      <label>Repo<input value={form.repo} onChange={(e) => setForm({ ...form, repo: e.target.value })} required /></label>
      <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
      <label>Objective<textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} required /></label>

      <FormArray label="allowedPaths" values={form.constraints?.allowedPaths || []} onChange={(v) => setForm({ ...form, constraints: { ...(form.constraints||{}), allowedPaths: v } })} />
      <FormArray label="forbiddenPaths" values={form.constraints?.forbiddenPaths || []} onChange={(v) => setForm({ ...form, constraints: { ...(form.constraints||{}), forbiddenPaths: v } })} />
      <FormArray label="testSpec" values={form.testSpec || []} onChange={(v) => setForm({ ...form, testSpec: v })} />
      <FormArray label="acceptance" values={form.acceptance || []} onChange={(v) => setForm({ ...form, acceptance: v })} />
      <FormArray label="labels" values={form.labels || []} onChange={(v) => setForm({ ...form, labels: v })} />

      <button type="submit">Create Task</button>
    </form>
  );
}

export default NewTask;
