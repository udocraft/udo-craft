"use client";

import * as React from "react";

type Definition = {
  id: string;
  slug: string;
  name: string;
  description: string;
  model: "opus" | "sonnet" | "haiku";
  system_prompt: string;
  allowed_tools: string[];
  is_active: boolean;
  version: number;
};

type Job = {
  id: string;
  definition_id: string | null;
  prompt: string;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  result: string | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};

const EMPTY_DEF = {
  slug: "",
  name: "",
  description: "",
  model: "sonnet" as Definition["model"],
  system_prompt: "",
  allowed_tools: ["Read", "Grep", "Glob"],
  is_active: true,
};

const STATUS_STYLE: Record<Job["status"], string> = {
  queued: "bg-zinc-100 text-zinc-700",
  running: "bg-blue-100 text-blue-800",
  done: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-zinc-200 text-zinc-600",
};

export default function AgentsPage() {
  const [defs, setDefs] = React.useState<Definition[]>([]);
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [editingId, setEditingId] = React.useState<string | "new" | null>(null);
  const [form, setForm] = React.useState<typeof EMPTY_DEF>(EMPTY_DEF);
  const [jobDefId, setJobDefId] = React.useState<string>("");
  const [jobPrompt, setJobPrompt] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/agents", { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load agents");
      return;
    }
    const data = await res.json();
    setDefs(data.definitions ?? []);
    setJobs(data.jobs ?? []);
  }, []);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  function startEdit(d: Definition | "new") {
    setError(null);
    if (d === "new") {
      setForm(EMPTY_DEF);
      setEditingId("new");
    } else {
      setForm({
        slug: d.slug,
        name: d.name,
        description: d.description,
        model: d.model,
        system_prompt: d.system_prompt,
        allowed_tools: d.allowed_tools,
        is_active: d.is_active,
      });
      setEditingId(d.id);
    }
  }

  async function saveDefinition(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const isNew = editingId === "new";
    const res = await fetch(isNew ? "/api/agents" : `/api/agents?id=${editingId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isNew ? { kind: "definition", ...form } : form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }
    setEditingId(null);
    load();
  }

  async function queueJob(e: React.FormEvent) {
    e.preventDefault();
    if (!jobPrompt.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "job",
        definition_id: jobDefId || null,
        prompt: jobPrompt,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not queue job");
      return;
    }
    setJobPrompt("");
    load();
  }

  const input = "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm";
  const label = "block text-xs font-medium text-zinc-600 mb-1";

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Агенти</h1>
        <p className="text-sm text-zinc-600">
          Задачі виконує локальний worker. Лише читання: Read, Grep, Glob. Без shell, запису та мережі.
        </p>
      </header>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Визначення</h2>
          <button
            type="button"
            onClick={() => startEdit("new")}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white"
          >
            Новий агент
          </button>
        </div>

        <ul className="divide-y rounded-md border">
          {defs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 p-3">
              <div>
                <p className="font-medium">
                  {d.name} <span className="text-xs text-zinc-500">v{d.version} · {d.model}</span>
                </p>
                <p className="text-xs text-zinc-600">{d.description || d.slug}</p>
              </div>
              <button type="button" onClick={() => startEdit(d)} className="text-sm underline">
                Редагувати
              </button>
            </li>
          ))}
          {defs.length === 0 && <li className="p-3 text-sm text-zinc-500">Ще немає агентів.</li>}
        </ul>

        {editingId && (
          <form onSubmit={saveDefinition} className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
            <div>
              <label className={label}>Назва</label>
              <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className={label}>Slug (a-z, 0-9, -)</label>
              <input className={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Опис</label>
              <input className={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className={label}>Модель</label>
              <select className={input} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value as typeof form.model })}>
                <option value="opus">opus (план, рев'ю)</option>
                <option value="sonnet">sonnet (код, дизайн)</option>
                <option value="haiku">haiku (швидкі задачі)</option>
              </select>
            </div>
            <div>
              <label className={label}>Інструменти (лише читання)</label>
              <p className="py-2 text-sm text-zinc-600">Read, Grep, Glob. Інші інструменти заборонено.</p>
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Системний промпт</label>
              <textarea className={`${input} min-h-40 font-mono`} value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Активний
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button disabled={busy} className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">
                Зберегти
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="rounded-md border px-3 py-1.5 text-sm">
                Скасувати
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Поставити задачу в чергу</h2>
        <form onSubmit={queueJob} className="space-y-2 rounded-md border p-4">
          <select className={input} value={jobDefId} onChange={(e) => setJobDefId(e.target.value)}>
            <option value="">Без агента (sonnet, лише читання)</option>
            {defs.filter((d) => d.is_active).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <textarea
            className={`${input} min-h-24`}
            placeholder="Що зробити (наприклад: знайди всі місця з text-[10px])"
            value={jobPrompt}
            onChange={(e) => setJobPrompt(e.target.value)}
            maxLength={8000}
          />
          <button disabled={busy || !jobPrompt.trim()} className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">
            У чергу
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Останні задачі</h2>
        <ul className="divide-y rounded-md border">
          {jobs.map((j) => (
            <li key={j.id} className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm">{j.prompt}</p>
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${STATUS_STYLE[j.status]}`}>{j.status}</span>
              </div>
              {(j.result || j.error) && (
                <details>
                  <summary className="cursor-pointer text-xs text-zinc-600">Результат</summary>
                  <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-3 text-xs">
                    {j.error ?? j.result}
                  </pre>
                </details>
              )}
            </li>
          ))}
          {jobs.length === 0 && <li className="p-3 text-sm text-zinc-500">Черга порожня.</li>}
        </ul>
      </section>
    </div>
  );
}
