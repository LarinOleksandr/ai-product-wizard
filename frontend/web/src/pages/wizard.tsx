import { FormEvent, useEffect, useMemo, useState } from "react";

const API_BASE =
  import.meta.env.VITE_ORCHESTRATOR_URL || "http://localhost:8002";

type DiscoveryDocument = {
  productSummary?: string;
  targetUsers?: string[];
  pains?: string[];
  solutionOutline?: string[];
  successMetrics?: string[];
  openQuestions?: string[];
};

type DiscoveryRecord = {
  version: number;
  timestamp?: string;
  productIdea?: string;
  targetUser?: string;
  discoveryDocument?: DiscoveryDocument;
  approved?: boolean;
  changeReason?: string;
  approvedAt?: string | null;
};

type ApiStatus = "idle" | "running" | "needs_input" | "awaiting_approval" | "approved" | "error";

const statusCopy: Record<ApiStatus, string> = {
  idle: "Idle",
  running: "Running",
  needs_input: "Waiting for missing answers",
  awaiting_approval: "Waiting for approval",
  approved: "Approved",
  error: "Error"
};

const statusColors: Record<ApiStatus, string> = {
  idle: "bg-gray-100 text-gray-800",
  running: "bg-blue-100 text-blue-800",
  needs_input: "bg-yellow-100 text-yellow-800",
  awaiting_approval: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800"
};

const emptyDocument: DiscoveryDocument = {
  targetUsers: [],
  pains: [],
  solutionOutline: [],
  successMetrics: [],
  openQuestions: []
};

