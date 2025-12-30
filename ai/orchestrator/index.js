import http from "http";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";
import { agent as discoveryGraph } from "./graph-core.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFromFile(filePath) {
  if (!fsSync.existsSync(filePath)) {
    return;
  }
  const raw = fsSync.readFileSync(filePath, "utf8");
  raw.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      return;
    }
    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadEnvFromFile(path.join(__dirname, ".env"));

const PORT = Number(process.env.ORCHESTRATOR_PORT) || 8002;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_TABLE =
  process.env.SUPABASE_DISCOVERY_TABLE || "discovery_records";
const SUPABASE_ENABLED = Boolean(
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
);
const PROMPTS_DIR = (() => {
  const envBase = process.env.KNOWLEDGE_BASE_DIR;
  if (envBase) {
    return path.join(
      envBase,
      "prompts",
      "documents",
      "1-discovery-document"
    );
  }
  const dockerPath = path.join(
    path.sep,
    "knowledge-base",
    "prompts",
    "documents",
    "1-discovery-document"
  );
  if (fsSync.existsSync(dockerPath)) {
    return dockerPath;
  }
  return path.join(
    __dirname,
    "..",
    "..",
    "knowledge-base",
    "prompts",
    "documents",
    "1-discovery-document"
  );
})();
const PRODUCT_MANAGER_DIR = (() => {
  const envBase = process.env.KNOWLEDGE_BASE_DIR;
  if (envBase) {
    return path.join(envBase, "prompts", "agents", "pm-product-manager");
  }
  const dockerPath = path.join(
    path.sep,
    "knowledge-base",
    "prompts",
    "agents",
    "pm-product-manager"
  );
  if (fsSync.existsSync(dockerPath)) {
    return dockerPath;
  }
  return path.join(
    __dirname,
    "..",
    "..",
    "knowledge-base",
    "prompts",
    "agents",
    "pm-product-manager"
  );
})();
const OTHER_PROMPTS_DIR = (() => {
  const envBase = process.env.KNOWLEDGE_BASE_DIR;
  if (envBase) {
    return path.join(
      envBase,
      "prompts",
      "documents",
      "1-discovery-document",
      "service"
    );
  }
  const dockerPath = path.join(
    path.sep,
    "knowledge-base",
    "prompts",
    "documents",
    "1-discovery-document",
    "service"
  );
  if (fsSync.existsSync(dockerPath)) {
    return dockerPath;
  }
  return path.join(
    __dirname,
    "..",
    "..",
    "knowledge-base",
    "prompts",
    "documents",
    "1-discovery-document",
    "service"
  );
})();
const RANDOM_IDEA_DOMAINS = [
  "Education & learning",
  "Healthcare & wellbeing",
  "Finance & personal money",
  "Climate & environment",
  "Entertainment & media",
  "Work & collaboration",
  "Civic life & public services"
];
let lastRandomIdeaDomain = "";
const recentRandomIdeas = [];
const MAX_RECENT_RANDOM_IDEAS = 5;

const FIELD_DEFINITIONS = [
  {
    key: "problemUnderstanding.problemStatement",
    section: "problem-statement",
    type: "string"
  },
  {
    key: "problemUnderstanding.targetUsersSegments",
    section: "target-users-segments",
    type: "object",
    outputKey: "target_segments",
    wrapOutputKey: true
  },
  {
    key: "problemUnderstanding.userPainPoints",
    section: "user-pain-points",
    type: "object",
    outputKey: "pain_point_themes",
    wrapOutputKey: true
  },
  {
    key: "problemUnderstanding.contextConstraints",
    section: "context-constraints",
    type: "object"
  },
  {
    key: "marketAndCompetitorAnalysis.marketLandscape",
    section: "market-landscape",
    type: "object"
  },
  {
    key: "marketAndCompetitorAnalysis.competitorInventory",
    section: "competitor-inventory",
    type: "object"
  },
  {
    key: "marketAndCompetitorAnalysis.competitorCapabilities",
    section: "competitor-capabilities",
    type: "object"
  },
  {
    key: "marketAndCompetitorAnalysis.gapsOpportunities",
    section: "gaps-opportunities",
    type: "object",
    outputKey: "gaps_and_opportunities",
    wrapOutputKey: true
  },
  {
    key: "opportunityDefinition.opportunityStatement",
    section: "opportunity-statement",
    type: "object",
    outputKey: "opportunity_statement",
    wrapOutputKey: true
  },
  {
    key: "opportunityDefinition.valueDrivers",
    section: "value-drivers",
    type: "object",
    outputKey: "value_drivers",
    wrapOutputKey: true
  },
  {
    key: "opportunityDefinition.marketFitHypothesis",
    section: "market-fit-hypothesis",
    type: "object",
    outputKey: "market_fit_hypothesis",
    wrapOutputKey: true
  },
  {
    key: "opportunityDefinition.feasibilityAssessment",
    section: "feasibility-assessment",
    type: "object",
    outputKey: "feasibility_assessment",
    wrapOutputKey: true
  }
];
const FIELD_DISPLAY_KEY_MAP = FIELD_DEFINITIONS.reduce((acc, field) => {
  const displayKey = field.outputKey || field.key.split(".").pop() || field.key;
  acc[displayKey] = field.key;
  return acc;
}, {});
const SECTION_INPUTS_PATH = path.join(
  PROMPTS_DIR,
  "sections",
  "section-inputs.json"
);
let sectionInputDependencies = null;

const EXPORT_STRUCTURE = [
  {
    title: "Problem Understanding",
    fields: [
      { key: "problemUnderstanding.problemStatement", label: "Problem Statement" },
      { key: "problemUnderstanding.targetUsersSegments", label: "Target Users & Segments" },
      { key: "problemUnderstanding.userPainPoints", label: "User Pain Points" },
      { key: "problemUnderstanding.contextConstraints", label: "Context & Constraints" }
    ]
  },
  {
    title: "Market and Competitor Analysis",
    fields: [
      { key: "marketAndCompetitorAnalysis.marketLandscape", label: "Market Landscape" },
      { key: "marketAndCompetitorAnalysis.competitorInventory", label: "Competitor Inventory" },
      { key: "marketAndCompetitorAnalysis.competitorCapabilities", label: "Competitor Capabilities" },
      { key: "marketAndCompetitorAnalysis.gapsOpportunities", label: "Gaps & Opportunities" }
    ]
  },
  {
    title: "Opportunity Definition",
    fields: [
      { key: "opportunityDefinition.opportunityStatement", label: "Opportunity Statement" },
      { key: "opportunityDefinition.valueDrivers", label: "Value Drivers" },
      { key: "opportunityDefinition.marketFitHypothesis", label: "Market Fit Hypothesis" },
      { key: "opportunityDefinition.feasibilityAssessment", label: "Feasibility Assessment" }
    ]
  }
];

const FIELD_LABELS = EXPORT_STRUCTURE.reduce((acc, section) => {
  section.fields.forEach((field) => {
    acc[field.key] = field.label;
  });
  return acc;
}, {});

function getFieldLabel(fieldKey) {
  return FIELD_LABELS[fieldKey] || fieldKey;
}

function createAbortSignal(req) {
  let aborted = false;
  req.on("close", () => {
    aborted = true;
  });
  return () => aborted;
}

const REQUIRED_FIELDS = [
  {
    key: "productIdea",
    question: "What is the product idea or main problem we are solving?",
    description: "Product idea"
  },
  {
    key: "targetUser",
    question: "Who is the primary user or customer for this product?",
    description: "Target user"
  }
];

const tracingFlags = [
  "LANGCHAIN_TRACING_V2",
  "LANGSMITH_TRACING",
  "LANGCHAIN_CALLBACKS_BACKGROUND"
];
tracingFlags.forEach((flag) => {
  if (typeof process.env[flag] === "undefined") {
    process.env[flag] = "false";
  }
});

const applyCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
};

const sendJson = (res, statusCode, payload) => {
  applyCorsHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
};

