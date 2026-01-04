import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../components/ui/dialog";
import discoveryDocumentIcon from "../assets/discovery-document.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "../components/ui/accordion";
import { supabase } from "../lib/supabase";
import {
  getSession,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  listProjects,
  createProject,
  saveProjectDocument,
  type Project
} from "../lib/projects-store";

const API_BASE =
  import.meta.env.VITE_ORCHESTRATOR_URL || "http://localhost:8002";

type TargetSegment = {
  segment_name: string;
  segment_type: "primary" | "secondary";
  usage_contexts: string[];
  characteristics: string[];
};

type PainPoint = {
  name: string;
  description: string;
  severity: "low" | "medium" | "high";
  frequency: "low" | "medium" | "high";
};

type PainPointGroup = {
  user_segment: string;
  pain_points: PainPoint[];
};

type ContextFactor = {
  name: string;
  description: string;
};

type ContextFactorGroup = {
  factor_group: string;
  factors: ContextFactor[];
};

type ConstraintItem = {
  name: string;
  description: string;
};

type ConstraintGroup = {
  constraint_group: string;
  constraints: ConstraintItem[];
};

type ContextualFactors = {
  contextual_factors: ContextFactorGroup[];
};

type Constraints = {
  constraints: ConstraintGroup[];
};

type MarketAlternatives = {
  direct_competitor_segments: string[];
  indirect_competitor_segments: string[];
  substitute_segments: string[];
};

type MarketLandscape = {
  market_definition: string;
  alternatives: MarketAlternatives;
  market_norms: string[];
  adoption_drivers: string[];
  adoption_barriers: string[];
};

type CompetitorEntry = {
  product_name: string;
  url: string;
  description: string;
  target_audience: string;
  positioning: string;
};

type CompetitorInventory = {
  competitors: {
    direct: CompetitorEntry[];
    indirect: CompetitorEntry[];
    substitute: CompetitorEntry[];
  };
};

type CompetitorCapabilityEntry = {
  capability: string;
  alignment_with_user_needs: string;
  owning_competitors: string[];
  gaps_and_limitations: string[];
};

type CompetitorCapabilities = {
  competitor_capabilities: {
    Functional: CompetitorCapabilityEntry[];
    Technical: CompetitorCapabilityEntry[];
    Business: CompetitorCapabilityEntry[];
  };
};

type OpportunityItem = {
  opportunity: string;
  why_it_remains_unaddressed: string;
  user_value_potential: string;
};

type Opportunities = {
  opportunities: OpportunityItem[];
};

type ValueDrivers = {
  value_drivers: string[];
};

type FeasibilityRisk = {
  feasibility_risk_type: "business" | "user" | "technical";
  feasibility_risk: string;
  why_it_matters: string;
};

type FeasibilityRisks = {
  feasibility_risks: FeasibilityRisk[];
};

type DiscoveryDocument = {
  problemUnderstanding?: {
    problemStatement?: string;
    targetUsersSegments?: {
      user_segments?: TargetSegment[];
    };
    userPainPoints?: {
      user_segments?: PainPointGroup[];
    };
    contextualFactors?: ContextualFactors;
    constraints?: Constraints;
  };
  marketAndCompetitorAnalysis?: {
    marketLandscape?: MarketLandscape;
    competitorInventory?: CompetitorInventory;
    competitorCapabilities?: CompetitorCapabilities;
    gapsOpportunities?: Opportunities;
  };
  opportunityDefinition?: {
    valueDrivers?: ValueDrivers;
    feasibilityRisks?: FeasibilityRisks;
  };
};

type DiscoveryRecord = {
  version: number;
  timestamp?: string;
  productIdea?: string;
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
  approved: "Ready",
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

const formatProductIdea = (value: string) =>
  value
    .replace(/\r?\n+/g, " ")
    .replace(/([.!?])\s+/g, "$1\n")
    .trim();

const emptyMarketLandscape: MarketLandscape = {
  market_definition: "",
  alternatives: {
    direct_competitor_segments: [],
    indirect_competitor_segments: [],
    substitute_segments: []
  },
  market_norms: [],
  adoption_drivers: [],
  adoption_barriers: []
};

const emptyCompetitorInventory: CompetitorInventory = {
  competitors: {
    direct: [],
    indirect: [],
    substitute: []
  }
};

const emptyCompetitorCapabilities: CompetitorCapabilities = {
  competitor_capabilities: {
    Functional: [],
    Technical: [],
    Business: []
  }
};

const emptyGapsOpportunities: Opportunities = {
  opportunities: []
};

const emptyDocument: DiscoveryDocument = {
  problemUnderstanding: {
    targetUsersSegments: {
      user_segments: []
    },
    userPainPoints: {
      user_segments: []
    },
    contextualFactors: {
      contextual_factors: [],
    },
    constraints: {
      constraints: []
    }
  },
  marketAndCompetitorAnalysis: {
    marketLandscape: emptyMarketLandscape,
    competitorInventory: emptyCompetitorInventory,
    competitorCapabilities: emptyCompetitorCapabilities,
    gapsOpportunities: emptyGapsOpportunities
  },
  opportunityDefinition: {
    valueDrivers: {
      value_drivers: []
    },
    feasibilityRisks: {
      feasibility_risks: []
    }
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
    label: "User Segments",
    type: "object",
    group: "Problem Understanding",
    outputKey: "user_segments"
  },
  {
    key: "problemUnderstanding.userPainPoints",
    label: "User Pain Points",
    type: "object",
    group: "Problem Understanding",
    outputKey: "user_pain_points"
  },
  {
    key: "problemUnderstanding.contextualFactors",
    label: "Contextual Factors",
    type: "object",
    group: "Problem Understanding"
  },
  {
    key: "problemUnderstanding.constraints",
    label: "Constraints",
    type: "object",
    group: "Problem Understanding"
  },
  {
    key: "marketAndCompetitorAnalysis.marketLandscape",
    label: "Market Landscape",
    type: "object",
    group: "Market and Competitor Analysis"
  },
  {
    key: "marketAndCompetitorAnalysis.competitorInventory",
    label: "Competitors",
    type: "object",
    group: "Market and Competitor Analysis"
  },
  {
    key: "marketAndCompetitorAnalysis.competitorCapabilities",
    label: "Competitor Capabilities",
    type: "object",
    group: "Market and Competitor Analysis"
  },
  {
    key: "marketAndCompetitorAnalysis.gapsOpportunities",
    label: "Opportunities",
    type: "object",
    group: "Opportunity Definition"
  },
  {
    key: "opportunityDefinition.valueDrivers",
    label: "Value Drivers",
    type: "object",
    group: "Opportunity Definition"
  },
  {
    key: "opportunityDefinition.feasibilityRisks",
    label: "Feasibility Risks",
    type: "object",
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

function setNestedValue(document: DiscoveryDocument, key: string, value: unknown) {
  const parts = key.split(".");
  const next: Record<string, unknown> = { ...document };
  let current: Record<string, unknown> = next;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
      return;
    }
    const existing = current[part];
    const nextNode =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>) }
        : {};
    current[part] = nextNode;
    current = nextNode;
  });
  return next as DiscoveryDocument;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

function buildDocumentFromDrafts(
  base: DiscoveryDocument,
  drafts: Record<string, unknown>
) {
  let document = cloneJson(base);
  fieldDefinitions.forEach((field) => {
    const rawValue = drafts[field.key];
    if (typeof rawValue === "undefined") {
      return;
    }
    if (field.type === "object") {
      const outputKey = field.outputKey;
      if (Array.isArray(rawValue) && outputKey) {
        document = setNestedValue(document, field.key, { [outputKey]: rawValue });
      } else {
        document = setNestedValue(document, field.key, rawValue);
      }
      return;
    }
    const textValue = typeof rawValue === "string" ? rawValue : "";
    const parsedValue = fromFieldString(textValue, field.type);
    document = setNestedValue(document, field.key, parsedValue);
  });
  return document;
}

function getFieldDisplayKey(field: FieldDefinition) {
  return field.outputKey || field.key.split(".").pop() || field.key;
}

function normalizeMarketLandscapeValue(value?: MarketLandscape | null): MarketLandscape {
  const alternatives = value?.alternatives;
  const legacyDefinition =
    typeof (value as { market_definition?: { description?: string } })?.market_definition
      ?.description === "string"
      ? (value as { market_definition: { description: string } }).market_definition.description
      : "";
  return {
    market_definition:
      typeof value?.market_definition === "string" ? value.market_definition : legacyDefinition,
    alternatives: {
      direct_competitor_segments: Array.isArray(alternatives?.direct_competitor_segments)
        ? alternatives.direct_competitor_segments
        : [],
      indirect_competitor_segments: Array.isArray(alternatives?.indirect_competitor_segments)
        ? alternatives.indirect_competitor_segments
        : [],
      substitute_segments: Array.isArray(alternatives?.substitute_segments)
        ? alternatives.substitute_segments
        : []
    },
    market_norms: Array.isArray(value?.market_norms) ? value.market_norms : [],
    adoption_drivers: Array.isArray(value?.adoption_drivers) ? value.adoption_drivers : [],
    adoption_barriers: Array.isArray(value?.adoption_barriers) ? value.adoption_barriers : []
  };
}

function normalizeCompetitorInventoryValue(
  value?: CompetitorInventory | null
): CompetitorInventory {
  const raw = value?.competitors;
  if (Array.isArray(raw)) {
    const grouped = { direct: [], indirect: [], substitute: [] } as CompetitorInventory["competitors"];
    raw.forEach((item: any) => {
      const entry: CompetitorEntry = {
        product_name: item?.product_name || item?.name || "",
        url: item?.url || "",
        description: item?.description || "",
        target_audience: item?.target_audience || "",
        positioning: item?.positioning || ""
      };
      if (item?.category === "indirect") {
        grouped.indirect.push(entry);
      } else if (item?.category === "substitute") {
        grouped.substitute.push(entry);
      } else {
        grouped.direct.push(entry);
      }
    });
    return { competitors: grouped };
  }
  return {
    competitors: {
      direct: Array.isArray(raw?.direct) ? raw.direct : [],
      indirect: Array.isArray(raw?.indirect) ? raw.indirect : [],
      substitute: Array.isArray(raw?.substitute) ? raw.substitute : []
    }
  };
}

function normalizeCompetitorCapabilitiesValue(
  value?: CompetitorCapabilities | null
): CompetitorCapabilities {
  const normalizeItems = (items: unknown) =>
    Array.isArray(items)
      ? items.map((item: any) => ({
          capability: item?.capability || "",
          alignment_with_user_needs: item?.alignment_with_user_needs || "",
          owning_competitors: Array.isArray(item?.owning_competitors)
            ? item.owning_competitors
            : [],
          gaps_and_limitations: Array.isArray(item?.gaps_and_limitations)
            ? item.gaps_and_limitations
            : []
        }))
      : [];
  if (Array.isArray((value as any)?.competitor_capabilities)) {
    return {
      competitor_capabilities: {
        Functional: normalizeItems((value as any).competitor_capabilities),
        Technical: [],
        Business: []
      }
    };
  }
  return {
    competitor_capabilities: {
      Functional: normalizeItems(value?.competitor_capabilities?.Functional),
      Technical: normalizeItems(value?.competitor_capabilities?.Technical),
      Business: normalizeItems(value?.competitor_capabilities?.Business)
    }
  };
}

function normalizeGapsOpportunitiesValue(
  value?: Opportunities | null
): Opportunities {
  const normalizeItem = (
    item: Partial<OpportunityItem> | null | undefined
  ): OpportunityItem => ({
    opportunity:
      item?.opportunity ||
      (item as { opportunity_description?: string })?.opportunity_description ||
      (item as { gap_description?: string })?.gap_description ||
      "",
    why_it_remains_unaddressed:
      item?.why_it_remains_unaddressed ||
      (item as { persistence_reason?: string })?.persistence_reason ||
      "",
    user_value_potential: item?.user_value_potential || ""
  });
  if (Array.isArray(value?.opportunities)) {
    return { opportunities: value.opportunities.map((item) => normalizeItem(item)) };
  }
  const legacy = (value as { gaps_and_opportunities?: any })?.gaps_and_opportunities;
  if (legacy && typeof legacy === "object") {
    const merged = [
      ...(Array.isArray(legacy.functional) ? legacy.functional : []),
      ...(Array.isArray(legacy.technical) ? legacy.technical : []),
      ...(Array.isArray(legacy.business) ? legacy.business : [])
    ];
    return { opportunities: merged.map((item) => normalizeItem(item)) };
  }
  return { opportunities: [] };
}

function normalizeValueDriversValue(value?: ValueDrivers | null): ValueDrivers {
  if (Array.isArray(value)) {
    return { value_drivers: value.map((item) => String(item)) };
  }
  if (Array.isArray(value?.value_drivers)) {
    const drivers = value.value_drivers.map((item) =>
      typeof item === "string" ? item : (item as any)?.name || String(item)
    );
    return { value_drivers: drivers };
  }
  return { value_drivers: [] };
}

function normalizeFeasibilityRisksValue(
  value?: FeasibilityRisks | null
): FeasibilityRisks {
  if (Array.isArray(value)) {
    return { feasibility_risks: value as FeasibilityRisk[] };
  }
  if (Array.isArray(value?.feasibility_risks)) {
    return { feasibility_risks: value.feasibility_risks };
  }
  const legacy = (value as any)?.feasibility_assessment;
  if (legacy && typeof legacy === "object") {
    const mapLegacy = (
      items: any[],
      riskType: FeasibilityRisk["feasibility_risk_type"]
    ) =>
      Array.isArray(items)
        ? items.map((item) => ({
            feasibility_risk_type: riskType,
            feasibility_risk: item?.name || "",
            why_it_matters: item?.description || ""
          }))
        : [];
    return {
      feasibility_risks: [
        ...mapLegacy(legacy.business_constraints, "business"),
        ...mapLegacy(legacy.user_constraints, "user"),
        ...mapLegacy(legacy.technical_concerns, "technical")
      ]
    };
  }
  return { feasibility_risks: [] };
}

