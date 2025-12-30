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

type ContextConstraintItem = {
  name: string;
  description: string;
  impact_on_user_needs: string;
  business_implications: string;
};

type ContextConstraints = {
  contextual_factors: ContextConstraintItem[];
  constraints: ContextConstraintItem[];
};

type MarketDefinition = {
  description: string;
  excluded_adjacent_spaces: string[];
};

type MarketSize = {
  description: string;
};

type MarketMaturity = {
  classification: "emerging" | "fragmented" | "consolidating" | "mature";
  rationale: string;
};

type MarketTrend = {
  name: string;
  description: string;
  time_horizon: "short" | "mid" | "long";
  affected_target_segments: string[];
  basis: "evidence_from_inputs" | "domain_generic_assumption";
  confidence: "low" | "medium" | "high";
};

type MarketDynamic = {
  name: string;
  description: string;
  affected_target_segments: string[];
  basis: "evidence_from_inputs" | "domain_generic_assumption";
  confidence: "low" | "medium" | "high";
};

type MarketForce = MarketDynamic;

type AdoptionDriver = {
  name: string;
  description: string;
  affected_target_segments: string[];
};

type AdoptionBarrier = AdoptionDriver;

type MarketLandscape = {
  market_definition: MarketDefinition;
  market_size: MarketSize;
  market_maturity: MarketMaturity;
  market_trends: MarketTrend[];
  market_dynamics: MarketDynamic[];
  market_forces: MarketForce[];
  adoption_drivers: AdoptionDriver[];
  adoption_barriers: AdoptionBarrier[];
};

type CompetitorEntry = {
  name: string;
  url: string;
  category: "direct" | "indirect" | "substitute";
  description: string;
  target_audience: string;
  positioning: string;
};

type CompetitorInventory = {
  competitors: CompetitorEntry[];
};

type CompetitorCapabilityEntry = {
  competitor_name: string;
  functional_capabilities: string[];
  technical_capabilities: string[];
  business_capabilities: string[];
  strengths: string[];
  limitations: string[];
  alignment_with_user_needs: string;
};

type IndustryCapabilityPattern = {
  pattern_name: string;
  description: string;
};

type CompetitorCapabilities = {
  competitor_capabilities: CompetitorCapabilityEntry[];
  industry_capability_patterns: IndustryCapabilityPattern[];
};

type GapOpportunity = {
  gap_description: string;
  affected_user_segments: string[];
  opportunity_description: string;
  user_value_potential: "low" | "medium" | "high";
  feasibility: "low" | "medium" | "high";
};

type GapsOpportunities = {
  gaps_and_opportunities: {
    functional: GapOpportunity[];
    technical: GapOpportunity[];
    business: GapOpportunity[];
  };
};

type OpportunityStatement = {
  opportunity_statement: string;
};

type ValueDriver = {
  name: string;
  user_need_or_pain: string;
  user_value_impact: "low" | "medium" | "high";
  business_value_lever: string;
  business_value_impact: "low" | "medium" | "high";
  priority: "low" | "medium" | "high";
};

type ValueDrivers = {
  value_drivers: ValueDriver[];
};

type MarketFitHypothesisItem = {
  hypothesis: string;
  rationale: string;
  key_risks_or_unknowns: string[];
};

type MarketFitHypothesis = {
  market_fit_hypothesis: {
    desirability: MarketFitHypothesisItem[];
    viability: MarketFitHypothesisItem[];
  };
};

type FeasibilityConstraintItem = {
  name: string;
  description: string;
  readiness: "low" | "medium" | "high";
};