async function supabaseRequest(path, { method = "GET", body, preferReturn } = {}) {
  if (!SUPABASE_ENABLED) {
    return null;
  }
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  };
  if (preferReturn) {
    headers.Prefer = "return=representation";
  }
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Supabase request failed (${response.status}): ${text || response.statusText}`
    );
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

async function supabaseFetchLatestRecord() {
  if (!SUPABASE_ENABLED) {
    return null;
  }
  const rows = await supabaseRequest(
    `${SUPABASE_TABLE}?select=version,record&order=version.desc&limit=1`
  );
  if (!rows || !rows.length) {
    return null;
  }
  const row = rows[0];
  if (!row.record) {
    return null;
  }
  return {
    ...row.record,
    version: row.version
  };
}

async function supabaseFetchRecordByVersion(version) {
  if (!SUPABASE_ENABLED) {
    return null;
  }
  const rows = await supabaseRequest(
    `${SUPABASE_TABLE}?select=version,record&version=eq.${version}&limit=1`
  );
  if (!rows || !rows.length) {
    return null;
  }
  const row = rows[0];
  if (!row.record) {
    return null;
  }
  return {
    ...row.record,
    version: row.version
  };
}

async function supabaseInsertRecord(version, record) {
  if (!SUPABASE_ENABLED) {
    return null;
  }
  const rows = await supabaseRequest(SUPABASE_TABLE, {
    method: "POST",
    preferReturn: true,
    body: {
      version,
      record,
      updated_at: new Date().toISOString()
    }
  });
  if (!rows || !rows.length) {
    return null;
  }
  const row = rows[0];
  return {
    ...row.record,
    version: row.version
  };
}

async function supabaseUpdateRecord(version, record) {
  if (!SUPABASE_ENABLED) {
    return null;
  }
  const rows = await supabaseRequest(`${SUPABASE_TABLE}?version=eq.${version}`, {
    method: "PATCH",
    preferReturn: true,
    body: {
      record,
      updated_at: new Date().toISOString()
    }
  });
  if (!rows || !rows.length) {
    return null;
  }
  const row = rows[0];
  return {
    ...row.record,
    version: row.version
  };
}

async function getLatestRecord() {
  if (!SUPABASE_ENABLED) {
    throw new Error("Supabase is required for persistence. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return supabaseFetchLatestRecord();
}

async function loadDiscoveryRecord(version) {
  if (!SUPABASE_ENABLED) {
    throw new Error("Supabase is required for persistence. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return supabaseFetchRecordByVersion(version);
}

function validateUserInput(input) {
  const missingFields = REQUIRED_FIELDS.filter((field) => {
    const value = (input[field.key] || "").toString().trim();
    return value.length === 0;
  });
  return {
    valid: missingFields.length === 0,
    missingFields: missingFields.map((field) => field.key),
    questions: missingFields.map((field) => field.question)
  };
}

async function checkApprovalGate() {
  const latestRecord = await getLatestRecord();
  if (!latestRecord) {
    return null;
  }
  if (!latestRecord.fieldStatus) {
    return null;
  }
  if (latestRecord.approved === true) {
    return null;
  }

  return {
    status: "in_progress",
    resultType: "existing",
    record: latestRecord,
    message: "Finish approving the current document before creating a new one."
  };
}

function normalizeUserMessages(messages) {
  if (!messages) {
    return [];
  }
  if (Array.isArray(messages)) {
    return messages.map((item) => item.toString().trim()).filter(Boolean);
  }
  if (typeof messages === "string") {
    return messages
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function buildEmptyDocument() {
  return {
    problemUnderstanding: {
      problemStatement: "",
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
      marketLandscape: {
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
      },
      competitorInventory: {
        competitors: []
      },
      competitorCapabilities: {
        competitor_capabilities: [],
        industry_capability_patterns: []
      },
      gapsOpportunities: {
        gaps_and_opportunities: {
          functional: [],
          technical: [],
          business: []
        }
      }
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
}

function emptyValueForField(field) {
  if (field.type === "array") {
    return [];
  }
  if (field.type === "object" && field.outputKey && field.wrapOutputKey) {
    return { [field.outputKey]: [] };
  }
  if (field.key === "problemUnderstanding.contextConstraints") {
    return { contextual_factors: [], constraints: [] };
  }
  if (field.key === "marketAndCompetitorAnalysis.marketLandscape") {
    return {
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
  }
  if (field.key === "marketAndCompetitorAnalysis.competitorInventory") {
    return { competitors: [] };
  }
  if (field.key === "marketAndCompetitorAnalysis.competitorCapabilities") {
    return {
      competitor_capabilities: [],
      industry_capability_patterns: []
    };
  }
  if (field.key === "marketAndCompetitorAnalysis.gapsOpportunities") {
    return {
      gaps_and_opportunities: {
        functional: [],
        technical: [],
        business: []
      }
    };
  }
  if (field.key === "opportunityDefinition.opportunityStatement") {
    return { opportunity_statement: "" };
  }
  if (field.key === "opportunityDefinition.valueDrivers") {
    return { value_drivers: [] };
  }
  if (field.key === "opportunityDefinition.marketFitHypothesis") {
    return {
      market_fit_hypothesis: {
        desirability: [],
        viability: []
      }
    };
  }
  if (field.key === "opportunityDefinition.feasibilityAssessment") {
    return {
      feasibility_assessment: {
        business_constraints: [],
        user_constraints: [],
        technical_concerns: []
      }
    };
  }
  if (field.type === "object") {
    return {};
  }
  return "";
}

function setNestedValue(target, pathKey, value) {
  const parts = pathKey.split(".");
  let current = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

function getNestedValue(target, pathKey) {
  const parts = pathKey.split(".");
  let current = target;
  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function buildFieldStatus() {
  return FIELD_DEFINITIONS.reduce((acc, field) => {
    acc[field.key] = {
      approved: false,
      approvedAt: null
    };
    return acc;
  }, {});
}

function getNextFieldDefinition(fieldStatus) {
  return FIELD_DEFINITIONS.find((field) => !fieldStatus[field.key]?.approved);
}

function isDocumentApproved(fieldStatus) {
  return FIELD_DEFINITIONS.every((field) => fieldStatus[field.key]?.approved);
}

async function generateFieldValue({
  field,
  productIdea,
  targetUser,
  userNotes,
  currentDocument
}) {
  const result = await generateFieldValueWithOutput({
    field,
    productIdea,
    targetUser,
    userNotes,
    currentDocument
  });
  return result.value;
}

async function generateFieldValueWithOutput({
  field,
  productIdea,
  targetUser,
  userNotes,
  currentDocument,
  fieldStatus
}) {
  const promptAssets = await getDiscoveryPromptAssets();
  const sectionPrompt = promptAssets.sectionPromptMap[field.section] || "";
  const sectionSchema = promptAssets.sectionSchemaMap[field.section] || "";
  const sectionExamples = "";
  const sectionSchemaJson = promptAssets.sectionSchemaJsonMap?.[field.section];
  const approvedDocument = buildApprovedDocument(currentDocument, fieldStatus);
  const promptInputs = `## Inputs (JSON)\n${JSON.stringify(
    buildIncomingInfoForField({
      fieldKey: field.key,
      productIdea,
      targetUser,
      userNotes,
      currentDocument,
      fieldStatus
    }),
    null,
    2
  )}`;
  const prompt = buildFieldPrompt({
    promptInputs,
    approvedDocument,
    systemPrompt: promptAssets.systemPrompt,
    productIdea,
    targetUser,
    userNotes,
    outputRules: promptAssets.outputRules,
    sectionPrompt,
    sectionSchema,
    sectionSchemaJson,
    sectionExamples,
    finalSchema: promptAssets.finalSchema,
    currentDocument,
    fieldKey: field.key,
    fieldOutputKey: field.outputKey
  });

  const messages = [
    {
      role: "system",
      content: promptAssets.systemPrompt
    },
    {
      role: "user",
      content: prompt
    }
  ];

  const model = getChatModel();
  if (!model) {
    if (process.env.MOCK_DISCOVERY === "true") {
      const value = buildFallbackFieldValue(field);
      return { value, prompt, rawText: JSON.stringify(value, null, 2) };
    }
    throw new Error("Ollama is not available. Start Ollama and retry.");
  }

  let lastRawText = "";
  let lastValidationErrors = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await model.invoke(messages);
      const rawText = extractTextFromResponse(response);
      lastRawText = rawText;
      const fieldName = field.key.split(".").pop();
      try {
        const parsed = normalizeParsedFieldValue(
          field,
          tryParseDiscoveryResponse(response),
          approvedDocument
        );
        if (field.type === "object" && isPlainObject(parsed) && sectionSchemaJson?.type === "object") {
          const candidate = parsed;
          const validation = validateAgainstSchema(candidate, sectionSchemaJson);
          if (validation.valid) {
            return {
              value: candidate,
              prompt,
              rawText,
              validationStatus: "valid"
            };
          }
          lastValidationErrors = validation.errors;
        }
        if (field.outputKey && typeof parsed?.[field.outputKey] !== "undefined") {
          if (field.wrapOutputKey) {
            const value = { [field.outputKey]: parsed[field.outputKey] };
            const candidate = value;
            const validation = validateAgainstSchema(candidate, sectionSchemaJson || null);
            if (!validation.valid) {
              lastValidationErrors = validation.errors;
              continue;
            }
            return {
              value: candidate,
              prompt,
              rawText,
              validationStatus: "valid"
            };
          }
          const value = parsed[field.outputKey];
          const validationValue = sectionSchemaJson?.type === "object"
            ? { [field.outputKey]: value }
            : value;
          const candidateValue = value;
          const candidateForValidation = validationValue;
          const validation = validateAgainstSchema(
            candidateForValidation,
            sectionSchemaJson || null
          );
          if (!validation.valid) {
            lastValidationErrors = validation.errors;
            continue;
          }
          return {
            value: candidateValue,
            prompt,
            rawText,
            validationStatus: "valid"
          };
        }
        if (fieldName && typeof parsed?.[fieldName] !== "undefined") {
          const value = parsed[fieldName];
          const validationValue = sectionSchemaJson?.type === "object"
            ? { [fieldName]: value }
            : value;
          const candidateValue = value;
          const candidateForValidation = validationValue;
          const validation = validateAgainstSchema(
            candidateForValidation,
            sectionSchemaJson || null
          );
          if (!validation.valid) {
            lastValidationErrors = validation.errors;
            continue;
          }
          return {
            value: candidateValue,
            prompt,
            rawText,
            validationStatus: "valid"
          };
        }
        const nested = getNestedValue(parsed, field.key);
        if (typeof nested !== "undefined") {
          const candidateValue = nested;
          const candidateForValidation = nested;
          const validation = validateAgainstSchema(
            candidateForValidation,
            sectionSchemaJson || null
          );
          if (!validation.valid) {
            lastValidationErrors = validation.errors;
            continue;
          }
          return {
            value: candidateValue,
            prompt,
            rawText,
            validationStatus: "valid"
          };
        }
      } catch (parseError) {
        if (rawText) {
          const normalized = normalizeRawFieldValue(rawText, field.type);
          const validationValue = sectionSchemaJson?.type === "object"
            ? { [field.outputKey || fieldName || "value"]: normalized }
            : normalized;
          const candidateValue = normalized;
          const candidateForValidation = validationValue;
          const validation = validateAgainstSchema(
            candidateForValidation,
            sectionSchemaJson || null
          );
          if (!validation.valid) {
            lastValidationErrors = validation.errors;
            continue;
          }
          return {
            value: candidateValue,
            prompt,
            rawText,
            validationStatus: "valid"
          };
        }
      }
    } catch (error) {
      console.warn(`Discovery field ${field.key} attempt ${attempt + 1} failed`, error);
    }
  }

  const failure = new Error(`LLM output invalid for field ${field.key}.`);
  failure.lastPrompt = prompt;
  failure.lastOutput = lastRawText || null;
  failure.lastOutputFieldKey = field.key;
  failure.validationErrors = lastValidationErrors;
  throw failure;
}

function normalizeRawFieldValue(text, fieldType) {
  if (fieldType === "array") {
    const items = text
      .split("\n")
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
    return items.length ? items : [text.trim()];
  }
  if (fieldType === "object") {
    try {
      return JSON.parse(text);
    } catch (error) {
      return {};
    }
  }
  return text.trim();
}

function normalizeParsedFieldValue(field, parsed, approvedDocument) {
  if (!isPlainObject(parsed)) {
    return parsed;
  }
  if (field.key === "marketAndCompetitorAnalysis.marketLandscape") {
    if (Array.isArray(parsed.market_trends)) {
      parsed.market_trends = parsed.market_trends.map((item) =>
        item && typeof item === "object" && !item.confidence
          ? { ...item, confidence: "medium" }
          : item
      );
    }
    if (Array.isArray(parsed.market_dynamics)) {
      parsed.market_dynamics = parsed.market_dynamics.map((item) =>
        item && typeof item === "object" && !item.confidence
          ? { ...item, confidence: "medium" }
          : item
      );
    }
    if (Array.isArray(parsed.market_forces)) {
      parsed.market_forces = parsed.market_forces.map((item) =>
        item && typeof item === "object" && !item.confidence
          ? { ...item, confidence: "medium" }
          : item
      );
    }
    if (parsed.market_landscape && !parsed.market_definition) {
      const { market_landscape, ...rest } = parsed;
      return { ...rest, market_definition: market_landscape };
    }
    if (parsed.marketLandscape && !parsed.market_definition) {
      const { marketLandscape, ...rest } = parsed;
      return { ...rest, market_definition: marketLandscape };
    }
  }
  if (field.key === "marketAndCompetitorAnalysis.competitorInventory") {
    if (parsed.competitor_inventory && parsed.competitor_inventory.competitors) {
      return parsed.competitor_inventory;
    }
    if (parsed.competitorInventory && parsed.competitorInventory.competitors) {
      return parsed.competitorInventory;
    }
    if (Array.isArray(parsed.competitors)) {
      return { competitors: parsed.competitors };
    }
    if (Array.isArray(parsed["Competitor Inventory"])) {
      return { competitors: parsed["Competitor Inventory"] };
    }
  }
  if (field.key === "problemUnderstanding.userPainPoints") {
    if (parsed.user_pain_points && parsed.user_pain_points.pain_point_themes) {
      return parsed.user_pain_points;
    }
  }
  if (field.key === "marketAndCompetitorAnalysis.competitorCapabilities") {
    if (parsed.competitorCapabilities && parsed.competitorCapabilities.competitor_capabilities) {
      return parsed.competitorCapabilities;
    }
  }
  if (field.key === "marketAndCompetitorAnalysis.gapsOpportunities") {
    const validSegmentNames = (() => {
      const segments = getNestedValue(
        approvedDocument,
        "problemUnderstanding.targetUsersSegments"
      )?.target_segments;
      if (!Array.isArray(segments)) {
        return null;
      }
      const names = segments
        .map((segment) => segment?.segment_name)
        .filter((name) => typeof name === "string" && name.trim().length > 0);
      return names.length ? new Set(names) : null;
    })();
    const normalizeGap = (item) => {
      if (!item || typeof item !== "object") {
        return item;
      }
      const gap_description = item.gap_description || item.description || "";
      const opportunity_description =
        item.opportunity_description || item.opportunity_area || "";
      const affected_user_segments = Array.isArray(item.affected_user_segments)
        ? item.affected_user_segments
        : [];
      return {
        ...item,
        gap_description,
        opportunity_description,
        affected_user_segments
      };
    };
    const filterSegments = (item) => {
      if (!item || typeof item !== "object") {
        return item;
      }
      if (!validSegmentNames) {
        return item;
      }
      const filtered = (item.affected_user_segments || []).filter((segment) =>
        validSegmentNames.has(segment)
      );
      const normalizedSegments = filtered.length
        ? filtered
        : Array.from(validSegmentNames);
      return {
        ...item,
        affected_user_segments: normalizedSegments
      };
    };
    if (parsed.gapsOpportunities && parsed.gapsOpportunities.gaps_and_opportunities) {
      const normalized = parsed.gapsOpportunities;
      ["functional", "technical", "business"].forEach((key) => {
        if (Array.isArray(normalized.gaps_and_opportunities?.[key])) {
          normalized.gaps_and_opportunities[key] =
            normalized.gaps_and_opportunities[key]
              .map(normalizeGap)
              .map(filterSegments);
        }
      });
      return normalized;
    }
    if (parsed.gaps_and_opportunities) {
      const normalized = { gaps_and_opportunities: parsed.gaps_and_opportunities };
      ["functional", "technical", "business"].forEach((key) => {
        if (Array.isArray(normalized.gaps_and_opportunities?.[key])) {
          normalized.gaps_and_opportunities[key] =
            normalized.gaps_and_opportunities[key]
              .map(normalizeGap)
              .map(filterSegments);
        }
      });
      return normalized;
    }
  }
  if (field.key === "opportunityDefinition.valueDrivers") {
    if (parsed.valueDrivers && parsed.valueDrivers.value_drivers) {
      return parsed.valueDrivers;
    }
    if (parsed.value_drivers) {
      return { value_drivers: parsed.value_drivers };
    }
  }
  if (field.key === "opportunityDefinition.marketFitHypothesis") {
    if (parsed.marketFitHypothesis && parsed.marketFitHypothesis.market_fit_hypothesis) {
      return parsed.marketFitHypothesis;
    }
    if (parsed.market_fit_hypothesis) {
      return { market_fit_hypothesis: parsed.market_fit_hypothesis };
    }
  }
  if (field.key === "opportunityDefinition.feasibilityAssessment") {
    if (parsed.feasibilityAssessment && parsed.feasibilityAssessment.feasibility_assessment) {
      return parsed.feasibilityAssessment;
    }
    if (parsed.feasibility_assessment) {
      return { feasibility_assessment: parsed.feasibility_assessment };
    }
  }
  return parsed;
}

function buildFallbackFieldValue(field) {
  if (field.type === "string") {
    return "Draft content needs review.";
  }
  if (field.type === "object") {
    return emptyValueForField(field);
  }
  return ["Draft item needs review."];
}

async function getDiscoveryPromptAssets() {
  if (promptCache && Array.isArray(promptCache.sectionSchemas)) {
    return promptCache;
  }

  const systemPrompt = await readProductManagerPromptFile(
    "product-manager-system-prompt.md"
  );
  const finalSchema = await readPromptFile("discovery-document-schema.json");
  const outputRules = await readPromptFile(path.join("sections", "section-output-rules.md"));

  const sectionPrompts = [];
  const sectionSchemas = [];
  const sectionPromptMap = {};
  const sectionSchemaMap = {};
  const sectionSchemaJsonMap = {};
  for (const definition of FIELD_DEFINITIONS) {
    const section = definition.section;
    const promptPath = path.join("sections", "prompts", `${section}.prompt.md`);
    const promptContent = await readPromptFile(promptPath);
    if (promptContent) {
      sectionPrompts.push(`Section: ${section}\n${promptContent}`);
      sectionPromptMap[section] = promptContent;
    }
    const schemaPath = path.join("sections", "schemas", `${section}.schema.json`);
    const schemaContent = await readPromptFile(schemaPath);
    if (schemaContent) {
      sectionSchemas.push(`Section: ${section}\n${schemaContent}`);
      sectionSchemaMap[section] = schemaContent;
      try {
        sectionSchemaJsonMap[section] = JSON.parse(schemaContent);
      } catch (error) {
        console.warn(`Invalid JSON schema for section ${section}.`);
      }
    }
  }

  promptCache = {
    systemPrompt:
      systemPrompt ||
      "You are the Discovery Agent. Respond only with JSON that matches the required schema. Do not write prose.",
    outputRules: outputRules || "",
    finalSchema: finalSchema || "",
    sectionPrompts,
    sectionSchemas,
    sectionPromptMap,
    sectionSchemaMap,
    sectionSchemaJsonMap
  };
  return promptCache;
}

async function readPromptFile(relativePath) {
  try {
    const filePath = path.join(PROMPTS_DIR, relativePath);
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(`Prompt file missing: ${relativePath}`);
      return "";
    }
    throw error;
  }
}

async function readProductManagerPromptFile(relativePath) {
  try {
    const filePath = path.join(PRODUCT_MANAGER_DIR, relativePath);
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(`Prompt file missing: ${relativePath}`);
      return "";
    }
    throw error;
  }
}

async function readOtherPromptFile(relativePath) {
  try {
    const filePath = path.join(OTHER_PROMPTS_DIR, relativePath);
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(`Prompt file missing: ${relativePath}`);
      return "";
    }
    throw error;
  }
}

function renderTemplate(template, values) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : "";
  });
}

function escapeMarkdown(text) {
  if (typeof text !== "string") {
    return "";
  }
  return text.replace(/\r\n/g, "\n").trim();
}

function formatMarkdownList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }
  return items.map((item) => `- ${escapeMarkdown(String(item))}`).join("\n");
}

function renderDiscoveryMarkdown(document) {
  const parts = ["# Discovery Document"];

  EXPORT_STRUCTURE.forEach((section) => {
    parts.push(`\n## ${section.title}`);
    section.fields.forEach((field) => {
      const value = getNestedValue(document, field.key);
      if (!value || (typeof value === "string" && !value.trim())) {
        return;
      }
      parts.push(`\n### ${field.label}`);
      if (typeof value === "string") {
        parts.push(escapeMarkdown(value));
        return;
      }
      if (field.key === "problemUnderstanding.targetUsersSegments") {
        const segments = value?.target_segments || [];
        segments.forEach((segment) => {
          parts.push(`- Segment: ${escapeMarkdown(segment.segment_name || "")}`);
          if (segment.business_relevance) {
            parts.push(`  - Business relevance: ${escapeMarkdown(segment.business_relevance)}`);
          }
          if (Array.isArray(segment.user_groups)) {
            segment.user_groups.forEach((group) => {
              parts.push(`  - Group: ${escapeMarkdown(group.name || "")}`);
              const characteristics = formatMarkdownList(group.characteristics || []);
              if (characteristics) {
                parts.push("    - Characteristics:");
                parts.push(
                  characteristics
                    .split("\n")
                    .map((line) => `    ${line}`)
                    .join("\n")
                );
              }
            });
          }
        });
        return;
      }
      if (field.key === "problemUnderstanding.userPainPoints") {
        const themes = value?.pain_point_themes || [];
        themes.forEach((theme) => {
          parts.push(`- Theme: ${escapeMarkdown(theme.theme_name || "")}`);
          (theme.pain_points || []).forEach((pain) => {
            parts.push(`  - Pain point: ${escapeMarkdown(pain.name || "")}`);
            if (pain.description) {
              parts.push(`    - Description: ${escapeMarkdown(pain.description)}`);
            }
            if (Array.isArray(pain.affected_user_groups)) {
              const groups = formatMarkdownList(pain.affected_user_groups);
              if (groups) {
                parts.push(
                  groups
                    .split("\n")
                    .map((line) => `    ${line}`)
                    .join("\n")
                );
              }
            }
            parts.push(`    - Severity: ${pain.severity || ""}`);
            parts.push(`    - Frequency: ${pain.frequency || ""}`);
            parts.push(`    - Business importance: ${pain.business_importance || ""}`);
          });
        });
        return;
      }
      if (field.key === "problemUnderstanding.contextConstraints") {
        const contextual = value?.contextual_factors || [];
        if (contextual.length) {
          parts.push("#### Contextual factors");
          contextual.forEach((item) => {
            parts.push(`- ${escapeMarkdown(item.name || "")}`);
            parts.push(`  - Description: ${escapeMarkdown(item.description || "")}`);
            parts.push(`  - Impact on user needs: ${escapeMarkdown(item.impact_on_user_needs || "")}`);
            parts.push(`  - Business implications: ${escapeMarkdown(item.business_implications || "")}`);
          });
        }
        const constraints = value?.constraints || [];
        if (constraints.length) {
          parts.push("#### Constraints");
          constraints.forEach((item) => {
            parts.push(`- ${escapeMarkdown(item.name || "")}`);
            parts.push(`  - Description: ${escapeMarkdown(item.description || "")}`);
            parts.push(`  - Impact on user needs: ${escapeMarkdown(item.impact_on_user_needs || "")}`);
            parts.push(`  - Business implications: ${escapeMarkdown(item.business_implications || "")}`);
          });
        }
        return;
      }
      if (field.key === "marketAndCompetitorAnalysis.marketLandscape") {
        parts.push(`- Market definition: ${escapeMarkdown(value.market_definition?.description || "")}`);
        if (Array.isArray(value.market_definition?.excluded_adjacent_spaces)) {
          const excluded = formatMarkdownList(value.market_definition.excluded_adjacent_spaces);
          if (excluded) {
            parts.push("  - Excluded adjacent spaces:");
            parts.push(
              excluded
                .split("\n")
                .map((line) => `  ${line}`)
                .join("\n")
            );
          }
        }
        parts.push(`- Market size: ${escapeMarkdown(value.market_size?.description || "")}`);
        parts.push(`- Market maturity: ${escapeMarkdown(value.market_maturity?.classification || "")}`);
        if (value.market_maturity?.rationale) {
          parts.push(`  - Rationale: ${escapeMarkdown(value.market_maturity.rationale)}`);
        }
        const listSections = [
          ["Market trends", value.market_trends],
          ["Market dynamics", value.market_dynamics],
          ["Market forces", value.market_forces],
          ["Adoption drivers", value.adoption_drivers],
          ["Adoption barriers", value.adoption_barriers]
        ];
        listSections.forEach(([label, items]) => {
          if (!Array.isArray(items) || items.length === 0) {
            return;
          }
          parts.push(`#### ${label}`);
          items.forEach((item) => {
            parts.push(`- ${escapeMarkdown(item.name || "")}`);
            if (item.description) {
              parts.push(`  - Description: ${escapeMarkdown(item.description)}`);
            }
            if (item.time_horizon) {
              parts.push(`  - Time horizon: ${item.time_horizon}`);
            }
            if (item.affected_target_segments?.length) {
              const affected = formatMarkdownList(item.affected_target_segments);
              parts.push(
                affected
                  .split("\n")
                  .map((line) => `  ${line}`)
                  .join("\n")
              );
            }
            if (item.basis) {
              parts.push(`  - Basis: ${item.basis}`);
            }
            if (item.confidence) {
              parts.push(`  - Confidence: ${item.confidence}`);
            }
          });
        });
        return;
      }
      if (field.key === "marketAndCompetitorAnalysis.competitorInventory") {
        (value.competitors || []).forEach((item) => {
          parts.push(`- ${escapeMarkdown(item.name || "")}`);
          parts.push(`  - URL: ${escapeMarkdown(item.url || "")}`);
          parts.push(`  - Category: ${item.category || ""}`);
          parts.push(`  - Description: ${escapeMarkdown(item.description || "")}`);
          parts.push(`  - Target audience: ${escapeMarkdown(item.target_audience || "")}`);
          parts.push(`  - Positioning: ${escapeMarkdown(item.positioning || "")}`);
        });
        return;
      }
      if (field.key === "marketAndCompetitorAnalysis.competitorCapabilities") {
        (value.competitor_capabilities || []).forEach((item) => {
          parts.push(`- ${escapeMarkdown(item.competitor_name || "")}`);
          const sections = [
            ["Functional capabilities", item.functional_capabilities],
            ["Technical capabilities", item.technical_capabilities],
            ["Business capabilities", item.business_capabilities],
            ["Strengths", item.strengths],
            ["Limitations", item.limitations]
          ];
          sections.forEach(([label, items]) => {
            const list = formatMarkdownList(items || []);
            if (list) {
              parts.push(`  - ${label}:`);
              parts.push(
                list
                  .split("\n")
                  .map((line) => `  ${line}`)
                  .join("\n")
              );
            }
          });
          if (item.alignment_with_user_needs) {
            parts.push(`  - Alignment with user needs: ${escapeMarkdown(item.alignment_with_user_needs)}`);
          }
        });
        if (Array.isArray(value.industry_capability_patterns)) {
          parts.push("#### Industry capability patterns");
          value.industry_capability_patterns.forEach((item) => {
            parts.push(`- ${escapeMarkdown(item.pattern_name || "")}`);
            parts.push(`  - Description: ${escapeMarkdown(item.description || "")}`);
          });
        }
        return;
      }
      if (field.key === "marketAndCompetitorAnalysis.gapsOpportunities") {
        const groups = value.gaps_and_opportunities || {};
        ["functional", "technical", "business"].forEach((groupKey) => {
          const items = groups[groupKey] || [];
          if (!items.length) {
            return;
          }
          parts.push(`#### ${groupKey[0].toUpperCase()}${groupKey.slice(1)}`);
          items.forEach((item) => {
            parts.push(`- ${escapeMarkdown(item.gap_description || "")}`);
            const segments = formatMarkdownList(item.affected_user_segments || []);
            if (segments) {
              parts.push(
                segments
                  .split("\n")
                  .map((line) => `  ${line}`)
                  .join("\n")
              );
            }
            parts.push(`  - Opportunity: ${escapeMarkdown(item.opportunity_description || "")}`);
            parts.push(`  - User value potential: ${item.user_value_potential || ""}`);
            parts.push(`  - Feasibility: ${item.feasibility || ""}`);
          });
        });
        return;
      }
      if (field.key === "opportunityDefinition.opportunityStatement") {
        parts.push(escapeMarkdown(value.opportunity_statement || ""));
        return;
      }
      if (field.key === "opportunityDefinition.valueDrivers") {
        (value.value_drivers || []).forEach((item) => {
          parts.push(`- ${escapeMarkdown(item.name || "")}`);
          parts.push(`  - User need or pain: ${escapeMarkdown(item.user_need_or_pain || "")}`);
          parts.push(`  - User value impact: ${item.user_value_impact || ""}`);
          parts.push(`  - Business value lever: ${escapeMarkdown(item.business_value_lever || "")}`);
          parts.push(`  - Business value impact: ${item.business_value_impact || ""}`);
          parts.push(`  - Priority: ${item.priority || ""}`);
        });
        return;
      }
      if (field.key === "opportunityDefinition.marketFitHypothesis") {
        const hypothesis = value.market_fit_hypothesis || {};
        ["desirability", "viability"].forEach((key) => {
          const items = hypothesis[key] || [];
          if (!items.length) {
            return;
          }
          parts.push(`#### ${key[0].toUpperCase()}${key.slice(1)}`);
          items.forEach((item) => {
            parts.push(`- ${escapeMarkdown(item.hypothesis || "")}`);
            parts.push(`  - Rationale: ${escapeMarkdown(item.rationale || "")}`);
            const risks = formatMarkdownList(item.key_risks_or_unknowns || []);
            if (risks) {
              parts.push(
                risks
                  .split("\n")
                  .map((line) => `  ${line}`)
                  .join("\n")
              );
            }
          });
        });
        return;
      }
      if (field.key === "opportunityDefinition.feasibilityAssessment") {
        const assessment = value.feasibility_assessment || {};
        const groups = [
          ["Business constraints", assessment.business_constraints],
          ["User constraints", assessment.user_constraints],
          ["Technical concerns", assessment.technical_concerns]
        ];
        groups.forEach(([label, items]) => {
          if (!Array.isArray(items) || items.length === 0) {
            return;
          }
          parts.push(`#### ${label}`);
          items.forEach((item) => {
            parts.push(`- ${escapeMarkdown(item.name || "")}`);
            parts.push(`  - Description: ${escapeMarkdown(item.description || "")}`);
            parts.push(`  - Readiness: ${item.readiness || ""}`);
          });
        });
      }
    });
  });

  return parts.join("\n");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function markdownToHtml(markdown) {
  const lines = markdown.split("\n");
  const html = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };
  lines.forEach((line) => {
    if (!line.trim()) {
      closeList();
      return;
    }
    if (line.startsWith("#### ")) {
      closeList();
      html.push(`<h4>${escapeHtml(line.slice(5).trim())}</h4>`);
      return;
    }
    if (line.startsWith("### ")) {
      closeList();
      html.push(`<h3>${escapeHtml(line.slice(4).trim())}</h3>`);
      return;
    }
    if (line.startsWith("## ")) {
      closeList();
      html.push(`<h2>${escapeHtml(line.slice(3).trim())}</h2>`);
      return;
    }
    if (line.startsWith("# ")) {
      closeList();
      html.push(`<h1>${escapeHtml(line.slice(2).trim())}</h1>`);
      return;
    }
    if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${escapeHtml(line.slice(2).trim())}</li>`);
      return;
    }
    closeList();
    html.push(`<p>${escapeHtml(line.trim())}</p>`);
  });
  closeList();
  return html.join("\n");
}

function renderDiscoveryHtml(markdown) {
  const body = markdownToHtml(markdown);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Discovery Document</title>
    <style>
      body {
        font-family: "Inter", "Segoe UI", Arial, sans-serif;
        color: #0f172a;
        margin: 40px;
        line-height: 1.5;
      }
      h1 { font-size: 24px; margin-bottom: 16px; }
      h2 { font-size: 18px; margin-top: 24px; }
      h3 { font-size: 16px; margin-top: 16px; }
      h4 { font-size: 14px; margin-top: 12px; text-transform: uppercase; color: #64748b; }
      ul { margin: 8px 0 12px 20px; }
      li { margin: 4px 0; }
      p { margin: 6px 0; }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

async function getExportRecord(versionParam) {
  if (versionParam) {
    const record = await loadDiscoveryRecord(versionParam);
    if (!record) {
      throw new Error(`Discovery document v${versionParam} was not found.`);
    }
    return record;
  }
  const latest = await getLatestRecord();
  if (!latest) {
    throw new Error("No discovery document exists yet.");
  }
  return latest;
}

async function renderPdfFromHtml(html) {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch (error) {
    throw new Error("Playwright is not installed. Run: npm install playwright && npx playwright install chromium");
  }
  const browser = await playwright.chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const buffer = await page.pdf({ format: "A4", printBackground: true });
    await page.close();
    return buffer;
  } finally {
    await browser.close();
  }
}

function buildApprovedDocument(document, fieldStatus) {
  if (!document || !fieldStatus) {
    return {};
  }
  const approvedDocument = {};
  FIELD_DEFINITIONS.forEach((field) => {
    const statusInfo = fieldStatus[field.key];
    if (!statusInfo?.approved) {
      return;
    }
    const value = getNestedValue(document, field.key);
    if (typeof value === "undefined") {
      return;
    }
    setNestedValue(approvedDocument, field.key, value);
  });
  return approvedDocument;
}

function buildIncomingInfo({
  productIdea,
  targetUser,
  userNotes,
  currentDocument,
  fieldStatus
}) {
  const approvedDocument = buildApprovedDocument(currentDocument, fieldStatus);
  const incomingInfo = {
    productIdea: productIdea || "",
    targetUser: targetUser || "",
    userNotes: Array.isArray(userNotes) ? userNotes : []
  };
  FIELD_DEFINITIONS.forEach((field) => {
    const statusInfo = fieldStatus?.[field.key];
    if (!statusInfo?.approved) {
      return;
    }
    const displayKey = field.outputKey || field.key.split(".").pop() || field.key;
    const value = getNestedValue(approvedDocument, field.key);
    if (typeof value !== "undefined") {
      incomingInfo[displayKey] = value;
    }
  });
  return incomingInfo;
}

function buildIncomingInfoForField({
  fieldKey,
  productIdea,
  targetUser,
  userNotes,
  currentDocument,
  fieldStatus
}) {
  const approvedDocument = buildApprovedDocument(currentDocument, fieldStatus);
  const incomingInfo = {
    productIdea: productIdea || "",
    targetUser: targetUser || "",
    userNotes: Array.isArray(userNotes) ? userNotes : []
  };
  if (!sectionInputDependencies) {
    try {
      const raw = fsSync.readFileSync(SECTION_INPUTS_PATH, "utf8");
      sectionInputDependencies = JSON.parse(raw);
    } catch (error) {
      console.warn("Unable to load section-inputs.json. Using empty dependencies.");
      sectionInputDependencies = {};
    }
  }
  const dependencies = sectionInputDependencies[fieldKey] || [];
  dependencies.forEach((displayKey) => {
    const fieldKeyForDisplay = FIELD_DISPLAY_KEY_MAP[displayKey];
    if (!fieldKeyForDisplay) {
      return;
    }
    const value = getNestedValue(approvedDocument, fieldKeyForDisplay);
    if (typeof value !== "undefined") {
      incomingInfo[displayKey] = value;
    }
  });
  return incomingInfo;
}

const discoveryDocumentSchema = z
  .object({
    problemUnderstanding: z
      .object({
        problemStatement: z.string().min(20),
        targetUsersSegments: z
          .object({
            target_segments: z
              .array(
                z
                  .object({
                    segment_name: z.string().min(1),
                    business_relevance: z.string().min(1),
                    user_groups: z
                      .array(
                        z.object({
                          name: z.string().min(1),
                          characteristics: z.array(z.string().min(1)).nonempty()
                        })
                      )
                      .nonempty()
                  })
                  .strict()
              )
              .nonempty()
          })
          .strict(),
        userPainPoints: z
          .object({
            pain_point_themes: z
              .array(
                z
                  .object({
                    theme_name: z.string().min(1),
                    pain_points: z
                      .array(
                        z.object({
                          name: z.string().min(1),
                          description: z.string().min(1),
                          affected_user_groups: z.array(z.string().min(1)).nonempty(),
                          severity: z.enum(["low", "medium", "high"]),
                          frequency: z.enum(["low", "medium", "high"]),
                          business_importance: z.enum(["low", "medium", "high"])
                        })
                      )
                      .nonempty()
                  })
                  .strict()
              )
              .nonempty()
          })
          .strict(),
        contextConstraints: z
          .object({
            contextual_factors: z
              .array(
                z
                  .object({
                    name: z.string().min(3),
                    description: z.string().min(3),
                    impact_on_user_needs: z.string().min(3),
                    business_implications: z.string().min(3)
                  })
                  .strict()
              )
              .optional(),
            constraints: z
              .array(
                z
                  .object({
                    name: z.string().min(3),
                    description: z.string().min(3),
                    impact_on_user_needs: z.string().min(3),
                    business_implications: z.string().min(3)
                  })
                  .strict()
              )
              .optional()
          })
          .strict()
      })
      .strict(),
    marketAndCompetitorAnalysis: z
      .object({
        marketLandscape: z
          .object({
            market_definition: z
              .object({
                description: z.string().min(1),
                excluded_adjacent_spaces: z.array(z.string().min(1))
              })
              .strict(),
            market_size: z
              .object({
                description: z.string().min(1)
              })
              .strict(),
            market_maturity: z
              .object({
                classification: z.enum([
                  "emerging",
                  "fragmented",
                  "consolidating",
                  "mature"
                ]),
                rationale: z.string().min(1)
              })
              .strict(),
            market_trends: z
              .array(
                z
                  .object({
                    name: z.string().min(1),
                    description: z.string().min(1),
                    time_horizon: z.enum(["short", "mid", "long"]),
                    affected_target_segments: z.array(z.string().min(1)),
                    basis: z.enum([
                      "evidence_from_inputs",
                      "domain_generic_assumption"
                    ]),
                    confidence: z.enum(["low", "medium", "high"])
                  })
                  .strict()
              ),
            market_dynamics: z
              .array(
                z
                  .object({
                    name: z.string().min(1),
                    description: z.string().min(1),
                    affected_target_segments: z.array(z.string().min(1)),
                    basis: z.enum([
                      "evidence_from_inputs",
                      "domain_generic_assumption"
                    ]),
                    confidence: z.enum(["low", "medium", "high"])
                  })
                  .strict()
              ),
            market_forces: z
              .array(
                z
                  .object({
                    name: z.string().min(1),
                    description: z.string().min(1),
                    affected_target_segments: z.array(z.string().min(1)),
                    basis: z.enum([
                      "evidence_from_inputs",
                      "domain_generic_assumption"
                    ]),
                    confidence: z.enum(["low", "medium", "high"])
                  })
                  .strict()
              ),
            adoption_drivers: z
              .array(
                z
                  .object({
                    name: z.string().min(1),
                    description: z.string().min(1),
                    affected_target_segments: z.array(z.string().min(1))
                  })
                  .strict()
              ),
            adoption_barriers: z
              .array(
                z
                  .object({
                    name: z.string().min(1),
                    description: z.string().min(1),
                    affected_target_segments: z.array(z.string().min(1))
                  })
                  .strict()
              )
          })
          .strict(),
        competitorInventory: z
          .object({
            competitors: z
              .array(
                z
                  .object({
                    name: z.string().min(1),
                    url: z.string().url(),
                    category: z.enum(["direct", "indirect", "substitute"]),
                    description: z.string().min(3),
                    target_audience: z.string().min(3),
                    positioning: z.string().min(3)
                  })
                  .strict()
              )
              .nonempty()
          })
          .strict(),
        competitorCapabilities: z
          .object({
            competitor_capabilities: z
              .array(
                z
                  .object({
                    competitor_name: z.string().min(1),
                    functional_capabilities: z.array(z.string().min(1)),
                    technical_capabilities: z.array(z.string().min(1)),
                    business_capabilities: z.array(z.string().min(1)),
                    strengths: z.array(z.string().min(1)),
                    limitations: z.array(z.string().min(1)),
                    alignment_with_user_needs: z.string().min(3)
                  })
                  .strict()
              )
              .nonempty(),
            industry_capability_patterns: z
              .array(
                z
                  .object({
                    pattern_name: z.string().min(1),
                    description: z.string().min(3)
                  })
                  .strict()
              )
              .nonempty()
          })
          .strict(),
        gapsOpportunities: z
          .object({
            gaps_and_opportunities: z
              .object({
                functional: z
                  .array(
                    z
                      .object({
                        gap_description: z.string().min(10),
                        affected_user_segments: z.array(z.string().min(3)).nonempty(),
                        opportunity_description: z.string().min(10),
                        user_value_potential: z.enum(["low", "medium", "high"]),
                        feasibility: z.enum(["low", "medium", "high"])
                      })
                      .strict()
                  )
                  .nonempty(),
                technical: z
                  .array(
                    z
                      .object({
                        gap_description: z.string().min(10),
                        affected_user_segments: z.array(z.string().min(3)).nonempty(),
                        opportunity_description: z.string().min(10),
                        user_value_potential: z.enum(["low", "medium", "high"]),
                        feasibility: z.enum(["low", "medium", "high"])
                      })
                      .strict()
                  )
                  .nonempty(),
                business: z
                  .array(
                    z
                      .object({
                        gap_description: z.string().min(10),
                        affected_user_segments: z.array(z.string().min(3)).nonempty(),
                        opportunity_description: z.string().min(10),
                        user_value_potential: z.enum(["low", "medium", "high"]),
                        feasibility: z.enum(["low", "medium", "high"])
                      })
                      .strict()
                  )
                  .nonempty()
              })
              .strict()
          })
          .strict()
      })
      .strict(),
    opportunityDefinition: z
      .object({
      opportunityStatement: z
        .object({
          opportunity_statement: z.string().min(3)
        })
        .strict(),
      valueDrivers: z
        .object({
          value_drivers: z
            .array(
              z
                .object({
                  name: z.string().min(3),
                  user_need_or_pain: z.string().min(3),
                  user_value_impact: z.enum(["low", "medium", "high"]),
                  business_value_lever: z.string().min(3),
                  business_value_impact: z.enum(["low", "medium", "high"]),
                  priority: z.enum(["low", "medium", "high"])
                })
                .strict()
            )
            .nonempty()
        })
        .strict(),
      marketFitHypothesis: z
        .object({
          market_fit_hypothesis: z
            .object({
              desirability: z
                .array(
                  z
                    .object({
                      hypothesis: z.string().min(3),
                      rationale: z.string().min(3),
                      key_risks_or_unknowns: z.array(z.string().min(3)).nonempty()
                    })
                    .strict()
                )
                .nonempty(),
              viability: z
                .array(
                  z
                    .object({
                      hypothesis: z.string().min(3),
                      rationale: z.string().min(3),
                      key_risks_or_unknowns: z.array(z.string().min(3)).nonempty()
                    })
                    .strict()
                )
                .nonempty()
            })
            .strict()
        })
        .strict(),
      feasibilityAssessment: z
        .object({
          feasibility_assessment: z
            .object({
              business_constraints: z
                .array(
                  z
                    .object({
                      name: z.string().min(3),
                      description: z.string().min(5),
                      readiness: z.enum(["low", "medium", "high"])
                    })
                    .strict()
                )
                .nonempty(),
              user_constraints: z
                .array(
                  z
                    .object({
                      name: z.string().min(3),
                      description: z.string().min(5),
                      readiness: z.enum(["low", "medium", "high"])
                    })
                    .strict()
                )
                .nonempty(),
              technical_concerns: z
                .array(
                  z
                    .object({
                      name: z.string().min(3),
                      description: z.string().min(5),
                      readiness: z.enum(["low", "medium", "high"])
                    })
                    .strict()
                )
                .nonempty()
            })
            .strict()
        })
        .strict()
      })
      .strict()
  })
  .strict();

export const agent = discoveryGraph;
let chatInstance;
let promptCache;

export async function produceDiscoveryDocument({
  productIdea,
  targetUser,
  userMessages
}) {
  const emptyDocument = buildEmptyDocument();
  const firstField = FIELD_DEFINITIONS[0];
  if (!firstField) {
    throw new Error("No discovery fields configured.");
  }

  const { value: firstValue, prompt, rawText, validationStatus } = await generateFieldValueWithOutput({
    field: firstField,
    productIdea,
    targetUser,
    userNotes: userMessages,
    currentDocument: emptyDocument,
    fieldStatus: {}
  });
  setNestedValue(emptyDocument, firstField.key, firstValue);
  return {
    discoveryDocument: emptyDocument,
    lastPrompt: prompt,
    lastPromptFieldKey: firstField.key,
    lastOutput: rawText,
    lastOutputFieldKey: firstField.key,
    lastValidationStatus: validationStatus || null
  };
}

function getChatModel() {
  if (process.env.MOCK_DISCOVERY === "true") {
    return null;
  }

  if (chatInstance) {
    return chatInstance;
  }

  try {
    chatInstance = new ChatOllama({
      model: OLLAMA_MODEL,
      temperature: 0.2,
      keepAlive: "2m",
      format: "json"
    });
    return chatInstance;
  } catch (error) {
    console.warn(
      "Unable to initialize ChatOllama. Set MOCK_DISCOVERY=true to skip LLM usage."
    );
    console.warn(error);
    chatInstance = null;
    return null;
  }
}

function buildFieldPrompt({
  promptInputs,
  approvedDocument,
  systemPrompt,
  productIdea,
  targetUser,
  userNotes,
  outputRules,
  sectionPrompt,
  sectionSchema,
  sectionSchemaJson,
  sectionExamples,
  finalSchema,
  currentDocument,
  fieldKey,
  fieldOutputKey
}) {
  const fieldName = fieldKey?.split(".").pop() || "field";
  const outputKey = fieldOutputKey || fieldName;
  const safeNotes = Array.isArray(userNotes) ? userNotes : [];
  const notesBlock = safeNotes.length
    ? `User notes:\n- ${safeNotes.join("\n- ")}`
    : "User notes: none provided";
  const schemaBlock = sectionSchemaJson
    ? buildSchemaSketch(sectionSchemaJson)
    : sectionSchema
      ? buildSchemaSketch(tryParseJsonText(sectionSchema))
      : "### JSON schema (define output format)\n\nSchema missing.";
  const prompt = [
    systemPrompt || "You are the Discovery Agent.",
    promptInputs,
    sectionPrompt || "Section prompt missing.",
    outputRules,
    schemaBlock
  ]
    .filter(Boolean)
    .join("\n\n");

  const approved = approvedDocument || {};
  return renderTemplate(prompt, {
    productIdea,
    targetUser,
    userNotes: safeNotes.length ? `- ${safeNotes.join("\n- ")}` : "none",
    problemStatement:
      getNestedValue(approved, "problemUnderstanding.problemStatement") || "",
    targetUsersAndSegments: JSON.stringify(
      getNestedValue(approved, "problemUnderstanding.targetUsersSegments") || {},
      null,
      2
    ),
    userPainPoints: JSON.stringify(
      getNestedValue(approved, "problemUnderstanding.userPainPoints") || {},
      null,
      2
    ),
    contextConstraints: JSON.stringify(
      getNestedValue(approved, "problemUnderstanding.contextConstraints") || {
        contextual_factors: [],
        constraints: []
      },
      null,
      2
    ),
    marketLandscape: JSON.stringify(
      getNestedValue(approved, "marketAndCompetitorAnalysis.marketLandscape") || {},
      null,
      2
    ),
    competitorInventory: JSON.stringify(
      getNestedValue(approved, "marketAndCompetitorAnalysis.competitorInventory") || {
        competitors: []
      },
      null,
      2
    ),
    competitorCapabilities: JSON.stringify(
      getNestedValue(approved, "marketAndCompetitorAnalysis.competitorCapabilities") || {
        competitor_capabilities: [],
        industry_capability_patterns: []
      },
      null,
      2
    ),
    gapsOpportunities: JSON.stringify(
      getNestedValue(approved, "marketAndCompetitorAnalysis.gapsOpportunities") || {
        gaps_and_opportunities: {
          functional: [],
          technical: [],
          business: []
        }
      },
      null,
      2
    ),
    opportunityStatement:
      JSON.stringify(
        getNestedValue(approved, "opportunityDefinition.opportunityStatement") || {
          opportunity_statement: ""
        },
        null,
        2
      ),
    valueDrivers: JSON.stringify(
      getNestedValue(approved, "opportunityDefinition.valueDrivers") || {
        value_drivers: []
      },
      null,
      2
    ),
    marketFitHypothesis: JSON.stringify(
      getNestedValue(approved, "opportunityDefinition.marketFitHypothesis") || {
        market_fit_hypothesis: {
          desirability: [],
          viability: []
        }
      },
      null,
      2
    ),
    feasibilityAssessment: JSON.stringify(
      getNestedValue(approved, "opportunityDefinition.feasibilityAssessment") || {
        feasibility_assessment: {
          business_constraints: [],
          user_constraints: [],
          technical_concerns: []
        }
      },
      null,
      2
    )
  });
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateAgainstSchema(value, schema, path = "") {
  const errors = [];
  if (!schema || typeof schema !== "object") {
    return { valid: true, errors };
  }

  const pushError = (message) => {
    errors.push(path ? `${path}: ${message}` : message);
  };

  if (schema.enum) {
    if (!schema.enum.includes(value)) {
      pushError(`Value must be one of: ${schema.enum.join(", ")}`);
      return { valid: false, errors };
    }
  }

  const type = schema.type;
  if (type === "string") {
    if (typeof value !== "string") {
      pushError("Expected string.");
      return { valid: false, errors };
    }
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      pushError(`String length must be >= ${schema.minLength}.`);
    }
    return { valid: errors.length === 0, errors };
  }

  if (type === "array") {
    if (!Array.isArray(value)) {
      pushError("Expected array.");
      return { valid: false, errors };
    }
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      pushError(`Array length must be >= ${schema.minItems}.`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        const result = validateAgainstSchema(item, schema.items, `${path}[${index}]`);
        if (!result.valid) {
          errors.push(...result.errors);
        }
      });
    }
    return { valid: errors.length === 0, errors };
  }

  if (type === "object") {
    if (!isPlainObject(value)) {
      pushError("Expected object.");
      return { valid: false, errors };
    }
    const properties = schema.properties || {};
    const required = schema.required || [];
    required.forEach((key) => {
      if (!(key in value)) {
        errors.push(`${path ? `${path}.` : ""}${key}: Missing required property.`);
      }
    });
    if (schema.additionalProperties === false) {
      Object.keys(value).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) {
          errors.push(`${path ? `${path}.` : ""}${key}: Additional property not allowed.`);
        }
      });
    }
    Object.keys(properties).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const result = validateAgainstSchema(
          value[key],
          properties[key],
          path ? `${path}.${key}` : key
        );
        if (!result.valid) {
          errors.push(...result.errors);
        }
      }
    });
    return { valid: errors.length === 0, errors };
  }

  return { valid: true, errors };
}

function tryParseDiscoveryResponse(response) {
  if (!response) {
    throw new Error("Empty response from discovery agent.");
  }
  const textChunks = Array.isArray(response.content)
    ? response.content
      .filter((chunk) => chunk?.type === "text" && chunk.text)
      .map((chunk) => chunk.text)
    : [response.content];
  const text = textChunks.join("\n");
  const cleaned = text.replace(/```json|```/g, "").trim();
  const candidate = cleaned.startsWith("{") ? cleaned : extractJsonBlock(cleaned);
  return JSON.parse(candidate);
}

function extractTextFromResponse(response) {
  if (!response) {
    return "";
  }
  const textChunks = Array.isArray(response.content)
    ? response.content
      .filter((chunk) => chunk?.type === "text" && chunk.text)
      .map((chunk) => chunk.text)
    : [response.content];
  return textChunks.join("\n").trim();
}

function extractJsonBlock(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in response.");
  }
  return text.slice(start, end + 1);
}

function resolveSchemaRef(schema, rootSchema) {
  if (!schema || typeof schema.$ref !== "string" || !rootSchema) {
    return schema;
  }
  const ref = schema.$ref;
  if (!ref.startsWith("#/")) {
    return schema;
  }
  const pathParts = ref.slice(2).split("/");
  let current = rootSchema;
  for (const part of pathParts) {
    if (!current || typeof current !== "object") {
      return schema;
    }
    current = current[part];
  }
  return current || schema;
}

function formatSchemaType(schema, rootSchema) {
  if (!schema || typeof schema !== "object") {
    return "unknown";
  }
  const resolved = resolveSchemaRef(schema, rootSchema);
  if (resolved !== schema) {
    return formatSchemaType(resolved, rootSchema);
  }
  if (schema.enum) {
    return schema.enum.join("|");
  }
  if (schema.type === "string") {
    return "string";
  }
  if (schema.type === "array") {
    const itemType = formatSchemaType(schema.items || {}, rootSchema);
    return `array<${itemType}>`;
  }
  if (schema.type === "object") {
    const properties = schema.properties || {};
    const requiredKeys = Array.isArray(schema.required) && schema.required.length
      ? schema.required
      : Object.keys(properties);
    if (!requiredKeys.length) {
      return "object";
    }
    const fields = requiredKeys.map((key) => {
      const prop = properties[key] || {};
      const typeLabel = formatSchemaType(prop, rootSchema);
      return `${key} (${typeLabel})`;
    });
    return `object { ${fields.join(", ")} }`;
  }
  return "unknown";
}

function buildSchemaSketch(schemaJson) {
  if (!schemaJson || typeof schemaJson !== "object") {
    return "### JSON schema (define output format)\n\nSchema missing.";
  }
  const properties = schemaJson.properties || {};
  const requiredKeys = Array.isArray(schemaJson.required) ? schemaJson.required : [];
  const lines = [];
  if (requiredKeys.length) {
    lines.push(`Required keys: ${requiredKeys.join(", ")}.`);
  }
  const keysToDescribe = requiredKeys.length ? requiredKeys : Object.keys(properties);
  keysToDescribe.forEach((key) => {
    if (!properties[key]) {
      return;
    }
    lines.push(`${key}: ${formatSchemaType(properties[key], schemaJson)}`);
  });
  return [
    "### JSON schema (define output format)",
    "",
    ...lines
  ].join("\n");
}

function tryParseJsonText(text) {
  if (typeof text !== "string") {
    return null;
  }
  const cleaned = text.replace(/```json|```/g, "").trim();
  if (!cleaned) {
    return null;
  }
  const candidate = cleaned.startsWith("{") ? cleaned : (() => {
    try {
      return extractJsonBlock(cleaned);
    } catch {
      return "";
    }
  })();
  if (!candidate) {
    return null;
  }
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function pickStringValue(payload, keys) {
  if (!payload) {
    return "";
  }
  if (typeof payload === "string") {
    return payload.trim();
  }
  for (const key of keys) {
    const value = payload?.[key];
    if (typeof value === "string") {
      return value.trim();
    }
  }
  return "";
}

function isLikelyJsonText(text) {
  if (!text) {
    return false;
  }
  const trimmed = text.trim();
  return trimmed.startsWith("{") || trimmed.includes("\"productIdea\"") || trimmed.includes("\"targetUser\"");
}

function pickNextRandomIdeaDomain() {
  const candidates = RANDOM_IDEA_DOMAINS.filter((domain) => domain !== lastRandomIdeaDomain);
  const pool = candidates.length ? candidates : RANDOM_IDEA_DOMAINS;
  const selection = pool[Math.floor(Math.random() * pool.length)];
  lastRandomIdeaDomain = selection;
  return selection;
}

function recordRecentRandomIdea(productIdea) {
  if (!productIdea) {
    return;
  }
  recentRandomIdeas.unshift(productIdea);
  if (recentRandomIdeas.length > MAX_RECENT_RANDOM_IDEAS) {
    recentRandomIdeas.length = MAX_RECENT_RANDOM_IDEAS;
  }
}

async function generateRandomInputs({ currentProductIdea } = {}) {
  const model = getChatModel();
  if (!model) {
    if (process.env.MOCK_DISCOVERY === "true") {
      return {
        productIdea: "A random product idea goes here. It is a short, clear concept. It has three sentences.",
        targetUser: "People who want a quick, randomized product concept."
      };
    }
    throw new Error("Ollama is not available. Start Ollama and retry.");
  }

  const ideaPrompt = await readOtherPromptFile("random-product-idea.prompt.md");
  const targetPromptTemplate = await readOtherPromptFile("random-target-user.prompt.md");
  if (!ideaPrompt || !targetPromptTemplate) {
    throw new Error("Random prompt files are missing.");
  }

  const selectedDomain = pickNextRandomIdeaDomain();
  const ideaPromptText = renderTemplate(ideaPrompt, {
    currentProductIdea: currentProductIdea || "",
    selectedDomain,
    recentProductIdeas: recentRandomIdeas.length
      ? `- ${recentRandomIdeas.join("\n- ")}`
      : "None"
  });
  const ideaResponse = await model.invoke([{ role: "user", content: ideaPromptText }]);
  const ideaRaw = extractTextFromResponse(ideaResponse);
  let ideaPayload;
  try {
    ideaPayload = tryParseDiscoveryResponse(ideaResponse);
  } catch {
    ideaPayload = tryParseJsonText(ideaRaw);
  }
  let productIdea = pickStringValue(ideaPayload, [
    "productIdea",
    "product_idea",
    "idea"
  ]);
  if (!productIdea && ideaRaw && !isLikelyJsonText(ideaRaw)) {
    productIdea = ideaRaw.replace(/```json|```/g, "").trim();
  }
  if (!productIdea) {
    throw new Error("Random product idea response missing productIdea.");
  }
  recordRecentRandomIdea(productIdea);

  const targetPrompt = renderTemplate(targetPromptTemplate, { productIdea });
  const targetResponse = await model.invoke([{ role: "user", content: targetPrompt }]);
  const targetRaw = extractTextFromResponse(targetResponse);
  let targetPayload;
  try {
    targetPayload = tryParseDiscoveryResponse(targetResponse);
  } catch {
    targetPayload = tryParseJsonText(targetRaw);
  }
  let targetUser = pickStringValue(targetPayload, [
    "targetUser",
    "target_user",
    "user"
  ]);
  if (!targetUser && targetRaw && !isLikelyJsonText(targetRaw)) {
    targetUser = targetRaw.replace(/```json|```/g, "").trim();
  }
  if (!targetUser) {
    throw new Error("Random target user response missing targetUser.");
  }

  return { productIdea, targetUser };
}

function buildFallbackDocument(productIdea, targetUser) {
  const baseIdea =
    productIdea || "New product idea awaiting more details from the user.";
  const userTarget =
    targetUser || "Describe the ideal user or customer so we can tailor the plan.";
  return {
    problemUnderstanding: {
      problemStatement: `Problem statement for: ${baseIdea}. Target user hint: ${userTarget}. This draft was generated without the LLM and should be reviewed.`,
      targetUsersSegments: {
        target_segments: [
          {
            segment_name: "Primary customers",
            business_relevance: "Likely to experience the core pain.",
            user_groups: [
              {
                name: "Primary customers",
                characteristics: [
                  "Experience the described pain",
                  "Need faster alignment",
                  "Seek clear outcomes"
                ]
              }
            ]
          }
        ]
      },
      userPainPoints: {
        pain_point_themes: [
          {
            theme_name: "Discovery clarity",
            pain_points: [
              {
                name: "Unclear problem framing",
                description:
                  "Teams struggle to define and align on the core user problem.",
                affected_user_groups: ["Product leads", "Stakeholders"],
                severity: "high",
                frequency: "high",
                business_importance: "high"
              }
            ]
          }
        ]
      },
      contextConstraints: {
        contextual_factors: [
          {
            name: "Time constraints for delivery",
            description: "Teams operate under limited delivery timelines.",
            impact_on_user_needs: "Users expect faster clarity and direction.",
            business_implications: "Delays increase coordination cost."
          }
        ],
        constraints: [
          {
            name: "Budget and staffing limits",
            description: "Resources are limited during discovery.",
            impact_on_user_needs: "Users need low-effort validation steps.",
            business_implications: "Scope must stay tight to deliver value."
          },
          {
            name: "Data availability and quality",
            description: "Inputs may be incomplete or inconsistent.",
            impact_on_user_needs: "Users require clear assumptions and gaps.",
            business_implications: "Low data quality can slow confidence."
          }
        ]
      }
    },
    marketAndCompetitorAnalysis: {
      marketLandscape: {
        market_definition: {
          description: "Discovery planning tools supporting product teams.",
          excluded_adjacent_spaces: ["General project management suites"]
        },
        market_size: {
          description: "Mid-sized market with steady adoption across product teams."
        },
        market_maturity: {
          classification: "fragmented",
          rationale: "Many tools exist, but few dominate the segment."
        },
        market_trends: [
          {
            name: "AI-assisted drafting",
            description: "Teams expect faster initial drafts from AI.",
            time_horizon: "short",
            affected_target_segments: ["Product leads"],
            basis: "domain_generic_assumption",
            confidence: "medium"
          }
        ],
        market_dynamics: [
          {
            name: "Preference for workflow fit",
            description: "Teams choose tools that match existing processes.",
            affected_target_segments: ["Product managers"],
            basis: "domain_generic_assumption",
            confidence: "medium"
          }
        ],
        market_forces: [
          {
            name: "Budget scrutiny",
            description: "Spending on new tools requires clear ROI.",
            affected_target_segments: ["Budget owners"],
            basis: "domain_generic_assumption",
            confidence: "low"
          }
        ],
        adoption_drivers: [
          {
            name: "Faster discovery cycles",
            description: "Teams want to reduce time to draft.",
            affected_target_segments: ["Product teams"]
          }
        ],
        adoption_barriers: [
          {
            name: "Change fatigue",
            description: "Teams are cautious about new tools.",
            affected_target_segments: ["Product teams"]
          }
        ]
      },
      competitorInventory: {
        competitors: [
          {
            name: "Discovery templates",
            url: "https://example.com/templates",
            category: "substitute",
            description: "Static templates used to draft discovery documents.",
            target_audience: "Product teams",
            positioning: "Lightweight and familiar."
          }
        ]
      },
      competitorCapabilities: {
        competitor_capabilities: [
          {
            competitor_name: "Discovery templates",
            functional_capabilities: ["Static templates"],
            technical_capabilities: ["Document export"],
            business_capabilities: ["Low-cost usage"],
            strengths: ["Easy to adopt"],
            limitations: ["No AI assistance"],
            alignment_with_user_needs: "Basic guidance but limited depth."
          }
        ],
        industry_capability_patterns: [
          {
            pattern_name: "Template-first workflows",
            description: "Teams rely on static templates to structure discovery."
          }
        ]
      },
      gapsOpportunities: {
        gaps_and_opportunities: {
          functional: [
            {
              gap_description: "Drafts are created manually with limited automation.",
              affected_user_segments: ["Product teams"],
              opportunity_description: "Automated draft generation could reduce effort.",
              user_value_potential: "high",
              feasibility: "medium"
            }
          ],
          technical: [],
          business: []
        }
      }
    },
    opportunityDefinition: {
      opportunityStatement: {
        opportunity_statement:
          "Provide a clear, structured discovery draft that accelerates alignment and decision-making."
      },
      valueDrivers: {
        value_drivers: [
          {
            name: "Faster draft creation",
            user_need_or_pain: "Teams need to move from idea to draft quickly.",
            user_value_impact: "high",
            business_value_lever: "Reduced preparation time",
            business_value_impact: "medium",
            priority: "high"
          }
        ]
      },
      marketFitHypothesis: {
        market_fit_hypothesis: {
          desirability: [
            {
              hypothesis: "Users want a faster way to align on discovery inputs.",
              rationale: "Manual drafting slows teams down.",
              key_risks_or_unknowns: ["Adoption willingness", "Change resistance"]
            }
          ],
          viability: [
            {
              hypothesis: "Teams will pay for reduced discovery time.",
              rationale: "Faster alignment shortens planning cycles.",
              key_risks_or_unknowns: ["Budget approval", "Procurement delays"]
            }
          ]
        }
      },
      feasibilityAssessment: {
        feasibility_assessment: {
          business_constraints: [
            {
              name: "Budget approval cycles",
              description: "Purchases may require multi-step approvals.",
              readiness: "medium"
            }
          ],
          user_constraints: [
            {
              name: "Time constraints",
              description: "Users have limited time to maintain long documents.",
              readiness: "medium"
            }
          ],
          technical_concerns: [
            {
              name: "Model availability",
              description: "LLM access may be limited by infrastructure.",
              readiness: "medium"
            }
          ]
        }
      }
    }
  };
}

export async function runDiscoveryWorkflow(input) {
  const validation = validateUserInput(input || {});
  if (!validation.valid) {
    return {
      status: "needs_input",
      missingFields: validation.missingFields,
      questions: validation.questions,
      timestamp: new Date().toISOString()
    };
  }

  const productIdea = (input.productIdea || "").trim();
  const targetUser = (input.targetUser || "").trim();
  const userMessages = normalizeUserMessages(input.userMessages);
  const changeReason = (input.changeReason || "").trim();
  const pendingApproval = input?.forceNew ? null : await checkApprovalGate();
  if (pendingApproval) {
    return pendingApproval;
  }

  const initialState = {
    productIdea,
    targetUser,
    userMessages,
    currentStage: "discovery_planning",
    decisions: [],
    openQuestions: [],
    pendingQuestions: []
  };

  const finalState = await discoveryGraph.invoke(initialState);
  if (!finalState.discoveryDocument) {
    throw new Error("Discovery document was not generated.");
  }

  const fieldStatus = buildFieldStatus();
  const firstField = FIELD_DEFINITIONS[0];
  const firstFieldLabel = firstField ? getFieldLabel(firstField.key) : "First section";
  const record = {
    stage: "discovery",
    timestamp: new Date().toISOString(),
    productIdea,
    targetUser,
    discoveryDocument: finalState.discoveryDocument,
    decisions: finalState.decisions,
    openQuestions: [],
    userMessages,
    approved: false,
    approvedAt: null,
    approvalHistory: [],
    changeReason: changeReason || "Initial discovery draft",
    changeLog: [],
    fieldStatus,
    fieldOrder: FIELD_DEFINITIONS.map((field) => field.key),
    currentFieldKey: firstField ? firstField.key : null,
    fieldApprovalHistory: [],
    lastPrompt: finalState.lastPrompt || null,
    lastPromptFieldKey: finalState.lastPromptFieldKey || null,
    lastOutput: finalState.lastOutput || null,
    lastOutputFieldKey: finalState.lastOutputFieldKey || null,
    lastValidationStatus: finalState.lastValidationStatus || null,
    lastStatusMessage: `${firstFieldLabel} created. Review and approve.`
  };

  const persisted = await persistDiscoveryResult(record);
  return {
    status: "in_progress",
    resultType: "created",
    record: persisted.record,
    savedToSupabase: persisted.savedToSupabase,
    validationStatus: finalState.lastValidationStatus || null
  };
}

export async function generateEntireDiscoveryDocument(input, shouldAbort) {
  const validation = validateUserInput(input || {});
  if (!validation.valid) {
    return {
      status: "needs_input",
      missingFields: validation.missingFields,
      questions: validation.questions,
      timestamp: new Date().toISOString()
    };
  }

  const productIdea = (input.productIdea || "").trim();
  const targetUser = (input.targetUser || "").trim();
  const userMessages = normalizeUserMessages(input.userMessages);
  const changeReason = (input.changeReason || "").trim();

  const pendingApproval = input?.forceNew ? null : await checkApprovalGate();
  if (pendingApproval) {
    return pendingApproval;
  }

  const emptyDocument = buildEmptyDocument();
  const fieldStatus = buildFieldStatus();
  const currentDocument = emptyDocument;
  const initialTimestamp = new Date().toISOString();
  const initialChangeReason = changeReason || "Generating entire document";

  const initialRecord = {
    stage: "discovery",
    timestamp: initialTimestamp,
    productIdea,
    targetUser,
    discoveryDocument: currentDocument,
    decisions: [],
    openQuestions: [],
    userMessages,
    approved: false,
    approvedAt: null,
    approvalHistory: [],
    changeReason: initialChangeReason,
    changeLog: [],
    fieldStatus,
    fieldOrder: FIELD_DEFINITIONS.map((field) => field.key),
    currentFieldKey: null,
    fieldApprovalHistory: [],
    lastPrompt: null,
    lastPromptFieldKey: null,
    lastOutput: null,
    lastOutputFieldKey: null,
    lastValidationStatus: null,
    lastStatusMessage: "Starting full document generation."
  };

  const persisted = await persistDiscoveryResult(initialRecord);
  let record = persisted.record;

  for (const field of FIELD_DEFINITIONS) {
    if (shouldAbort?.()) {
      throw new Error("Generation cancelled.");
    }
    const fieldLabel = getFieldLabel(field.key);
    record = {
      ...record,
      lastStatusMessage: `Generating ${fieldLabel}...`
    };
    const preUpdate = await updateDiscoveryRecord(
      record,
      "generate_all_progress",
      record.lastStatusMessage
    );
    record = preUpdate.record;
    const { value, prompt, rawText, validationStatus } = await generateFieldValueWithOutput({
      field,
      productIdea,
      targetUser,
      userNotes: userMessages,
      currentDocument,
      fieldStatus
    });
    setNestedValue(currentDocument, field.key, value);
    fieldStatus[field.key] = { approved: true, approvedAt: new Date().toISOString() };
    const isLastField = field.key === FIELD_DEFINITIONS[FIELD_DEFINITIONS.length - 1].key;
    const statusMessage = isLastField
      ? `${fieldLabel} created. Finalizing document...`
      : `${fieldLabel} created. Starting next section...`;
    record = {
      ...record,
      discoveryDocument: currentDocument,
      fieldStatus,
      lastPrompt: prompt,
      lastPromptFieldKey: field.key,
      lastOutput: rawText,
      lastOutputFieldKey: field.key,
      lastValidationStatus: validationStatus || null,
      lastStatusMessage: statusMessage
    };
    const updated = await updateDiscoveryRecord(
      record,
      "generate_all_progress",
      statusMessage
    );
    record = updated.record;
  }

  const timestamp = new Date().toISOString();
  const approvedFieldStatus = FIELD_DEFINITIONS.reduce((acc, field) => {
    acc[field.key] = { approved: true, approvedAt: timestamp };
    return acc;
  }, {});
  const finalChangeReason = changeReason || "Generated entire document";
  record = {
    ...record,
    approved: true,
    approvedAt: timestamp,
    approvalHistory: [
      {
        timestamp,
        approver: "system"
      }
    ],
    changeReason: finalChangeReason,
    fieldStatus: approvedFieldStatus,
    currentFieldKey: null,
    lastStatusMessage: "Full document generated and approved."
  };

  const finalUpdate = await updateDiscoveryRecord(
    record,
    "generate_all_complete",
    record.lastStatusMessage
  );
  return {
    status: "approved",
    resultType: "updated",
    record: finalUpdate.record,
    savedToSupabase: finalUpdate.savedToSupabase,
    validationStatus: record.lastValidationStatus || null
  };
}

export async function approveDiscoveryDocument(version, approver) {
  const approval = await approveDiscoveryVersion(version, approver);
  return approval.record;
}

async function persistDiscoveryResult(record) {
  if (!SUPABASE_ENABLED) {
    throw new Error("Supabase is required for persistence. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  const version = await computeNextVersion();
  const timestamp = record.timestamp || new Date().toISOString();
  const changeReason = record.changeReason || "Initial discovery draft";

  const persistedRecord = {
    ...record,
    version,
    timestamp,
    changeReason,
    changeLog: [
      {
        version,
        timestamp,
        reason: changeReason,
        stage: "discovery_generation"
      }
    ]
  };

  await supabaseInsertRecord(version, persistedRecord);
  return { version, record: persistedRecord, savedToSupabase: true };
}

async function computeNextVersion() {
  if (!SUPABASE_ENABLED) {
    throw new Error("Supabase is required for persistence. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  const latest = await supabaseFetchLatestRecord();
  const latestVersion = latest?.version ? Number(latest.version) : 0;
  return latestVersion + 1;
}

async function updateDiscoveryRecord(record, stage, reason) {
  if (!SUPABASE_ENABLED) {
    throw new Error("Supabase is required for persistence. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  const timestamp = new Date().toISOString();
  const changeEntry = {
    version: record.version,
    timestamp,
    reason: reason || "Update",
    stage: stage || "discovery_update"
  };

  const updatedRecord = {
    ...record,
    timestamp,
    changeLog: Array.isArray(record.changeLog)
      ? record.changeLog.concat([changeEntry])
      : [changeEntry]
  };

  await supabaseUpdateRecord(record.version, updatedRecord);
  return { record: updatedRecord, savedToSupabase: true };
}

async function approveDiscoveryVersion(version, approver) {
  if (!Number.isFinite(Number(version))) {
    throw new Error("A numeric version is required for approval.");
  }
  const numericVersion = Number(version);
  const record = await loadDiscoveryRecord(numericVersion);
  if (!record) {
    throw new Error(`Discovery document v${numericVersion} was not found.`);
  }

  if (record.approved) {
    return { record, alreadyApproved: true, savedToSupabase: false };
  }

  const timestamp = new Date().toISOString();
  const approvalHistory = Array.isArray(record.approvalHistory)
    ? record.approvalHistory
    : [];
  approvalHistory.push({
    timestamp,
    approver: approver || "system"
  });

  const updatedRecord = {
    ...record,
    approved: true,
    approvedAt: timestamp,
    approvalHistory
  };

  await supabaseUpdateRecord(numericVersion, updatedRecord);
  return { record: updatedRecord, alreadyApproved: false, savedToSupabase: true };
}

async function clearDiscoveryField({ version, fieldKey, approver }) {
  if (!Number.isFinite(Number(version))) {
    throw new Error("A numeric version is required to clear a field.");
  }
  if (!fieldKey) {
    throw new Error("fieldKey is required.");
  }

  const numericVersion = Number(version);
  const record = await loadDiscoveryRecord(numericVersion);
  if (!record) {
    throw new Error(`Discovery document v${numericVersion} was not found.`);
  }

  const fieldStatus = record.fieldStatus || buildFieldStatus();
  const fieldIndex = FIELD_DEFINITIONS.findIndex((field) => field.key === fieldKey);
  if (fieldIndex === -1) {
    throw new Error("Unknown field key.");
  }

  for (let index = fieldIndex; index < FIELD_DEFINITIONS.length; index += 1) {
    const field = FIELD_DEFINITIONS[index];
    fieldStatus[field.key] = { approved: false, approvedAt: null };
    setNestedValue(record.discoveryDocument, field.key, emptyValueForField(field));
  }

  record.fieldStatus = fieldStatus;
  record.currentFieldKey = fieldKey;
  record.approved = false;
  record.approvedAt = null;
  record.lastPrompt = null;
  record.lastPromptFieldKey = null;
  record.lastOutput = null;
  record.lastOutputFieldKey = null;

  const fieldApprovalHistory = Array.isArray(record.fieldApprovalHistory)
    ? record.fieldApprovalHistory
    : [];
  fieldApprovalHistory.push({
    fieldKey,
    timestamp: new Date().toISOString(),
    approver: approver || "system",
    action: "clear"
  });
  record.fieldApprovalHistory = fieldApprovalHistory;

  const { record: updatedRecord, savedToSupabase } = await updateDiscoveryRecord(
    record,
    "field_clear",
    `Cleared ${fieldKey}`
  );

  return { record: updatedRecord, savedToSupabase };
}

async function clearDiscoveryDocument(version, approver) {
  if (!Number.isFinite(Number(version))) {
    throw new Error("A numeric version is required to clear a document.");
  }
  const numericVersion = Number(version);
  const record = await loadDiscoveryRecord(numericVersion);
  if (!record) {
    throw new Error(`Discovery document v${numericVersion} was not found.`);
  }

  const emptyDocument = buildEmptyDocument();
  const fieldStatus = buildFieldStatus();
  const firstField = FIELD_DEFINITIONS[0];

  const updatedRecord = {
    ...record,
    discoveryDocument: emptyDocument,
    fieldStatus,
    currentFieldKey: firstField ? firstField.key : null,
    approved: false,
    approvedAt: null,
    fieldApprovalHistory: [],
    approvalHistory: [],
    changeReason: "Cleared document",
    lastPrompt: null,
    lastPromptFieldKey: null,
    lastOutput: null,
    lastOutputFieldKey: null
  };

  const { record: persisted } = await updateDiscoveryRecord(
    updatedRecord,
    "document_clear",
    "Cleared document"
  );

  return persisted;
}

async function approveDiscoveryField({
  version,
  fieldKey,
  value,
  approver
}) {
  if (!Number.isFinite(Number(version))) {
    throw new Error("A numeric version is required for approval.");
  }
  if (!fieldKey) {
    throw new Error("fieldKey is required.");
  }

  const numericVersion = Number(version);
  const record = await loadDiscoveryRecord(numericVersion);
  if (!record) {
    throw new Error(`Discovery document v${numericVersion} was not found.`);
  }

  const fieldStatus = record.fieldStatus || buildFieldStatus();
  const currentFieldKey = record.currentFieldKey;
  if (currentFieldKey && fieldKey !== currentFieldKey) {
    throw new Error("You must approve the current field before moving on.");
  }
  if (fieldStatus[fieldKey]?.approved) {
    throw new Error("This field is already approved.");
  }

  setNestedValue(record.discoveryDocument, fieldKey, value);
  fieldStatus[fieldKey] = {
    approved: true,
    approvedAt: new Date().toISOString()
  };

  const fieldApprovalHistory = Array.isArray(record.fieldApprovalHistory)
    ? record.fieldApprovalHistory
    : [];
  fieldApprovalHistory.push({
    fieldKey,
    timestamp: fieldStatus[fieldKey].approvedAt,
    approver: approver || "system"
  });

  record.fieldStatus = fieldStatus;
  record.fieldApprovalHistory = fieldApprovalHistory;

  const nextField = getNextFieldDefinition(fieldStatus);
  if (nextField) {
    const {
      value: nextValue,
      prompt,
      rawText,
      validationStatus
    } = await generateFieldValueWithOutput({
      field: nextField,
      productIdea: record.productIdea,
      targetUser: record.targetUser,
      userNotes: record.userMessages || [],
      currentDocument: record.discoveryDocument,
      fieldStatus
    });
    setNestedValue(record.discoveryDocument, nextField.key, nextValue);
    record.lastStatusMessage = `${getFieldLabel(nextField.key)} created. Review and approve.`;
    record.lastPrompt = prompt;
    record.lastPromptFieldKey = nextField.key;
    record.lastOutput = rawText;
    record.lastOutputFieldKey = nextField.key;
    record.lastValidationStatus = validationStatus || null;
    record.currentFieldKey = nextField.key;
    record.approved = false;
  } else {
    record.currentFieldKey = null;
    record.approved = true;
    record.approvedAt = new Date().toISOString();
    record.lastStatusMessage = "All fields approved. Discovery document is complete.";
  }

  const { record: updatedRecord, savedToSupabase } = await updateDiscoveryRecord(
    record,
    "field_approval",
    record.lastStatusMessage || `Approved ${fieldKey}`
  );

  return {
    record: updatedRecord,
    savedToSupabase,
    validationStatus: record.lastValidationStatus || null
  };
}

async function regenerateDiscoveryField({
  version,
  fieldKey,
  approver
}) {
  if (!Number.isFinite(Number(version))) {
    throw new Error("A numeric version is required for regeneration.");
  }
  if (!fieldKey) {
    throw new Error("fieldKey is required.");
  }

  const numericVersion = Number(version);
  const record = await loadDiscoveryRecord(numericVersion);
  if (!record) {
    throw new Error(`Discovery document v${numericVersion} was not found.`);
  }

  const fieldStatus = record.fieldStatus || buildFieldStatus();
  const fieldIndex = FIELD_DEFINITIONS.findIndex((field) => field.key === fieldKey);
  if (fieldIndex === -1) {
    throw new Error("Unknown field key.");
  }

  for (let index = fieldIndex; index < FIELD_DEFINITIONS.length; index += 1) {
    const field = FIELD_DEFINITIONS[index];
    fieldStatus[field.key] = { approved: false, approvedAt: null };
    setNestedValue(record.discoveryDocument, field.key, emptyValueForField(field));
  }

  record.fieldStatus = fieldStatus;
  record.currentFieldKey = fieldKey;

  const field = FIELD_DEFINITIONS[fieldIndex];
  const {
    value: nextValue,
    prompt,
    rawText,
    validationStatus
  } = await generateFieldValueWithOutput({
    field,
    productIdea: record.productIdea,
    targetUser: record.targetUser,
    userNotes: record.userMessages || [],
    currentDocument: record.discoveryDocument,
    fieldStatus
  });
  setNestedValue(record.discoveryDocument, field.key, nextValue);
  record.lastStatusMessage = `${getFieldLabel(field.key)} regenerated. Review and approve.`;
  record.lastPrompt = prompt;
  record.lastPromptFieldKey = field.key;
  record.lastOutput = rawText;
  record.lastOutputFieldKey = field.key;
  record.lastValidationStatus = validationStatus || null;

  const fieldApprovalHistory = Array.isArray(record.fieldApprovalHistory)
    ? record.fieldApprovalHistory
    : [];
  fieldApprovalHistory.push({
    fieldKey,
    timestamp: new Date().toISOString(),
    approver: approver || "system",
    action: "regenerate"
  });
  record.fieldApprovalHistory = fieldApprovalHistory;

  const { record: updatedRecord, savedToSupabase } = await updateDiscoveryRecord(
    record,
    "field_regenerate",
    record.lastStatusMessage || `Regenerated ${fieldKey}`
  );

  return {
    record: updatedRecord,
    savedToSupabase,
    validationStatus: record.lastValidationStatus || null
  };
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let payload = "";
    req.on("data", (chunk) => {
      payload += chunk;
    });
    req.on("end", () => {
      try {
        resolve(payload ? JSON.parse(payload) : {});
      } catch (error) {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    applyCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && req.url?.startsWith("/discovery/export/markdown")) {
      applyCorsHeaders(res);
      const parsedUrl = new URL(req.url, "http://127.0.0.1");
      const versionParam = parsedUrl.searchParams.get("version");
      const record = await getExportRecord(versionParam);
      const markdown = renderDiscoveryMarkdown(record.discoveryDocument || {});
      const filename = `discovery-document-v${record.version}.md`;
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.writeHead(200);
      res.end(markdown);
      return;
    }

    if (req.method === "GET" && req.url?.startsWith("/discovery/export/pdf")) {
      applyCorsHeaders(res);
      const parsedUrl = new URL(req.url, "http://127.0.0.1");
      const versionParam = parsedUrl.searchParams.get("version");
      const record = await getExportRecord(versionParam);
      const markdown = renderDiscoveryMarkdown(record.discoveryDocument || {});
      const html = renderDiscoveryHtml(markdown);
      const pdfBuffer = await renderPdfFromHtml(html);
      const filename = `discovery-document-v${record.version}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.writeHead(200);
      res.end(pdfBuffer);
      return;
    }

    if (req.method === "POST" && req.url === "/discovery") {
      const body = await parseRequestBody(req);
      const result = await runDiscoveryWorkflow(body);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && req.url === "/discovery/generate-all") {
      const body = await parseRequestBody(req);
      const shouldAbort = createAbortSignal(req);
      const result = await generateEntireDiscoveryDocument(body, shouldAbort);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && req.url === "/discovery/random-inputs") {
      const body = await parseRequestBody(req);
      const result = await generateRandomInputs(body);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && req.url === "/discovery/field/approve") {
      const body = await parseRequestBody(req);
      const result = await approveDiscoveryField({
        version: body.version,
        fieldKey: body.fieldKey,
        value: body.value,
        approver: body.approver
      });
      sendJson(res, 200, {
        status: result.record.approved ? "approved" : "in_progress",
        record: result.record,
        savedToSupabase: result.savedToSupabase,
        validationStatus: result.validationStatus || null
      });
      return;
    }

    if (req.method === "POST" && req.url === "/discovery/field/regenerate") {
      const body = await parseRequestBody(req);
      const result = await regenerateDiscoveryField({
        version: body.version,
        fieldKey: body.fieldKey,
        approver: body.approver
      });
      sendJson(res, 200, {
        status: "in_progress",
        record: result.record,
        savedToSupabase: result.savedToSupabase,
        validationStatus: result.validationStatus || null
      });
      return;
    }

    if (req.method === "POST" && req.url === "/discovery/field/clear") {
      const body = await parseRequestBody(req);
      const result = await clearDiscoveryField({
        version: body.version,
        fieldKey: body.fieldKey,
        approver: body.approver
      });
      sendJson(res, 200, {
        status: "in_progress",
        record: result.record,
        savedToSupabase: result.savedToSupabase
      });
      return;
    }

    if (req.method === "POST" && req.url === "/discovery/approve") {
      const body = await parseRequestBody(req);
      const approval = await approveDiscoveryVersion(body.version, body.approver);
      sendJson(res, 200, {
        status: "approved",
        version: approval.record.version,
        approved: approval.record.approved,
        timestamp: approval.record.approvedAt,
        discoveryDocument: approval.record.discoveryDocument,
        savedToSupabase: approval.savedToSupabase
      });
      return;
    }

    if (req.method === "POST" && req.url === "/discovery/clear") {
      const body = await parseRequestBody(req);
      const updatedRecord = await clearDiscoveryDocument(body.version, body.approver);
      sendJson(res, 200, {
        status: "in_progress",
        record: updatedRecord
      });
      return;
    }

    if (req.method === "GET" && req.url === "/discovery/latest") {
      const latest = await getLatestRecord();
      if (!latest) {
        sendJson(res, 404, {
          status: "not_found",
          message: "No discovery document exists yet."
        });
        return;
      }
      sendJson(res, 200, {
        status: latest.approved ? "approved" : "in_progress",
        record: latest
      });
      return;
    }
  } catch (error) {
    const payload = {
      status: "error",
      message: error.message
    };
    if (error.lastPrompt) {
      payload.lastPrompt = error.lastPrompt;
    }
    if (typeof error.lastOutput === "string") {
      payload.lastOutput = error.lastOutput;
    }
    if (error.lastOutputFieldKey) {
      payload.lastOutputFieldKey = error.lastOutputFieldKey;
    }
    sendJson(res, 400, payload);
    return;
  }

  sendJson(res, 200, {
    status: "ok",
    message:
      "POST /discovery with { productIdea, targetUser, userMessages?, changeReason? } to run the agent.",
    timestamp: new Date().toISOString()
  });
});

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (!(process.env.SKIP_SERVER === "true" || !isMainModule)) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Agentic orchestrator running on http://0.0.0.0:${PORT}`);
  });
}