function hasFieldValue(field: FieldDefinition, value: unknown): boolean {
  if (field.type === "string") {
    return typeof value === "string" && value.trim().length > 0;
  }
  if (field.type === "array") {
    return Array.isArray(value) && value.length > 0;
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  if (field.key === "problemUnderstanding.contextualFactors") {
    const factorsValue = value as ContextualFactors;
    return Array.isArray(factorsValue.contextual_factors)
      ? factorsValue.contextual_factors.some(
          (group) => Array.isArray(group.factors) && group.factors.length > 0
        )
      : false;
  }
  if (field.key === "problemUnderstanding.targetUsersSegments") {
    const segmentsValue = value as { user_segments?: TargetSegment[] };
    return Array.isArray(segmentsValue.user_segments) && segmentsValue.user_segments.length > 0;
  }
  if (field.key === "problemUnderstanding.userPainPoints") {
    const painPointsValue = value as { user_segments?: PainPointGroup[] };
    return (
      Array.isArray(painPointsValue.user_segments) &&
      painPointsValue.user_segments.length > 0
    );
  }
  if (field.key === "problemUnderstanding.constraints") {
    const constraintsValue = value as Constraints;
    return Array.isArray(constraintsValue.constraints)
      ? constraintsValue.constraints.some(
          (group) => Array.isArray(group.constraints) && group.constraints.length > 0
        )
      : false;
  }
  if (field.key === "marketAndCompetitorAnalysis.marketLandscape") {
    const landscapeValue = normalizeMarketLandscapeValue(value as MarketLandscape);
    return Boolean(
      landscapeValue.market_definition.trim() ||
        landscapeValue.alternatives.direct_competitor_segments.length > 0 ||
        landscapeValue.alternatives.indirect_competitor_segments.length > 0 ||
        landscapeValue.alternatives.substitute_segments.length > 0 ||
        landscapeValue.market_norms.length > 0 ||
        landscapeValue.adoption_drivers.length > 0 ||
        landscapeValue.adoption_barriers.length > 0
    );
  }
  if (field.key === "marketAndCompetitorAnalysis.competitorInventory") {
    const inventoryValue = value as CompetitorInventory;
    if (Array.isArray(inventoryValue.competitors)) {
      return inventoryValue.competitors.length > 0;
    }
    return Boolean(
      inventoryValue.competitors?.direct?.length ||
        inventoryValue.competitors?.indirect?.length ||
        inventoryValue.competitors?.substitute?.length
    );
  }
  if (field.key === "marketAndCompetitorAnalysis.competitorCapabilities") {
    const capabilityValue = value as CompetitorCapabilities;
    return Boolean(
      capabilityValue.competitor_capabilities?.Functional?.length ||
        capabilityValue.competitor_capabilities?.Technical?.length ||
        capabilityValue.competitor_capabilities?.Business?.length
    );
  }
  if (field.key === "marketAndCompetitorAnalysis.gapsOpportunities") {
    const gapsValue = value as Opportunities;
    return Array.isArray(gapsValue.opportunities) && gapsValue.opportunities.length > 0;
  }
  if (field.key === "opportunityDefinition.valueDrivers") {
    const driversValue = value as ValueDrivers;
    return Array.isArray(driversValue.value_drivers) && driversValue.value_drivers.length > 0;
  }
  if (field.key === "opportunityDefinition.feasibilityRisks") {
    const risksValue = value as FeasibilityRisks;
    return Array.isArray(risksValue.feasibility_risks) && risksValue.feasibility_risks.length > 0;
  }
  if (field.outputKey) {
    const collection = (value as Record<string, unknown>)[field.outputKey];
    return Array.isArray(collection) && collection.length > 0;
  }
  return Object.values(value).some((entry) => {
    if (typeof entry === "string") {
      return entry.trim().length > 0;
    }
    if (Array.isArray(entry)) {
      return entry.length > 0;
    }
    return Boolean(entry);
  });
}

export function WizardPage() {
  const [form, setForm] = useState({
    productIdea: ""
  });
  const textareaContainerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<ApiStatus>("idle");
  const [message, setMessage] = useState("Provide inputs and run the agent.");
  const [session, setSession] = useState<Session | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthWorking, setIsAuthWorking] = useState(false);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [pendingSaveDocument, setPendingSaveDocument] = useState(false);
  const [latestRecord, setLatestRecord] = useState<DiscoveryRecord | null>(null);
  const [latestVersion, setLatestVersion] = useState<number | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugPrompt, setDebugPrompt] = useState<string | null>(null);
  const [debugOutput, setDebugOutput] = useState<string | null>(null);
  const errorPromptRef = useRef<HTMLTextAreaElement | null>(null);
  const errorOutputRef = useRef<HTMLTextAreaElement | null>(null);
  const llmPromptRef = useRef<HTMLTextAreaElement | null>(null);
  const llmOutputRef = useRef<HTMLTextAreaElement | null>(null);
  const [lastLlmError, setLastLlmError] = useState<{
    message?: string;
    lastPrompt?: string | null;
    lastOutput?: string | null;
    lastOutputFieldKey?: string | null;
  } | null>(null);
  const errorPromptText =
    typeof lastLlmError?.lastPrompt === "string"
      ? lastLlmError.lastPrompt
      : status === "error"
        ? debugPrompt || latestRecord?.lastPrompt || null
        : null;
  const errorOutputText =
    typeof lastLlmError?.lastOutput === "string"
      ? lastLlmError.lastOutput
      : status === "error"
        ? debugOutput || latestRecord?.lastOutput || null
        : null;
  const formatDebugValue = (value: string | null) => {
    if (value === null) {
      return "Not available.";
    }
    if (value === "") {
      return "(empty output)";
    }
    return value;
  };

  const captureLlmError = (payload?: any) => {
    if (!payload || typeof payload !== "object") {
      return;
    }
    if (!payload.message && !payload.lastPrompt && !payload.lastOutput) {
      return;
    }
    setLastLlmError({
      message: payload.message,
      lastPrompt: typeof payload.lastPrompt === "string" ? payload.lastPrompt : null,
      lastOutput: typeof payload.lastOutput === "string" ? payload.lastOutput : null,
      lastOutputFieldKey:
        typeof payload.lastOutputFieldKey === "string" ? payload.lastOutputFieldKey : null
    });
  };
  useEffect(() => {
    const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
      if (!textarea) {
        return;
      }
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.style.overflow = "hidden";
    };
    resizeTextarea(errorPromptRef.current);
    resizeTextarea(errorOutputRef.current);
    resizeTextarea(llmPromptRef.current);
    resizeTextarea(llmOutputRef.current);
  }, [errorPromptText, errorOutputText, debugPrompt, debugOutput, latestRecord]);
  const [draftFields, setDraftFields] = useState<
    Record<
      string,
      | string
      | TargetSegment[]
      | PainPointGroup[]
      | ContextualFactors
      | Constraints
      | MarketLandscape
      | CompetitorInventory
      | CompetitorCapabilities
      | Opportunities
      | ValueDrivers
      | FeasibilityRisks
    >
  >({});
  const [approvingFieldKey, setApprovingFieldKey] = useState<string | null>(null);
  const [regeneratingFieldKey, setRegeneratingFieldKey] = useState<string | null>(null);
  const [autoGeneratingFieldKey, setAutoGeneratingFieldKey] = useState<string | null>(null);
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [confirmRegenerateFieldKey, setConfirmRegenerateFieldKey] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [clearingFieldKey, setClearingFieldKey] = useState<string | null>(null);
  const [confirmClearFieldKey, setConfirmClearFieldKey] = useState<string | null>(null);
  const [confirmClearDocument, setConfirmClearDocument] = useState(false);
  const [isExportingMarkdown, setIsExportingMarkdown] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [confirmStartMode, setConfirmStartMode] = useState<
    "first-section" | "entire-document" | null
  >(null);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isGeneratingRandom, setIsGeneratingRandom] = useState(false);
  const [generateAllAbort, setGenerateAllAbort] = useState<AbortController | null>(null);
  const generateAllPollRef = useRef<number | null>(null);
  const [generationCanceled, setGenerationCanceled] = useState(false);
  const cancelGenerationRef = useRef(false);
  const lastAutoOpenedFieldRef = useRef<string | null>(null);
  const [openGroups, setOpenGroups] = useState<string[]>(
    Object.keys(groupedFields)
  );
  const [openFieldsByGroup, setOpenFieldsByGroup] = useState<
    Record<string, string[]>
  >(initialOpenFieldsByGroup);

  const isDocumentCleared = (record?: DiscoveryRecord | null) =>
    record?.changeReason === "Cleared document" ||
    record?.lastStatusMessage === "Document cleared.";
  const isFullGenerationComplete =
    latestRecord?.changeReason === "Generated entire document";
  const isFullGenerationActive =
    isGeneratingAll ||
    (!generationCanceled &&
      (status === "running" || status === "in_progress") &&
      latestRecord?.changeReason === "Generating entire document");
  const isStaleGeneration =
    !isGeneratingAll &&
    status === "running" &&
    Boolean(latestRecord?.lastStatusMessage?.startsWith("Generating "));
  const canRestartAfterCancel =
    status === "idle" && latestRecord?.changeReason === "Generating entire document";
  const isBlockingInputs = status === "running" || isGeneratingAll || isGeneratingRandom;

  const loadProjects = async () => {
    setIsProjectsLoading(true);
    try {
      const list = await listProjects();
      setProjects(list);
      if (!activeProjectId && list.length > 0) {
        setActiveProjectId(list[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects.");
    } finally {
      setIsProjectsLoading(false);
    }
  };

  const ensureActiveProject = async (): Promise<Project | null> => {
    if (!session) {
      return null;
    }
    let currentProjects = projects;
    if (currentProjects.length === 0) {
      try {
        currentProjects = await listProjects();
        setProjects(currentProjects);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects.");
      }
    }
    let selected =
      currentProjects.find((project) => project.id === activeProjectId) ||
      currentProjects[0];
    if (!selected) {
      const created = await createProject("My first project");
      setProjects((prev) => [created, ...prev]);
      setActiveProjectId(created.id);
      selected = created;
    } else if (activeProjectId !== selected.id) {
      setActiveProjectId(selected.id);
    }
    return selected;
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim() || "Untitled project";
    setIsCreatingProject(true);
    setError(null);
    try {
      const created = await createProject(name);
      setProjects((prev) => [created, ...prev]);
      setActiveProjectId(created.id);
      setNewProjectName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project.");
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = authEmail.trim();
    const password = authPassword;
    if (!email || !password) {
      setAuthError("Email and password are required.");
      return;
    }
    setIsAuthWorking(true);
    setAuthError(null);
    try {
      const nextSession =
        authMode === "sign-in"
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password);
      if (!nextSession) {
        setAuthError(
          "Check your email to confirm the account before signing in."
        );
        return;
      }
      setSession(nextSession);
      await loadProjects();
      setIsAuthModalOpen(false);
      setAuthPassword("");
      if (pendingSaveDocument) {
        setPendingSaveDocument(false);
        await saveDocumentWithProject();
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsAuthWorking(false);
    }
  };

  useEffect(() => {
    let active = true;
    getSession()
      .then((currentSession) => {
        if (!active) return;
        setSession(currentSession);
        if (currentSession) {
          void loadProjects();
        }
      })
      .catch(() => {
        if (active) {
          setSession(null);
        }
      });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        void loadProjects();
      } else {
        setProjects([]);
        setActiveProjectId(null);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
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
      if (currentField.key === "problemUnderstanding.contextualFactors") {
        return items && typeof items === "object" ? items : null;
      }
      if (currentField.key === "problemUnderstanding.constraints") {
        return items && typeof items === "object" ? items : null;
      }
      if (currentField.key === "problemUnderstanding.targetUsersSegments") {
        return items && typeof items === "object" ? items : null;
      }
      if (currentField.key === "problemUnderstanding.userPainPoints") {
        return items && typeof items === "object" ? items : null;
      }
      if (currentField.key === "marketAndCompetitorAnalysis.marketLandscape") {
        return items && typeof items === "object" ? items : null;
      }
      if (currentField.key === "marketAndCompetitorAnalysis.competitorInventory") {
        return items && typeof items === "object" ? items : null;
      }
      if (currentField.key === "marketAndCompetitorAnalysis.competitorCapabilities") {
        return items && typeof items === "object" ? items : null;
      }
      if (currentField.key === "marketAndCompetitorAnalysis.gapsOpportunities") {
        return items && typeof items === "object" ? items : null;
      }
      if (currentField.key === "opportunityDefinition.valueDrivers") {
        return items && typeof items === "object" ? items : null;
      }
      if (currentField.key === "opportunityDefinition.feasibilityRisks") {
        return items && typeof items === "object" ? items : null;
      }
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
      productIdea: form.productIdea.trim()
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
          if (field.key === "problemUnderstanding.contextualFactors") {
            previousOutputs[fieldName] =
              items && typeof items === "object" ? items : { contextual_factors: [] };
          } else if (field.key === "problemUnderstanding.constraints") {
            previousOutputs[fieldName] =
              items && typeof items === "object" ? items : { constraints: [] };
          } else if (field.key === "problemUnderstanding.targetUsersSegments") {
            previousOutputs[fieldName] =
              items && typeof items === "object" ? items : { user_segments: [] };
          } else if (field.key === "problemUnderstanding.userPainPoints") {
            previousOutputs[fieldName] =
              items && typeof items === "object" ? items : { user_segments: [] };
          } else if (field.key === "marketAndCompetitorAnalysis.marketLandscape") {
            previousOutputs[fieldName] =
              items && typeof items === "object" ? items : emptyMarketLandscape;
          } else if (field.key === "marketAndCompetitorAnalysis.competitorInventory") {
            previousOutputs[fieldName] =
              items && typeof items === "object" ? items : emptyCompetitorInventory;
          } else if (field.key === "marketAndCompetitorAnalysis.competitorCapabilities") {
            previousOutputs[fieldName] =
              items && typeof items === "object" ? items : emptyCompetitorCapabilities;
          } else if (field.key === "marketAndCompetitorAnalysis.gapsOpportunities") {
            previousOutputs[fieldName] =
              items && typeof items === "object" ? items : emptyGapsOpportunities;
          } else if (field.key === "opportunityDefinition.valueDrivers") {
            previousOutputs[fieldName] =
              items && typeof items === "object" ? items : { value_drivers: [] };
          } else if (field.key === "opportunityDefinition.feasibilityRisks") {
            previousOutputs[fieldName] =
              items && typeof items === "object"
                ? items
                : {
                  feasibility_risks: []
                };
          } else {
            previousOutputs[fieldName] = Array.isArray(items) ? items : [];
          }
        } else {
          const rawValue = draftFields[field.key];
          const textValue = typeof rawValue === "string" ? rawValue : "";
          previousOutputs[fieldName] = fromFieldString(textValue, field.type);
        }
      }
    });
    return JSON.stringify({ ...base, ...previousOutputs }, null, 2);
  }, [draftFields, fieldDefinitions, form.productIdea, latestRecord]);

  useEffect(() => {
    void refreshLatest(true);
  }, []);

  useEffect(() => {
    const container = textareaContainerRef.current;
    if (!container) {
      return;
    }
    const resize = (textarea: HTMLTextAreaElement) => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.style.overflow = "hidden";
    };
    const handleInput = (event: Event) => {
      if (event.target instanceof HTMLTextAreaElement) {
        resize(event.target);
      }
    };
    container.addEventListener("input", handleInput);
    container.querySelectorAll("textarea").forEach((textarea) => resize(textarea));
    return () => {
      container.removeEventListener("input", handleInput);
    };
  }, []);

  useEffect(() => {
    const container = textareaContainerRef.current;
    if (!container) {
      return;
    }
    container.querySelectorAll("textarea").forEach((textarea) => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.style.overflow = "hidden";
    });
  }, [draftFields, form.productIdea]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = async () => {
    const version = latestRecord?.version ?? latestVersion ?? null;
    if (!version) {
      setError("No document available to export.");
      return;
    }
    setError(null);
    setIsExportingMarkdown(true);
    try {
      const url = `${API_BASE}/discovery/export/markdown?version=${version}`;
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Markdown export failed.");
      }
      const blob = await response.blob();
      downloadBlob(blob, `discovery-document-v${version}.md`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Markdown export failed.");
    } finally {
      setIsExportingMarkdown(false);
    }
  };

  const exportPdf = async () => {
    const version = latestRecord?.version ?? latestVersion ?? null;
    if (!version) {
      setError("No document available to export.");
      return;
    }
    setError(null);
    setIsExportingPdf(true);
    try {
      const url = `${API_BASE}/discovery/export/pdf?version=${version}`;
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "PDF export failed.");
      }
      const blob = await response.blob();
      downloadBlob(blob, `discovery-document-v${version}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF export failed.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const generateEntireDocument = async () => {
    if (isGeneratingAll) {
      return;
    }
    setStatus("running");
    setMessage("Generating entire document...");
    setQuestions([]);
    setError(null);
    setIsGeneratingAll(true);
    setOpenGroups(Object.keys(groupedFields));
    setOpenFieldsByGroup({});
    const controller = new AbortController();
    setGenerateAllAbort(controller);
    if (generateAllPollRef.current) {
      window.clearInterval(generateAllPollRef.current);
    }
    generateAllPollRef.current = window.setInterval(() => {
      void refreshLatest();
    }, 2000);

    const payload = {
      productIdea: form.productIdea.trim(),
      forceNew: true
    };

    try {
      const response = await fetch(`${API_BASE}/discovery/generate-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Generate entire document failed.");
      }
      setStatus((data.status as ApiStatus) || "approved");
      if (data.status === "needs_input") {
        setQuestions(data.questions || []);
        setMessage("Please answer the missing inputs.");
        return;
      }
      if ((data.status === "approved" || data.status === "in_progress") && data.record) {
        setLatestRecord(data.record);
        setLatestVersion(data.record.version ?? null);
        setDebugPrompt(data.record.lastPrompt ?? null);
        setDebugOutput(data.record.lastOutput ?? null);
        setMessage(
          withValidationMessage(
            withSupabaseMessage(
              data.status === "approved"
                ? "Full document generated and ready."
                : "Full document generated. Review and approve.",
              data.savedToSupabase
            ),
            data.validationStatus
          )
        );
        setOpenGroups(Object.keys(groupedFields));
        setOpenFieldsByGroup({});
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("idle");
        setMessage("Generation canceled.");
        return;
      }
      setStatus("error");
      setError(err instanceof Error ? err.message : "Generate entire document failed.");
    } finally {
      setIsGeneratingAll(false);
      setGenerateAllAbort(null);
      if (generateAllPollRef.current) {
        window.clearInterval(generateAllPollRef.current);
        generateAllPollRef.current = null;
      }
    }
  };

  const cancelGenerateAll = () => {
    if (generateAllAbort) {
      generateAllAbort.abort();
    }
    cancelGenerationRef.current = true;
    setStatus("idle");
    setMessage("Generation canceled.");
    setIsGeneratingAll(false);
    setGenerateAllAbort(null);
    setGenerationCanceled(true);
    window.setTimeout(() => {
      cancelGenerationRef.current = false;
      setGenerationCanceled(false);
    }, 10000);
    if (generateAllPollRef.current) {
      window.clearInterval(generateAllPollRef.current);
      generateAllPollRef.current = null;
    }
    void refreshLatest(true);
  };

  function loadSavedInputs() {
    const pendingIdea = localStorage.getItem("discoveryWizard.pendingIdea") || "";
    const savedIdea = localStorage.getItem("discoveryWizard.productIdea") || "";
    const rawIdea = pendingIdea || savedIdea;
    const formattedIdea = rawIdea ? formatProductIdea(rawIdea) : "";
    if (pendingIdea) {
      localStorage.removeItem("discoveryWizard.pendingIdea");
      localStorage.setItem("discoveryWizard.productIdea", formattedIdea);
    }
    setForm((prev) => ({
      ...prev,
      productIdea: formattedIdea
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
    const nextDrafts: Record<
      string,
      | string
      | { user_segments: TargetSegment[] }
      | { user_segments: PainPointGroup[] }
      | ContextualFactors
      | Constraints
      | MarketLandscape
      | CompetitorInventory
      | CompetitorCapabilities
      | Opportunities
      | ValueDrivers
      | FeasibilityRisks
    > = {};
    let approvedCount = 0;
    fieldDefinitions.forEach((field) => {
      const statusInfo = latestRecord.fieldStatus?.[field.key];
      const isApproved = statusInfo?.approved ?? false;
      const isCurrent = latestRecord.currentFieldKey === field.key;
      const rawValue = getNestedValue(
        latestRecord.discoveryDocument || emptyDocument,
        field.key
      );
      const shouldShow = isApproved || isCurrent || hasFieldValue(field, rawValue);
      const value = shouldShow ? rawValue : "";
      if (field.type === "object") {
        if (field.key === "problemUnderstanding.targetUsersSegments") {
          const segmentsValue =
            typeof value === "object" && value !== null
              ? (value as { user_segments?: TargetSegment[] })
              : { user_segments: [] };
          nextDrafts[field.key] = {
            user_segments: Array.isArray(segmentsValue.user_segments)
              ? segmentsValue.user_segments
              : []
          };
        } else if (field.key === "problemUnderstanding.userPainPoints") {
          const painPointsValue =
            typeof value === "object" && value !== null
              ? (value as { user_segments?: PainPointGroup[] })
              : { user_segments: [] };
          nextDrafts[field.key] = {
            user_segments: Array.isArray(painPointsValue.user_segments)
              ? painPointsValue.user_segments
              : []
          };
        } else if (field.key === "problemUnderstanding.contextualFactors") {
          const factorsValue =
            typeof value === "object" && value !== null
              ? (value as ContextualFactors)
              : { contextual_factors: [] };
          nextDrafts[field.key] = {
            contextual_factors: Array.isArray(factorsValue.contextual_factors)
              ? factorsValue.contextual_factors
              : []
          };
        } else if (field.key === "problemUnderstanding.constraints") {
          const constraintsValue =
            typeof value === "object" && value !== null
              ? (value as Constraints)
              : { constraints: [] };
          nextDrafts[field.key] = {
            constraints: Array.isArray(constraintsValue.constraints)
              ? constraintsValue.constraints
              : []
          };
        } else if (field.key === "marketAndCompetitorAnalysis.marketLandscape") {
          const landscapeValue =
            typeof value === "object" && value !== null
              ? (value as MarketLandscape)
              : null;
          nextDrafts[field.key] = normalizeMarketLandscapeValue(landscapeValue);
        } else if (field.key === "marketAndCompetitorAnalysis.competitorInventory") {
          const inventoryValue =
            typeof value === "object" && value !== null
              ? (value as CompetitorInventory)
              : null;
          nextDrafts[field.key] = normalizeCompetitorInventoryValue(inventoryValue);
        } else if (field.key === "marketAndCompetitorAnalysis.competitorCapabilities") {
          const capabilityValue =
            typeof value === "object" && value !== null
              ? (value as CompetitorCapabilities)
              : null;
          nextDrafts[field.key] = normalizeCompetitorCapabilitiesValue(capabilityValue);
        } else if (field.key === "marketAndCompetitorAnalysis.gapsOpportunities") {
          const gapsValue =
            typeof value === "object" && value !== null
              ? (value as Opportunities)
              : null;
          nextDrafts[field.key] = normalizeGapsOpportunitiesValue(gapsValue);
        } else if (field.key === "opportunityDefinition.valueDrivers") {
          const driversValue =
            typeof value === "object" && value !== null
              ? (value as ValueDrivers)
              : null;
          nextDrafts[field.key] = normalizeValueDriversValue(driversValue);
        } else if (field.key === "opportunityDefinition.feasibilityRisks") {
          const risksValue =
            typeof value === "object" && value !== null
              ? (value as FeasibilityRisks)
              : null;
          nextDrafts[field.key] = normalizeFeasibilityRisksValue(risksValue);
        } else {
          const outputKey = field.outputKey || "";
          const collection =
            outputKey && typeof value === "object" && value !== null
              ? (value as Record<string, unknown>)[outputKey]
              : undefined;
          nextDrafts[field.key] = Array.isArray(collection) ? collection : [];
        }
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
    setProgressText(`Step ${stepNumber} of ${total} ready (${approvedCount}/${total}).`);
  }, [latestRecord]);

  const withSupabaseMessage = (text: string) => text;
  const withValidationMessage = (text: string) => text;
  const isEmptyDocumentView =
    !latestRecord || isDocumentCleared(latestRecord);

  useEffect(() => {
    if (isEmptyDocumentView) {
      setOpenGroups(Object.keys(groupedFields));
      setOpenFieldsByGroup(initialOpenFieldsByGroup);
    }
  }, [isEmptyDocumentView]);

    useEffect(() => {
      const lastGeneratedKey = latestRecord?.lastOutputFieldKey;
      if (
        latestRecord?.approved ||
        isFullGenerationActive ||
        latestRecord?.changeReason === "Generated entire document" ||
        latestRecord?.changeReason === "Generating entire document"
      ) {
        return;
      }
      if (!lastGeneratedKey) {
        return;
      }
    if (lastAutoOpenedFieldRef.current === lastGeneratedKey) {
      return;
    }
    const lastField = fieldDefinitions.find((field) => field.key === lastGeneratedKey);
    if (!lastField) {
      return;
    }
    const currentValue = getNestedValue(latestRecord.discoveryDocument, lastGeneratedKey);
    if (!hasFieldValue(lastField, currentValue)) {
      return;
    }
    const groupName = fieldGroupMap[lastGeneratedKey];
    if (!groupName) {
      return;
    }
    setOpenGroups((prev) =>
      prev.includes(groupName) ? prev : prev.concat(groupName)
    );
    setOpenFieldsByGroup((prev) => {
      const currentOpen = prev[groupName] || [];
      if (currentOpen.includes(lastGeneratedKey)) {
        return prev;
      }
      return {
        ...prev,
        [groupName]: currentOpen.concat(lastGeneratedKey)
      };
    });
    lastAutoOpenedFieldRef.current = lastGeneratedKey;
  }, [latestRecord?.lastOutputFieldKey, latestRecord?.discoveryDocument, latestRecord?.approved]);

  useEffect(() => {
    if (latestRecord?.changeReason === "Generated entire document") {
      setOpenGroups(Object.keys(groupedFields));
      setOpenFieldsByGroup({});
    }
  }, [latestRecord?.changeReason, groupedFields]);

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
        let data: any = null;
        try {
          data = await response.json();
        } catch {
          data = { message: "Request failed with non-JSON response." };
        }
        if (response.ok) {
          return data as T;
        }
        captureLlmError(data);
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
        const pendingIdea = localStorage.getItem("discoveryWizard.pendingIdea") || "";
        const formattedIdea = pendingIdea
          ? formatProductIdea(pendingIdea)
          : payload.record.productIdea
            ? formatProductIdea(payload.record.productIdea)
            : "";
        if (pendingIdea) {
          localStorage.removeItem("discoveryWizard.pendingIdea");
        }
        setForm({
          productIdea: formattedIdea
        });
        if (formattedIdea) {
          localStorage.setItem("discoveryWizard.productIdea", formattedIdea);
        }
        const nextStatus = isDocumentCleared(payload.record)
          ? "idle"
          : payload.status || "in_progress";
        if (
          cancelGenerationRef.current &&
          payload.record.changeReason === "Generating entire document" &&
          payload.record.lastStatusMessage?.startsWith("Generating ")
        ) {
          setStatus("idle");
          setMessage("Generation canceled.");
          return;
        }
        const isStale =
          nextStatus === "in_progress" &&
          payload.record.lastStatusMessage?.startsWith("Generating ") &&
          payload.record.changeReason !== "Generating entire document";
        if (isStale && !isGeneratingAll && !isFullGenerationActive) {
          setStatus("idle");
          setMessage("Generation interrupted. Please restart.");
          return;
        }
        setStatus(nextStatus);
        if (payload.record.lastStatusMessage) {
          setMessage(payload.record.lastStatusMessage);
        } else {
          setMessage(
            nextStatus === "idle" && isDocumentCleared(payload.record)
              ? "Document cleared."
              : nextStatus === "approved"
                ? "Latest discovery document is ready."
                : "Latest discovery document is in progress."
          );
        }
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
    const firstFieldLabel = fieldDefinitions[0]?.label || "first section";
    setMessage(`Generating ${firstFieldLabel}...`);
    setQuestions([]);
    setError(null);

    const payload = {
      productIdea: form.productIdea.trim(),
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
        const fallbackMessage =
          data.resultType === "created"
            ? `${firstFieldLabel} generated and saved. Review and approve.`
            : "Continue approving fields in order.";
        setMessage(data.record.lastStatusMessage || fallbackMessage);
      }

      if (data.status === "approved") {
        setMessage(withSupabaseMessage("This document is now ready.", data.savedToSupabase));
      }
      } catch (err) {
        setStatus("error");
        captureLlmError(err?.data);
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

    const currentIndex = fieldDefinitions.findIndex((field) => field.key === fieldKey);
    const nextFieldLabel =
      currentIndex >= 0 && currentIndex + 1 < fieldDefinitions.length
        ? fieldDefinitions[currentIndex + 1].label
        : null;
    setStatus("in_progress");
    setMessage(
      nextFieldLabel
        ? `Approving and generating ${nextFieldLabel}...`
        : "Finalizing document..."
    );
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
        const fallbackMessage =
          data.status === "approved"
            ? "All fields ready. Discovery document is complete."
            : "Field approved. Next field is ready.";
        setMessage(data.record.lastStatusMessage || fallbackMessage);
        const nextFieldKey = data.record.currentFieldKey;
        if (
          data.status !== "approved" &&
          nextFieldKey &&
          nextFieldKey !== fieldKey &&
          !hasGeneratedLaterFieldsForRecord(data.record, nextFieldKey)
        ) {
          await executeRegenerate(nextFieldKey, { mode: "generated" });
        }
      }
      } catch (err) {
        setStatus("error");
        captureLlmError(err?.data);
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
      if (isFullGenerationActive) {
        cancelGenerateAll();
      }
      setConfirmClearDocument(true);
    }

    async function saveDocumentWithProject() {
      if (!latestVersion || !latestRecord) {
        setError("No document to save.");
        return;
      }
      setIsSavingDocument(true);
      setError(null);
      try {
        const nextDocument = buildDocumentFromDrafts(
          latestRecord.discoveryDocument || emptyDocument,
          draftFields
        );
        const project = await ensureActiveProject();
        if (!project) {
          setIsAuthModalOpen(true);
          setPendingSaveDocument(true);
          return;
        }
        await saveProjectDocument(project.id, nextDocument, "discovery");
        const data = await postWithRetry(
          `${API_BASE}/discovery/save`,
          { version: latestVersion, discoveryDocument: nextDocument },
          () => {
            setMessage("Error saving document. Retrying...");
          }
        );
        if (data.record) {
          setLatestRecord(data.record);
          setStatus(data.status || "in_progress");
          setMessage("Document saved.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed.");
      } finally {
        setIsSavingDocument(false);
      }
    }

    async function saveDocument() {
      if (!latestVersion || !latestRecord) {
        setError("No document to save.");
        return;
      }
      if (!session) {
        setPendingSaveDocument(true);
        setIsAuthModalOpen(true);
        return;
      }
      await saveDocumentWithProject();
    }

  const handleStartFirstSection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      generationCanceled &&
      latestRecord?.changeReason === "Generating entire document"
    ) {
      await confirmClearDocumentAction();
      cancelGenerationRef.current = false;
      setGenerationCanceled(false);
    }
    if (latestRecord && !isDocumentCleared(latestRecord)) {
      setConfirmStartMode("first-section");
      return;
    }
    await handleSubmit(event);
  };

  const handleGenerateEntireDocument = async () => {
    if (latestRecord?.approved) {
      setConfirmStartMode("entire-document");
      return;
    }
    await generateEntireDocument();
  };

  const handleGenerateRandomInputs = async () => {
    setError(null);
    setIsGeneratingRandom(true);
    try {
      const response = await fetch(`${API_BASE}/discovery/random-inputs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentProductIdea: form.productIdea.trim()
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Random generation failed.");
      }
      const productIdea = typeof data?.productIdea === "string" ? data.productIdea : "";
      if (!productIdea) {
        throw new Error("Random generation returned incomplete data.");
      }
      const formattedIdea = formatProductIdea(productIdea);
      setForm((prev) => {
        localStorage.setItem("discoveryWizard.productIdea", formattedIdea);
        return {
          ...prev,
          productIdea: formattedIdea
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Random generation failed.");
    } finally {
      setIsGeneratingRandom(false);
    }
  };

  const confirmStartNewDocument = async () => {
    if (!confirmStartMode) {
      return;
    }
    if (confirmStartMode === "first-section") {
      const syntheticEvent = new Event("submit", { bubbles: true, cancelable: true });
      await handleSubmit(syntheticEvent as unknown as FormEvent<HTMLFormElement>);
    } else {
      await generateEntireDocument();
    }
    setConfirmStartMode(null);
  };

    async function regenerateField(fieldKey: string) {
      if (!latestVersion) {
        setError("No draft available to regenerate.");
        return;
      }
      const hasLaterGenerated =
        hasGeneratedLaterFields(fieldKey) || hasGeneratedLaterOutput(fieldKey);
      if (isFullGenerationActive) {
        cancelGenerateAll();
      }
      if (hasLaterGenerated) {
        setConfirmRegenerateFieldKey(fieldKey);
        return;
      }
      await executeRegenerate(fieldKey, { mode: "regenerated" });
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
        setStatus("idle");
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

    function getFieldOrder() {
      return latestRecord?.fieldOrder?.length
        ? latestRecord.fieldOrder
        : fieldDefinitions.map((field) => field.key);
    }

    function hasGeneratedLaterFields(fieldKey: string) {
      const order = getFieldOrder();
      const index = order.indexOf(fieldKey);
      if (index < 0) {
        return false;
      }
      return order.slice(index + 1).some((key) => {
        const statusInfo = latestRecord?.fieldStatus?.[key];
        if (statusInfo?.approved) {
          return true;
        }
      const rawValue = draftFields[key];
      if (Array.isArray(rawValue)) {
        return rawValue.length > 0;
      }
      if (rawValue && typeof rawValue === "object") {
        const field = fieldDefinitions.find((item) => item.key === key);
        return field ? hasFieldValue(field, rawValue) : false;
      }
      return typeof rawValue === "string" && rawValue.trim().length > 0;
      });
    }

    function hasGeneratedLaterOutput(fieldKey: string) {
      if (!latestRecord?.lastOutputFieldKey) {
        return false;
      }
      const order = getFieldOrder();
      const fieldIndex = order.indexOf(fieldKey);
      const outputIndex = order.indexOf(latestRecord.lastOutputFieldKey);
      if (fieldIndex < 0 || outputIndex < 0) {
        return false;
      }
      return outputIndex > fieldIndex;
    }

  function hasGeneratedLaterFieldsForRecord(record: DiscoveryRecord, fieldKey: string) {
    const order = record.fieldOrder?.length
      ? record.fieldOrder
      : fieldDefinitions.map((field) => field.key);
    const index = order.indexOf(fieldKey);
    if (index < 0) {
      return false;
    }
    return order.slice(index + 1).some((key) => {
      const statusInfo = record.fieldStatus?.[key];
      if (statusInfo?.approved) {
        return true;
      }
      const field = fieldDefinitions.find((item) => item.key === key);
      if (!field) {
        return false;
      }
      const value = getNestedValue(record.discoveryDocument, key);
      return hasFieldValue(field, value);
    });
  }

  function collapseLaterFields(fieldKey: string) {
    const order = latestRecord?.fieldOrder?.length
      ? latestRecord.fieldOrder
      : fieldDefinitions.map((field) => field.key);
    const index = order.indexOf(fieldKey);
    if (index < 0) {
      return;
    }
    const laterKeys = new Set(order.slice(index + 1));
    if (laterKeys.size === 0) {
      return;
    }
    setOpenFieldsByGroup((prev) => {
      const next: Record<string, string[]> = {};
      for (const [group, keys] of Object.entries(prev)) {
        next[group] = (keys || []).filter((key) => !laterKeys.has(key));
      }
      return next;
    });
  }

    async function executeRegenerate(
      fieldKey: string,
      options?: { mode?: "generated" | "regenerated" }
    ) {
      if (!latestVersion) {
        setError("No draft available to regenerate.");
        return;
      }

      if (options?.mode === "generated") {
        setAutoGeneratingFieldKey(fieldKey);
      } else if (options?.mode === "regenerated") {
        collapseLaterFields(fieldKey);
        const order = getFieldOrder();
        const index = order.indexOf(fieldKey);
        if (index >= 0) {
          setLatestRecord((prev) => {
            if (!prev) {
              return prev;
            }
            let nextDocument = prev.discoveryDocument;
            const nextStatus = { ...(prev.fieldStatus || {}) };
            for (const key of order.slice(index + 1)) {
              const emptyValue = cloneJson(
                getNestedValue(emptyDocument, key)
              );
              nextDocument = setNestedValue(nextDocument, key, emptyValue);
              nextStatus[key] = { approved: false, approvedAt: null };
            }
            return {
              ...prev,
              discoveryDocument: nextDocument,
              fieldStatus: nextStatus,
              currentFieldKey: fieldKey,
              approved: false,
              approvedAt: null
            };
          });
        }
      }

      const currentField = fieldDefinitions.find((field) => field.key === fieldKey);
      const currentLabel = currentField?.label || "section";
      const isGenerated = options?.mode === "generated";
      setStatus("in_progress");
      setMessage(
        isGenerated ? `Generating ${currentLabel}...` : `Regenerating ${currentLabel}...`
      );
      setRegeneratingFieldKey(fieldKey);
      setError(null);

    try {
      const data = await postWithRetry(
        `${API_BASE}/discovery/field/regenerate`,
        { version: latestVersion, fieldKey, productIdea: form.productIdea.trim() },
        () => {
          setMessage("Error LLM response. Requesting again...");
        }
      );
      if (data.record) {
        setLatestRecord(data.record);
        setStatus("in_progress");
        setDebugPrompt(data.record.lastPrompt ?? null);
        setDebugOutput(data.record.lastOutput ?? null);
        const fallbackMessage = isGenerated
          ? `${currentLabel} generated and saved. Review and approve.`
          : `${currentLabel} regenerated and saved. Review and approve.`;
        setMessage(fallbackMessage);
      }
      } catch (err) {
        setStatus("error");
        captureLlmError(err?.data);
        if (err?.data?.lastPrompt) {
          setDebugPrompt(err.data.lastPrompt);
        }
      if (typeof err?.data?.lastOutput === "string") {
        setDebugOutput(err.data.lastOutput);
      }
      setError(err instanceof Error ? err.message : "Regenerate failed.");
    } finally {
      setRegeneratingFieldKey(null);
      if (options?.mode === "generated") {
        setAutoGeneratingFieldKey((prev) => (prev === fieldKey ? null : prev));
      }
    }
  }

  const statusClass = statusColors[status] || statusColors.idle;

  return (
    <div ref={textareaContainerRef} className="space-y-6">
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
                      void executeRegenerate(fieldKey, { mode: "regenerated" });
                    }
                  }}
                >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmStartMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-5 shadow-lg">
            <p className="text-sm font-semibold text-gray-900">Start a new document?</p>
            <p className="mt-2 text-sm text-gray-600">
              The current document will be erased. Continue?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm"
                onClick={() => setConfirmStartMode(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded border border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700"
                onClick={confirmStartNewDocument}
              >
                Yes, erase
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
        <div className="flex items-start gap-3">
          <img
            src={discoveryDocumentIcon}
            alt=""
            className="h-7 w-7"
          />
          <div>
            <h1 className="text-xl font-semibold">Discovery Document Wizard</h1>
            <p className="text-sm text-gray-600">
              Enter your idea, then generate the document section by section (recommended) or as a single complete run.
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <div className="space-y-6">
          <form
            className="space-y-4 rounded-lg border bg-white p-5 shadow-sm"
            onSubmit={handleStartFirstSection}
          >
          <div>
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-gray-700">
                Product idea
              </label>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs font-medium text-blue-700 disabled:opacity-60"
                onClick={handleGenerateRandomInputs}
                disabled={isBlockingInputs || isGeneratingRandom}
              >
                {isGeneratingRandom ? "Generating..." : "Generate random"}
              </button>
            </div>
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
              placeholder={`This product is designed for individuals with chronic pain who live in rural areas, providing a personalized virtual reality therapy program tailored to their specific condition and environment.

The core mechanic involves using AI-powered avatars to simulate real-world environments, allowing users to confront and overcome triggers that exacerbate their pain.

By doing so, users experience a sense of control and empowerment over their wellbeing, leading to improved mental health outcomes.`}
              required
              disabled={isBlockingInputs}
            />
          </div>

          

  <div className="flex items-center gap-3">
    <button
      type="submit"
      className="min-w-[230px] rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      disabled={
        status === "running" ||
        isGeneratingAll ||
        (!isStaleGeneration &&
          !canRestartAfterCancel &&
          Boolean(latestRecord) &&
          !latestRecord.approved &&
          !isDocumentCleared(latestRecord))
      }
    >
      Generate First Section
    </button>

    <button
      type="button"
      className="rounded border px-3 py-2 text-sm disabled:opacity-60"
      onClick={handleGenerateEntireDocument}
      disabled={
        status === "running" ||
        isFullGenerationActive ||
        (!isStaleGeneration &&
          !canRestartAfterCancel &&
          Boolean(latestRecord) &&
          !latestRecord.approved &&
          !isDocumentCleared(latestRecord))
      }
    >
      {isGeneratingAll ? "Generating…" : "Generate Entire Document"}
    </button>

    {isFullGenerationActive && (
      <button
        type="button"
        className="rounded border px-3 py-2 text-sm text-red-600 disabled:opacity-60"
        onClick={cancelGenerateAll}
      >
        Cancel
      </button>
    )}
  </div>
          </form>

          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 whitespace-nowrap flex-nowrap">
                <h2 className="text-xl font-semibold">Discovery Document</h2>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                >
                  {statusCopy[status]}
                </span>
                {message && (
                  <span className="text-xs text-gray-600">{message}</span>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 text-right text-sm text-gray-600">
                {!isEmptyDocumentView && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="rounded border px-3 py-2 text-sm disabled:opacity-60"
                      onClick={exportMarkdown}
                      disabled={!latestVersion || isGeneratingAll || isExportingMarkdown}
                    >
                      {isExportingMarkdown ? "Preparing MD…" : "Export MD"}
                    </button>
                    <button
                      type="button"
                      className="rounded border px-3 py-2 text-sm disabled:opacity-60"
                      onClick={exportPdf}
                      disabled={!latestVersion || isGeneratingAll || isExportingPdf}
                    >
                      {isExportingPdf ? "Preparing PDF…" : "Export PDF"}
                    </button>
                    <button
                      type="button"
                      className="rounded border px-3 py-2 text-sm disabled:opacity-60"
                      onClick={clearDocument}
                      disabled={!latestVersion || isClearing || isGeneratingAll}
                    >
                      {isClearing ? "Clearing…" : "Clear Document"}
                    </button>
                  </div>
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
                              const isGeneratingCurrent = regeneratingFieldKey === field.key;
                              const isGeneratingLabel =
                                isGeneratingCurrent && message.startsWith("Generating ");
                              const isAutoGeneratingCurrent =
                                isGeneratingCurrent && autoGeneratingFieldKey === field.key;
                            const recordValue = getNestedValue(
                              latestRecord?.discoveryDocument || emptyDocument,
                              field.key
                            );
                              const hasValue = hasFieldValue(field, recordValue);
                              const shouldRender =
                                isApproved || hasValue || (isCurrent && !isAutoGeneratingCurrent);
                              const showRegenerate = isFullGenerationActive
                                ? hasValue && !isGeneratingCurrent
                                : true;
                              const isEditable =
                                !!latestRecord &&
                                !latestRecord.approved &&
                                !isApproved &&
                                !isGeneratingAll &&
                                !isFullGenerationActive &&
                                !isGeneratingCurrent &&
                                (isCurrent || (isFullGenerationComplete && hasValue));
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
                                <div className="flex items-center justify-between">
                                  <AccordionTrigger
                                    className={`flex-1 py-2 text-sm font-semibold hover:no-underline ${headerClass}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span>{field.label}</span>
                                        {isApproved && (
                                          <span className="text-xs font-medium text-green-600">
                                            Ready
                                          </span>
                                        )}
                                    </div>
                                  </AccordionTrigger>
                                  {!isApproved && isCurrent && !isGeneratingCurrent && !isFullGenerationActive && (
                                    <button
                                      type="button"
                                      className="rounded border bg-white px-3 py-2 text-sm font-normal text-gray-700 disabled:opacity-60"
                                      onClick={() => clearField(field.key)}
                                      disabled={clearingFieldKey === field.key}
                                    >
                                      {clearingFieldKey === field.key ? "Clearing…" : "Clear block"}
                                    </button>
                                  )}
                                </div>
                                <AccordionContent className="pt-2">
                                  {field.type === "object" ? (
                                    field.key === "problemUnderstanding.targetUsersSegments" ? (
                                      <TargetSegmentsEditor
                                        title={field.label}
                                        showTitle={false}
                                        segments={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as {
                                                user_segments?: TargetSegment[];
                                              }).user_segments || []
                                            : []
                                        }
                                        onChange={(nextValue) =>
                                          setDraftFields((prev) => ({
                                            ...prev,
                                            [field.key]: { user_segments: nextValue }
                                          }))
                                        }
                                        onApprove={() => approveField(field.key, field.type)}
                                        onRegenerate={() => regenerateField(field.key)}
                                        onClear={() => clearField(field.key)}
                                        approved={isApproved}
                                        disabled={isBlocked}
                                        isApproving={approvingFieldKey === field.key}
                                        isRegenerating={regeneratingFieldKey === field.key}
                                        regenerateLabel={
                                          isGeneratingLabel ? "Generating..." : "Regenerating..."
                                        }
                                        isClearing={clearingFieldKey === field.key}
                                        showRegenerate={showRegenerate}
                                        hideApprove={isFullGenerationActive}
                                      />
                                    ) : field.key === "problemUnderstanding.userPainPoints" ? (
                                      <PainPointsEditor
                                        title={field.label}
                                        showTitle={false}
                                        value={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as {
                                                user_segments?: PainPointGroup[];
                                              }).user_segments || []
                                            : []
                                        }
                                        segmentOptions={
                                          typeof draftFields[
                                            "problemUnderstanding.targetUsersSegments"
                                          ] === "object" &&
                                          draftFields[
                                            "problemUnderstanding.targetUsersSegments"
                                          ] !== null
                                            ? (draftFields[
                                                "problemUnderstanding.targetUsersSegments"
                                              ] as {
                                                user_segments?: TargetSegment[];
                                              }).user_segments || []
                                            : []
                                        }
                                        onChange={(nextValue) =>
                                          setDraftFields((prev) => ({
                                            ...prev,
                                            [field.key]: { user_segments: nextValue }
                                          }))
                                        }
                                        onApprove={() => approveField(field.key, field.type)}
                                        onRegenerate={() => regenerateField(field.key)}
                                        onClear={() => clearField(field.key)}
                                        approved={isApproved}
                                        disabled={isBlocked}
                                        isApproving={approvingFieldKey === field.key}
                                        isRegenerating={regeneratingFieldKey === field.key}
                                        regenerateLabel={
                                          isGeneratingLabel ? "Generating..." : "Regenerating..."
                                        }
                                        isClearing={clearingFieldKey === field.key}
                                        showRegenerate={showRegenerate}
                                        hideApprove={isFullGenerationActive}
                                      />
                                    ) : field.key === "problemUnderstanding.contextualFactors" ? (
                                      <ContextualFactorsEditor
                                        title={field.label}
                                        showTitle={false}
                                        value={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as ContextualFactors)
                                            : { contextual_factors: [] }
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
                                        regenerateLabel={
                                          isGeneratingLabel ? "Generating..." : "Regenerating..."
                                        }
                                        isClearing={clearingFieldKey === field.key}
                                        showRegenerate={showRegenerate}
                                        hideApprove={isFullGenerationActive}
                                      />
                                    ) : field.key === "problemUnderstanding.constraints" ? (
                                      <ConstraintsEditor
                                        title={field.label}
                                        showTitle={false}
                                        value={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as Constraints)
                                            : { constraints: [] }
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
                                        regenerateLabel={
                                          isGeneratingLabel ? "Generating..." : "Regenerating..."
                                        }
                                        isClearing={clearingFieldKey === field.key}
                                        showRegenerate={showRegenerate}
                                        hideApprove={isFullGenerationActive}
                                      />
                                    ) : field.key === "marketAndCompetitorAnalysis.marketLandscape" ? (
                                      <MarketLandscapeEditor
                                        title={field.label}
                                        showTitle={false}
                                        value={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as MarketLandscape)
                                            : emptyMarketLandscape
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
                                        regenerateLabel={
                                          isGeneratingLabel ? "Generating..." : "Regenerating..."
                                        }
                                        isClearing={clearingFieldKey === field.key}
                                        showRegenerate={showRegenerate}
                                        hideApprove={isFullGenerationActive}
                                      />
                                    ) : field.key === "marketAndCompetitorAnalysis.competitorInventory" ? (
                                      <CompetitorInventoryEditor
                                        title={field.label}
                                        showTitle={false}
                                        value={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as CompetitorInventory)
                                            : emptyCompetitorInventory
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
                                        regenerateLabel={
                                          isGeneratingLabel ? "Generating..." : "Regenerating..."
                                        }
                                        isClearing={clearingFieldKey === field.key}
                                        showRegenerate={showRegenerate}
                                        hideApprove={isFullGenerationActive}
                                      />
                                    ) : field.key === "marketAndCompetitorAnalysis.competitorCapabilities" ? (
                                      <CompetitorCapabilitiesEditor
                                        title={field.label}
                                        showTitle={false}
                                        value={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as CompetitorCapabilities)
                                            : emptyCompetitorCapabilities
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
                                        regenerateLabel={
                                          isGeneratingLabel ? "Generating..." : "Regenerating..."
                                        }
                                        isClearing={clearingFieldKey === field.key}
                                        showRegenerate={showRegenerate}
                                        hideApprove={isFullGenerationActive}
                                      />
                                    ) : field.key === "marketAndCompetitorAnalysis.gapsOpportunities" ? (
                                      <OpportunitiesEditor
                                        title={field.label}
                                        showTitle={false}
                                        value={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as Opportunities)
                                            : emptyGapsOpportunities
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
                                        regenerateLabel={
                                          isGeneratingLabel ? "Generating..." : "Regenerating..."
                                        }
                                        isClearing={clearingFieldKey === field.key}
                                        showRegenerate={showRegenerate}
                                        hideApprove={isFullGenerationActive}
                                      />
                                    ) : field.key === "opportunityDefinition.valueDrivers" ? (
                                      <ValueDriversEditor
                                        title={field.label}
                                        showTitle={false}
                                        value={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as ValueDrivers)
                                            : { value_drivers: [] }
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
                                        regenerateLabel={
                                          isGeneratingLabel ? "Generating..." : "Regenerating..."
                                        }
                                        isClearing={clearingFieldKey === field.key}
                                        showRegenerate={showRegenerate}
                                        hideApprove={isFullGenerationActive}
                                      />
                                    ) : field.key === "opportunityDefinition.feasibilityRisks" ? (
                                      <FeasibilityRisksEditor
                                        title={field.label}
                                        showTitle={false}
                                        value={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as FeasibilityRisks)
                                            : { feasibility_risks: [] }
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
                                        regenerateLabel={
                                          isGeneratingLabel ? "Generating..." : "Regenerating..."
                                        }
                                        isClearing={clearingFieldKey === field.key}
                                        showRegenerate={showRegenerate}
                                        hideApprove={isFullGenerationActive}
                                      />
                                    ) : null
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
                                        regenerateLabel={isGeneratingLabel ? "Generating..." : "Regenerating..."}
                                      isClearing={clearingFieldKey === field.key}
                                        showRegenerate={showRegenerate}
                                        hideApprove={isFullGenerationActive}
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
            {!isEmptyDocumentView && (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  onClick={saveDocument}
                  disabled={
                    !latestVersion ||
                    isSavingDocument ||
                    isGeneratingAll ||
                    status === "running"
                  }
                >
                  {isSavingDocument ? "Saving..." : "Save Document"}
                </button>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          {session ? (
            <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Projects</p>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-700"
                  onClick={async () => {
                    try {
                      await signOut();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Sign out failed.");
                    }
                  }}
                >
                  Sign out
                </button>
              </div>
              {isProjectsLoading ? (
                <p className="mt-2 text-xs text-slate-500">Loading projects...</p>
              ) : (
                <>
                  {projects.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">No projects yet.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {projects.map((project) => {
                        const isActive = activeProjectId === project.id;
                        return (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => setActiveProjectId(project.id)}
                            className={`w-full rounded border px-2 py-2 text-left text-xs ${
                              isActive
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="text-sm font-medium">
                              {project.name || "Untitled project"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {project.created_at}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (isCreatingProject) return;
                      void handleCreateProject();
                    }}
                  >
                    <input
                      className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
                      placeholder="New project name"
                      value={newProjectName}
                      onChange={(event) => setNewProjectName(event.target.value)}
                    />
                    <button
                      type="submit"
                      className="rounded border border-blue-600 px-2 py-1 text-xs font-medium text-blue-700 disabled:opacity-60"
                      disabled={isCreatingProject}
                    >
                      {isCreatingProject ? "Creating..." : "Add"}
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <p className="font-semibold">Projects</p>
              <p className="mt-2 text-xs text-slate-500">
                Sign in to save documents and manage projects.
              </p>
              <button
                type="button"
                className="mt-3 rounded border border-blue-600 px-3 py-1 text-xs font-medium text-blue-700"
                onClick={() => {
                  setAuthMode("sign-in");
                  setIsAuthModalOpen(true);
                }}
              >
                Sign in
              </button>
            </div>
          )}
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
          <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Last LLM error</p>
              {lastLlmError && (
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-700"
                  onClick={() => setLastLlmError(null)}
                >
                  Clear
                </button>
              )}
            </div>
            {!lastLlmError && (
              <p className="mt-2 text-xs text-slate-500">No errors captured yet.</p>
            )}
            {lastLlmError?.message && (
              <p className="mt-2 text-xs text-slate-600">{lastLlmError.message}</p>
            )}
            {lastLlmError?.lastOutputFieldKey && (
              <p className="mt-2 text-xs text-slate-500">
                Field: {lastLlmError.lastOutputFieldKey}
              </p>
            )}
            {status === "error" && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-slate-600">Last prompt</p>
                <textarea
                  readOnly
                  className="mt-1 w-full resize-none overflow-hidden rounded bg-slate-50 p-2 text-xs text-slate-700"
                  rows={6}
                  ref={errorPromptRef}
                  value={formatDebugValue(errorPromptText)}
                />
              </div>
            )}
            {status === "error" && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-slate-600">Last output</p>
                <textarea
                  readOnly
                  className="mt-1 w-full resize-none overflow-hidden rounded bg-slate-50 p-2 text-xs text-slate-700"
                  rows={6}
                  ref={errorOutputRef}
                  value={formatDebugValue(errorOutputText)}
                />
              </div>
            )}
          </div>

          <Accordion type="multiple" className="space-y-2">
            <AccordionItem value="llm-prompt" className="border rounded">
              <AccordionTrigger className="px-3 py-2 text-sm font-medium hover:no-underline">
                LLM Prompt
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <textarea
                  readOnly
                  className="w-full resize-none overflow-hidden rounded border bg-gray-50 p-3 text-xs text-gray-700"
                  rows={8}
                  ref={llmPromptRef}
                  value={formatDebugValue(
                    status === "error"
                      ? debugPrompt || latestRecord?.lastPrompt || null
                      : latestRecord?.lastPrompt || debugPrompt || null
                  )}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="llm-output" className="border rounded">
              <AccordionTrigger className="px-3 py-2 text-sm font-medium hover:no-underline">
                LLM output
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <textarea
                  readOnly
                  className="w-full resize-none overflow-hidden rounded border bg-gray-50 p-3 text-xs text-gray-700"
                  rows={8}
                  ref={llmOutputRef}
                  value={formatDebugValue(
                    status === "error"
                      ? debugOutput || latestRecord?.lastOutput || null
                      : latestRecord?.lastOutput || debugOutput || null
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </aside>
      </section>
      <Dialog
        open={isAuthModalOpen}
        onOpenChange={(open) => {
          setIsAuthModalOpen(open);
          if (!open) {
            setAuthError(null);
            setAuthPassword("");
            setPendingSaveDocument(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {authMode === "sign-in" ? "Sign in" : "Create an account"}
            </DialogTitle>
            <DialogDescription>
              {pendingSaveDocument
                ? "Sign in to save this document and manage projects."
                : "Sign in to save documents and manage projects."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleAuthSubmit}>
            <div>
              <label className="text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="********"
              />
            </div>
            {authError && <p className="text-xs text-red-600">{authError}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm"
                onClick={() => setIsAuthModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={isAuthWorking}
              >
                {isAuthWorking
                  ? authMode === "sign-in"
                    ? "Signing in..."
                    : "Creating account..."
                  : authMode === "sign-in"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </DialogFooter>
          </form>
          <div className="pt-2 text-xs text-slate-500">
            {authMode === "sign-in" ? "No account yet?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-medium text-blue-600"
              onClick={() =>
                setAuthMode((prev) => (prev === "sign-in" ? "sign-up" : "sign-in"))
              }
            >
              {authMode === "sign-in" ? "Create one" : "Sign in"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function useOpenItems(items: unknown[], prefix: string) {
  const [openItems, setOpenItems] = useState<string[]>([]);
  useEffect(() => {
    const keys = items.map((_, index) => `${prefix}-${index}`);
    setOpenItems((prev) => {
      const next = prev.filter((key) => keys.includes(key));
      keys.forEach((key) => {
        if (!next.includes(key)) {
          next.push(key);
        }
      });
      return next;
    });
  }, [items.length, prefix]);
  return [openItems, setOpenItems] as const;
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
  showRegenerate?: boolean;
    regenerateLabel?: string;
    hideApprove?: boolean;
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
  showTitle = true,
  showRegenerate = true,
    regenerateLabel,
    hideApprove = false
}: FieldEditorProps & { showTitle?: boolean }) {
  const isEmpty = !value || value.trim().length === 0;
  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Ready</span>}
          </div>
          {!approved && (
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:opacity-60"
              onClick={onClear}
              disabled={isClearing}
            >
              {isClearing ? "Clearing…" : "Clear block"}
            </button>
          )}
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
        {!approved && !hideApprove && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || approved || isApproving || isEmpty}
          >
            {isApproving ? "Approving…" : "Approve and Proceed"}
          </button>
        )}
        {showRegenerate && (
          <button
            type="button"
            className="inline-flex min-w-[108px] items-center justify-center rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (regenerateLabel ?? "Regenerating...") : "Regenerate"}
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
  showRegenerate?: boolean;
  regenerateLabel?: string;
  hideApprove?: boolean;
};

const SEGMENT_TYPE_OPTIONS: TargetSegment["segment_type"][] = [
  "primary",
  "secondary"
];

const SEVERITY_ORDER: Record<PainPoint["severity"], number> = {
  high: 0,
  medium: 1,
  low: 2
};

const FREQUENCY_ORDER: Record<PainPoint["frequency"], number> = {
  high: 0,
  medium: 1,
  low: 2
};

const toLineItems = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const toLineValue = (items: string[]) => items.join("\n");

const normalizeSegments = (segments: TargetSegment[]) => {
  const next = segments.map((segment) => ({
    segment_name: segment.segment_name ?? "",
    segment_type: segment.segment_type ?? "secondary",
    usage_contexts: Array.isArray(segment.usage_contexts)
      ? segment.usage_contexts
      : [],
    characteristics: Array.isArray(segment.characteristics)
      ? segment.characteristics
      : []
  }));

  const primaryIndex = next.findIndex(
    (segment) => segment.segment_type === "primary"
  );
  if (primaryIndex === -1 && next.length > 0) {
    next[0] = { ...next[0], segment_type: "primary" };
  } else if (primaryIndex >= 0) {
    next.forEach((segment, index) => {
      if (index !== primaryIndex && segment.segment_type === "primary") {
        segment.segment_type = "secondary";
      }
    });
  }

  const primary = next.find((segment) => segment.segment_type === "primary");
  const secondary = next.filter((segment) => segment.segment_type !== "primary");
  return primary ? [primary, ...secondary] : next;
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
  showTitle = true,
  showRegenerate = true,
  regenerateLabel,
  hideApprove = false
}: TargetSegmentsEditorProps) {
  const safeSegments = normalizeSegments(segments);
  const hasSegments = safeSegments.length > 0;
  const [openSegments, setOpenSegments] = useOpenItems(safeSegments, "segment");

  const updateSegment = (index: number, nextSegment: TargetSegment) => {
    const next = safeSegments.slice();
    next[index] = nextSegment;
    onChange(normalizeSegments(next));
  };

  const addSegment = () => {
    onChange(
      normalizeSegments(
        safeSegments.concat([
          {
            segment_name: "",
            segment_type: safeSegments.some(
              (segment) => segment.segment_type === "primary"
            )
              ? "secondary"
              : "primary",
            usage_contexts: [],
            characteristics: []
          }
        ])
      )
    );
  };

  const removeSegment = (index: number) => {
    const next = safeSegments.slice();
    next.splice(index, 1);
    onChange(normalizeSegments(next));
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Ready</span>}
          </div>
          {!approved && (
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:opacity-60"
              onClick={onClear}
              disabled={isClearing}
            >
              {isClearing ? "Clearing..." : "Clear block"}
            </button>
          )}
        </div>
      )}

      {safeSegments.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          No user segments yet. Add one to begin.
        </p>
      )}

      <Accordion
        type="multiple"
        value={openSegments}
        onValueChange={setOpenSegments}
        className="mt-3 space-y-3"
      >
        {safeSegments.map((segment, index) => {
          const itemKey = `segment-${index}`;
          return (
            <AccordionItem
              key={itemKey}
              value={itemKey}
              className="rounded border border-slate-100 p-2"
            >
              <div className="grid items-start gap-3 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2">
                    <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                      <span className="sr-only">Toggle segment details</span>
                    </AccordionTrigger>
                    <label className="block text-xs text-gray-600">Segment name</label>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      value={segment.segment_name}
                      onChange={(event) =>
                        updateSegment(index, {
                          ...segment,
                          segment_name: event.target.value
                        })
                      }
                      disabled={disabled || approved}
                    />
                    {!approved && !disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-600 hover:text-slate-700"
                        onClick={() => removeSegment(index)}
                        disabled={disabled}
                        aria-label="Remove segment"
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <AccordionContent className="pt-2">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600">Segment type</label>
                    <select
                      className="mt-1 w-auto min-w-[9rem] max-w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      value={segment.segment_type}
                      onChange={(event) =>
                        updateSegment(index, {
                          ...segment,
                          segment_type:
                            event.target.value as TargetSegment["segment_type"]
                        })
                      }
                      disabled={disabled || approved}
                    >
                      {SEGMENT_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">Usage contexts</label>
                    <textarea
                      className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      rows={2}
                      value={toLineValue(segment.usage_contexts)}
                      onChange={(event) =>
                        updateSegment(index, {
                          ...segment,
                          usage_contexts: toLineItems(event.target.value)
                        })
                      }
                      disabled={disabled || approved}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">
                      Characteristics (one per line)
                    </label>
                    <textarea
                      className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      rows={2}
                      value={toLineValue(segment.characteristics)}
                      onChange={(event) =>
                        updateSegment(index, {
                          ...segment,
                          characteristics: toLineItems(event.target.value)
                        })
                      }
                      disabled={disabled || approved}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {!approved && (
        <button
          type="button"
          className="mt-3 text-xs text-blue-600 disabled:opacity-60"
          onClick={addSegment}
          disabled={disabled}
        >
          + User Segment
        </button>
      )}

      <div className="mt-3 flex items-center gap-2">
        {!approved && !hideApprove && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || approved || !hasSegments || isApproving}
          >
            {isApproving ? "Approving..." : "Approve and Proceed"}
          </button>
        )}
        {showRegenerate && (
          <button
            type="button"
            className="inline-flex min-w-[108px] items-center justify-center rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (regenerateLabel ?? "Regenerating...") : "Regenerate"}
          </button>
        )}
      </div>
    </div>
  );
}

const sortPainPoints = (items: PainPoint[]) =>
  items
    .slice()
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        FREQUENCY_ORDER[a.frequency] - FREQUENCY_ORDER[b.frequency]
    );

type PainPointsEditorProps = {
  title: string;
  value: PainPointGroup[];
  segmentOptions: TargetSegment[];
  onChange: (value: PainPointGroup[]) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  approved: boolean;
  disabled: boolean;
  isApproving: boolean;
  isRegenerating: boolean;
  isClearing: boolean;
  showTitle?: boolean;
  showRegenerate?: boolean;
  regenerateLabel?: string;
  hideApprove?: boolean;
};

function PainPointsEditor({
  title,
  value,
  segmentOptions,
  onChange,
  onApprove,
  onRegenerate,
  onClear,
  approved,
  disabled,
  isApproving,
  isRegenerating,
  isClearing,
  showTitle = true,
  showRegenerate = true,
  regenerateLabel,
  hideApprove = false
}: PainPointsEditorProps) {
  const safeGroups = Array.isArray(value)
    ? value.map((group) => ({
        user_segment: group.user_segment ?? "",
        pain_points: Array.isArray(group.pain_points) ? group.pain_points : []
      }))
    : [];
  const hasGroups = safeGroups.length > 0;
  const [openGroups, setOpenGroups] = useOpenItems(safeGroups, "pain-segment");
  const [openPainPointsByGroup, setOpenPainPointsByGroup] = useState<
    Record<string, string[]>
  >({});
  const painPointCountsKey = safeGroups
    .map((group) => group.pain_points.length)
    .join("|");
  const normalizedSegments = normalizeSegments(segmentOptions);
  const segmentNames = Array.from(
    new Set(
      normalizedSegments
        .map((segment) => segment.segment_name)
        .filter((name) => name.trim().length > 0)
    )
  );
  const primarySegmentName =
    normalizedSegments.find((segment) => segment.segment_type === "primary")
      ?.segment_name || "";
  const defaultSegment = primarySegmentName || segmentNames[0] || "";

  useEffect(() => {
    if (!defaultSegment) {
      return;
    }
    const nextGroups = safeGroups.map((group) => ({
      ...group,
      user_segment: group.user_segment || defaultSegment
    }));
    const changed = nextGroups.some(
      (group, index) => group.user_segment !== safeGroups[index]?.user_segment
    );
    if (changed) {
      onChange(nextGroups);
    }
  }, [defaultSegment, safeGroups, onChange]);

  useEffect(() => {
    setOpenPainPointsByGroup((prev) => {
      const next: Record<string, string[]> = { ...prev };
      safeGroups.forEach((group, groupIndex) => {
        const groupKey = `pain-segment-${groupIndex}`;
        const keys = sortPainPoints(group.pain_points).map(
          (_point, pointIndex) => `pain-point-${groupKey}-${pointIndex}`
        );
        const current = next[groupKey] || [];
        const filtered = current.filter((key) => keys.includes(key));
        const newlyAdded = keys.filter((key) => !filtered.includes(key));
        next[groupKey] = filtered.concat(newlyAdded);
      });
      Object.keys(next).forEach((key) => {
        if (!safeGroups.some((_group, index) => `pain-segment-${index}` === key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [painPointCountsKey, safeGroups.length]);

  const updateGroup = (index: number, nextGroup: PainPointGroup) => {
    const next = safeGroups.slice();
    next[index] = {
      ...nextGroup,
      pain_points: sortPainPoints(nextGroup.pain_points)
    };
    onChange(next);
  };

  const addGroup = () => {
    onChange(
      safeGroups.concat([
        {
          user_segment: defaultSegment,
          pain_points: []
        }
      ])
    );
  };

  const removeGroup = (index: number) => {
    const next = safeGroups.slice();
    next.splice(index, 1);
    onChange(next);
  };

  const updatePainPoint = (
    groupIndex: number,
    pointIndex: number,
    nextPoint: PainPoint
  ) => {
    const group = safeGroups[groupIndex];
    if (!group) {
      return;
    }
    const nextPoints = group.pain_points.slice();
    nextPoints[pointIndex] = nextPoint;
    updateGroup(groupIndex, { ...group, pain_points: nextPoints });
  };

  const addPainPoint = (groupIndex: number) => {
    const group = safeGroups[groupIndex];
    if (!group) {
      return;
    }
    updateGroup(groupIndex, {
      ...group,
      pain_points: group.pain_points.concat([
        {
          name: "",
          description: "",
          severity: "medium",
          frequency: "medium"
        }
      ])
    });
  };

  const removePainPoint = (groupIndex: number, pointIndex: number) => {
    const group = safeGroups[groupIndex];
    if (!group) {
      return;
    }
    const nextPoints = group.pain_points.slice();
    nextPoints.splice(pointIndex, 1);
    updateGroup(groupIndex, { ...group, pain_points: nextPoints });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Ready</span>}
          </div>
          {!approved && (
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:opacity-60"
              onClick={onClear}
              disabled={isClearing}
            >
              {isClearing ? "Clearing..." : "Clear block"}
            </button>
          )}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        Only the primary User Segment is generated to keep scope clear. Add more user segments
        manually as needed. Pain points are ordered by severity and then frequency.
      </p>

      {safeGroups.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          No user segments yet. Add one to begin.
        </p>
      )}

      <Accordion
        type="multiple"
        value={openGroups}
        onValueChange={setOpenGroups}
        className="mt-3 space-y-3"
      >
        {safeGroups.map((group, groupIndex) => {
          const groupKey = `pain-segment-${groupIndex}`;
          return (
            <AccordionItem
              key={groupKey}
              value={groupKey}
              className="rounded border border-slate-100 p-2"
            >
              <div className="grid items-start gap-3 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2">
                    <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                      <span className="sr-only">Toggle segment pain points</span>
                    </AccordionTrigger>
                    <label className="block text-xs text-gray-600">User Segment</label>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <select
                      className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      value={group.user_segment}
                      onChange={(event) =>
                        updateGroup(groupIndex, {
                          ...group,
                          user_segment: event.target.value
                        })
                      }
                      disabled={disabled || approved}
                    >
                      <option value="">Select User Segment</option>
                      {segmentNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {!approved && !disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-600 hover:text-slate-700"
                        onClick={() => removeGroup(groupIndex)}
                        disabled={disabled}
                        aria-label="Remove user segment"
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <AccordionContent className="pt-2">
                <Accordion
                  type="multiple"
                  value={openPainPointsByGroup[groupKey] || []}
                  onValueChange={(nextItems) =>
                    setOpenPainPointsByGroup((prev) => ({
                      ...prev,
                      [groupKey]: nextItems
                    }))
                  }
                  className="space-y-3"
                >
                  {sortPainPoints(group.pain_points).map((point, pointIndex) => {
                    const itemKey = `pain-point-${groupKey}-${pointIndex}`;
                    return (
                      <AccordionItem
                        key={itemKey}
                        value={itemKey}
                        className="rounded border border-slate-100 p-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                              <span className="sr-only">Toggle pain point details</span>
                            </AccordionTrigger>
                            <label className="block text-xs text-gray-600">
                              Pain Point Name
                            </label>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              value={point.name}
                              onChange={(event) =>
                                updatePainPoint(groupIndex, pointIndex, {
                                  ...point,
                                  name: event.target.value
                                })
                              }
                              disabled={disabled || approved}
                            />
                            {!approved && !disabled && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-600 hover:text-slate-700"
                                onClick={() => removePainPoint(groupIndex, pointIndex)}
                                disabled={disabled}
                                aria-label="Remove pain point"
                              >
                                <Trash2 />
                              </Button>
                            )}
                          </div>
                        </div>
                        <AccordionContent className="pt-2">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-gray-600">
                                Description (behavioral evidence)
                              </label>
                              <textarea
                                className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                                rows={2}
                                value={point.description}
                                onChange={(event) =>
                                  updatePainPoint(groupIndex, pointIndex, {
                                    ...point,
                                    description: event.target.value
                                  })
                                }
                                disabled={disabled || approved}
                              />
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                              <div>
                                <label className="block text-xs text-gray-600">
                                  Severity
                                </label>
                                <select
                                  className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                                  value={point.severity}
                                  onChange={(event) =>
                                    updatePainPoint(groupIndex, pointIndex, {
                                      ...point,
                                      severity: event.target.value as PainPoint["severity"]
                                    })
                                  }
                                  disabled={disabled || approved}
                                >
                                  <option value="high">high</option>
                                  <option value="medium">medium</option>
                                  <option value="low">low</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600">
                                  Frequency
                                </label>
                                <select
                                  className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                                  value={point.frequency}
                                  onChange={(event) =>
                                    updatePainPoint(groupIndex, pointIndex, {
                                      ...point,
                                      frequency: event.target.value as PainPoint["frequency"]
                                    })
                                  }
                                  disabled={disabled || approved}
                                >
                                  <option value="high">high</option>
                                  <option value="medium">medium</option>
                                  <option value="low">low</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
                {!approved && (
                  <button
                    type="button"
                    className="mt-3 text-xs text-blue-600 disabled:opacity-60"
                    onClick={() => addPainPoint(groupIndex)}
                    disabled={disabled}
                  >
                    + Pain Point
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
          className="mt-3 text-xs text-blue-600 disabled:opacity-60"
          onClick={addGroup}
          disabled={disabled}
        >
          + User Segment
        </button>
      )}

      <div className="mt-3 flex items-center gap-2">
        {!approved && !hideApprove && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || approved || !hasGroups || isApproving}
          >
            {isApproving ? "Approving..." : "Approve and Proceed"}
          </button>
        )}
        {showRegenerate && (
          <button
            type="button"
            className="inline-flex min-w-[108px] items-center justify-center rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (regenerateLabel ?? "Regenerating...") : "Regenerate"}
          </button>
        )}
      </div>
    </div>
  );
}

type ContextualFactorsEditorProps = {
  title: string;
  value: ContextualFactors;
  onChange: (value: ContextualFactors) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  approved: boolean;
  disabled: boolean;
  isApproving: boolean;
  isRegenerating: boolean;
  isClearing: boolean;
  showTitle?: boolean;
  showRegenerate?: boolean;
  regenerateLabel?: string;
  hideApprove?: boolean;
};

function ContextualFactorsEditor({
  title,
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
  showTitle = true,
  showRegenerate = true,
  regenerateLabel,
  hideApprove = false
}: ContextualFactorsEditorProps) {
  const safeValue: ContextualFactors = {
    contextual_factors: Array.isArray(value.contextual_factors)
      ? value.contextual_factors
      : []
  };
  const hasGroups = safeValue.contextual_factors.length > 0;
  const [openGroups, setOpenGroups] = useOpenItems(
    safeValue.contextual_factors,
    "context-group"
  );

  const updateGroup = (index: number, nextGroup: ContextFactorGroup) => {
    const next = safeValue.contextual_factors.slice();
    next[index] = nextGroup;
    onChange({ contextual_factors: next });
  };

  const addGroup = () => {
    onChange({
      contextual_factors: safeValue.contextual_factors.concat([
        { factor_group: "", factors: [] }
      ])
    });
  };

  const removeGroup = (index: number) => {
    const next = safeValue.contextual_factors.slice();
    next.splice(index, 1);
    onChange({ contextual_factors: next });
  };

  const addFactor = (groupIndex: number) => {
    const group = safeValue.contextual_factors[groupIndex];
    if (!group) return;
    updateGroup(groupIndex, {
      ...group,
      factors: group.factors.concat([{ name: "", description: "" }])
    });
  };

  const updateFactor = (
    groupIndex: number,
    factorIndex: number,
    nextFactor: ContextFactor
  ) => {
    const group = safeValue.contextual_factors[groupIndex];
    if (!group) return;
    const nextFactors = group.factors.slice();
    nextFactors[factorIndex] = nextFactor;
    updateGroup(groupIndex, { ...group, factors: nextFactors });
  };

  const removeFactor = (groupIndex: number, factorIndex: number) => {
    const group = safeValue.contextual_factors[groupIndex];
    if (!group) return;
    const nextFactors = group.factors.slice();
    nextFactors.splice(factorIndex, 1);
    updateGroup(groupIndex, { ...group, factors: nextFactors });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Ready</span>}
          </div>
          {!approved && (
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:opacity-60"
              onClick={onClear}
              disabled={isClearing}
            >
              {isClearing ? "Clearing..." : "Clear block"}
            </button>
          )}
        </div>
      )}

      {safeValue.contextual_factors.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          No contextual factor groups yet. Add one to begin.
        </p>
      )}

      <Accordion
        type="multiple"
        value={openGroups}
        onValueChange={setOpenGroups}
        className="mt-3 space-y-3"
      >
        {safeValue.contextual_factors.map((group, groupIndex) => {
          const groupKey = `context-group-${groupIndex}`;
          return (
            <AccordionItem
              key={groupKey}
              value={groupKey}
              className="rounded border border-slate-100 p-2"
            >
              <div className="grid items-start gap-3 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2">
                    <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                      <span className="sr-only">Toggle contextual factors</span>
                    </AccordionTrigger>
                    <label className="block text-xs text-gray-600">Factor Group</label>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      value={group.factor_group}
                      onChange={(event) =>
                        updateGroup(groupIndex, {
                          ...group,
                          factor_group: event.target.value
                        })
                      }
                      disabled={disabled || approved}
                    />
                    {!approved && !disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-600 hover:text-slate-700"
                        onClick={() => removeGroup(groupIndex)}
                        disabled={disabled}
                        aria-label="Remove factor group"
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <AccordionContent className="pt-2">
                {group.factors.map((factor, factorIndex) => (
                  <div
                    key={`${groupKey}-factor-${factorIndex}`}
                    className="mt-3 rounded border border-slate-100 p-3"
                  >
                    <div>
                      <label className="block text-xs text-gray-600">Factor Name</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                          value={factor.name}
                          onChange={(event) =>
                            updateFactor(groupIndex, factorIndex, {
                              ...factor,
                              name: event.target.value
                            })
                          }
                          disabled={disabled || approved}
                        />
                        {!approved && !disabled && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-slate-700"
                            onClick={() => removeFactor(groupIndex, factorIndex)}
                            disabled={disabled}
                            aria-label="Remove factor"
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs text-gray-600">Description</label>
                      <textarea
                        className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                        rows={2}
                        value={factor.description}
                        onChange={(event) =>
                          updateFactor(groupIndex, factorIndex, {
                            ...factor,
                            description: event.target.value
                          })
                        }
                        disabled={disabled || approved}
                      />
                    </div>
                  </div>
                ))}
                {!approved && (
                  <button
                    type="button"
                    className="mt-3 text-xs text-blue-600 disabled:opacity-60"
                    onClick={() => addFactor(groupIndex)}
                    disabled={disabled}
                  >
                    + Factor
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
          className="mt-3 text-xs text-blue-600 disabled:opacity-60"
          onClick={addGroup}
          disabled={disabled}
        >
          + Factor Group
        </button>
      )}

      <div className="mt-3 flex items-center gap-2">
        {!approved && !hideApprove && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || approved || !hasGroups || isApproving}
          >
            {isApproving ? "Approving..." : "Approve and Proceed"}
          </button>
        )}
        {showRegenerate && (
          <button
            type="button"
            className="inline-flex min-w-[108px] items-center justify-center rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (regenerateLabel ?? "Regenerating...") : "Regenerate"}
          </button>
        )}
      </div>
    </div>
  );
}

type ConstraintsEditorProps = {
  title: string;
  value: Constraints;
  onChange: (value: Constraints) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  approved: boolean;
  disabled: boolean;
  isApproving: boolean;
  isRegenerating: boolean;
  isClearing: boolean;
  showTitle?: boolean;
  showRegenerate?: boolean;
  regenerateLabel?: string;
  hideApprove?: boolean;
};

function ConstraintsEditor({
  title,
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
  showTitle = true,
  showRegenerate = true,
  regenerateLabel,
  hideApprove = false
}: ConstraintsEditorProps) {
  const safeValue: Constraints = {
    constraints: Array.isArray(value.constraints) ? value.constraints : []
  };
  const hasGroups = safeValue.constraints.length > 0;
  const [openGroups, setOpenGroups] = useOpenItems(
    safeValue.constraints,
    "constraint-group"
  );

  const updateGroup = (index: number, nextGroup: ConstraintGroup) => {
    const next = safeValue.constraints.slice();
    next[index] = nextGroup;
    onChange({ constraints: next });
  };

  const addGroup = () => {
    onChange({
      constraints: safeValue.constraints.concat([
        { constraint_group: "", constraints: [] }
      ])
    });
  };

  const removeGroup = (index: number) => {
    const next = safeValue.constraints.slice();
    next.splice(index, 1);
    onChange({ constraints: next });
  };

  const addConstraint = (groupIndex: number) => {
    const group = safeValue.constraints[groupIndex];
    if (!group) return;
    updateGroup(groupIndex, {
      ...group,
      constraints: group.constraints.concat([{ name: "", description: "" }])
    });
  };

  const updateConstraint = (
    groupIndex: number,
    constraintIndex: number,
    nextConstraint: ConstraintItem
  ) => {
    const group = safeValue.constraints[groupIndex];
    if (!group) return;
    const nextConstraints = group.constraints.slice();
    nextConstraints[constraintIndex] = nextConstraint;
    updateGroup(groupIndex, { ...group, constraints: nextConstraints });
  };

  const removeConstraint = (groupIndex: number, constraintIndex: number) => {
    const group = safeValue.constraints[groupIndex];
    if (!group) return;
    const nextConstraints = group.constraints.slice();
    nextConstraints.splice(constraintIndex, 1);
    updateGroup(groupIndex, { ...group, constraints: nextConstraints });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Ready</span>}
          </div>
          {!approved && (
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:opacity-60"
              onClick={onClear}
              disabled={isClearing}
            >
              {isClearing ? "Clearing..." : "Clear block"}
            </button>
          )}
        </div>
      )}

      {safeValue.constraints.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          No constraint groups yet. Add one to begin.
        </p>
      )}

      <Accordion
        type="multiple"
        value={openGroups}
        onValueChange={setOpenGroups}
        className="mt-3 space-y-3"
      >
        {safeValue.constraints.map((group, groupIndex) => {
          const groupKey = `constraint-group-${groupIndex}`;
          return (
            <AccordionItem
              key={groupKey}
              value={groupKey}
              className="rounded border border-slate-100 p-2"
            >
              <div className="grid items-start gap-3 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2">
                    <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                      <span className="sr-only">Toggle constraints</span>
                    </AccordionTrigger>
                    <label className="block text-xs text-gray-600">Constraint Group</label>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      value={group.constraint_group}
                      onChange={(event) =>
                        updateGroup(groupIndex, {
                          ...group,
                          constraint_group: event.target.value
                        })
                      }
                      disabled={disabled || approved}
                    />
                    {!approved && !disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-600 hover:text-slate-700"
                        onClick={() => removeGroup(groupIndex)}
                        disabled={disabled}
                        aria-label="Remove constraint group"
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <AccordionContent className="pt-2">
                {group.constraints.map((constraint, constraintIndex) => (
                  <div
                    key={`${groupKey}-constraint-${constraintIndex}`}
                    className="mt-3 rounded border border-slate-100 p-3"
                  >
                    <div>
                      <label className="block text-xs text-gray-600">Constraint Name</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                          value={constraint.name}
                          onChange={(event) =>
                            updateConstraint(groupIndex, constraintIndex, {
                              ...constraint,
                              name: event.target.value
                            })
                          }
                          disabled={disabled || approved}
                        />
                        {!approved && !disabled && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-slate-700"
                            onClick={() => removeConstraint(groupIndex, constraintIndex)}
                            disabled={disabled}
                            aria-label="Remove constraint"
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs text-gray-600">Description</label>
                      <textarea
                        className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                        rows={2}
                        value={constraint.description}
                        onChange={(event) =>
                          updateConstraint(groupIndex, constraintIndex, {
                            ...constraint,
                            description: event.target.value
                          })
                        }
                        disabled={disabled || approved}
                      />
                    </div>
                  </div>
                ))}
                {!approved && (
                  <button
                    type="button"
                    className="mt-3 text-xs text-blue-600 disabled:opacity-60"
                    onClick={() => addConstraint(groupIndex)}
                    disabled={disabled}
                  >
                    + Constraint
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
          className="mt-3 text-xs text-blue-600 disabled:opacity-60"
          onClick={addGroup}
          disabled={disabled}
        >
          + Constraint Group
        </button>
      )}

      <div className="mt-3 flex items-center gap-2">
        {!approved && !hideApprove && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || approved || !hasGroups || isApproving}
          >
            {isApproving ? "Approving..." : "Approve and Proceed"}
          </button>
        )}
        {showRegenerate && (
          <button
            type="button"
            className="inline-flex min-w-[108px] items-center justify-center rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (regenerateLabel ?? "Regenerating...") : "Regenerate"}
          </button>
        )}
      </div>
    </div>
  );
}

type MarketLandscapeEditorProps = {
  title: string;
  value: MarketLandscape;
  onChange: (value: MarketLandscape) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  approved: boolean;
  disabled: boolean;
  isApproving: boolean;
  isRegenerating: boolean;
  isClearing: boolean;
  showTitle?: boolean;
  showRegenerate?: boolean;
  regenerateLabel?: string;
  hideApprove?: boolean;
};

function MarketLandscapeEditor({
  title,
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
  showTitle = true,
  showRegenerate = true,
  regenerateLabel,
  hideApprove = false
}: MarketLandscapeEditorProps) {
  const safeValue = normalizeMarketLandscapeValue(value);
  const hasContent = Boolean(
    safeValue.market_definition.trim() ||
      safeValue.alternatives.direct_competitor_segments.length > 0 ||
      safeValue.alternatives.indirect_competitor_segments.length > 0 ||
      safeValue.alternatives.substitute_segments.length > 0 ||
      safeValue.market_norms.length > 0 ||
      safeValue.adoption_drivers.length > 0 ||
      safeValue.adoption_barriers.length > 0
  );

  const updateAlternatives = (
    key: keyof MarketAlternatives,
    nextValue: string
  ) => {
    onChange({
      ...safeValue,
      alternatives: {
        ...safeValue.alternatives,
        [key]: toLineItems(nextValue)
      }
    });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Ready</span>}
          </div>
          {!approved && (
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:opacity-60"
              onClick={onClear}
              disabled={isClearing}
            >
              {isClearing ? "Clearing..." : "Clear block"}
            </button>
          )}
        </div>
      )}

      <div className="mt-3">
        <label className="block text-xs text-gray-600">Market definition</label>
        <textarea
          className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
          rows={2}
          value={safeValue.market_definition}
          onChange={(event) =>
            onChange({ ...safeValue, market_definition: event.target.value })
          }
          disabled={disabled || approved}
        />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div>
          <label className="block text-xs text-gray-600">
            Direct competitor segments (one per line)
          </label>
          <textarea
            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
            rows={3}
            value={toLineValue(safeValue.alternatives.direct_competitor_segments)}
            onChange={(event) =>
              updateAlternatives("direct_competitor_segments", event.target.value)
            }
            disabled={disabled || approved}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600">
            Indirect competitor segments (one per line)
          </label>
          <textarea
            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
            rows={3}
            value={toLineValue(safeValue.alternatives.indirect_competitor_segments)}
            onChange={(event) =>
              updateAlternatives("indirect_competitor_segments", event.target.value)
            }
            disabled={disabled || approved}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600">
            Substitutes (one per line)
          </label>
          <textarea
            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
            rows={3}
            value={toLineValue(safeValue.alternatives.substitute_segments)}
            onChange={(event) =>
              updateAlternatives("substitute_segments", event.target.value)
            }
            disabled={disabled || approved}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-xs text-gray-600">Market norms (one per line)</label>
        <textarea
          className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
          rows={3}
          value={toLineValue(safeValue.market_norms)}
          onChange={(event) =>
            onChange({ ...safeValue, market_norms: toLineItems(event.target.value) })
          }
          disabled={disabled || approved}
        />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-xs text-gray-600">
            Adoption drivers (one per line)
          </label>
          <textarea
            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
            rows={3}
            value={toLineValue(safeValue.adoption_drivers)}
            onChange={(event) =>
              onChange({
                ...safeValue,
                adoption_drivers: toLineItems(event.target.value)
              })
            }
            disabled={disabled || approved}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600">
            Adoption barriers (one per line)
          </label>
          <textarea
            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
            rows={3}
            value={toLineValue(safeValue.adoption_barriers)}
            onChange={(event) =>
              onChange({
                ...safeValue,
                adoption_barriers: toLineItems(event.target.value)
              })
            }
            disabled={disabled || approved}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {!approved && !hideApprove && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || approved || !hasContent || isApproving}
          >
            {isApproving ? "Approving..." : "Approve and Proceed"}
          </button>
        )}
        {showRegenerate && (
          <button
            type="button"
            className="inline-flex min-w-[108px] items-center justify-center rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (regenerateLabel ?? "Regenerating...") : "Regenerate"}
          </button>
        )}
      </div>
    </div>
  );
}

type CompetitorInventoryEditorProps = {
  title: string;
  value: CompetitorInventory;
  onChange: (value: CompetitorInventory) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  approved: boolean;
  disabled: boolean;
  isApproving: boolean;
  isRegenerating: boolean;
  isClearing: boolean;
  showTitle?: boolean;
  showRegenerate?: boolean;
  regenerateLabel?: string;
  hideApprove?: boolean;
};

const COMPETITOR_GROUPS: Array<{
  key: keyof CompetitorInventory["competitors"];
  label: string;
}> = [
  { key: "direct", label: "Direct competitors" },
  { key: "indirect", label: "Indirect competitors" },
  { key: "substitute", label: "Substitutes" }
];

function CompetitorInventoryEditor({
  title,
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
  showTitle = true,
  showRegenerate = true,
  regenerateLabel,
  hideApprove = false
}: CompetitorInventoryEditorProps) {
  const safeValue = normalizeCompetitorInventoryValue(value);
  const hasCompetitors = Boolean(
    safeValue.competitors.direct.length ||
      safeValue.competitors.indirect.length ||
      safeValue.competitors.substitute.length
  );
  const [openGroups, setOpenGroups] = useState<string[]>(
    COMPETITOR_GROUPS.map((group) => group.key)
  );
  const [openCompetitorsByGroup, setOpenCompetitorsByGroup] = useState<
    Record<string, string[]>
  >({});
  const competitorCountsRef = useRef<Record<string, number>>({});
  const competitorCountsKey = COMPETITOR_GROUPS.map(
    (group) => safeValue.competitors[group.key].length
  ).join("|");

  useEffect(() => {
    setOpenCompetitorsByGroup((prev) => {
      const next: Record<string, string[]> = { ...prev };
      COMPETITOR_GROUPS.forEach((group) => {
        const groupKey = group.key;
        const keys = safeValue.competitors[groupKey].map(
          (_item, index) => `competitor-${groupKey}-${index}`
        );
        const current = next[groupKey] || [];
        const filtered = current.filter((key) => keys.includes(key));
        const prevCount = competitorCountsRef.current[groupKey];
        if (typeof prevCount === "number" && keys.length > prevCount) {
          const addedKeys = keys.slice(prevCount);
          next[groupKey] = filtered.concat(addedKeys);
        } else {
          next[groupKey] = filtered;
        }
        competitorCountsRef.current[groupKey] = keys.length;
      });
      Object.keys(next).forEach((key) => {
        if (!COMPETITOR_GROUPS.some((group) => group.key === key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [competitorCountsKey]);

  const updateGroup = (
    key: keyof CompetitorInventory["competitors"],
    nextItems: CompetitorEntry[]
  ) => {
    onChange({
      competitors: {
        ...safeValue.competitors,
        [key]: nextItems
      }
    });
  };

  const addCompetitor = (key: keyof CompetitorInventory["competitors"]) => {
    updateGroup(key, [
      ...safeValue.competitors[key],
      {
        product_name: "",
        url: "",
        description: "",
        target_audience: "",
        positioning: ""
      }
    ]);
  };

  const updateCompetitor = (
    key: keyof CompetitorInventory["competitors"],
    index: number,
    nextItem: CompetitorEntry
  ) => {
    const next = safeValue.competitors[key].slice();
    next[index] = nextItem;
    updateGroup(key, next);
  };

  const removeCompetitor = (
    key: keyof CompetitorInventory["competitors"],
    index: number
  ) => {
    const next = safeValue.competitors[key].slice();
    next.splice(index, 1);
    updateGroup(key, next);
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Ready</span>}
          </div>
          {!approved && (
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:opacity-60"
              onClick={onClear}
              disabled={isClearing}
            >
              {isClearing ? "Clearing..." : "Clear block"}
            </button>
          )}
        </div>
      )}

      <Accordion
        type="multiple"
        value={openGroups}
        onValueChange={setOpenGroups}
        className="mt-3 space-y-3"
      >
        {COMPETITOR_GROUPS.map((group) => (
          <AccordionItem
            key={group.key}
            value={group.key}
            className="rounded border border-slate-100 p-2"
          >
            <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
              {group.label}
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              {safeValue.competitors[group.key].length === 0 && (
                <p className="text-xs text-gray-500">
                  No competitors yet in this group.
                </p>
              )}
              <Accordion
                type="multiple"
                value={openCompetitorsByGroup[group.key] || []}
                onValueChange={(nextItems) =>
                  setOpenCompetitorsByGroup((prev) => ({
                    ...prev,
                    [group.key]: nextItems
                  }))
                }
                className="space-y-3"
              >
                {safeValue.competitors[group.key].map((item, index) => {
                  const itemKey = `competitor-${group.key}-${index}`;
                  return (
                    <AccordionItem
                      key={itemKey}
                      value={itemKey}
                      className="rounded border border-slate-100 p-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                            <span className="sr-only">Toggle competitor details</span>
                          </AccordionTrigger>
                          <label className="block text-xs text-gray-600">
                            Product name
                          </label>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            value={item.product_name}
                            onChange={(event) =>
                              updateCompetitor(group.key, index, {
                                ...item,
                                product_name: event.target.value
                              })
                            }
                            disabled={disabled || approved}
                          />
                          {!approved && !disabled && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-600 hover:text-slate-700"
                              onClick={() => removeCompetitor(group.key, index)}
                              disabled={disabled}
                              aria-label="Remove competitor"
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      </div>
                      <AccordionContent className="pt-2">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-600">URL</label>
                            <input
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              value={item.url}
                              onChange={(event) =>
                                updateCompetitor(group.key, index, {
                                  ...item,
                                  url: event.target.value
                                })
                              }
                              disabled={disabled || approved}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600">
                              Description
                            </label>
                            <textarea
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              rows={2}
                              value={item.description}
                              onChange={(event) =>
                                updateCompetitor(group.key, index, {
                                  ...item,
                                  description: event.target.value
                                })
                              }
                              disabled={disabled || approved}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600">
                              Target audience
                            </label>
                            <textarea
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              rows={2}
                              value={item.target_audience}
                              onChange={(event) =>
                                updateCompetitor(group.key, index, {
                                  ...item,
                                  target_audience: event.target.value
                                })
                              }
                              disabled={disabled || approved}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600">
                              Positioning
                            </label>
                            <textarea
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              rows={2}
                              value={item.positioning}
                              onChange={(event) =>
                                updateCompetitor(group.key, index, {
                                  ...item,
                                  positioning: event.target.value
                                })
                              }
                              disabled={disabled || approved}
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
              {!approved && (
                <button
                  type="button"
                  className="mt-3 text-xs text-blue-600 disabled:opacity-60"
                  onClick={() => addCompetitor(group.key)}
                  disabled={disabled}
                >
                  + Competitor
                </button>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-3 flex items-center gap-2">
        {!approved && !hideApprove && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || approved || !hasCompetitors || isApproving}
          >
            {isApproving ? "Approving..." : "Approve and Proceed"}
          </button>
        )}
        {showRegenerate && (
          <button
            type="button"
            className="inline-flex min-w-[108px] items-center justify-center rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (regenerateLabel ?? "Regenerating...") : "Regenerate"}
          </button>
        )}
      </div>
    </div>
  );
}

type CompetitorCapabilitiesEditorProps = {
  title: string;
  value: CompetitorCapabilities;
  onChange: (value: CompetitorCapabilities) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  approved: boolean;
  disabled: boolean;
  isApproving: boolean;
  isRegenerating: boolean;
  isClearing: boolean;
  showTitle?: boolean;
  showRegenerate?: boolean;
  regenerateLabel?: string;
  hideApprove?: boolean;
};

const CAPABILITY_GROUPS: Array<keyof CompetitorCapabilities["competitor_capabilities"]> = [
  "Functional",
  "Technical",
  "Business"
];

function CompetitorCapabilitiesEditor({
  title,
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
  showTitle = true,
  showRegenerate = true,
  regenerateLabel,
  hideApprove = false
}: CompetitorCapabilitiesEditorProps) {
  const safeValue = normalizeCompetitorCapabilitiesValue(value);
  const hasItems = CAPABILITY_GROUPS.some(
    (key) => safeValue.competitor_capabilities[key].length > 0
  );
  const [openCapabilities, setOpenCapabilities] = useState<Record<string, string[]>>(
    CAPABILITY_GROUPS.reduce<Record<string, string[]>>((acc, key) => {
      acc[key] = [];
      return acc;
    }, {})
  );
  const capabilityCountsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    setOpenCapabilities((prev) => {
      const next = { ...prev };
      CAPABILITY_GROUPS.forEach((groupKey) => {
        const keys = safeValue.competitor_capabilities[groupKey].map(
          (_item, index) => `capability-${groupKey}-${index}`
        );
        const existing = prev[groupKey] || [];
        const filtered = existing.filter((key) => keys.includes(key));
        const prevCount = capabilityCountsRef.current[groupKey];
        if (typeof prevCount === "number" && keys.length > prevCount) {
          const addedKeys = keys.slice(prevCount);
          next[groupKey] = filtered.concat(addedKeys);
        } else {
          next[groupKey] = filtered;
        }
        capabilityCountsRef.current[groupKey] = keys.length;
      });
      return next;
    });
  }, [
    safeValue.competitor_capabilities.Functional.length,
    safeValue.competitor_capabilities.Technical.length,
    safeValue.competitor_capabilities.Business.length
  ]);

  const updateGroup = (
    key: keyof CompetitorCapabilities["competitor_capabilities"],
    nextItems: CompetitorCapabilityEntry[]
  ) => {
    onChange({
      competitor_capabilities: {
        ...safeValue.competitor_capabilities,
        [key]: nextItems
      }
    });
  };

  const addCapability = (
    key: keyof CompetitorCapabilities["competitor_capabilities"]
  ) => {
    updateGroup(key, [
      ...safeValue.competitor_capabilities[key],
      {
        capability: "",
        alignment_with_user_needs: "",
        owning_competitors: [],
        gaps_and_limitations: []
      }
    ]);
  };

  const updateCapability = (
    key: keyof CompetitorCapabilities["competitor_capabilities"],
    index: number,
    nextItem: CompetitorCapabilityEntry
  ) => {
    const next = safeValue.competitor_capabilities[key].slice();
    next[index] = nextItem;
    updateGroup(key, next);
  };

  const removeCapability = (
    key: keyof CompetitorCapabilities["competitor_capabilities"],
    index: number
  ) => {
    const next = safeValue.competitor_capabilities[key].slice();
    next.splice(index, 1);
    updateGroup(key, next);
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Ready</span>}
          </div>
          {!approved && (
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:opacity-60"
              onClick={onClear}
              disabled={isClearing}
            >
              {isClearing ? "Clearing..." : "Clear block"}
            </button>
          )}
        </div>
      )}

      {CAPABILITY_GROUPS.map((groupKey) => {
        const openItems = openCapabilities[groupKey] || [];
        const setOpenItems = (nextItems: string[]) => {
          setOpenCapabilities((prev) => ({
            ...prev,
            [groupKey]: nextItems
          }));
        };
        return (
          <Accordion key={groupKey} type="multiple" defaultValue={[groupKey]}>
            <AccordionItem value={groupKey} className="border-0">
              <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
                {groupKey} capabilities
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <Accordion
                  type="multiple"
                  value={openItems}
                  onValueChange={setOpenItems}
                  className="space-y-3"
                >
                  {safeValue.competitor_capabilities[groupKey].map((item, index) => {
                    const itemKey = `capability-${groupKey}-${index}`;
                    return (
                      <AccordionItem
                        key={itemKey}
                        value={itemKey}
                        className="rounded border border-slate-100 p-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                              <span className="sr-only">Toggle capability details</span>
                            </AccordionTrigger>
                            <label className="block text-xs text-gray-600">Capability</label>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              value={item.capability}
                              onChange={(event) =>
                                updateCapability(groupKey, index, {
                                  ...item,
                                  capability: event.target.value
                                })
                              }
                              disabled={disabled || approved}
                            />
                            {!approved && !disabled && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-600 hover:text-slate-700"
                                onClick={() => removeCapability(groupKey, index)}
                                disabled={disabled}
                                aria-label="Remove capability"
                              >
                                <Trash2 />
                              </Button>
                            )}
                          </div>
                        </div>
                        <AccordionContent className="pt-2">
                          <div className="mt-2">
                            <label className="block text-xs text-gray-600">
                              Alignment with User Needs
                            </label>
                            <textarea
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              rows={2}
                              value={item.alignment_with_user_needs}
                              onChange={(event) =>
                                updateCapability(groupKey, index, {
                                  ...item,
                                  alignment_with_user_needs: event.target.value
                                })
                              }
                              disabled={disabled || approved}
                            />
                          </div>
                          <div className="mt-2">
                            <label className="block text-xs text-gray-600">
                              Owning Competitors (one per line)
                            </label>
                            <textarea
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              rows={2}
                              value={toLineValue(item.owning_competitors)}
                              onChange={(event) =>
                                updateCapability(groupKey, index, {
                                  ...item,
                                  owning_competitors: toLineItems(event.target.value)
                                })
                              }
                              disabled={disabled || approved}
                            />
                          </div>
                          <div className="mt-2">
                            <label className="block text-xs text-gray-600">
                              Gaps and Limitations (one per line)
                            </label>
                            <textarea
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              rows={2}
                              value={toLineValue(item.gaps_and_limitations)}
                              onChange={(event) =>
                                updateCapability(groupKey, index, {
                                  ...item,
                                  gaps_and_limitations: toLineItems(event.target.value)
                                })
                              }
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
                    className="mt-3 text-xs text-blue-600 disabled:opacity-60"
                    onClick={() => addCapability(groupKey)}
                    disabled={disabled}
                  >
                    + Capability
                  </button>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      })}

      <div className="mt-3 flex items-center gap-2">
        {!approved && !hideApprove && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || approved || !hasItems || isApproving}
          >
            {isApproving ? "Approving..." : "Approve and Proceed"}
          </button>
        )}
        {showRegenerate && (
          <button
            type="button"
            className="inline-flex min-w-[108px] items-center justify-center rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (regenerateLabel ?? "Regenerating...") : "Regenerate"}
          </button>
        )}
      </div>
    </div>
  );
}

type OpportunitiesEditorProps = {
  title: string;
  value: Opportunities;
  onChange: (value: Opportunities) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  approved: boolean;
  disabled: boolean;
  isApproving: boolean;
  isRegenerating: boolean;
  isClearing: boolean;
  showTitle?: boolean;
  showRegenerate?: boolean;
  regenerateLabel?: string;
  hideApprove?: boolean;
};

function OpportunitiesEditor({
  title,
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
  showTitle = true,
  showRegenerate = true,
  regenerateLabel,
  hideApprove = false
}: OpportunitiesEditorProps) {
  const safeValue = normalizeGapsOpportunitiesValue(value);
  const hasItems = safeValue.opportunities.length > 0;
  const [openOpportunities, setOpenOpportunities] = useState<string[]>([]);
  const opportunityCountsRef = useRef<number>(0);
  const opportunityCount = safeValue.opportunities.length;

  useEffect(() => {
    setOpenOpportunities((prev) => {
      const keys = safeValue.opportunities.map((_item, index) => `opportunity-${index}`);
      const filtered = prev.filter((key) => keys.includes(key));
      if (opportunityCountsRef.current && opportunityCount > opportunityCountsRef.current) {
        const addedKeys = keys.slice(opportunityCountsRef.current);
        opportunityCountsRef.current = opportunityCount;
        return filtered.concat(addedKeys);
      }
      opportunityCountsRef.current = opportunityCount;
      return filtered;
    });
  }, [opportunityCount, safeValue.opportunities]);

  const updateOpportunity = (index: number, nextItem: OpportunityItem) => {
    const next = safeValue.opportunities.slice();
    next[index] = nextItem;
    onChange({ opportunities: next });
  };

  const addOpportunity = () => {
    onChange({
      opportunities: safeValue.opportunities.concat([
        {
          opportunity: "",
          why_it_remains_unaddressed: "",
          user_value_potential: ""
        }
      ])
    });
  };

  const removeOpportunity = (index: number) => {
    const next = safeValue.opportunities.slice();
    next.splice(index, 1);
    onChange({ opportunities: next });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Ready</span>}
          </div>
          {!approved && (
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:opacity-60"
              onClick={onClear}
              disabled={isClearing}
            >
              {isClearing ? "Clearing..." : "Clear block"}
            </button>
          )}
        </div>
      )}

      {safeValue.opportunities.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">No opportunities yet.</p>
      )}

      <Accordion
        type="multiple"
        value={openOpportunities}
        onValueChange={setOpenOpportunities}
        className="mt-3 space-y-3"
      >
        {safeValue.opportunities.map((item, index) => {
          const itemKey = `opportunity-${index}`;
          return (
            <AccordionItem
              key={itemKey}
              value={itemKey}
              className="rounded border border-slate-100 p-2"
            >
              <div>
                <div className="flex items-center gap-2">
                  <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                    <span className="sr-only">Toggle opportunity details</span>
                  </AccordionTrigger>
                  <label className="block text-xs text-gray-600">Opportunity</label>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <textarea
                    className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                    rows={2}
                    value={item.opportunity}
                    onChange={(event) =>
                      updateOpportunity(index, {
                        ...item,
                        opportunity: event.target.value
                      })
                    }
                    disabled={disabled || approved}
                  />
                  {!approved && !disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-600 hover:text-slate-700"
                      onClick={() => removeOpportunity(index)}
                      disabled={disabled}
                      aria-label="Remove opportunity"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>

              <AccordionContent className="pt-2">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600">
                      Why it remains unaddressed
                    </label>
                    <textarea
                      className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      rows={2}
                      value={item.why_it_remains_unaddressed}
                      onChange={(event) =>
                        updateOpportunity(index, {
                          ...item,
                          why_it_remains_unaddressed: event.target.value
                        })
                      }
                      disabled={disabled || approved}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">
                      User value potential
                    </label>
                    <textarea
                      className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      rows={2}
                      value={item.user_value_potential}
                      onChange={(event) =>
                        updateOpportunity(index, {
                          ...item,
                          user_value_potential: event.target.value
                        })
                      }
                      disabled={disabled || approved}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {!approved && (
        <button
          type="button"
          className="mt-3 text-xs text-blue-600 disabled:opacity-60"
          onClick={addOpportunity}
          disabled={disabled}
        >
          + Opportunity
        </button>
      )}

      <div className="mt-3 flex items-center gap-2">
        {!approved && !hideApprove && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || approved || !hasItems || isApproving}
          >
            {isApproving ? "Approving..." : "Approve and Proceed"}
          </button>
        )}
        {showRegenerate && (
          <button
            type="button"
            className="inline-flex min-w-[108px] items-center justify-center rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (regenerateLabel ?? "Regenerating...") : "Regenerate"}
          </button>
        )}
      </div>
    </div>
  );
}

type ValueDriversEditorProps = {
  title: string;
  value: ValueDrivers;
  onChange: (value: ValueDrivers) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  approved: boolean;
  disabled: boolean;
  isApproving: boolean;
  isRegenerating: boolean;
  isClearing: boolean;
  showTitle?: boolean;
  showRegenerate?: boolean;
  regenerateLabel?: string;
  hideApprove?: boolean;
};

function ValueDriversEditor({
  title,
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
  showTitle = true,
  showRegenerate = true,
  regenerateLabel,
  hideApprove = false
}: ValueDriversEditorProps) {
  const safeValue = normalizeValueDriversValue(value);
  const hasDrivers = safeValue.value_drivers.length > 0;

  const updateDriver = (index: number, nextValue: string) => {
    const next = safeValue.value_drivers.slice();
    next[index] = nextValue;
    onChange({ value_drivers: next });
  };

  const addDriver = () => {
    onChange({ value_drivers: safeValue.value_drivers.concat([""]) });
  };

  const removeDriver = (index: number) => {
    const next = safeValue.value_drivers.slice();
    next.splice(index, 1);
    onChange({ value_drivers: next });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Ready</span>}
          </div>
          {!approved && (
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:opacity-60"
              onClick={onClear}
              disabled={isClearing}
            >
              {isClearing ? "Clearing..." : "Clear block"}
            </button>
          )}
        </div>
      )}

      {safeValue.value_drivers.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          No value drivers yet. Add one to begin.
        </p>
      )}

      <div className="mt-3 space-y-3">
        {safeValue.value_drivers.map((driver, index) => (
          <div key={`value-driver-${index}`} className="rounded border border-slate-100 p-3">
            <label className="block text-xs text-gray-600">Value driver</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                value={driver}
                onChange={(event) => updateDriver(index, event.target.value)}
                disabled={disabled || approved}
              />
              {!approved && !disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-600 hover:text-slate-700"
                  onClick={() => removeDriver(index)}
                  disabled={disabled}
                  aria-label="Remove value driver"
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!approved && (
        <button
          type="button"
          className="mt-3 text-xs text-blue-600 disabled:opacity-60"
          onClick={addDriver}
          disabled={disabled}
        >
          + Value Driver
        </button>
      )}

      <div className="mt-3 flex items-center gap-2">
        {!approved && !hideApprove && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || approved || !hasDrivers || isApproving}
          >
            {isApproving ? "Approving..." : "Approve and Proceed"}
          </button>
        )}
        {showRegenerate && (
          <button
            type="button"
            className="inline-flex min-w-[108px] items-center justify-center rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (regenerateLabel ?? "Regenerating...") : "Regenerate"}
          </button>
        )}
      </div>
    </div>
  );
}

type FeasibilityRisksEditorProps = {
  title: string;
  value: FeasibilityRisks;
  onChange: (value: FeasibilityRisks) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  approved: boolean;
  disabled: boolean;
  isApproving: boolean;
  isRegenerating: boolean;
  isClearing: boolean;
  showTitle?: boolean;
  showRegenerate?: boolean;
  regenerateLabel?: string;
  hideApprove?: boolean;
};

const FEASIBILITY_RISK_TYPES: FeasibilityRisk["feasibility_risk_type"][] = [
  "business",
  "user",
  "technical"
];

function FeasibilityRisksEditor({
  title,
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
  showTitle = true,
  showRegenerate = true,
  regenerateLabel,
  hideApprove = false
}: FeasibilityRisksEditorProps) {
  const safeValue = normalizeFeasibilityRisksValue(value);
  const hasItems = safeValue.feasibility_risks.length > 0;

  const updateRisk = (index: number, nextRisk: FeasibilityRisk) => {
    const next = safeValue.feasibility_risks.slice();
    next[index] = nextRisk;
    onChange({ feasibility_risks: next });
  };

  const addRisk = () => {
    onChange({
      feasibility_risks: safeValue.feasibility_risks.concat([
        {
          feasibility_risk_type: "business",
          feasibility_risk: "",
          why_it_matters: ""
        }
      ])
    });
  };

  const removeRisk = (index: number) => {
    const next = safeValue.feasibility_risks.slice();
    next.splice(index, 1);
    onChange({ feasibility_risks: next });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Ready</span>}
          </div>
          {!approved && (
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:opacity-60"
              onClick={onClear}
              disabled={isClearing}
            >
              {isClearing ? "Clearing..." : "Clear block"}
            </button>
          )}
        </div>
      )}

      {safeValue.feasibility_risks.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          No feasibility risks yet. Add one to begin.
        </p>
      )}

      <div className="mt-3 space-y-3">
        {safeValue.feasibility_risks.map((risk, index) => (
          <div key={`risk-${index}`} className="rounded border border-slate-100 p-3">
            <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
              <div>
                <label className="block text-xs text-gray-600">Risk type</label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                  value={risk.feasibility_risk_type}
                  onChange={(event) =>
                    updateRisk(index, {
                      ...risk,
                      feasibility_risk_type:
                        event.target.value as FeasibilityRisk["feasibility_risk_type"]
                    })
                  }
                  disabled={disabled || approved}
                >
                  {FEASIBILITY_RISK_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Feasibility risk</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                    value={risk.feasibility_risk}
                    onChange={(event) =>
                      updateRisk(index, {
                        ...risk,
                        feasibility_risk: event.target.value
                      })
                    }
                    disabled={disabled || approved}
                  />
                  {!approved && !disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-600 hover:text-slate-700"
                      onClick={() => removeRisk(index)}
                      disabled={disabled}
                      aria-label="Remove risk"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs text-gray-600">Why it matters</label>
              <textarea
                className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                rows={2}
                value={risk.why_it_matters}
                onChange={(event) =>
                  updateRisk(index, {
                    ...risk,
                    why_it_matters: event.target.value
                  })
                }
                disabled={disabled || approved}
              />
            </div>
          </div>
        ))}
      </div>

      {!approved && (
        <button
          type="button"
          className="mt-3 text-xs text-blue-600 disabled:opacity-60"
          onClick={addRisk}
          disabled={disabled}
        >
          + Feasibility Risk
        </button>
      )}

      <div className="mt-3 flex items-center gap-2">
        {!approved && !hideApprove && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || approved || !hasItems || isApproving}
          >
            {isApproving ? "Approving..." : "Approve and Proceed"}
          </button>
        )}
        {showRegenerate && (
          <button
            type="button"
            className="inline-flex min-w-[108px] items-center justify-center rounded border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-60"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (regenerateLabel ?? "Regenerating...") : "Regenerate"}
          </button>
        )}
      </div>
    </div>
  );
}