type FeasibilityAssessment = {
  feasibility_assessment: {
    business_constraints: FeasibilityConstraintItem[];
    user_constraints: FeasibilityConstraintItem[];
    technical_concerns: FeasibilityConstraintItem[];
  };
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
    contextConstraints?: ContextConstraints;
  };
  marketAndCompetitorAnalysis?: {
    marketLandscape?: MarketLandscape;
    competitorInventory?: CompetitorInventory;
    competitorCapabilities?: CompetitorCapabilities;
    gapsOpportunities?: GapsOpportunities;
  };
  opportunityDefinition?: {
    opportunityStatement?: OpportunityStatement;
    valueDrivers?: ValueDrivers;
    marketFitHypothesis?: MarketFitHypothesis;
    feasibilityAssessment?: FeasibilityAssessment;
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

const emptyMarketLandscape: MarketLandscape = {
  market_definition: {
    description: "",
    excluded_adjacent_spaces: []
  },
  market_size: {
    description: ""
  },
  market_maturity: {
    classification: "emerging",
    rationale: ""
  },
  market_trends: [],
  market_dynamics: [],
  market_forces: [],
  adoption_drivers: [],
  adoption_barriers: []
};

const emptyCompetitorInventory: CompetitorInventory = {
  competitors: []
};

const emptyCompetitorCapabilities: CompetitorCapabilities = {
  competitor_capabilities: [],
  industry_capability_patterns: []
};

const emptyGapsOpportunities: GapsOpportunities = {
  gaps_and_opportunities: {
    functional: [],
    technical: [],
    business: []
  }
};

const emptyDocument: DiscoveryDocument = {
  problemUnderstanding: {
    targetUsersSegments: {
      target_segments: []
    },
    userPainPoints: {
      pain_point_themes: []
    },
    contextConstraints: {
      contextual_factors: [],
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
    opportunityStatement: {
      opportunity_statement: ""
    },
    valueDrivers: {
      value_drivers: []
    },
    marketFitHypothesis: {
      market_fit_hypothesis: {
        desirability: [],
        viability: []
      }
    },
    feasibilityAssessment: {
      feasibility_assessment: {
        business_constraints: [],
        user_constraints: [],
        technical_concerns: []
      }
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
    label: "Competitor Inventory",
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
    label: "Gaps & Opportunities",
    type: "object",
    group: "Market and Competitor Analysis"
  },
  {
    key: "opportunityDefinition.opportunityStatement",
    label: "Opportunity Statement",
    type: "object",
    group: "Opportunity Definition",
    outputKey: "opportunity_statement"
  },
  {
    key: "opportunityDefinition.valueDrivers",
    label: "Value Drivers",
    type: "object",
    group: "Opportunity Definition"
  },
  {
    key: "opportunityDefinition.marketFitHypothesis",
    label: "Market Fit Hypothesis",
    type: "object",
    group: "Opportunity Definition"
  },
  {
    key: "opportunityDefinition.feasibilityAssessment",
    label: "Feasibility Assessment",
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

function normalizeMarketLandscapeValue(value?: MarketLandscape | null): MarketLandscape {
  return {
    market_definition: {
      description: value?.market_definition?.description || "",
      excluded_adjacent_spaces: Array.isArray(
        value?.market_definition?.excluded_adjacent_spaces
      )
        ? value?.market_definition?.excluded_adjacent_spaces || []
        : []
    },
    market_size: {
      description: value?.market_size?.description || ""
    },
    market_maturity: {
      classification: value?.market_maturity?.classification || "emerging",
      rationale: value?.market_maturity?.rationale || ""
    },
    market_trends: Array.isArray(value?.market_trends) ? value?.market_trends || [] : [],
    market_dynamics: Array.isArray(value?.market_dynamics)
      ? value?.market_dynamics || []
      : [],
    market_forces: Array.isArray(value?.market_forces) ? value?.market_forces || [] : [],
    adoption_drivers: Array.isArray(value?.adoption_drivers)
      ? value?.adoption_drivers || []
      : [],
    adoption_barriers: Array.isArray(value?.adoption_barriers)
      ? value?.adoption_barriers || []
      : []
  };
}

function normalizeCompetitorInventoryValue(
  value?: CompetitorInventory | null
): CompetitorInventory {
  return {
    competitors: Array.isArray(value?.competitors) ? value?.competitors || [] : []
  };
}

function normalizeCompetitorCapabilitiesValue(
  value?: CompetitorCapabilities | null
): CompetitorCapabilities {
  return {
    competitor_capabilities: Array.isArray(value?.competitor_capabilities)
      ? value?.competitor_capabilities || []
      : [],
    industry_capability_patterns: Array.isArray(value?.industry_capability_patterns)
      ? value?.industry_capability_patterns || []
      : []
  };
}

function normalizeGapsOpportunitiesValue(
  value?: GapsOpportunities | null
): GapsOpportunities {
  const legacyList = Array.isArray(
    (value as { gaps_and_opportunities?: unknown })?.gaps_and_opportunities
  )
    ? (value as { gaps_and_opportunities: GapOpportunity[] }).gaps_and_opportunities
    : null;
  return {
    gaps_and_opportunities: {
      functional: legacyList
        ? legacyList
        : Array.isArray(value?.gaps_and_opportunities?.functional)
          ? value?.gaps_and_opportunities?.functional || []
          : [],
      technical: Array.isArray(value?.gaps_and_opportunities?.technical)
        ? value?.gaps_and_opportunities?.technical || []
        : [],
      business: Array.isArray(value?.gaps_and_opportunities?.business)
        ? value?.gaps_and_opportunities?.business || []
        : []
    }
  };
}

function normalizeOpportunityStatementValue(
  value?: OpportunityStatement | null
): OpportunityStatement {
  if (typeof value === "string") {
    return { opportunity_statement: value };
  }
  return {
    opportunity_statement: value?.opportunity_statement || ""
  };
}

function normalizeValueDriversValue(value?: ValueDrivers | null): ValueDrivers {
  return {
    value_drivers: Array.isArray(value?.value_drivers) ? value?.value_drivers || [] : []
  };
}

function normalizeMarketFitHypothesisValue(
  value?: MarketFitHypothesis | null
): MarketFitHypothesis {
  return {
    market_fit_hypothesis: {
      desirability: Array.isArray(value?.market_fit_hypothesis?.desirability)
        ? value?.market_fit_hypothesis?.desirability || []
        : [],
      viability: Array.isArray(value?.market_fit_hypothesis?.viability)
        ? value?.market_fit_hypothesis?.viability || []
        : []
    }
  };
}

function normalizeFeasibilityAssessmentValue(
  value?: FeasibilityAssessment | null
): FeasibilityAssessment {
  return {
    feasibility_assessment: {
      business_constraints: Array.isArray(value?.feasibility_assessment?.business_constraints)
        ? value?.feasibility_assessment?.business_constraints || []
        : [],
      user_constraints: Array.isArray(value?.feasibility_assessment?.user_constraints)
        ? value?.feasibility_assessment?.user_constraints || []
        : [],
      technical_concerns: Array.isArray(value?.feasibility_assessment?.technical_concerns)
        ? value?.feasibility_assessment?.technical_concerns || []
        : []
    }
  };
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
  if (field.key === "problemUnderstanding.contextConstraints") {
    const constraintsValue = value as ContextConstraints;
    return Boolean(
      (Array.isArray(constraintsValue.contextual_factors) &&
        constraintsValue.contextual_factors.length > 0) ||
        (Array.isArray(constraintsValue.constraints) &&
          constraintsValue.constraints.length > 0)
    );
  }
  if (field.key === "marketAndCompetitorAnalysis.marketLandscape") {
    const landscapeValue = value as MarketLandscape;
    return Boolean(
      landscapeValue.market_definition?.description?.trim() ||
        landscapeValue.market_size?.description?.trim() ||
        landscapeValue.market_maturity?.rationale?.trim() ||
        (Array.isArray(landscapeValue.market_trends) &&
          landscapeValue.market_trends.length > 0) ||
        (Array.isArray(landscapeValue.market_dynamics) &&
          landscapeValue.market_dynamics.length > 0) ||
        (Array.isArray(landscapeValue.market_forces) &&
          landscapeValue.market_forces.length > 0) ||
        (Array.isArray(landscapeValue.adoption_drivers) &&
          landscapeValue.adoption_drivers.length > 0) ||
        (Array.isArray(landscapeValue.adoption_barriers) &&
          landscapeValue.adoption_barriers.length > 0)
    );
  }
  if (field.key === "marketAndCompetitorAnalysis.competitorInventory") {
    const inventoryValue = value as CompetitorInventory;
    return Array.isArray(inventoryValue.competitors) && inventoryValue.competitors.length > 0;
  }
  if (field.key === "marketAndCompetitorAnalysis.competitorCapabilities") {
    const capabilityValue = value as CompetitorCapabilities;
    return Boolean(
      (Array.isArray(capabilityValue.competitor_capabilities) &&
        capabilityValue.competitor_capabilities.length > 0) ||
        (Array.isArray(capabilityValue.industry_capability_patterns) &&
          capabilityValue.industry_capability_patterns.length > 0)
    );
  }
  if (field.key === "marketAndCompetitorAnalysis.gapsOpportunities") {
    const gapsValue = value as GapsOpportunities;
    return (
      (Array.isArray(gapsValue.gaps_and_opportunities?.functional) &&
        gapsValue.gaps_and_opportunities.functional.length > 0) ||
      (Array.isArray(gapsValue.gaps_and_opportunities?.technical) &&
        gapsValue.gaps_and_opportunities.technical.length > 0) ||
      (Array.isArray(gapsValue.gaps_and_opportunities?.business) &&
        gapsValue.gaps_and_opportunities.business.length > 0)
    );
  }
  if (field.key === "opportunityDefinition.opportunityStatement") {
    const statementValue = value as OpportunityStatement;
    return Boolean(statementValue?.opportunity_statement?.trim());
  }
  if (field.key === "opportunityDefinition.valueDrivers") {
    const driversValue = value as ValueDrivers;
    return Array.isArray(driversValue.value_drivers) && driversValue.value_drivers.length > 0;
  }
  if (field.key === "opportunityDefinition.marketFitHypothesis") {
    const hypothesisValue = value as MarketFitHypothesis;
    return Boolean(
      (Array.isArray(hypothesisValue.market_fit_hypothesis?.desirability) &&
        hypothesisValue.market_fit_hypothesis.desirability.length > 0) ||
        (Array.isArray(hypothesisValue.market_fit_hypothesis?.viability) &&
          hypothesisValue.market_fit_hypothesis.viability.length > 0)
    );
  }
  if (field.key === "opportunityDefinition.feasibilityAssessment") {
    const assessmentValue = value as FeasibilityAssessment;
    return Boolean(
      (Array.isArray(assessmentValue.feasibility_assessment?.business_constraints) &&
        assessmentValue.feasibility_assessment.business_constraints.length > 0) ||
        (Array.isArray(assessmentValue.feasibility_assessment?.user_constraints) &&
          assessmentValue.feasibility_assessment.user_constraints.length > 0) ||
        (Array.isArray(assessmentValue.feasibility_assessment?.technical_concerns) &&
          assessmentValue.feasibility_assessment.technical_concerns.length > 0)
    );
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
    Record<
      string,
      | string
      | TargetSegment[]
      | PainPointTheme[]
      | ContextConstraints
      | MarketLandscape
      | CompetitorInventory
      | CompetitorCapabilities
      | GapsOpportunities
      | OpportunityStatement
      | ValueDrivers
      | MarketFitHypothesis
      | FeasibilityAssessment
    >
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
      if (currentField.key === "problemUnderstanding.contextConstraints") {
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
      if (currentField.key === "opportunityDefinition.opportunityStatement") {
        return items && typeof items === "object" ? items : null;
      }
      if (currentField.key === "opportunityDefinition.valueDrivers") {
        return items && typeof items === "object" ? items : null;
      }
      if (currentField.key === "opportunityDefinition.marketFitHypothesis") {
        return items && typeof items === "object" ? items : null;
      }
      if (currentField.key === "opportunityDefinition.feasibilityAssessment") {
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
          if (field.key === "problemUnderstanding.contextConstraints") {
            previousOutputs[fieldName] =
              items && typeof items === "object"
                ? items
                : { contextual_factors: [], constraints: [] };
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
          } else if (field.key === "opportunityDefinition.opportunityStatement") {
            previousOutputs[fieldName] =
              items && typeof items === "object" ? items : { opportunity_statement: "" };
          } else if (field.key === "opportunityDefinition.valueDrivers") {
            previousOutputs[fieldName] =
              items && typeof items === "object" ? items : { value_drivers: [] };
          } else if (field.key === "opportunityDefinition.marketFitHypothesis") {
            previousOutputs[fieldName] =
              items && typeof items === "object"
                ? items
                : {
                  market_fit_hypothesis: {
                    desirability: [],
                    viability: []
                  }
                };
          } else if (field.key === "opportunityDefinition.feasibilityAssessment") {
            previousOutputs[fieldName] =
              items && typeof items === "object"
                ? items
                : {
                  feasibility_assessment: {
                    business_constraints: [],
                    user_constraints: [],
                    technical_concerns: []
                  }
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
  }, [draftFields, fieldDefinitions, form.productIdea, form.targetUser, latestRecord, notesArray]);

  useEffect(() => {
    void refreshLatest(true);
  }, []);

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
    if (!latestVersion) {
      setError("No document available to export.");
      return;
    }
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE}/discovery/export/markdown?version=${latestVersion}`
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Markdown export failed.");
      }
      const blob = await response.blob();
      downloadBlob(blob, `discovery-document-v${latestVersion}.md`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Markdown export failed.");
    }
  };

  const exportPdf = async () => {
    if (!latestVersion) {
      setError("No document available to export.");
      return;
    }
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE}/discovery/export/pdf?version=${latestVersion}`
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "PDF export failed.");
      }
      const blob = await response.blob();
      downloadBlob(blob, `discovery-document-v${latestVersion}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF export failed.");
    }
  };

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
    const nextDrafts: Record<
      string,
      | string
      | TargetSegment[]
      | PainPointTheme[]
      | ContextConstraints
      | MarketLandscape
      | CompetitorInventory
      | CompetitorCapabilities
      | GapsOpportunities
      | OpportunityStatement
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
        if (field.key === "problemUnderstanding.contextConstraints") {
          const constraintsValue =
            typeof value === "object" && value !== null
              ? (value as ContextConstraints)
              : { contextual_factors: [], constraints: [] };
          nextDrafts[field.key] = {
            contextual_factors: Array.isArray(constraintsValue.contextual_factors)
              ? constraintsValue.contextual_factors
              : [],
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
              ? (value as GapsOpportunities)
              : null;
          nextDrafts[field.key] = normalizeGapsOpportunitiesValue(gapsValue);
        } else if (field.key === "opportunityDefinition.opportunityStatement") {
          const statementValue =
            typeof value === "object" && value !== null
              ? (value as OpportunityStatement)
              : null;
          nextDrafts[field.key] = normalizeOpportunityStatementValue(statementValue);
        } else if (field.key === "opportunityDefinition.valueDrivers") {
          const driversValue =
            typeof value === "object" && value !== null
              ? (value as ValueDrivers)
              : null;
          nextDrafts[field.key] = normalizeValueDriversValue(driversValue);
        } else if (field.key === "opportunityDefinition.marketFitHypothesis") {
          const hypothesisValue =
            typeof value === "object" && value !== null
              ? (value as MarketFitHypothesis)
              : null;
          nextDrafts[field.key] = normalizeMarketFitHypothesisValue(hypothesisValue);
        } else if (field.key === "opportunityDefinition.feasibilityAssessment") {
          const assessmentValue =
            typeof value === "object" && value !== null
              ? (value as FeasibilityAssessment)
              : null;
          nextDrafts[field.key] = normalizeFeasibilityAssessmentValue(assessmentValue);
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
    setProgressText(`Step ${stepNumber} of ${total} approved (${approvedCount}/${total}).`);
  }, [latestRecord]);

  const withSupabaseMessage = (text: string, saved?: boolean) =>
    saved ? `${text} Saved to Supabase.` : text;
  const withValidationMessage = (text: string, status?: string | null) =>
    status === "valid" ? `${text} JSON validated.` : text;
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
  }, [latestRecord?.currentFieldKey, latestRecord?.discoveryDocument]);

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
          withValidationMessage(
            withSupabaseMessage(
              data.resultType === "created"
                ? "New discovery document started. Approve each field in order."
                : "Continue approving fields in order.",
              data.savedToSupabase
            ),
            data.validationStatus
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
          withValidationMessage(
            withSupabaseMessage(
              data.status === "approved"
                ? "All fields approved. Discovery document is complete."
                : "Field approved. Next field is ready.",
              data.savedToSupabase
            ),
            data.validationStatus
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
      if (rawValue && typeof rawValue === "object") {
        const field = fieldDefinitions.find((item) => item.key === key);
        return field ? hasFieldValue(field, rawValue) : false;
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
          withValidationMessage(
            withSupabaseMessage(
              "Field regenerated. Review and approve.",
              data.savedToSupabase
            ),
            data.validationStatus
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
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="rounded border px-3 py-2 text-sm disabled:opacity-60"
                      onClick={exportMarkdown}
                      disabled={!latestVersion}
                    >
                      Export MD
                    </button>
                    <button
                      type="button"
                      className="rounded border px-3 py-2 text-sm disabled:opacity-60"
                      onClick={exportPdf}
                      disabled={!latestVersion}
                    >
                      Export PDF
                    </button>
                    <button
                      type="button"
                      className="rounded border px-3 py-2 text-sm disabled:opacity-60"
                      onClick={clearDocument}
                      disabled={!latestVersion || isClearing}
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
                            const recordValue = getNestedValue(
                              latestRecord?.discoveryDocument || emptyDocument,
                              field.key
                            );
                            const shouldRender =
                              isApproved || isCurrent || hasFieldValue(field, recordValue);
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
                                  <div className="flex w-full items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span>{field.label}</span>
                                      {isApproved && (
                                        <span className="text-xs font-medium text-green-600">
                                          Approved
                                        </span>
                                      )}
                                    </div>
                                    {!isApproved && isCurrent && (
                                      <button
                                        type="button"
                                        className="rounded border bg-white px-3 py-2 text-sm font-normal text-gray-700 disabled:opacity-60"
                                        onClick={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          clearField(field.key);
                                        }}
                                        disabled={clearingFieldKey === field.key}
                                      >
                                        {clearingFieldKey === field.key ? "Clearing…" : "Clear block"}
                                      </button>
                                    )}
                                  </div>
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
                                    ) : field.key ===
                                      "marketAndCompetitorAnalysis.marketLandscape" ? (
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
                                        isClearing={clearingFieldKey === field.key}
                                      />
                                    ) : field.key ===
                                      "marketAndCompetitorAnalysis.competitorInventory" ? (
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
                                        isClearing={clearingFieldKey === field.key}
                                      />
                                    ) : field.key ===
                                      "marketAndCompetitorAnalysis.competitorCapabilities" ? (
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
                                        isClearing={clearingFieldKey === field.key}
                                      />
                                    ) : field.key ===
                                      "marketAndCompetitorAnalysis.gapsOpportunities" ? (
                                      <GapsOpportunitiesEditor
                                        title={field.label}
                                        showTitle={false}
                                        value={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as GapsOpportunities)
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
                                        isClearing={clearingFieldKey === field.key}
                                      />
                                    ) : field.key ===
                                      "opportunityDefinition.opportunityStatement" ? (
                                      <FieldEditor
                                        title={field.label}
                                        showTitle={false}
                                        type="string"
                                        value={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as OpportunityStatement)
                                                .opportunity_statement
                                            : ""
                                        }
                                        onChange={(nextValue) =>
                                          setDraftFields((prev) => ({
                                            ...prev,
                                            [field.key]: {
                                              opportunity_statement: nextValue
                                            }
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
                                        isClearing={clearingFieldKey === field.key}
                                      />
                                    ) : field.key ===
                                      "opportunityDefinition.marketFitHypothesis" ? (
                                      <MarketFitHypothesisEditor
                                        title={field.label}
                                        showTitle={false}
                                        value={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as MarketFitHypothesis)
                                            : {
                                              market_fit_hypothesis: {
                                                desirability: [],
                                                viability: []
                                              }
                                            }
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
                                    ) : field.key ===
                                      "opportunityDefinition.feasibilityAssessment" ? (
                                      <FeasibilityAssessmentEditor
                                        title={field.label}
                                        showTitle={false}
                                        value={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as FeasibilityAssessment)
                                            : {
                                              feasibility_assessment: {
                                                business_constraints: [],
                                                user_constraints: [],
                                                technical_concerns: []
                                              }
                                            }
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
                                    ) : field.key === "problemUnderstanding.contextConstraints" ? (
                                      <ContextConstraintsEditor
                                        title={field.label}
                                        showTitle={false}
                                        value={
                                          typeof draftFields[field.key] === "object" &&
                                          draftFields[field.key] !== null
                                            ? (draftFields[field.key] as ContextConstraints)
                                            : { contextual_factors: [], constraints: [] }
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
                                    ) : field.key ===
                                      "problemUnderstanding.userPainPoints" ? (
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

          <Accordion type="multiple" className="space-y-2">
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
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Approved</span>}
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
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Approved</span>}
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
                  <textarea
                    className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                    rows={2}
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
const MARKET_MATURITY_OPTIONS: Array<MarketMaturity["classification"]> = [
  "emerging",
  "fragmented",
  "consolidating",
  "mature"
];
const TIME_HORIZON_OPTIONS: Array<MarketTrend["time_horizon"]> = [
  "short",
  "mid",
  "long"
];
const BASIS_OPTIONS: Array<MarketTrend["basis"]> = [
  "evidence_from_inputs",
  "domain_generic_assumption"
];
const CONFIDENCE_OPTIONS: Array<MarketTrend["confidence"]> = [
  "low",
  "medium",
  "high"
];
const COMPETITOR_CATEGORY_OPTIONS: Array<CompetitorEntry["category"]> = [
  "direct",
  "indirect",
  "substitute"
];

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
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Approved</span>}
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
      </div>
    </div>
  );
}

type ContextConstraintsEditorProps = {
  title: string;
  value: ContextConstraints;
  onChange: (value: ContextConstraints) => void;
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

function ContextConstraintsEditor({
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
  showTitle = true
}: ContextConstraintsEditorProps) {
  const safeValue: ContextConstraints = {
    contextual_factors: Array.isArray(value?.contextual_factors)
      ? value.contextual_factors
      : [],
    constraints: Array.isArray(value?.constraints) ? value.constraints : []
  };

  const updateList = (
    key: keyof ContextConstraints,
    nextItems: ContextConstraintItem[]
  ) => {
    onChange({ ...safeValue, [key]: nextItems });
  };

  const updateItem = (
    key: keyof ContextConstraints,
    index: number,
    nextItem: ContextConstraintItem
  ) => {
    const items = safeValue[key].slice();
    items[index] = nextItem;
    updateList(key, items);
  };

  const addItem = (key: keyof ContextConstraints) => {
    updateList(key, safeValue[key].concat([
      {
        name: "",
        description: "",
        impact_on_user_needs: "",
        business_implications: ""
      }
    ]));
  };

  const removeItem = (key: keyof ContextConstraints, index: number) => {
    const items = safeValue[key].slice();
    items.splice(index, 1);
    updateList(key, items);
  };

  const renderList = (label: string, key: keyof ContextConstraints) => (
    <Accordion type="multiple" defaultValue={[key]}>
      <AccordionItem value={key} className="border-0">
        <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
          {label}
        </AccordionTrigger>
        <AccordionContent className="pt-2">
          <Accordion type="multiple" className="space-y-3">
        {safeValue[key].map((item, index) => {
          const itemKey = `${key}-${index}`;
          return (
            <AccordionItem
              key={itemKey}
              value={itemKey}
              className="rounded border border-slate-100 p-2"
            >
              <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2">
                    <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                      <span className="sr-only">Toggle item</span>
                    </AccordionTrigger>
                    <label className="block text-xs text-gray-600">Name</label>
                  </div>
                  <input
                    className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                    value={item.name}
                    onChange={(event) =>
                      updateItem(key, index, { ...item, name: event.target.value })
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
                      onClick={() => removeItem(key, index)}
                      disabled={disabled}
                      aria-label={`Remove ${label.toLowerCase()} item`}
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
                    value={item.description}
                    onChange={(event) =>
                      updateItem(key, index, { ...item, description: event.target.value })
                    }
                    disabled={disabled || approved}
                  />
                </div>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-600">
                      Impact on user needs
                    </label>
                    <textarea
                      className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      rows={1}
                      value={item.impact_on_user_needs}
                      onChange={(event) =>
                        updateItem(key, index, {
                          ...item,
                          impact_on_user_needs: event.target.value
                        })
                      }
                      disabled={disabled || approved}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">
                      Business implications
                    </label>
                    <textarea
                      className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      rows={1}
                      value={item.business_implications}
                      onChange={(event) =>
                        updateItem(key, index, {
                          ...item,
                          business_implications: event.target.value
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
              onClick={() => addItem(key)}
              disabled={disabled}
            >
              + {label === "Contextual factors" ? "Factor" : "Constraint"}
            </button>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Approved</span>}
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

      {renderList("Contextual factors", "contextual_factors")}
      {renderList("Constraints", "constraints")}

      <div className="mt-4 flex items-center gap-2">
        {!approved && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || isApproving}
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
  showTitle = true
}: MarketLandscapeEditorProps) {
  const safeValue = normalizeMarketLandscapeValue(value);

  const hasContent =
    safeValue.market_definition.description.trim().length > 0 ||
    safeValue.market_definition.excluded_adjacent_spaces.some((item) => item.trim()) ||
    safeValue.market_size.description.trim().length > 0 ||
    safeValue.market_maturity.rationale.trim().length > 0 ||
    safeValue.market_trends.length > 0 ||
    safeValue.market_dynamics.length > 0 ||
    safeValue.market_forces.length > 0 ||
    safeValue.adoption_drivers.length > 0 ||
    safeValue.adoption_barriers.length > 0;

  const updateMarketDefinition = (next: MarketDefinition) => {
    onChange({ ...safeValue, market_definition: next });
  };

  const updateMarketSize = (next: MarketSize) => {
    onChange({ ...safeValue, market_size: next });
  };

  const updateMarketMaturity = (next: MarketMaturity) => {
    onChange({ ...safeValue, market_maturity: next });
  };

  const [openTrends, setOpenTrends] = useOpenItems(
    safeValue.market_trends,
    "trend"
  );
  const [openDynamics, setOpenDynamics] = useOpenItems(
    safeValue.market_dynamics,
    "dynamic"
  );
  const [openForces, setOpenForces] = useOpenItems(
    safeValue.market_forces,
    "force"
  );
  const [openDrivers, setOpenDrivers] = useOpenItems(
    safeValue.adoption_drivers,
    "driver"
  );
  const [openBarriers, setOpenBarriers] = useOpenItems(
    safeValue.adoption_barriers,
    "barrier"
  );

  const updateTrend = (index: number, nextItem: MarketTrend) => {
    const next = safeValue.market_trends.slice();
    next[index] = nextItem;
    onChange({ ...safeValue, market_trends: next });
  };

  const addTrend = () => {
    onChange({
      ...safeValue,
      market_trends: safeValue.market_trends.concat([
        {
          name: "",
          description: "",
          time_horizon: "short",
          affected_target_segments: [""],
          basis: "domain_generic_assumption",
          confidence: "medium"
        }
      ])
    });
  };

  const removeTrend = (index: number) => {
    const next = safeValue.market_trends.slice();
    next.splice(index, 1);
    onChange({ ...safeValue, market_trends: next });
  };

  const updateDynamic = (index: number, nextItem: MarketDynamic) => {
    const next = safeValue.market_dynamics.slice();
    next[index] = nextItem;
    onChange({ ...safeValue, market_dynamics: next });
  };

  const addDynamic = () => {
    onChange({
      ...safeValue,
      market_dynamics: safeValue.market_dynamics.concat([
        {
          name: "",
          description: "",
          affected_target_segments: [""],
          basis: "domain_generic_assumption",
          confidence: "medium"
        }
      ])
    });
  };

  const removeDynamic = (index: number) => {
    const next = safeValue.market_dynamics.slice();
    next.splice(index, 1);
    onChange({ ...safeValue, market_dynamics: next });
  };

  const updateForce = (index: number, nextItem: MarketForce) => {
    const next = safeValue.market_forces.slice();
    next[index] = nextItem;
    onChange({ ...safeValue, market_forces: next });
  };

  const addForce = () => {
    onChange({
      ...safeValue,
      market_forces: safeValue.market_forces.concat([
        {
          name: "",
          description: "",
          affected_target_segments: [""],
          basis: "domain_generic_assumption",
          confidence: "medium"
        }
      ])
    });
  };

  const removeForce = (index: number) => {
    const next = safeValue.market_forces.slice();
    next.splice(index, 1);
    onChange({ ...safeValue, market_forces: next });
  };

  const updateDriver = (index: number, nextItem: AdoptionDriver) => {
    const next = safeValue.adoption_drivers.slice();
    next[index] = nextItem;
    onChange({ ...safeValue, adoption_drivers: next });
  };

  const addDriver = () => {
    onChange({
      ...safeValue,
      adoption_drivers: safeValue.adoption_drivers.concat([
        {
          name: "",
          description: "",
          affected_target_segments: [""]
        }
      ])
    });
  };

  const removeDriver = (index: number) => {
    const next = safeValue.adoption_drivers.slice();
    next.splice(index, 1);
    onChange({ ...safeValue, adoption_drivers: next });
  };

  const updateBarrier = (index: number, nextItem: AdoptionBarrier) => {
    const next = safeValue.adoption_barriers.slice();
    next[index] = nextItem;
    onChange({ ...safeValue, adoption_barriers: next });
  };

  const addBarrier = () => {
    onChange({
      ...safeValue,
      adoption_barriers: safeValue.adoption_barriers.concat([
        {
          name: "",
          description: "",
          affected_target_segments: [""]
        }
      ])
    });
  };

  const removeBarrier = (index: number) => {
    const next = safeValue.adoption_barriers.slice();
    next.splice(index, 1);
    onChange({ ...safeValue, adoption_barriers: next });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Approved</span>}
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

      <Accordion type="multiple" defaultValue={["market-definition"]}>
        <AccordionItem value="market-definition" className="border-0">
          <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
            Market definition
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="mt-2">
              <label className="block text-xs text-gray-600">Description</label>
              <textarea
                className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                rows={1}
                value={safeValue.market_definition.description}
                onChange={(event) =>
                  updateMarketDefinition({
                    ...safeValue.market_definition,
                    description: event.target.value
                  })
                }
                disabled={disabled || approved}
              />
            </div>
            <div className="mt-2">
              <label className="block text-xs text-gray-600">
                Excluded adjacent spaces (one per line)
              </label>
              <textarea
                className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                rows={1}
                value={safeValue.market_definition.excluded_adjacent_spaces.join("\n")}
                onChange={(event) =>
                  updateMarketDefinition({
                    ...safeValue.market_definition,
                    excluded_adjacent_spaces: event.target.value.split("\n")
                  })
                }
                disabled={disabled || approved}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="multiple" defaultValue={["market-size"]}>
        <AccordionItem value="market-size" className="border-0">
          <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
            Market size
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="mt-2">
              <label className="block text-xs text-gray-600">Description</label>
              <textarea
                className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                rows={1}
                value={safeValue.market_size.description}
                onChange={(event) =>
                  updateMarketSize({ description: event.target.value })
                }
                disabled={disabled || approved}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="multiple" defaultValue={["market-maturity"]}>
        <AccordionItem value="market-maturity" className="border-0">
          <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
            Market maturity
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-600">Classification</label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                  value={safeValue.market_maturity.classification}
                  onChange={(event) =>
                    updateMarketMaturity({
                      ...safeValue.market_maturity,
                      classification: event.target.value as MarketMaturity["classification"]
                    })
                  }
                  disabled={disabled || approved}
                >
                  {MARKET_MATURITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Rationale</label>
                <textarea
                  className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                  rows={1}
                  value={safeValue.market_maturity.rationale}
                  onChange={(event) =>
                    updateMarketMaturity({
                      ...safeValue.market_maturity,
                      rationale: event.target.value
                    })
                  }
                  disabled={disabled || approved}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="multiple" defaultValue={["market-trends"]}>
        <AccordionItem value="market-trends" className="border-0">
          <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
            Market trends
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Accordion
              type="multiple"
              value={openTrends}
              onValueChange={setOpenTrends}
              className="space-y-3"
            >
              {safeValue.market_trends.map((trend, index) => {
                const trendKey = `trend-${index}`;
                return (
                  <AccordionItem
                    key={trendKey}
                    value={trendKey}
                    className="rounded border border-slate-100 p-2"
                  >
                    <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex items-center gap-2">
                          <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                            <span className="sr-only">Toggle trend</span>
                          </AccordionTrigger>
                          <label className="block text-xs text-gray-600">Trend name</label>
                        </div>
                        <input
                          className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                          value={trend.name}
                          onChange={(event) =>
                            updateTrend(index, { ...trend, name: event.target.value })
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
                            onClick={() => removeTrend(index)}
                            disabled={disabled}
                            aria-label="Remove trend"
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
                          value={trend.description}
                          onChange={(event) =>
                            updateTrend(index, {
                              ...trend,
                              description: event.target.value
                            })
                          }
                          disabled={disabled || approved}
                        />
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <div>
                          <label className="block text-xs text-gray-600">Time horizon</label>
                          <select
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            value={trend.time_horizon}
                            onChange={(event) =>
                              updateTrend(index, {
                                ...trend,
                                time_horizon: event.target.value as MarketTrend["time_horizon"]
                              })
                            }
                            disabled={disabled || approved}
                          >
                            {TIME_HORIZON_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">Basis</label>
                          <select
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            value={trend.basis}
                            onChange={(event) =>
                              updateTrend(index, {
                                ...trend,
                                basis: event.target.value as MarketTrend["basis"]
                              })
                            }
                            disabled={disabled || approved}
                          >
                            {BASIS_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">Confidence</label>
                          <select
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            value={trend.confidence}
                            onChange={(event) =>
                              updateTrend(index, {
                                ...trend,
                                confidence: event.target.value as MarketTrend["confidence"]
                              })
                            }
                            disabled={disabled || approved}
                          >
                            {CONFIDENCE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-xs text-gray-600">
                          Affected target segments (one per line)
                        </label>
                        <textarea
                          className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                          rows={1}
                          value={trend.affected_target_segments.join("\n")}
                          onChange={(event) =>
                            updateTrend(index, {
                              ...trend,
                              affected_target_segments: event.target.value.split("\n")
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
                className="mt-2 text-xs text-blue-600 disabled:opacity-60"
                onClick={addTrend}
                disabled={disabled}
              >
                + Trend
              </button>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="multiple" defaultValue={["market-dynamics"]}>
        <AccordionItem value="market-dynamics" className="border-0">
          <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
            Market dynamics
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Accordion
              type="multiple"
              value={openDynamics}
              onValueChange={setOpenDynamics}
              className="space-y-3"
            >
              {safeValue.market_dynamics.map((item, index) => {
                const dynamicKey = `dynamic-${index}`;
                return (
                  <AccordionItem
                    key={dynamicKey}
                    value={dynamicKey}
                    className="rounded border border-slate-100 p-2"
                  >
                    <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex items-center gap-2">
                          <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                            <span className="sr-only">Toggle dynamic</span>
                          </AccordionTrigger>
                          <label className="block text-xs text-gray-600">Name</label>
                        </div>
                        <input
                          className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                          value={item.name}
                          onChange={(event) =>
                            updateDynamic(index, { ...item, name: event.target.value })
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
                            onClick={() => removeDynamic(index)}
                            disabled={disabled}
                            aria-label="Remove dynamic"
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
                          value={item.description}
                          onChange={(event) =>
                            updateDynamic(index, {
                              ...item,
                              description: event.target.value
                            })
                          }
                          disabled={disabled || approved}
                        />
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div>
                          <label className="block text-xs text-gray-600">Basis</label>
                          <select
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            value={item.basis}
                            onChange={(event) =>
                              updateDynamic(index, {
                                ...item,
                                basis: event.target.value as MarketDynamic["basis"]
                              })
                            }
                            disabled={disabled || approved}
                          >
                            {BASIS_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">Confidence</label>
                          <select
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            value={item.confidence}
                            onChange={(event) =>
                              updateDynamic(index, {
                                ...item,
                                confidence: event.target.value as MarketDynamic["confidence"]
                              })
                            }
                            disabled={disabled || approved}
                          >
                            {CONFIDENCE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-xs text-gray-600">
                          Affected target segments (one per line)
                        </label>
                        <textarea
                          className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                          rows={1}
                          value={item.affected_target_segments.join("\n")}
                          onChange={(event) =>
                            updateDynamic(index, {
                              ...item,
                              affected_target_segments: event.target.value.split("\n")
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
                className="mt-2 text-xs text-blue-600 disabled:opacity-60"
                onClick={addDynamic}
                disabled={disabled}
              >
                + Dynamic
              </button>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="multiple" defaultValue={["market-forces"]}>
        <AccordionItem value="market-forces" className="border-0">
          <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
            Market forces
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Accordion
              type="multiple"
              value={openForces}
              onValueChange={setOpenForces}
              className="space-y-3"
            >
              {safeValue.market_forces.map((item, index) => {
                const forceKey = `force-${index}`;
                return (
                  <AccordionItem
                    key={forceKey}
                    value={forceKey}
                    className="rounded border border-slate-100 p-2"
                  >
                    <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex items-center gap-2">
                          <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                            <span className="sr-only">Toggle force</span>
                          </AccordionTrigger>
                          <label className="block text-xs text-gray-600">Name</label>
                        </div>
                        <input
                          className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                          value={item.name}
                          onChange={(event) =>
                            updateForce(index, { ...item, name: event.target.value })
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
                            onClick={() => removeForce(index)}
                            disabled={disabled}
                            aria-label="Remove force"
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
                          value={item.description}
                          onChange={(event) =>
                            updateForce(index, {
                              ...item,
                              description: event.target.value
                            })
                          }
                          disabled={disabled || approved}
                        />
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div>
                          <label className="block text-xs text-gray-600">Basis</label>
                          <select
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            value={item.basis}
                            onChange={(event) =>
                              updateForce(index, {
                                ...item,
                                basis: event.target.value as MarketForce["basis"]
                              })
                            }
                            disabled={disabled || approved}
                          >
                            {BASIS_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">Confidence</label>
                          <select
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            value={item.confidence}
                            onChange={(event) =>
                              updateForce(index, {
                                ...item,
                                confidence: event.target.value as MarketForce["confidence"]
                              })
                            }
                            disabled={disabled || approved}
                          >
                            {CONFIDENCE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-xs text-gray-600">
                          Affected target segments (one per line)
                        </label>
                        <textarea
                          className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                          rows={1}
                          value={item.affected_target_segments.join("\n")}
                          onChange={(event) =>
                            updateForce(index, {
                              ...item,
                              affected_target_segments: event.target.value.split("\n")
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
                className="mt-2 text-xs text-blue-600 disabled:opacity-60"
                onClick={addForce}
                disabled={disabled}
              >
                + Force
              </button>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="multiple" defaultValue={["adoption-drivers"]}>
        <AccordionItem value="adoption-drivers" className="border-0">
          <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
            Adoption drivers
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Accordion
              type="multiple"
              value={openDrivers}
              onValueChange={setOpenDrivers}
              className="space-y-3"
            >
              {safeValue.adoption_drivers.map((item, index) => {
                const driverKey = `driver-${index}`;
                return (
                  <AccordionItem
                    key={driverKey}
                    value={driverKey}
                    className="rounded border border-slate-100 p-2"
                  >
                    <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex items-center gap-2">
                          <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                            <span className="sr-only">Toggle driver</span>
                          </AccordionTrigger>
                          <label className="block text-xs text-gray-600">Name</label>
                        </div>
                        <input
                          className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                          value={item.name}
                          onChange={(event) =>
                            updateDriver(index, { ...item, name: event.target.value })
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
                            onClick={() => removeDriver(index)}
                            disabled={disabled}
                            aria-label="Remove driver"
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
                          value={item.description}
                          onChange={(event) =>
                            updateDriver(index, {
                              ...item,
                              description: event.target.value
                            })
                          }
                          disabled={disabled || approved}
                        />
                      </div>
                      <div className="mt-2">
                        <label className="block text-xs text-gray-600">
                          Affected target segments (one per line)
                        </label>
                        <textarea
                          className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                          rows={1}
                          value={item.affected_target_segments.join("\n")}
                          onChange={(event) =>
                            updateDriver(index, {
                              ...item,
                              affected_target_segments: event.target.value.split("\n")
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
                className="mt-2 text-xs text-blue-600 disabled:opacity-60"
                onClick={addDriver}
                disabled={disabled}
              >
                + Driver
              </button>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="multiple" defaultValue={["adoption-barriers"]}>
        <AccordionItem value="adoption-barriers" className="border-0">
          <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
            Adoption barriers
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Accordion
              type="multiple"
              value={openBarriers}
              onValueChange={setOpenBarriers}
              className="space-y-3"
            >
              {safeValue.adoption_barriers.map((item, index) => {
                const barrierKey = `barrier-${index}`;
                return (
                  <AccordionItem
                    key={barrierKey}
                    value={barrierKey}
                    className="rounded border border-slate-100 p-2"
                  >
                    <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex items-center gap-2">
                          <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                            <span className="sr-only">Toggle barrier</span>
                          </AccordionTrigger>
                          <label className="block text-xs text-gray-600">Name</label>
                        </div>
                        <input
                          className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                          value={item.name}
                          onChange={(event) =>
                            updateBarrier(index, { ...item, name: event.target.value })
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
                            onClick={() => removeBarrier(index)}
                            disabled={disabled}
                            aria-label="Remove barrier"
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
                          value={item.description}
                          onChange={(event) =>
                            updateBarrier(index, {
                              ...item,
                              description: event.target.value
                            })
                          }
                          disabled={disabled || approved}
                        />
                      </div>
                      <div className="mt-2">
                        <label className="block text-xs text-gray-600">
                          Affected target segments (one per line)
                        </label>
                        <textarea
                          className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                          rows={1}
                          value={item.affected_target_segments.join("\n")}
                          onChange={(event) =>
                            updateBarrier(index, {
                              ...item,
                              affected_target_segments: event.target.value.split("\n")
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
                className="mt-2 text-xs text-blue-600 disabled:opacity-60"
                onClick={addBarrier}
                disabled={disabled}
              >
                + Barrier
              </button>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-4 flex items-center gap-2">
        {!approved && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || !hasContent || isApproving}
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
};

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
  showTitle = true
}: CompetitorInventoryEditorProps) {
  const safeValue = normalizeCompetitorInventoryValue(value);
  const hasCompetitors = safeValue.competitors.length > 0;
  const [openCompetitors, setOpenCompetitors] = useOpenItems(
    safeValue.competitors,
    "competitor"
  );

  const updateCompetitor = (index: number, nextItem: CompetitorEntry) => {
    const next = safeValue.competitors.slice();
    next[index] = nextItem;
    onChange({ competitors: next });
  };

  const addCompetitor = () => {
    onChange({
      competitors: safeValue.competitors.concat([
        {
          name: "",
          url: "",
          category: "direct",
          description: "",
          target_audience: "",
          positioning: ""
        }
      ])
    });
  };

  const removeCompetitor = (index: number) => {
    const next = safeValue.competitors.slice();
    next.splice(index, 1);
    onChange({ competitors: next });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Approved</span>}
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

      {safeValue.competitors.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          No competitors yet. Add one to begin.
        </p>
      )}

      <Accordion
        type="multiple"
        value={openCompetitors}
        onValueChange={setOpenCompetitors}
        className="mt-3 space-y-3"
      >
        {safeValue.competitors.map((competitor, index) => {
          const itemKey = `competitor-${index}`;
          return (
            <AccordionItem
              key={itemKey}
              value={itemKey}
              className="rounded border border-slate-100 p-2"
            >
              <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2">
                    <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                      <span className="sr-only">Toggle competitor</span>
                    </AccordionTrigger>
                    <label className="block text-xs text-gray-600">Competitor name</label>
                  </div>
                  <input
                    className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                    value={competitor.name}
                    onChange={(event) =>
                      updateCompetitor(index, { ...competitor, name: event.target.value })
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
                      onClick={() => removeCompetitor(index)}
                      disabled={disabled}
                      aria-label="Remove competitor"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
              <AccordionContent className="pt-0">
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-600">URL</label>
                    <input
                      className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      value={competitor.url}
                      onChange={(event) =>
                        updateCompetitor(index, { ...competitor, url: event.target.value })
                      }
                      disabled={disabled || approved}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">Category</label>
                    <select
                      className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      value={competitor.category}
                      onChange={(event) =>
                        updateCompetitor(index, {
                          ...competitor,
                          category: event.target.value as CompetitorEntry["category"]
                        })
                      }
                      disabled={disabled || approved}
                    >
                      {COMPETITOR_CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs text-gray-600">Description</label>
                  <textarea
                    className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                    rows={1}
                    value={competitor.description}
                    onChange={(event) =>
                      updateCompetitor(index, {
                        ...competitor,
                        description: event.target.value
                      })
                    }
                    disabled={disabled || approved}
                  />
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-600">Target audience</label>
                    <textarea
                      className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      rows={1}
                      value={competitor.target_audience}
                      onChange={(event) =>
                        updateCompetitor(index, {
                          ...competitor,
                          target_audience: event.target.value
                        })
                      }
                      disabled={disabled || approved}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">Positioning</label>
                    <textarea
                      className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      rows={1}
                      value={competitor.positioning}
                      onChange={(event) =>
                        updateCompetitor(index, {
                          ...competitor,
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
          className="mt-3 inline-flex items-center rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 disabled:opacity-60"
          onClick={addCompetitor}
          disabled={disabled}
        >
          + Competitor
        </button>
      )}

      <div className="mt-3 flex items-center gap-2">
        {!approved && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || !hasCompetitors || isApproving}
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
};

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
  showTitle = true
}: CompetitorCapabilitiesEditorProps) {
  const safeValue = normalizeCompetitorCapabilitiesValue(value);
  const hasCompetitors = safeValue.competitor_capabilities.length > 0;
  const hasPatterns = safeValue.industry_capability_patterns.length > 0;
  const [openCompetitors, setOpenCompetitors] = useOpenItems(
    safeValue.competitor_capabilities,
    "competitor-capability"
  );
  const [openPatterns, setOpenPatterns] = useOpenItems(
    safeValue.industry_capability_patterns,
    "industry-pattern"
  );

  const updateCompetitor = (
    index: number,
    nextItem: CompetitorCapabilityEntry
  ) => {
    const next = safeValue.competitor_capabilities.slice();
    next[index] = nextItem;
    onChange({ ...safeValue, competitor_capabilities: next });
  };

  const addCompetitor = () => {
    onChange({
      ...safeValue,
      competitor_capabilities: safeValue.competitor_capabilities.concat([
        {
          competitor_name: "",
          functional_capabilities: [""],
          technical_capabilities: [""],
          business_capabilities: [""],
          strengths: [""],
          limitations: [""],
          alignment_with_user_needs: ""
        }
      ])
    });
  };

  const removeCompetitor = (index: number) => {
    const next = safeValue.competitor_capabilities.slice();
    next.splice(index, 1);
    onChange({ ...safeValue, competitor_capabilities: next });
  };

  const updatePattern = (index: number, nextItem: IndustryCapabilityPattern) => {
    const next = safeValue.industry_capability_patterns.slice();
    next[index] = nextItem;
    onChange({ ...safeValue, industry_capability_patterns: next });
  };

  const addPattern = () => {
    onChange({
      ...safeValue,
      industry_capability_patterns: safeValue.industry_capability_patterns.concat([
        { pattern_name: "", description: "" }
      ])
    });
  };

  const removePattern = (index: number) => {
    const next = safeValue.industry_capability_patterns.slice();
    next.splice(index, 1);
    onChange({ ...safeValue, industry_capability_patterns: next });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Approved</span>}
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

      <Accordion type="multiple" defaultValue={["competitor_capabilities"]}>
        <AccordionItem value="competitor_capabilities" className="border-0">
          <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
            Competitor capabilities
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Accordion
              type="multiple"
              value={openCompetitors}
              onValueChange={setOpenCompetitors}
              className="space-y-3"
            >
              {safeValue.competitor_capabilities.map((item, index) => {
                const itemKey = `competitor-capability-${index}`;
                return (
                  <AccordionItem
                    key={itemKey}
                    value={itemKey}
                    className="rounded border border-slate-100 p-2"
                  >
                    <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex items-center gap-2">
                          <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                            <span className="sr-only">Toggle competitor</span>
                          </AccordionTrigger>
                          <label className="block text-xs text-gray-600">Competitor name</label>
                        </div>
                        <input
                          className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                          value={item.competitor_name}
                          onChange={(event) =>
                            updateCompetitor(index, {
                              ...item,
                              competitor_name: event.target.value
                            })
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
                            onClick={() => removeCompetitor(index)}
                            disabled={disabled}
                            aria-label="Remove competitor capability"
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </div>
                    <AccordionContent className="pt-0">
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div>
                          <label className="block text-xs text-gray-600">
                            Functional capabilities (one per line)
                          </label>
                          <textarea
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            rows={2}
                            value={item.functional_capabilities.join("\n")}
                            onChange={(event) =>
                              updateCompetitor(index, {
                                ...item,
                                functional_capabilities: event.target.value.split("\n")
                              })
                            }
                            disabled={disabled || approved}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">
                            Technical capabilities (one per line)
                          </label>
                          <textarea
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            rows={2}
                            value={item.technical_capabilities.join("\n")}
                            onChange={(event) =>
                              updateCompetitor(index, {
                                ...item,
                                technical_capabilities: event.target.value.split("\n")
                              })
                            }
                            disabled={disabled || approved}
                          />
                        </div>
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div>
                          <label className="block text-xs text-gray-600">
                            Business capabilities (one per line)
                          </label>
                          <textarea
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            rows={2}
                            value={item.business_capabilities.join("\n")}
                            onChange={(event) =>
                              updateCompetitor(index, {
                                ...item,
                                business_capabilities: event.target.value.split("\n")
                              })
                            }
                            disabled={disabled || approved}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">
                            Strengths (one per line)
                          </label>
                          <textarea
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            rows={2}
                            value={item.strengths.join("\n")}
                            onChange={(event) =>
                              updateCompetitor(index, {
                                ...item,
                                strengths: event.target.value.split("\n")
                              })
                            }
                            disabled={disabled || approved}
                          />
                        </div>
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div>
                          <label className="block text-xs text-gray-600">
                            Limitations (one per line)
                          </label>
                          <textarea
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            rows={2}
                            value={item.limitations.join("\n")}
                            onChange={(event) =>
                              updateCompetitor(index, {
                                ...item,
                                limitations: event.target.value.split("\n")
                              })
                            }
                            disabled={disabled || approved}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">
                            Alignment with user needs
                          </label>
                          <textarea
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            rows={2}
                            value={item.alignment_with_user_needs}
                            onChange={(event) =>
                              updateCompetitor(index, {
                                ...item,
                                alignment_with_user_needs: event.target.value
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
                onClick={addCompetitor}
                disabled={disabled}
              >
                + Competitor
              </button>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="multiple" defaultValue={["industry_capability_patterns"]}>
        <AccordionItem value="industry_capability_patterns" className="border-0">
          <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
            Industry capability patterns
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Accordion
              type="multiple"
              value={openPatterns}
              onValueChange={setOpenPatterns}
              className="space-y-3"
            >
              {safeValue.industry_capability_patterns.map((item, index) => {
                const itemKey = `industry-pattern-${index}`;
                return (
                  <AccordionItem
                    key={itemKey}
                    value={itemKey}
                    className="rounded border border-slate-100 p-2"
                  >
                    <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex items-center gap-2">
                          <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                            <span className="sr-only">Toggle pattern</span>
                          </AccordionTrigger>
                          <label className="block text-xs text-gray-600">Pattern name</label>
                        </div>
                        <input
                          className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                          value={item.pattern_name}
                          onChange={(event) =>
                            updatePattern(index, {
                              ...item,
                              pattern_name: event.target.value
                            })
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
                            onClick={() => removePattern(index)}
                            disabled={disabled}
                            aria-label="Remove capability pattern"
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
                          value={item.description}
                          onChange={(event) =>
                            updatePattern(index, {
                              ...item,
                              description: event.target.value
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
                onClick={addPattern}
                disabled={disabled}
              >
                + Pattern
              </button>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-4 flex items-center gap-2">
        {!approved && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || !hasCompetitors || !hasPatterns || isApproving}
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
      </div>
    </div>
  );
}

type GapsOpportunitiesEditorProps = {
  title: string;
  value: GapsOpportunities;
  onChange: (value: GapsOpportunities) => void;
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

const GAP_IMPACT_OPTIONS: GapOpportunity["user_value_potential"][] = [
  "low",
  "medium",
  "high"
];

function GapsOpportunitiesEditor({
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
  showTitle = true
}: GapsOpportunitiesEditorProps) {
  const safeValue = normalizeGapsOpportunitiesValue(value);
  const hasItems =
    safeValue.gaps_and_opportunities.functional.length > 0 &&
    safeValue.gaps_and_opportunities.technical.length > 0 &&
    safeValue.gaps_and_opportunities.business.length > 0;
  const [openFunctional, setOpenFunctional] = useOpenItems(
    safeValue.gaps_and_opportunities.functional,
    "gap-functional"
  );
  const [openTechnical, setOpenTechnical] = useOpenItems(
    safeValue.gaps_and_opportunities.technical,
    "gap-technical"
  );
  const [openBusiness, setOpenBusiness] = useOpenItems(
    safeValue.gaps_and_opportunities.business,
    "gap-business"
  );

  const updateGap = (
    key: keyof GapsOpportunities["gaps_and_opportunities"],
    index: number,
    nextItem: GapOpportunity
  ) => {
    const next = safeValue.gaps_and_opportunities[key].slice();
    next[index] = nextItem;
    onChange({
      gaps_and_opportunities: {
        ...safeValue.gaps_and_opportunities,
        [key]: next
      }
    });
  };

  const addGap = (key: keyof GapsOpportunities["gaps_and_opportunities"]) => {
    onChange({
      gaps_and_opportunities: {
        ...safeValue.gaps_and_opportunities,
        [key]: safeValue.gaps_and_opportunities[key].concat([
          {
            gap_description: "",
            affected_user_segments: [""],
            opportunity_description: "",
            user_value_potential: "medium",
            feasibility: "medium"
          }
        ])
      }
    });
  };

  const removeGap = (
    key: keyof GapsOpportunities["gaps_and_opportunities"],
    index: number
  ) => {
    const next = safeValue.gaps_and_opportunities[key].slice();
    next.splice(index, 1);
    onChange({
      gaps_and_opportunities: {
        ...safeValue.gaps_and_opportunities,
        [key]: next
      }
    });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Approved</span>}
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

      {safeValue.gaps_and_opportunities.functional.length === 0 &&
        safeValue.gaps_and_opportunities.technical.length === 0 &&
        safeValue.gaps_and_opportunities.business.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          No gaps yet. Add one to begin.
        </p>
      )}

      {([
        ["Functional", "functional", openFunctional, setOpenFunctional],
        ["Technical", "technical", openTechnical, setOpenTechnical],
        ["Business", "business", openBusiness, setOpenBusiness]
      ] as const).map(([label, key, openItems, setOpenItems]) => (
        <Accordion key={key} type="multiple" defaultValue={[key]}>
          <AccordionItem value={key} className="border-0">
            <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
              {label}
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <Accordion
                type="multiple"
                value={openItems}
                onValueChange={setOpenItems}
                className="space-y-3"
              >
                {safeValue.gaps_and_opportunities[key].map((item, index) => {
                  const itemKey = `gap-${key}-${index}`;
                  return (
                    <AccordionItem
                      key={itemKey}
                      value={itemKey}
                      className="rounded border border-slate-100 p-2"
                    >
                      <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                        <div>
                          <div className="flex items-center gap-2">
                            <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                              <span className="sr-only">Toggle gap</span>
                            </AccordionTrigger>
                            <label className="block text-xs text-gray-600">
                              Gap description
                            </label>
                          </div>
                          <textarea
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            rows={1}
                            value={item.gap_description}
                            onChange={(event) =>
                              updateGap(key, index, {
                                ...item,
                                gap_description: event.target.value
                              })
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
                              onClick={() => removeGap(key, index)}
                              disabled={disabled}
                              aria-label="Remove gap"
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      </div>
                      <AccordionContent className="pt-0">
                        <div className="mt-2">
                          <label className="block text-xs text-gray-600">
                            Affected user segments (one per line)
                          </label>
                          <textarea
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            rows={2}
                            value={item.affected_user_segments.join("\n")}
                            onChange={(event) =>
                              updateGap(key, index, {
                                ...item,
                                affected_user_segments: event.target.value.split("\n")
                              })
                            }
                            disabled={disabled || approved}
                          />
                        </div>
                        <div className="mt-2">
                          <label className="block text-xs text-gray-600">
                            Opportunity description
                          </label>
                          <textarea
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            rows={1}
                            value={item.opportunity_description}
                            onChange={(event) =>
                              updateGap(key, index, {
                                ...item,
                                opportunity_description: event.target.value
                              })
                            }
                            disabled={disabled || approved}
                          />
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <div>
                            <label className="block text-xs text-gray-600">
                              User value potential
                            </label>
                            <select
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              value={item.user_value_potential}
                              onChange={(event) =>
                                updateGap(key, index, {
                                  ...item,
                                  user_value_potential:
                                    event.target.value as GapOpportunity["user_value_potential"]
                                })
                              }
                              disabled={disabled || approved}
                            >
                              {GAP_IMPACT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600">Feasibility</label>
                            <select
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              value={item.feasibility}
                              onChange={(event) =>
                                updateGap(key, index, {
                                  ...item,
                                  feasibility: event.target.value as GapOpportunity["feasibility"]
                                })
                              }
                              disabled={disabled || approved}
                            >
                              {GAP_IMPACT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
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
                  onClick={() => addGap(key)}
                  disabled={disabled}
                >
                  + Gap
                </button>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ))}

      <div className="mt-3 flex items-center gap-2">
        {!approved && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || !hasItems || isApproving}
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
};

const VALUE_IMPACT_OPTIONS: ValueDriver["user_value_impact"][] = [
  "low",
  "medium",
  "high"
];

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
  showTitle = true
}: ValueDriversEditorProps) {
  const safeValue = normalizeValueDriversValue(value);
  const hasDrivers = safeValue.value_drivers.length > 0;
  const [openDrivers, setOpenDrivers] = useOpenItems(
    safeValue.value_drivers,
    "value-driver"
  );

  const updateDriver = (index: number, nextItem: ValueDriver) => {
    const next = safeValue.value_drivers.slice();
    next[index] = nextItem;
    onChange({ value_drivers: next });
  };

  const addDriver = () => {
    onChange({
      value_drivers: safeValue.value_drivers.concat([
        {
          name: "",
          user_need_or_pain: "",
          user_value_impact: "medium",
          business_value_lever: "",
          business_value_impact: "medium",
          priority: "medium"
        }
      ])
    });
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
            {approved && <span className="text-xs font-medium text-green-600">Approved</span>}
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

      {safeValue.value_drivers.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          No value drivers yet. Add one to begin.
        </p>
      )}

      <Accordion
        type="multiple"
        value={openDrivers}
        onValueChange={setOpenDrivers}
        className="mt-3 space-y-3"
      >
        {safeValue.value_drivers.map((driver, index) => {
          const itemKey = `value-driver-${index}`;
          return (
            <AccordionItem
              key={itemKey}
              value={itemKey}
              className="rounded border border-slate-100 p-2"
            >
              <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2">
                    <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                      <span className="sr-only">Toggle value driver</span>
                    </AccordionTrigger>
                    <label className="block text-xs text-gray-600">Name</label>
                  </div>
                  <input
                    className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                    value={driver.name}
                    onChange={(event) =>
                      updateDriver(index, { ...driver, name: event.target.value })
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
                      onClick={() => removeDriver(index)}
                      disabled={disabled}
                      aria-label="Remove value driver"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
              <AccordionContent className="pt-0">
                <div className="mt-2">
                  <label className="block text-xs text-gray-600">
                    User need or pain
                  </label>
                  <textarea
                    className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                    rows={1}
                    value={driver.user_need_or_pain}
                    onChange={(event) =>
                      updateDriver(index, {
                        ...driver,
                        user_need_or_pain: event.target.value
                      })
                    }
                    disabled={disabled || approved}
                  />
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-600">
                      User value impact
                    </label>
                    <select
                      className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      value={driver.user_value_impact}
                      onChange={(event) =>
                        updateDriver(index, {
                          ...driver,
                          user_value_impact:
                            event.target.value as ValueDriver["user_value_impact"]
                        })
                      }
                      disabled={disabled || approved}
                    >
                      {VALUE_IMPACT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">
                      Business value impact
                    </label>
                    <select
                      className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      value={driver.business_value_impact}
                      onChange={(event) =>
                        updateDriver(index, {
                          ...driver,
                          business_value_impact:
                            event.target.value as ValueDriver["business_value_impact"]
                        })
                      }
                      disabled={disabled || approved}
                    >
                      {VALUE_IMPACT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-600">
                      Business value lever
                    </label>
                    <textarea
                      className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      rows={1}
                      value={driver.business_value_lever}
                      onChange={(event) =>
                        updateDriver(index, {
                          ...driver,
                          business_value_lever: event.target.value
                        })
                      }
                      disabled={disabled || approved}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">Priority</label>
                    <select
                      className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                      value={driver.priority}
                      onChange={(event) =>
                        updateDriver(index, {
                          ...driver,
                          priority: event.target.value as ValueDriver["priority"]
                        })
                      }
                      disabled={disabled || approved}
                    >
                      {VALUE_IMPACT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
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
          className="mt-3 inline-flex items-center rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 disabled:opacity-60"
          onClick={addDriver}
          disabled={disabled}
        >
          + Driver
        </button>
      )}

      <div className="mt-3 flex items-center gap-2">
        {!approved && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || !hasDrivers || isApproving}
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
      </div>
    </div>
  );
}

type MarketFitHypothesisEditorProps = {
  title: string;
  value: MarketFitHypothesis;
  onChange: (value: MarketFitHypothesis) => void;
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

function MarketFitHypothesisEditor({
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
  showTitle = true
}: MarketFitHypothesisEditorProps) {
  const safeValue = normalizeMarketFitHypothesisValue(value);
  const hasItems =
    safeValue.market_fit_hypothesis.desirability.length > 0 &&
    safeValue.market_fit_hypothesis.viability.length > 0;
  const [openDesirability, setOpenDesirability] = useOpenItems(
    safeValue.market_fit_hypothesis.desirability,
    "hypothesis-desirability"
  );
  const [openViability, setOpenViability] = useOpenItems(
    safeValue.market_fit_hypothesis.viability,
    "hypothesis-viability"
  );

  const updateItem = (
    key: keyof MarketFitHypothesis["market_fit_hypothesis"],
    index: number,
    nextItem: MarketFitHypothesisItem
  ) => {
    const next = safeValue.market_fit_hypothesis[key].slice();
    next[index] = nextItem;
    onChange({
      market_fit_hypothesis: {
        ...safeValue.market_fit_hypothesis,
        [key]: next
      }
    });
  };

  const addItem = (key: keyof MarketFitHypothesis["market_fit_hypothesis"]) => {
    onChange({
      market_fit_hypothesis: {
        ...safeValue.market_fit_hypothesis,
        [key]: safeValue.market_fit_hypothesis[key].concat([
          {
            hypothesis: "",
            rationale: "",
            key_risks_or_unknowns: [""]
          }
        ])
      }
    });
  };

  const removeItem = (
    key: keyof MarketFitHypothesis["market_fit_hypothesis"],
    index: number
  ) => {
    const next = safeValue.market_fit_hypothesis[key].slice();
    next.splice(index, 1);
    onChange({
      market_fit_hypothesis: {
        ...safeValue.market_fit_hypothesis,
        [key]: next
      }
    });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Approved</span>}
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

      {safeValue.market_fit_hypothesis.desirability.length === 0 &&
        safeValue.market_fit_hypothesis.viability.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          No hypotheses yet. Add one to begin.
        </p>
      )}

      {([
        ["Desirability", "desirability", openDesirability, setOpenDesirability],
        ["Viability", "viability", openViability, setOpenViability]
      ] as const).map(([label, key, openItems, setOpenItems]) => (
        <Accordion key={key} type="multiple" defaultValue={[key]}>
          <AccordionItem value={key} className="border-0">
            <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
              {label}
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <Accordion
                type="multiple"
                value={openItems}
                onValueChange={setOpenItems}
                className="space-y-3"
              >
                {safeValue.market_fit_hypothesis[key].map((item, index) => {
                  const itemKey = `hypothesis-${key}-${index}`;
                  return (
                    <AccordionItem
                      key={itemKey}
                      value={itemKey}
                      className="rounded border border-slate-100 p-2"
                    >
                      <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                        <div>
                          <div className="flex items-center gap-2">
                            <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                              <span className="sr-only">Toggle hypothesis</span>
                            </AccordionTrigger>
                            <label className="block text-xs text-gray-600">Hypothesis</label>
                          </div>
                          <textarea
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            rows={1}
                            value={item.hypothesis}
                            onChange={(event) =>
                              updateItem(key, index, {
                                ...item,
                                hypothesis: event.target.value
                              })
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
                              onClick={() => removeItem(key, index)}
                              disabled={disabled}
                              aria-label="Remove hypothesis"
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      </div>
                      <AccordionContent className="pt-0">
                        <div className="mt-2">
                          <label className="block text-xs text-gray-600">Rationale</label>
                          <textarea
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            rows={1}
                            value={item.rationale}
                            onChange={(event) =>
                              updateItem(key, index, {
                                ...item,
                                rationale: event.target.value
                              })
                            }
                            disabled={disabled || approved}
                          />
                        </div>
                        <div className="mt-2">
                          <label className="block text-xs text-gray-600">
                            Key risks or unknowns (one per line)
                          </label>
                          <textarea
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            rows={2}
                            value={item.key_risks_or_unknowns.join("\n")}
                            onChange={(event) =>
                              updateItem(key, index, {
                                ...item,
                                key_risks_or_unknowns: event.target.value.split("\n")
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
                  onClick={() => addItem(key)}
                  disabled={disabled}
                >
                  + Hypothesis
                </button>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ))}

      <div className="mt-3 flex items-center gap-2">
        {!approved && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || !hasItems || isApproving}
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
      </div>
    </div>
  );
}

type FeasibilityAssessmentEditorProps = {
  title: string;
  value: FeasibilityAssessment;
  onChange: (value: FeasibilityAssessment) => void;
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

const READINESS_OPTIONS: FeasibilityConstraintItem["readiness"][] = [
  "low",
  "medium",
  "high"
];

function FeasibilityAssessmentEditor({
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
  showTitle = true
}: FeasibilityAssessmentEditorProps) {
  const safeValue = normalizeFeasibilityAssessmentValue(value);
  const hasItems =
    safeValue.feasibility_assessment.business_constraints.length > 0 &&
    safeValue.feasibility_assessment.user_constraints.length > 0 &&
    safeValue.feasibility_assessment.technical_concerns.length > 0;
  const [openBusiness, setOpenBusiness] = useOpenItems(
    safeValue.feasibility_assessment.business_constraints,
    "feasibility-business"
  );
  const [openUser, setOpenUser] = useOpenItems(
    safeValue.feasibility_assessment.user_constraints,
    "feasibility-user"
  );
  const [openTechnical, setOpenTechnical] = useOpenItems(
    safeValue.feasibility_assessment.technical_concerns,
    "feasibility-technical"
  );

  const updateItem = (
    key: keyof FeasibilityAssessment["feasibility_assessment"],
    index: number,
    nextItem: FeasibilityConstraintItem
  ) => {
    const next = safeValue.feasibility_assessment[key].slice();
    next[index] = nextItem;
    onChange({
      feasibility_assessment: {
        ...safeValue.feasibility_assessment,
        [key]: next
      }
    });
  };

  const addItem = (key: keyof FeasibilityAssessment["feasibility_assessment"]) => {
    onChange({
      feasibility_assessment: {
        ...safeValue.feasibility_assessment,
        [key]: safeValue.feasibility_assessment[key].concat([
          {
            name: "",
            description: "",
            readiness: "medium"
          }
        ])
      }
    });
  };

  const removeItem = (
    key: keyof FeasibilityAssessment["feasibility_assessment"],
    index: number
  ) => {
    const next = safeValue.feasibility_assessment[key].slice();
    next.splice(index, 1);
    onChange({
      feasibility_assessment: {
        ...safeValue.feasibility_assessment,
        [key]: next
      }
    });
  };

  return (
    <div className="rounded border bg-white p-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {approved && <span className="text-xs font-medium text-green-600">Approved</span>}
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

      {safeValue.feasibility_assessment.business_constraints.length === 0 &&
        safeValue.feasibility_assessment.user_constraints.length === 0 &&
        safeValue.feasibility_assessment.technical_concerns.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          No constraints yet. Add one to begin.
        </p>
      )}

      {([
        ["Business constraints", "business_constraints", openBusiness, setOpenBusiness],
        ["User constraints", "user_constraints", openUser, setOpenUser],
        ["Technical concerns", "technical_concerns", openTechnical, setOpenTechnical]
      ] as const).map(([label, key, openItems, setOpenItems]) => (
        <Accordion key={key} type="multiple" defaultValue={[key]}>
          <AccordionItem value={key} className="border-0">
            <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:no-underline">
              {label}
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <Accordion
                type="multiple"
                value={openItems}
                onValueChange={setOpenItems}
                className="space-y-3"
              >
                {safeValue.feasibility_assessment[key].map((item, index) => {
                  const itemKey = `feasibility-${key}-${index}`;
                  return (
                    <AccordionItem
                      key={itemKey}
                      value={itemKey}
                      className="rounded border border-slate-100 p-2"
                    >
                      <div className="grid items-start gap-2 md:grid-cols-[1fr_auto]">
                        <div>
                          <div className="flex items-center gap-2">
                            <AccordionTrigger className="flex-none justify-center gap-0 py-0 text-slate-600 hover:no-underline [&>svg]:h-3 [&>svg]:w-3">
                              <span className="sr-only">Toggle constraint</span>
                            </AccordionTrigger>
                            <label className="block text-xs text-gray-600">Name</label>
                          </div>
                          <input
                            className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                            value={item.name}
                            onChange={(event) =>
                              updateItem(key, index, { ...item, name: event.target.value })
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
                              onClick={() => removeItem(key, index)}
                              disabled={disabled}
                              aria-label="Remove constraint"
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      </div>
                      <AccordionContent className="pt-0">
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <div>
                            <label className="block text-xs text-gray-600">
                              Description
                            </label>
                            <textarea
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              rows={1}
                              value={item.description}
                              onChange={(event) =>
                                updateItem(key, index, {
                                  ...item,
                                  description: event.target.value
                                })
                              }
                              disabled={disabled || approved}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600">Readiness</label>
                            <select
                              className="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
                              value={item.readiness}
                              onChange={(event) =>
                                updateItem(key, index, {
                                  ...item,
                                  readiness: event.target.value as FeasibilityConstraintItem["readiness"]
                                })
                              }
                              disabled={disabled || approved}
                            >
                              {READINESS_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
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
                  onClick={() => addItem(key)}
                  disabled={disabled}
                >
                  + Constraint
                </button>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ))}

      <div className="mt-3 flex items-center gap-2">
        {!approved && (
          <button
            type="button"
            className="inline-flex min-w-[96px] items-center justify-center rounded border border-green-600 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-60"
            onClick={onApprove}
            disabled={disabled || !hasItems || isApproving}
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
      </div>
    </div>
  );
}
