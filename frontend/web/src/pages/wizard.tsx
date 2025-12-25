import { FormEvent, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "../components/ui/button";
import discoveryDocumentIcon from "../assets/discovery-document.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "../components/ui/accordion";

const API_BASE =
  import.meta.env.VITE_ORCHESTRATOR_URL || "http://localhost:8002";

type UserGroup = {
  name: string;
  characteristics: string[];
};

type TargetSegment = {
  segment_name: string;
  business_relevance: string;
  user_groups: UserGroup[];
};

type PainPoint = {
  name: string;
  description: string;
  affected_user_groups: string[];
  severity: "low" | "medium" | "high";
  frequency: "low" | "medium" | "high";
  business_importance: "low" | "medium" | "high";
};

type PainPointTheme = {
  theme_name: string;
  pain_points: PainPoint[];
};

type DiscoveryDocument = {
  problemUnderstanding?: {
    problemStatement?: string;
    targetUsersSegments?: {
      target_segments?: TargetSegment[];
    };
    userPainPoints?: {
      pain_point_themes?: PainPointTheme[];
    };
    contextConstraints?: string[];
  };
  marketAndCompetitorAnalysis?: {
    marketLandscape?: string[];
    competitorInventory?: string[];
    competitorCapabilities?: string[];
    gapsOpportunities?: string[];
  };
  opportunityDefinition?: {
    opportunityStatement?: string;
    valueDrivers?: string[];
    marketFitHypothesis?: string[];
    feasibilityAssessment?: string[];
  };
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
  fieldStatus?: Record<string, { approved: boolean; approvedAt?: string | null }>;
  currentFieldKey?: string | null;
  lastPrompt?: string | null;
  lastPromptFieldKey?: string | null;
  lastOutput?: string | null;
  lastOutputFieldKey?: string | null;
};

type ApiStatus = "idle" | "running" | "needs_input" | "in_progress" | "approved" | "error";

const statusCopy: Record<ApiStatus, string> = {
  idle: "Idle",
  running: "Running",
  needs_input: "Waiting for missing answers",
  in_progress: "In progress",
  approved: "Approved",
  error: "Error"
};

const statusColors: Record<ApiStatus, string> = {
  idle: "bg-gray-100 text-gray-800",
  running: "bg-blue-100 text-blue-800",
  needs_input: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800"
};

const emptyDocument: DiscoveryDocument = {
  problemUnderstanding: {
    targetUsersSegments: {
      target_segments: []
    },
    userPainPoints: {
      pain_point_themes: []
    },
    contextConstraints: []
  },
  marketAndCompetitorAnalysis: {
    marketLandscape: [],
    competitorInventory: [],
    competitorCapabilities: [],
    gapsOpportunities: []
  },
  opportunityDefinition: {
    valueDrivers: [],
    marketFitHypothesis: [],
    feasibilityAssessment: []
  }
};

type FieldDefinition = {
  key: string;
  label: string;
  type: "string" | "array" | "object";
  group: string;
  outputKey?: string;
};

const fieldDefinitions: FieldDefinition[] = [
  {
    key: "problemUnderstanding.problemStatement",
    label: "Problem Statement",
    type: "string",
    group: "Problem Understanding"
  },
  {
    key: "problemUnderstanding.targetUsersSegments",
    label: "Target Users & Segments",
    type: "object",
    group: "Problem Understanding",
    outputKey: "target_segments"
  },
  {
    key: "problemUnderstanding.userPainPoints",
    label: "User Pain Points",
    type: "object",
    group: "Problem Understanding",
    outputKey: "pain_point_themes"
  },
  {
    key: "problemUnderstanding.contextConstraints",
    label: "Context & Constraints",
    type: "array",
    group: "Problem Understanding"
  },
  {
    key: "marketAndCompetitorAnalysis.marketLandscape",
    label: "Market Landscape",
    type: "array",
    group: "Market and Competitor Analysis"
  },
  {
    key: "marketAndCompetitorAnalysis.competitorInventory",
    label: "Competitor Inventory",
    type: "array",
    group: "Market and Competitor Analysis"
  },
  {
    key: "marketAndCompetitorAnalysis.competitorCapabilities",
    label: "Competitor Capabilities",
    type: "array",
    group: "Market and Competitor Analysis"
  },
  {
    key: "marketAndCompetitorAnalysis.gapsOpportunities",
    label: "Gaps & Opportunities",
    type: "array",
    group: "Market and Competitor Analysis"
  },
  {
    key: "opportunityDefinition.opportunityStatement",
    label: "Opportunity Statement",
    type: "string",
    group: "Opportunity Definition"
  },
  {
    key: "opportunityDefinition.valueDrivers",
    label: "Value Drivers",
    type: "array",
    group: "Opportunity Definition"
  },
  {
    key: "opportunityDefinition.marketFitHypothesis",
    label: "Market Fit Hypothesis",
    type: "array",
    group: "Opportunity Definition"
  },
  {
    key: "opportunityDefinition.feasibilityAssessment",
    label: "Feasibility Assessment",
    type: "array",
    group: "Opportunity Definition"
  }
];

const groupedFields = fieldDefinitions.reduce<Record<string, FieldDefinition[]>>(
  (acc, field) => {
    acc[field.group] = acc[field.group] || [];
    acc[field.group].push(field);
    return acc;
  },
  {}
);
const fieldGroupMap = fieldDefinitions.reduce<Record<string, string>>((acc, field) => {
  acc[field.key] = field.group;
  return acc;
}, {});
const initialOpenFieldsByGroup = Object.entries(groupedFields).reduce<
  Record<string, string[]>
>((acc, [groupName]) => {
  acc[groupName] = [];
  return acc;
}, {});

function getNestedValue(document: DiscoveryDocument, key: string) {
  const parts = key.split(".");
  let current: any = document;
  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function toFieldString(value: unknown, type: "string" | "array") {
  if (type === "array") {
    return Array.isArray(value) ? value.join("\n") : "";
  }
  return typeof value === "string" ? value : "";
}

function fromFieldString(value: string, type: "string" | "array") {
  if (type === "array") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return value.trim();
}

function getFieldDisplayKey(field: FieldDefinition) {
  return field.outputKey || field.key.split(".").pop() || field.key;
}

export function WizardPage() {
  const [form, setForm] = useState({
    productIdea: "",
    targetUser: "",
    notes: ""
  });
  const [status, setStatus] = useState<ApiStatus>("idle");
  const [message, setMessage] = useState("Provide inputs and run the agent.");
  const [latestRecord, setLatestRecord] = useState<DiscoveryRecord | null>(null);
  const [latestVersion, setLatestVersion] = useState<number | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugPrompt, setDebugPrompt] = useState<string | null>(null);
  const [debugOutput, setDebugOutput] = useState<string | null>(null);
  const [draftFields, setDraftFields] = useState<
    Record<string, string | TargetSegment[] | PainPointTheme[]>
  >({});
  const [approvingFieldKey, setApprovingFieldKey] = useState<string | null>(null);
  const [regeneratingFieldKey, setRegeneratingFieldKey] = useState<string | null>(null);
  const [confirmRegenerateFieldKey, setConfirmRegenerateFieldKey] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [clearingFieldKey, setClearingFieldKey] = useState<string | null>(null);
  const [confirmClearFieldKey, setConfirmClearFieldKey] = useState<string | null>(null);
  const [confirmClearDocument, setConfirmClearDocument] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [openGroups, setOpenGroups] = useState<string[]>(
    Object.keys(groupedFields)
  );
  const [openFieldsByGroup, setOpenFieldsByGroup] = useState<
    Record<string, string[]>
  >(initialOpenFieldsByGroup);

  const notesArray = useMemo(
    () =>
      form.notes
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [form.notes]
  );
  const currentField = latestRecord?.currentFieldKey
    ? fieldDefinitions.find((field) => field.key === latestRecord.currentFieldKey)
    : undefined;
  const currentFieldName = currentField?.key.split(".").pop();
  const currentOutputValue = (() => {
    if (!currentField) {
      return null;
    }
    if (currentField.type === "object") {
      const items = draftFields[currentField.key];
      return Array.isArray(items) ? items : null;
    }
    const rawValue = draftFields[currentField.key];
    const textValue = typeof rawValue === "string" ? rawValue : "";
    return fromFieldString(textValue, currentField.type);
  })();
  const currentOutputKey = currentField ? getFieldDisplayKey(currentField) : "";
  const currentOutputJson =
    currentOutputKey && currentOutputValue !== null
      ? JSON.stringify({ [currentOutputKey]: currentOutputValue }, null, 2)
      : "";
  const inputSummary = useMemo(() => {
    const base = {
      productIdea: form.productIdea.trim(),
      targetUser: form.targetUser.trim(),
      userNotes: notesArray
    };
    if (!latestRecord) {
      return JSON.stringify(base, null, 2);
    }
    const previousOutputs: Record<string, unknown> = {};
    fieldDefinitions.forEach((field) => {
      const statusInfo = latestRecord.fieldStatus?.[field.key];
      if (statusInfo?.approved) {
        const fieldName = getFieldDisplayKey(field);
        if (field.type === "object") {
          const items = draftFields[field.key];
          previousOutputs[fieldName] = Array.isArray(items) ? items : [];
        } else {
          const rawValue = draftFields[field.key];
          const textValue = typeof rawValue === "string" ? rawValue : "";
          previousOutputs[fieldName] = fromFieldString(textValue, field.type);
        }
      }
    });
    return JSON.stringify({ ...base, ...previousOutputs }, null, 2);
  }, [draftFields, fieldDefinitions, form.productIdea, form.targetUser, latestRecord, notesArray]);

  useEffect(() => {
    void refreshLatest(true);
  }, []);

  function loadSavedInputs() {
    const savedIdea = localStorage.getItem("discoveryWizard.productIdea") || "";
    const savedTarget = localStorage.getItem("discoveryWizard.targetUser") || "";
    setForm((prev) => ({
      ...prev,
      productIdea: savedIdea,
      targetUser: savedTarget,
      notes: prev.notes
    }));
    setLatestRecord(null);
    setLatestVersion(null);
    setStatus("idle");
    setMessage("Enter the required fields and generate the first draft.");
    setDraftFields({});
    setDebugPrompt(null);
    setDebugOutput(null);
  }

  useEffect(() => {
    if (!latestRecord?.discoveryDocument) {
      setProgressText("");
      return;
    }
    const nextDrafts: Record<string, string | TargetSegment[] | PainPointTheme[]> = {};
    let approvedCount = 0;
    fieldDefinitions.forEach((field) => {
      const statusInfo = latestRecord.fieldStatus?.[field.key];
      const isApproved = statusInfo?.approved ?? false;
      const isCurrent = latestRecord.currentFieldKey === field.key;
      const shouldShow = isApproved || isCurrent;
      const value = shouldShow
        ? getNestedValue(latestRecord.discoveryDocument || emptyDocument, field.key)
        : "";
      if (field.type === "object") {
        const outputKey = field.outputKey || "";
        const collection =
          outputKey && typeof value === "object" && value !== null
            ? (value as Record<string, unknown>)[outputKey]
            : undefined;
        nextDrafts[field.key] = Array.isArray(collection) ? collection : [];
      } else {
        nextDrafts[field.key] = toFieldString(value, field.type);
      }
      if (isApproved) {
        approvedCount += 1;
      }
    });
    setDraftFields(nextDrafts);
    const total = fieldDefinitions.length;
    const currentIndex = latestRecord.currentFieldKey
      ? fieldDefinitions.findIndex((field) => field.key === latestRecord.currentFieldKey)
      : total;
    const stepNumber = currentIndex >= 0 ? Math.min(currentIndex + 1, total) : total;
    setProgressText(`Step ${stepNumber} of ${total} approved (${approvedCount}/${total}).`);
  }, [latestRecord]);

  const withSupabaseMessage = (text: string, saved?: boolean) =>
    saved ? `${text} Saved to Supabase.` : text;
  const isEmptyDocumentView =
    !latestRecord || latestRecord.changeReason === "Cleared document";

  useEffect(() => {
    if (isEmptyDocumentView) {
      setOpenGroups(Object.keys(groupedFields));
      setOpenFieldsByGroup(initialOpenFieldsByGroup);
    }
  }, [isEmptyDocumentView]);

  useEffect(() => {
    const currentFieldKey = latestRecord?.currentFieldKey;
    if (!currentFieldKey) {
      return;
    }
    const groupName = fieldGroupMap[currentFieldKey];
    if (!groupName) {
      return;
    }
    setOpenGroups((prev) =>
      prev.includes(groupName) ? prev : prev.concat(groupName)
    );
    setOpenFieldsByGroup((prev) => {
      const currentOpen = prev[groupName] || [];
      if (currentOpen.includes(currentFieldKey)) {
        return prev;
      }
      return {
        ...prev,
        [groupName]: currentOpen.concat(currentFieldKey)
      };
    });
  }, [latestRecord?.currentFieldKey]);

  async function postWithRetry<T>(
    url: string,
    body: Record<string, unknown>,
    onRetry: () => void
  ): Promise<T> {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (response.ok) {
        return data as T;
      }
      lastError = data;
      const message = data?.message || "Request failed.";
      if (message.includes("LLM output invalid") && attempt === 0) {
        onRetry();
        continue;
      }
      throw Object.assign(new Error(message), { data });
    }
    throw Object.assign(new Error("Request failed."), { data: lastError });
  }

  async function refreshLatest(useFallback = false) {
    setLoadingLatest(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/discovery/latest`);
      if (response.status === 404) {
        if (useFallback) {
          loadSavedInputs();
        } else {
          setLatestRecord(null);
          setLatestVersion(null);
          setMessage("No discovery document has been generated yet.");
          setStatus("idle");
          setDraftFields({});
          setDebugPrompt(null);
          setDebugOutput(null);
        }
        return;
      }
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      const payload = await response.json();
      if (payload.record) {
        setLatestRecord(payload.record);
        setLatestVersion(payload.record.version);
        setDebugPrompt(payload.record.lastPrompt ?? null);
        setDebugOutput(payload.record.lastOutput ?? null);
        setForm({
          productIdea: payload.record.productIdea || "",
          targetUser: payload.record.targetUser || "",
          notes: Array.isArray(payload.record.userMessages)
            ? payload.record.userMessages.join("\n")
            : ""
        });
        if (payload.record.productIdea) {
          localStorage.setItem("discoveryWizard.productIdea", payload.record.productIdea);
        }
        if (payload.record.targetUser) {
          localStorage.setItem("discoveryWizard.targetUser", payload.record.targetUser);
        }
        setStatus(payload.status || "in_progress");
        setMessage(
          payload.status === "approved"
            ? "Latest discovery document is approved."
            : "Latest discovery document is in progress."
        );
      }
    } catch (err) {
      setError("Unable to load the latest discovery document.");
      if (useFallback) {
        loadSavedInputs();
      }
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
        forceNew: true
      };

    try {
      const data = await postWithRetry(
        `${API_BASE}/discovery`,
        payload,
        () => {
          setMessage("Error LLM response. Requesting again...");
        }
      );

      setStatus((data.status as ApiStatus) || "in_progress");
      if (data.status === "needs_input") {
        setQuestions(data.questions || []);
        setMessage("Please answer the missing inputs.");
        return;
      }

      if (data.status === "in_progress" && data.record) {
        setLatestRecord(data.record);
        setLatestVersion(data.record.version ?? null);
        setDebugPrompt(data.record.lastPrompt ?? null);
        setDebugOutput(data.record.lastOutput ?? null);
        setMessage(
          withSupabaseMessage(
            data.resultType === "created"
              ? "New discovery document started. Approve each field in order."
              : "Continue approving fields in order.",
            data.savedToSupabase
          )
        );
      }

      if (data.status === "approved") {
        setMessage(withSupabaseMessage("This document is now approved.", data.savedToSupabase));
      }
    } catch (err) {
      setStatus("error");
      if (err?.data?.lastPrompt) {
        setDebugPrompt(err.data.lastPrompt);
      }
      if (typeof err?.data?.lastOutput === "string") {
        setDebugOutput(err.data.lastOutput);
      }
      setError(err instanceof Error ? err.message : "Agent call failed.");
    }
  }

  async function approveField(fieldKey: string, fieldType: "string" | "array" | "object") {
    if (!latestVersion) {
      setError("No draft available to approve.");
      return;
    }

    setApprovingFieldKey(fieldKey);
    setError(null);

    try {
      const rawValue = draftFields[fieldKey];
      let value: unknown;
      if (fieldType === "object") {
        const field = fieldDefinitions.find((item) => item.key === fieldKey);
        const outputKey = field?.outputKey;
        if (Array.isArray(rawValue) && outputKey) {
          value = { [outputKey]: rawValue };
        } else {
          value = rawValue;
        }
      } else {
        const textValue = typeof rawValue === "string" ? rawValue : "";
        value = fromFieldString(textValue, fieldType);
      }
      const data = await postWithRetry(
        `${API_BASE}/discovery/field/approve`,
        { version: latestVersion, fieldKey, value },
        () => {
          setMessage("Error LLM response. Requesting again...");
        }
      );
      if (data.record) {
        setLatestRecord(data.record);
        setStatus(data.status || "in_progress");
        setDebugPrompt(data.record.lastPrompt ?? null);
        setDebugOutput(data.record.lastOutput ?? null);
        setMessage(
          withSupabaseMessage(
            data.status === "approved"
              ? "All fields approved. Discovery document is complete."
              : "Field approved. Next field is ready.",
            data.savedToSupabase
          )
        );
      }
    } catch (err) {
      setStatus("error");
      if (err?.data?.lastPrompt) {
        setDebugPrompt(err.data.lastPrompt);
      }
      if (typeof err?.data?.lastOutput === "string") {
        setDebugOutput(err.data.lastOutput);
      }
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setApprovingFieldKey(null);
    }
  }

  async function clearDocument() {
    if (!latestVersion) {
      setError("No document to clear.");
      return;
    }
    setConfirmClearDocument(true);
  }

  async function regenerateField(fieldKey: string) {
    if (!latestVersion) {
      setError("No draft available to regenerate.");
      return;
    }
    const hasLaterGenerated = hasGeneratedLaterFields(fieldKey);
    if (hasLaterGenerated) {
      setConfirmRegenerateFieldKey(fieldKey);
      return;
    }
    await executeRegenerate(fieldKey);
  }

  async function clearField(fieldKey: string) {
    if (!latestVersion) {
      setError("No draft available to clear.");
      return;
    }
    setConfirmClearFieldKey(fieldKey);
  }

  async function confirmClearField(fieldKey: string) {
    setClearingFieldKey(fieldKey);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/discovery/field/clear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ version: latestVersion, fieldKey })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Clear failed.");
      }
      if (data.record) {
        setLatestRecord(data.record);
        setStatus("in_progress");
        setDebugPrompt(data.record.lastPrompt ?? null);
        setDebugOutput(data.record.lastOutput ?? null);
        setMessage("Block cleared.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear failed.");
    } finally {
      setClearingFieldKey(null);
    }
  }

  async function confirmClearDocumentAction() {
    setIsClearing(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/discovery/clear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ version: latestVersion })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Clear failed.");
      }
      if (data.record) {
        setLatestRecord(data.record);
        setStatus("in_progress");
        setDebugPrompt(data.record.lastPrompt ?? null);
        setDebugOutput(data.record.lastOutput ?? null);
        setMessage("Document cleared.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear failed.");
    } finally {
      setIsClearing(false);
    }
  }

  function hasGeneratedLaterFields(fieldKey: string) {
    if (!latestRecord?.fieldOrder?.length) {
      return false;
    }
    const index = latestRecord.fieldOrder.indexOf(fieldKey);
    if (index < 0) {
      return false;
    }
    return latestRecord.fieldOrder.slice(index + 1).some((key) => {
      const statusInfo = latestRecord?.fieldStatus?.[key];
      if (statusInfo?.approved) {
        return true;
      }
      const rawValue = draftFields[key];
      if (Array.isArray(rawValue)) {
        return rawValue.length > 0;
      }
      return typeof rawValue === "string" && rawValue.trim().length > 0;
    });
  }

  async function executeRegenerate(fieldKey: string) {
    if (!latestVersion) {
      setError("No draft available to regenerate.");
      return;
    }

    setRegeneratingFieldKey(fieldKey);
    setError(null);

    try {
      const data = await postWithRetry(
        `${API_BASE}/discovery/field/regenerate`,
        { version: latestVersion, fieldKey },
        () => {
          setMessage("Error LLM response. Requesting again...");
        }
      );
      if (data.record) {
        setLatestRecord(data.record);
        setStatus("in_progress");
        setDebugPrompt(data.record.lastPrompt ?? null);
        setDebugOutput(data.record.lastOutput ?? null);
        setMessage(
          withSupabaseMessage(
            "Field regenerated. Review and approve.",
            data.savedToSupabase
          )
        );
      }
    } catch (err) {
      setStatus("error");
      if (err?.data?.lastPrompt) {
        setDebugPrompt(err.data.lastPrompt);
      }
      if (typeof err?.data?.lastOutput === "string") {
        setDebugOutput(err.data.lastOutput);
      }
      setError(err instanceof Error ? err.message : "Regenerate failed.");
    } finally {
      setRegeneratingFieldKey(null);
    }
  }

  const statusClass = statusColors[status] || statusColors.idle;

  return (
    <div className="space-y-6">
      {confirmRegenerateFieldKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-5 shadow-lg">
            <p className="text-sm font-semibold text-gray-900">Regenerate field?</p>
            <p className="mt-2 text-sm text-gray-600">
              Regenerating this field will delete all later blocks. Continue?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm"
                onClick={() => setConfirmRegenerateFieldKey(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                onClick={() => {
                  const fieldKey = confirmRegenerateFieldKey;
                  setConfirmRegenerateFieldKey(null);
                  if (fieldKey) {
                    void executeRegenerate(fieldKey);
                  }
                }}
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmClearFieldKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-5 shadow-lg">
            <p className="text-sm font-semibold text-gray-900">Clear block?</p>
            <p className="mt-2 text-sm text-gray-600">
              This will clear this block and all later blocks. Continue?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm"
                onClick={() => setConfirmClearFieldKey(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                onClick={() => {
                  const fieldKey = confirmClearFieldKey;
                  setConfirmClearFieldKey(null);
                  if (fieldKey) {
                    void confirmClearField(fieldKey);
                  }
                }}
              >
                Clear block
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmClearDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-5 shadow-lg">
            <p className="text-sm font-semibold text-gray-900">Clear document?</p>
            <p className="mt-2 text-sm text-gray-600">
              All document data will be lost. Are you sure?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm"
                onClick={() => setConfirmClearDocument(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                onClick={() => {
                  setConfirmClearDocument(false);
                  void confirmClearDocumentAction();
                }}
              >
                Clear document
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <img
              src={discoveryDocumentIcon}
              alt=""
              className="h-7 w-7"
            />
            Discovery Document Wizard
          </h1>
          <p className="text-sm text-gray-600">
            Enter your idea, then generate the document section by section (recommended) or as a single complete run.
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

      <section className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <div className="space-y-6">
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
                setForm((prev) => {
                  const nextValue = event.target.value;
                  localStorage.setItem("discoveryWizard.productIdea", nextValue);
                  return { ...prev, productIdea: nextValue };
                })
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
                setForm((prev) => {
                  const nextValue = event.target.value;
                  localStorage.setItem("discoveryWizard.targetUser", nextValue);
                  return { ...prev, targetUser: nextValue };
                })
              }
              placeholder="Example: SaaS founders who need clear specs."
              required
            />
          </div>

  <div>
    <label className="block text-sm font-medium text-gray-700">User notes</label>
    <textarea
      className="mt-1 block w-full rounded border px-3 py-2 text-sm"
      rows={1}
      value={form.notes}
      onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
      placeholder="One note per line."
    />
  </div>

  <div className="flex items-center gap-3">
    <button
      type="submit"
      className="min-w-[230px] rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      disabled={
        status === "running" ||
        (Boolean(latestRecord) && latestRecord?.changeReason !== "Cleared document")
      }
    >
      {status === "running" ? "Running…" : "Start first section"}
    </button>

    <button
      type="button"
      className="rounded border px-3 py-2 text-sm disabled:opacity-60"
      disabled
    >
      Generate Entire Document
    </button>

  </div>
          </form>

          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Discovery Document</h2>
              </div>
              <div className="flex flex-col items-end gap-2 text-right text-sm text-gray-600">
                {!isEmptyDocumentView && (
                  <button
                    type="button"
                    className="rounded border px-3 py-2 text-sm disabled:opacity-60"
                    onClick={clearDocument}
                    disabled={!latestVersion || isClearing}
                  >
                    {isClearing ? "Clearing…" : "Clear Document"}
                  </button>
                )}
              </div>
            </div>

            {isEmptyDocumentView ? (
              <div className="mt-6 space-y-4">
                {Object.entries(groupedFields).map(([groupName, fields]) => (
                  <Accordion
                    key={groupName}
                    type="multiple"
                    value={openGroups.includes(groupName) ? [groupName] : []}
                    onValueChange={(nextValue) =>
                      setOpenGroups((prev) => {
                        const isOpen = nextValue.includes(groupName);
                        if (isOpen && !prev.includes(groupName)) {
                          return prev.concat(groupName);
                        }
                        if (!isOpen && prev.includes(groupName)) {
                          return prev.filter((name) => name !== groupName);
                        }
                        return prev;
                      })
                    }
                    className="rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <AccordionItem value={groupName} className="border-0">
                      <AccordionTrigger
                        className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-400 hover:no-underline [&>svg]:invisible"
                        disabled
                      >
                        {groupName}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <Accordion
                          type="multiple"
                          value={openFieldsByGroup[groupName] || []}
                          onValueChange={(nextValue) =>
                            setOpenFieldsByGroup((prev) => ({
                              ...prev,
                              [groupName]: nextValue
                            }))
                          }
                          className="space-y-3"
                        >
                          {fields.map((field) => (
                            <AccordionItem key={field.key} value={field.key} className="border-0">
                              <AccordionTrigger
                                className="py-2 text-sm font-semibold text-gray-400 hover:no-underline [&>svg]:invisible"
                                disabled
                              >
                                {field.label}
                              </AccordionTrigger>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ))}
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {Object.entries(groupedFields).map(([groupName, fields]) => (
                  <Accordion
                    key={groupName}
                    type="multiple"
                    value={openGroups.includes(groupName) ? [groupName] : []}
                    onValueChange={(nextValue) =>
                      setOpenGroups((prev) => {
                        const isOpen = nextValue.includes(groupName);
                        if (isOpen && !prev.includes(groupName)) {
                          return prev.concat(groupName);
                        }
                        if (!isOpen && prev.includes(groupName)) {
                          return prev.filter((name) => name !== groupName);
                        }
                        return prev;
                      })
                    }
                    className="rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <AccordionItem value={groupName} className="border-0">
                      <AccordionTrigger className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-600 hover:no-underline">
                        {groupName}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <Accordion
                          type="multiple"
                          value={openFieldsByGroup[groupName] || []}
                          onValueChange={(nextValue) =>
                            setOpenFieldsByGroup((prev) => ({
                              ...prev,
                              [groupName]: nextValue
                            }))
                          }
                          className="space-y-3"
                        >
                          {fields.map((field) => {
                            const statusInfo = latestRecord?.fieldStatus?.[field.key];
                            const isApproved = statusInfo?.approved ?? false;
                            const isCurrent = latestRecord?.currentFieldKey
                              ? latestRecord.currentFieldKey === field.key
                              : false;
                            const shouldRender = isApproved || isCurrent;
                            const isEditable =
                              !!latestRecord && !latestRecord.approved && isCurrent && !isApproved;
                            const isBlocked = !isEditable;
                            const headerClass = shouldRender
                              ? "text-gray-800"
                              : "text-gray-400";
                            if (!shouldRender) {
                              return (
                                <AccordionItem key={field.key} value={field.key} className="border-0">
                                  <AccordionTrigger
                                    className={`py-2 text-sm font-semibold hover:no-underline [&>svg]:invisible ${headerClass}`}
                                    disabled
                                  >
                                    {field.label}
                                  </AccordionTrigger>
                                </AccordionItem>
                              );
                            }
                            return (
                              <AccordionItem key={field.key} value={field.key} className="border-0">
                                <AccordionTrigger
                                  className={`py-2 text-sm font-semibold hover:no-underline ${headerClass}`}
                                >
                                  {field.label}
                                  {isApproved && (
                                    <span className="ml-2 text-xs font-medium text-green-600">
                                      Approved
                                    </span>
                                  )}
                                </AccordionTrigger>
                                <AccordionContent className="pt-2">
                                  {field.type === "object" ? (
                                    field.key === "problemUnderstanding.targetUsersSegments" ? (
                                      <TargetSegmentsEditor
                                        title={field.label}
                                        showTitle={false}
                                        segments={
                                          Array.isArray(draftFields[field.key])
                                            ? (draftFields[field.key] as TargetSegment[])
                                            : []
                                        }
                                        onChange={(nextValue) =>
                                          setDraftFields((prev) => ({
                                            ...prev,
                                            [field.key]: nextValue
                                          }))
                                        }
                                        onApprove={() => approveField(field.key, field.type)}
                                        onRegenerate={() => regenerateField(field.key)}
                                        onClear={() => clearField(field.key)}
                                        approved={isApproved}
                                        disabled={isBlocked}
                                        isApproving={approvingFieldKey === field.key}
                                        isRegenerating={regeneratingFieldKey === field.key}
                                        isClearing={clearingFieldKey === field.key}
                                      />
                                    ) : (
                                      <PainPointsEditor
                                        title={field.label}
                                        showTitle={false}
                                        themes={
                                          Array.isArray(draftFields[field.key])
                                            ? (draftFields[field.key] as PainPointTheme[])
                                            : []
                                        }
                                        onChange={(nextValue) =>
                                          setDraftFields((prev) => ({
                                            ...prev,
                                            [field.key]: nextValue
                                          }))
                                        }
                                        onApprove={() => approveField(field.key, field.type)}
                                        onRegenerate={() => regenerateField(field.key)}
                                        onClear={() => clearField(field.key)}
                                        approved={isApproved}
                                        disabled={isBlocked}
                                        isApproving={approvingFieldKey === field.key}
                                        isRegenerating={regeneratingFieldKey === field.key}
                                        isClearing={clearingFieldKey === field.key}
                                      />
                                    )
                                  ) : (
                                    <FieldEditor
                                      title={field.label}
                                      showTitle={false}
                                      type={field.type}
                                      value={
                                        typeof draftFields[field.key] === "string"
                                          ? (draftFields[field.key] as string)
                                          : ""
                                      }
                                      onChange={(nextValue) =>
                                        setDraftFields((prev) => ({
                                          ...prev,
                                          [field.key]: nextValue
                                        }))
                                      }
                                      onApprove={() => approveField(field.key, field.type)}
                                      onRegenerate={() => regenerateField(field.key)}
                                      onClear={() => clearField(field.key)}
                                      approved={isApproved}
                                      disabled={isBlocked}
                                      isApproving={approvingFieldKey === field.key}
                                      isRegenerating={regeneratingFieldKey === field.key}
                                      isClearing={clearingFieldKey === field.key}
                                    />
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
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
          {progressText && <p className="text-sm text-gray-500">{progressText}</p>}

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
            <p className="text-gray-600">
              Approve each field in order. The next field appears after approval.
            </p>
          </div>

          <Accordion type="multiple" className="space-y-2">
            <AccordionItem value="incoming" className="border rounded">
              <AccordionTrigger className="px-3 py-2 text-sm font-medium hover:no-underline">
                Incoming info
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <pre className="whitespace-pre-wrap rounded border bg-gray-50 p-3 text-xs text-gray-700">
                  {inputSummary}
                </pre>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="llm-prompt" className="border rounded">
              <AccordionTrigger className="px-3 py-2 text-sm font-medium hover:no-underline">
                LLM Prompt
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <pre className="whitespace-pre-wrap rounded border bg-gray-50 p-3 text-xs text-gray-700">
                  {status === "error"
                    ? debugPrompt || latestRecord?.lastPrompt || "Not available."
                    : latestRecord?.lastPrompt || debugPrompt || "Not available."}
                </pre>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="llm-output" className="border rounded">
              <AccordionTrigger className="px-3 py-2 text-sm font-medium hover:no-underline">
                LLM output
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <pre className="whitespace-pre-wrap rounded border bg-gray-50 p-3 text-xs text-gray-700">
                  {status === "error"
                    ? debugOutput || latestRecord?.lastOutput || "Not available."
                    : latestRecord?.lastOutput || debugOutput || "Not available."}
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </aside>
      </section>
    </div>
  );
}

type FieldEditorProps = {
  title: string;
  type: "string" | "array";
  value: string;
  onChange: (value: string) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  approved: boolean;
  disabled: boolean;
  isApproving: boolean;
  isRegenerating: boolean;
  isClearing: boolean;
};

function FieldEditor({
  title,
  type,
  value,
  onChange,
  onApprove,
  onRegenerate,
  onClear,
  approved,
  disabled,
  isApproving,
  isRegenerating,
  isClearing,
  showTitle = true
}: FieldEditorProps & { showTitle?: boolean }) {
  const isEmpty = !value || value.trim().length === 0;
  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {approved && <span className="text-xs font-medium text-green-600">Approved</span>}
        </div>
      )}
      <textarea
        className="mt-2 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
        rows={type === "array" ? 4 : 3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || approved}
        placeholder={type === "array" ? "One item per line." : "Write the content here."}
      />
      <div className="mt-3 flex items-center gap-2">
        {!approved && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || approved || isApproving || isEmpty}
          >
            {isApproving ? "Approving…" : "Approve"}
          </button>
        )}
        <button
          type="button"
          className="inline-flex min-w-[108px] items-center justify-center rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          {isRegenerating ? "Regenerating…" : "Regenerate"}
        </button>
        {!approved && (
          <button
            type="button"
            className="ml-auto rounded border px-3 py-2 text-sm disabled:opacity-60"
            onClick={onClear}
            disabled={isClearing}
          >
            {isClearing ? "Clearing…" : "Clear block"}
          </button>
        )}
      </div>
    </div>
  );
}

type TargetSegmentsEditorProps = {
  title: string;
  segments: TargetSegment[];
  onChange: (segments: TargetSegment[]) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  approved: boolean;
  disabled: boolean;
  isApproving: boolean;
  isRegenerating: boolean;
  isClearing: boolean;
  showTitle?: boolean;
};

function TargetSegmentsEditor({
  title,
  segments,
  onChange,
  onApprove,
  onRegenerate,
  onClear,
  approved,
  disabled,
  isApproving,
  isRegenerating,
  isClearing,
  showTitle = true
}: TargetSegmentsEditorProps) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const hasSegments = safeSegments.length > 0;
  const [openSegments, setOpenSegments] = useState<string[]>([]);

  useEffect(() => {
    setOpenSegments((prev) => {
      const keys = segments.map((_, index) => `segment-${index}`);
      const next = prev.filter((key) => keys.includes(key));
      keys.forEach((key) => {
        if (!next.includes(key)) {
          next.push(key);
        }
      });
      return next;
    });
  }, [segments.length]);

  const updateSegment = (index: number, nextSegment: TargetSegment) => {
    const next = segments.slice();
    next[index] = nextSegment;
    onChange(next);
  };

  const removeSegment = (index: number) => {
    const next = segments.slice();
    next.splice(index, 1);
    onChange(next);
  };

  const addSegment = () => {
    onChange(
      segments.concat([
        {
          segment_name: "",
          business_relevance: "",
          user_groups: [
            {
              name: "",
              characteristics: [""]
            }
          ]
        }
      ])
    );
  };

  const addUserGroup = (segmentIndex: number) => {
    const segment = segments[segmentIndex];
    const nextGroups = segment.user_groups.concat([
      { name: "", characteristics: [""] }
    ]);
    updateSegment(segmentIndex, { ...segment, user_groups: nextGroups });
  };

  const removeUserGroup = (segmentIndex: number, groupIndex: number) => {
    const segment = segments[segmentIndex];
    const nextGroups = segment.user_groups.slice();
    nextGroups.splice(groupIndex, 1);
    updateSegment(segmentIndex, { ...segment, user_groups: nextGroups });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {approved && <span className="text-xs font-medium text-green-600">Approved</span>}
        </div>
      )}

      {safeSegments.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          No segments yet. Add one to begin.
        </p>
      )}

      <Accordion
        type="multiple"
        value={openSegments}
        onValueChange={setOpenSegments}
        className="mt-3 space-y-4"
      >
        {safeSegments.map((segment, segmentIndex) => {
          const segmentKey = `segment-${segmentIndex}`;
          return (
            <AccordionItem
              key={segmentKey}
              value={segmentKey}
              className="rounded border border-slate-200 p-3"
            >
              <div className="grid items-start gap-2 md:grid-cols-[1fr_1fr_auto]">
                <div>
                  <div className="flex items-center gap-2">
                    <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                      <span className="sr-only">Toggle groups</span>
                    </AccordionTrigger>
                    <label className="block text-xs text-gray-600">Segment name</label>
                  </div>
                  <input
                    className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                    value={segment.segment_name}
                    onChange={(event) =>
                      updateSegment(segmentIndex, {
                        ...segment,
                        segment_name: event.target.value
                      })
                    }
                    disabled={disabled || approved}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">
                    Business relevance
                  </label>
                  <input
                    className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                    value={segment.business_relevance}
                    onChange={(event) =>
                      updateSegment(segmentIndex, {
                        ...segment,
                        business_relevance: event.target.value
                      })
                    }
                    disabled={disabled || approved}
                  />
                </div>
                <div className="flex items-end">
                  {!approved && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-600 hover:text-slate-700"
                      onClick={() => removeSegment(segmentIndex)}
                      disabled={disabled}
                      aria-label="Remove segment"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
              <AccordionContent className="pt-0">
                <div className="mt-3">
                  <div className="mt-2 space-y-3">
                    {(segment.user_groups || []).map((group, groupIndex) => (
                      <div key={groupIndex} className="rounded border border-slate-100 p-2">
                        <div className="grid items-start gap-2 md:grid-cols-[1fr_1fr_auto]">
                          <div>
                            <label className="block text-xs text-gray-600">Group name</label>
                            <input
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              value={group.name}
                              onChange={(event) => {
                                const nextGroups = segment.user_groups.slice();
                                nextGroups[groupIndex] = {
                                  ...group,
                                  name: event.target.value
                                };
                                updateSegment(segmentIndex, {
                                  ...segment,
                                  user_groups: nextGroups
                                });
                              }}
                              disabled={disabled || approved}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600">
                              Characteristics (one per line)
                            </label>
                            <textarea
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              rows={3}
                              value={group.characteristics.join("\n")}
                              onChange={(event) => {
                                const nextGroups = segment.user_groups.slice();
                                nextGroups[groupIndex] = {
                                  ...group,
                                  characteristics: event.target.value.split("\n")
                                };
                                updateSegment(segmentIndex, {
                                  ...segment,
                                  user_groups: nextGroups
                                });
                              }}
                              disabled={disabled || approved}
                            />
                          </div>
                          <div className="flex items-start">
                            {!approved && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-600 hover:text-slate-700"
                                onClick={() => removeUserGroup(segmentIndex, groupIndex)}
                                disabled={disabled}
                                aria-label="Remove user group"
                              >
                                <Trash2 />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!approved && (
                    <button
                      type="button"
                      className="mt-2 text-xs text-blue-600 disabled:opacity-60"
                      onClick={() => addUserGroup(segmentIndex)}
                      disabled={disabled}
                    >
                      + Group
                    </button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {!approved && (
        <button
          type="button"
          className="mt-3 inline-flex items-center rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 disabled:opacity-60"
          onClick={addSegment}
          disabled={disabled || approved}
        >
          + Segment
        </button>
      )}

      <div className="mt-3 flex items-center gap-2">
        {!approved && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || approved || !hasSegments || isApproving}
          >
            {isApproving ? "Approving…" : "Approve"}
          </button>
        )}
        <button
          type="button"
          className="inline-flex min-w-[108px] items-center justify-center rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          {isRegenerating ? "Regenerating…" : "Regenerate"}
        </button>
        {!approved && (
          <button
            type="button"
            className="ml-auto rounded border px-3 py-2 text-sm disabled:opacity-60"
            onClick={onClear}
            disabled={isClearing}
          >
            {isClearing ? "Clearing…" : "Clear block"}
          </button>
        )}
      </div>
    </div>
  );
}

type PainPointsEditorProps = {
  title: string;
  themes: PainPointTheme[];
  onChange: (themes: PainPointTheme[]) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  approved: boolean;
  disabled: boolean;
  isApproving: boolean;
  isRegenerating: boolean;
  isClearing: boolean;
  showTitle?: boolean;
};

const RATING_OPTIONS: Array<PainPoint["severity"]> = ["low", "medium", "high"];

function PainPointsEditor({
  title,
  themes,
  onChange,
  onApprove,
  onRegenerate,
  onClear,
  approved,
  disabled,
  isApproving,
  isRegenerating,
  isClearing,
  showTitle = true
}: PainPointsEditorProps) {
  const hasThemes = themes.length > 0;
  const [openThemes, setOpenThemes] = useState<string[]>([]);
  const [openPainPoints, setOpenPainPoints] = useState<Record<string, string[]>>(
    {}
  );

  useEffect(() => {
    const themeKeys = themes.map((_, index) => `theme-${index}`);
    setOpenThemes((prev) => {
      const next = prev.filter((key) => themeKeys.includes(key));
      themeKeys.forEach((key) => {
        if (!next.includes(key)) {
          next.push(key);
        }
      });
      return next;
    });
    setOpenPainPoints((prev) => {
      const next: Record<string, string[]> = { ...prev };
      themeKeys.forEach((themeKey, index) => {
        const points = themes[index]?.pain_points || [];
        const pointKeys = points.map((__, pointIndex) => `${themeKey}-point-${pointIndex}`);
        const existing = next[themeKey] || [];
        const merged = existing.filter((key) => pointKeys.includes(key));
        pointKeys.forEach((key) => {
          if (!merged.includes(key)) {
            merged.push(key);
          }
        });
        next[themeKey] = merged;
      });
      Object.keys(next).forEach((key) => {
        if (!themeKeys.includes(key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [themes.length, themes]);

  const updateTheme = (index: number, nextTheme: PainPointTheme) => {
    const next = themes.slice();
    next[index] = nextTheme;
    onChange(next);
  };

  const removeTheme = (index: number) => {
    const next = themes.slice();
    next.splice(index, 1);
    onChange(next);
  };

  const addTheme = () => {
    onChange(
      themes.concat([
        {
          theme_name: "",
          pain_points: [
            {
              name: "",
              description: "",
              affected_user_groups: [""],
              severity: "medium",
              frequency: "medium",
              business_importance: "medium"
            }
          ]
        }
      ])
    );
  };

  const addPainPoint = (themeIndex: number) => {
    const theme = themes[themeIndex];
    const nextPoints = theme.pain_points.concat([
      {
        name: "",
        description: "",
        affected_user_groups: [""],
        severity: "medium",
        frequency: "medium",
        business_importance: "medium"
      }
    ]);
    updateTheme(themeIndex, { ...theme, pain_points: nextPoints });
  };

  const removePainPoint = (themeIndex: number, pointIndex: number) => {
    const theme = themes[themeIndex];
    const nextPoints = theme.pain_points.slice();
    nextPoints.splice(pointIndex, 1);
    updateTheme(themeIndex, { ...theme, pain_points: nextPoints });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {approved && <span className="text-xs font-medium text-green-600">Approved</span>}
        </div>
      )}

      {themes.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          No themes yet. Add one to begin.
        </p>
      )}

      <Accordion
        type="multiple"
        value={openThemes}
        onValueChange={setOpenThemes}
        className="mt-3 space-y-4"
      >
        {themes.map((theme, themeIndex) => {
          const themeKey = `theme-${themeIndex}`;
          const openPoints = openPainPoints[themeKey] || [];
          return (
            <AccordionItem
              key={themeKey}
              value={themeKey}
              className="rounded border border-slate-200 p-3"
            >
              <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2">
                    <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                      <span className="sr-only">Toggle theme</span>
                    </AccordionTrigger>
                    <label className="block text-xs text-gray-600">Theme name</label>
                  </div>
                  <input
                    className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                    value={theme.theme_name}
                    onChange={(event) =>
                      updateTheme(themeIndex, { ...theme, theme_name: event.target.value })
                    }
                    disabled={disabled || approved}
                  />
                </div>
                <div className="flex items-start">
                  {!approved && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-600 hover:text-slate-700"
                      onClick={() => removeTheme(themeIndex)}
                      disabled={disabled}
                      aria-label="Remove theme"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>

              <AccordionContent className="pt-0">
                <Accordion
                  type="multiple"
                  value={openPoints}
                  onValueChange={(nextValue) =>
                    setOpenPainPoints((prev) => ({ ...prev, [themeKey]: nextValue }))
                  }
                  className="mt-3 space-y-3"
                >
                  {theme.pain_points.map((point, pointIndex) => {
                    const pointKey = `${themeKey}-point-${pointIndex}`;
                    return (
                      <AccordionItem
                        key={pointKey}
                        value={pointKey}
                        className="rounded border border-slate-100 p-2"
                      >
                        <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                          <div>
                            <div className="flex items-center gap-2">
                              <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                                <span className="sr-only">Toggle pain point</span>
                              </AccordionTrigger>
                              <label className="block text-xs text-gray-600">
                                Pain point name
                              </label>
                            </div>
                            <input
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              value={point.name}
                              onChange={(event) => {
                                const nextPoints = theme.pain_points.slice();
                                nextPoints[pointIndex] = {
                                  ...point,
                                  name: event.target.value
                                };
                                updateTheme(themeIndex, {
                                  ...theme,
                                  pain_points: nextPoints
                                });
                              }}
                              disabled={disabled || approved}
                            />
                          </div>
                          <div className="flex items-start">
                            {!approved && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-600 hover:text-slate-700"
                                onClick={() => removePainPoint(themeIndex, pointIndex)}
                                disabled={disabled}
                                aria-label="Remove pain point"
                              >
                                <Trash2 />
                              </Button>
                            )}
                          </div>
                        </div>

                        <AccordionContent className="pt-0">
                          <div className="mt-2">
                            <label className="block text-xs text-gray-600">Description</label>
                            <textarea
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              rows={1}
                              value={point.description}
                              onChange={(event) => {
                                const nextPoints = theme.pain_points.slice();
                                nextPoints[pointIndex] = {
                                  ...point,
                                  description: event.target.value
                                };
                                updateTheme(themeIndex, {
                                  ...theme,
                                  pain_points: nextPoints
                                });
                              }}
                              disabled={disabled || approved}
                            />
                          </div>

                          <div className="mt-2 grid gap-2 md:grid-cols-3">
                            <div>
                              <label className="block text-xs text-gray-600">Severity</label>
                              <select
                                className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                                value={point.severity}
                                onChange={(event) => {
                                  const nextPoints = theme.pain_points.slice();
                                  nextPoints[pointIndex] = {
                                    ...point,
                                    severity: event.target.value as PainPoint["severity"]
                                  };
                                  updateTheme(themeIndex, {
                                    ...theme,
                                    pain_points: nextPoints
                                  });
                                }}
                                disabled={disabled || approved}
                              >
                                {RATING_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600">Frequency</label>
                              <select
                                className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                                value={point.frequency}
                                onChange={(event) => {
                                  const nextPoints = theme.pain_points.slice();
                                  nextPoints[pointIndex] = {
                                    ...point,
                                    frequency: event.target.value as PainPoint["frequency"]
                                  };
                                  updateTheme(themeIndex, {
                                    ...theme,
                                    pain_points: nextPoints
                                  });
                                }}
                                disabled={disabled || approved}
                              >
                                {RATING_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600">
                                Business importance
                              </label>
                              <select
                                className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                                value={point.business_importance}
                                onChange={(event) => {
                                  const nextPoints = theme.pain_points.slice();
                                  nextPoints[pointIndex] = {
                                    ...point,
                                    business_importance: event.target.value as PainPoint["business_importance"]
                                  };
                                  updateTheme(themeIndex, {
                                    ...theme,
                                    pain_points: nextPoints
                                  });
                                }}
                                disabled={disabled || approved}
                              >
                                {RATING_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="mt-2">
                            <label className="block text-xs text-gray-600">
                              Affected user groups (one per line)
                            </label>
                            <textarea
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              rows={1}
                              value={point.affected_user_groups.join("\n")}
                              onChange={(event) => {
                                const nextPoints = theme.pain_points.slice();
                                nextPoints[pointIndex] = {
                                  ...point,
                                  affected_user_groups: event.target.value.split("\n")
                                };
                                updateTheme(themeIndex, {
                                  ...theme,
                                  pain_points: nextPoints
                                });
                              }}
                              disabled={disabled || approved}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>

                {!approved && (
                  <button
                    type="button"
                    className="mt-2 text-xs text-blue-600 disabled:opacity-60"
                    onClick={() => addPainPoint(themeIndex)}
                    disabled={disabled}
                  >
                    + Pain point
                  </button>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {!approved && (
        <button
          type="button"
          className="mt-3 inline-flex items-center rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 disabled:opacity-60"
          onClick={addTheme}
          disabled={disabled}
        >
          + Theme
        </button>
      )}

      <div className="mt-3 flex items-center gap-2">
        {!approved && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || !hasThemes || isApproving}
          >
            {isApproving ? "Approving…" : "Approve"}
          </button>
        )}
        <button
          type="button"
          className="inline-flex min-w-[108px] items-center justify-center rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          {isRegenerating ? "Regenerating…" : "Regenerate"}
        </button>
        {!approved && (
          <button
            type="button"
            className="ml-auto rounded border px-3 py-2 text-sm disabled:opacity-60"
            onClick={onClear}
            disabled={isClearing}
          >
            {isClearing ? "Clearing…" : "Clear block"}
          </button>
        )}
      </div>
    </div>
  );
}