export function WizardPage() {
  const [form, setForm] = useState({
    productIdea: "",
    targetUser: "",
    notes: "",
    changeReason: ""
  });
  const [status, setStatus] = useState<ApiStatus>("idle");
  const [message, setMessage] = useState("Provide inputs and run the agent.");
  const [latestRecord, setLatestRecord] = useState<DiscoveryRecord | null>(null);
  const [latestVersion, setLatestVersion] = useState<number | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);

  const notesArray = useMemo(
    () =>
      form.notes
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [form.notes]
  );

  useEffect(() => {
    refreshLatest();
  }, []);

  async function refreshLatest() {
    setLoadingLatest(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/discovery/latest`);
      if (response.status === 404) {
        setLatestRecord(null);
        setLatestVersion(null);
        setMessage("No discovery document has been generated yet.");
        setStatus("idle");
        setLoadingLatest(false);
        return;
      }
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      const payload = await response.json();
      if (payload.record) {
        setLatestRecord(payload.record);
        setLatestVersion(payload.record.version);
        setStatus(payload.status || "awaiting_approval");
        setMessage(
          payload.status === "approved"
            ? "Latest discovery document is approved."
            : "Latest discovery document is waiting for approval."
        );
      }
    } catch (err) {
      setError("Unable to load the latest discovery document.");
    } finally {
      setLoadingLatest(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("running");
    setMessage("Generating discovery document…");
    setQuestions([]);
    setError(null);

    const payload = {
      productIdea: form.productIdea.trim(),
      targetUser: form.targetUser.trim(),
      userMessages: notesArray,
      changeReason: form.changeReason.trim()
    };

    try {
      const response = await fetch(`${API_BASE}/discovery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Agent call failed.");
      }

      setStatus((data.status as ApiStatus) || "awaiting_approval");
      if (data.status === "needs_input") {
        setQuestions(data.questions || []);
        setMessage("Please answer the missing inputs.");
        return;
      }

      if (data.status === "awaiting_approval") {
        setLatestRecord({
          version: data.version,
          timestamp: data.timestamp,
          productIdea: data.productIdea,
          targetUser: data.targetUser,
          discoveryDocument: data.discoveryDocument,
          approved: data.approved,
          changeReason: data.changeReason
        });
        setLatestVersion(data.version ?? null);
        setMessage(
          data.resultType === "created"
            ? "New discovery document is ready for review."
            : "Approve the existing document to continue."
        );
      }

      if (data.status === "approved") {
        setMessage("This document is now approved.");
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Agent call failed.");
    }
  }

  async function approveLatest() {
    if (!latestVersion) {
      setError("No draft available to approve.");
      return;
    }

    setIsApproving(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/discovery/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ version: latestVersion })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Approval failed.");
      }
      if (data.status === "approved") {
        setStatus("approved");
        setMessage(`Discovery document v${data.version} approved.`);
        setLatestRecord((prev) =>
          prev
            ? {
                ...prev,
                approved: true,
                approvedAt: data.timestamp,
                discoveryDocument: data.discoveryDocument
              }
            : prev
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setIsApproving(false);
    }
  }

  const doc = latestRecord?.discoveryDocument || emptyDocument;
  const statusClass = statusColors[status] || statusColors.idle;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Discovery Wizard</h1>
          <p className="text-sm text-gray-600">
            Enter the idea, run the agent, answer missing questions, and approve the document.
          </p>
        </div>
        <button
          type="button"
          className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50"
          onClick={refreshLatest}
          disabled={loadingLatest}
        >
          {loadingLatest ? "Loading…" : "Load latest"}
        </button>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <form
          className="space-y-4 rounded-lg border bg-white p-5 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Product idea</label>
            <textarea
              className="mt-1 block w-full rounded border px-3 py-2 text-sm"
              rows={3}
              value={form.productIdea}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, productIdea: event.target.value }))
              }
              placeholder="Example: Agent that drafts the Discovery Document automatically."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Target user</label>
            <input
              className="mt-1 block w-full rounded border px-3 py-2 text-sm"
              value={form.targetUser}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, targetUser: event.target.value }))
              }
              placeholder="Example: SaaS founders who need clear specs."
              required
            />
          </div>

  <div>
    <label className="block text-sm font-medium text-gray-700">User notes</label>
    <textarea
      className="mt-1 block w-full rounded border px-3 py-2 text-sm"
      rows={4}
      value={form.notes}
      onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
      placeholder="One note per line."
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700">Change reason</label>
    <input
      className="mt-1 block w-full rounded border px-3 py-2 text-sm"
      value={form.changeReason}
      onChange={(event) =>
        setForm((prev) => ({ ...prev, changeReason: event.target.value }))
      }
      placeholder="Why do you need a new draft?"
    />
  </div>

  <div className="flex items-center gap-3">
    <button
      type="submit"
      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      disabled={status === "running"}
    >
      {status === "running" ? "Running…" : "Generate Discovery Document"}
    </button>

    <button
      type="button"
      className="rounded border px-3 py-2 text-sm disabled:opacity-60"
      onClick={() => {
        setForm({ productIdea: "", targetUser: "", notes: "", changeReason: "" });
        setQuestions([]);
      }}
      disabled={status === "running"}
    >
      Reset form
    </button>
  </div>
        </form>

        <div className="space-y-4 rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Status</p>
              <div className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
                {statusCopy[status]}
              </div>
            </div>
            {latestVersion && (
              <div className="text-right text-sm text-gray-600">
                <p>Version v{latestVersion}</p>
                <p>{latestRecord?.timestamp}</p>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-700">{message}</p>

          {questions.length > 0 && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm">
              <p className="font-medium">Missing info</p>
              <ul className="mt-2 list-disc pl-5">
                {questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2 text-sm">
            <p className="font-medium">Actions</p>
            <button
              type="button"
              className="w-full rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
              onClick={approveLatest}
              disabled={isApproving || !latestVersion || latestRecord?.approved}
            >
              {isApproving ? "Approving…" : "Approve current document"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Discovery Document</h2>
            <p className="text-sm text-gray-600">
              Review the document before granting approval.
            </p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Status: {latestRecord?.approved ? "Approved" : "Pending approval"}</p>
            {latestRecord?.changeReason && <p>Change: {latestRecord.changeReason}</p>}
          </div>
        </div>

        {latestRecord && latestRecord.discoveryDocument ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <DocSection title="Product summary" body={doc.productSummary} />
            <DocSection title="Target users" body={doc.targetUsers} />
            <DocSection title="Pains" body={doc.pains} />
            <DocSection title="Solution outline" body={doc.solutionOutline} />
            <DocSection title="Success metrics" body={doc.successMetrics} />
            <DocSection title="Open questions" body={doc.openQuestions} />
          </div>
        ) : (
          <div className="mt-6 rounded border border-dashed p-6 text-center text-sm text-gray-500">
            Run the agent to see the Discovery Document here.
          </div>
        )}
      </section>
    </div>
  );
}

type DocSectionProps = {
  title: string;
  body?: string | string[];
};

function DocSection({ title, body }: DocSectionProps) {
  if (Array.isArray(body)) {
    return (
      <div className="rounded border bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-gray-700">
          {body.length > 0 ? (
            body.map((item) => <li key={item}>{item}</li>)
          ) : (
            <li>No data yet.</li>
          )}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded border bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <p className="mt-2 text-sm text-gray-700">{body || "No data yet."}</p>
    </div>
  );
}
