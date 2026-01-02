import http from "http";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createLlmService } from "./services/llm.js";
import { createExportService } from "./services/export.js";
import { createGenerationService } from "./services/generation.js";
import { createRandomService } from "./services/random.js";
import { createValidationService } from "./services/validation.js";
import { createDocumentRegistry } from "./services/documents.js";
import { createStorageService } from "./services/storage.js";
import { createWorkflowService } from "./services/workflow.js";
import { createDiscoveryRouter } from "./routes/discovery.js";
import { applyCorsHeaders, sendJson, parseRequestBody } from "./utils/http.js";
import { z } from "zod";
import { agent as discoveryGraph } from "./graph-core.js";
import { createPromptService } from "./services/prompts.js";

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
const PROMPTS_ROOT_DIR = (() => {
  const envBase = process.env.KNOWLEDGE_BASE_DIR;
  if (envBase) {
    return path.join(envBase, "prompts");
  }
  const dockerPath = path.join(path.sep, "knowledge-base", "prompts");
  if (fsSync.existsSync(dockerPath)) {
    return dockerPath;
  }
  return path.join(__dirname, "..", "..", "knowledge-base", "prompts");
})();
const GLOSSARY_DIR = (() => {
  const envBase = process.env.KNOWLEDGE_BASE_DIR;
  if (envBase) {
    return path.join(envBase, "glossary");
  }
  const dockerPath = path.join(path.sep, "knowledge-base", "glossary");
  if (fsSync.existsSync(dockerPath)) {
    return dockerPath;
  }
  return path.join(__dirname, "..", "..", "knowledge-base", "glossary");
})();
const documentRegistry = createDocumentRegistry({
  promptsRootDir: PROMPTS_ROOT_DIR
});
const DISCOVERY_DOCUMENT = documentRegistry.getDocumentConfig("discovery");
const PROMPTS_DIR = DISCOVERY_DOCUMENT?.promptsDir;
if (!PROMPTS_DIR) {
  throw new Error("Discovery document prompts directory is missing.");
}
const PRODUCT_MANAGER_DIR = (() => {
  return path.join(
    PROMPTS_ROOT_DIR,
    "agents",
    "pm-product-manager"
  );
})();
const OTHER_PROMPTS_DIR = (() => {
  return path.join(
    PROMPTS_ROOT_DIR,
    "documents",
    "1-discovery-document",
    "service"
  );
})();
const llmService = createLlmService({
  modelName: OLLAMA_MODEL,
  temperature: 0.2,
  keepAlive: "2m",
  format: "json",
  mockDiscovery: process.env.MOCK_DISCOVERY === "true"
});

const FIELD_DEFINITIONS = [
  {
    key: "problemUnderstanding.problemStatement",
    section: "problem-statement",
    type: "string",
    label: "Problem Statement"
  },
  {
    key: "problemUnderstanding.targetUsersSegments",
    section: "target-users-segments",
    type: "object",
    outputKey: "target_segments",
    wrapOutputKey: true,
    label: "Target Users & Segments"
  },
  {
    key: "problemUnderstanding.userPainPoints",
    section: "user-pain-points",
    type: "object",
    outputKey: "pain_point_themes",
    wrapOutputKey: true,
    label: "User Pain Points"
  },
  {
    key: "problemUnderstanding.contextConstraints",
    section: "context-constraints",
    type: "object",
    label: "Context & Constraints"
  },
  {
    key: "marketAndCompetitorAnalysis.marketLandscape",
    section: "market-landscape",
    type: "object",
    label: "Market Landscape"
  },
  {
    key: "marketAndCompetitorAnalysis.competitorInventory",
    section: "competitor-inventory",
    type: "object",
    label: "Competitor Inventory"
  },
  {
    key: "marketAndCompetitorAnalysis.competitorCapabilities",
    section: "competitor-capabilities",
    type: "object",
    label: "Competitor Capabilities"
  },
  {
    key: "marketAndCompetitorAnalysis.gapsOpportunities",
    section: "gaps-opportunities",
    type: "object",
    outputKey: "gaps_and_opportunities",
    wrapOutputKey: true,
    label: "Gaps & Opportunities"
  },
  {
    key: "opportunityDefinition.opportunityStatement",
    section: "opportunity-statement",
    type: "object",
    outputKey: "opportunity_statement",
    wrapOutputKey: true,
    label: "Opportunity Statement"
  },
  {
    key: "opportunityDefinition.valueDrivers",
    section: "value-drivers",
    type: "object",
    outputKey: "value_drivers",
    wrapOutputKey: true,
    label: "Value Drivers"
  },
  {
    key: "opportunityDefinition.marketFitHypothesis",
    section: "market-fit-hypothesis",
    type: "object",
    outputKey: "market_fit_hypothesis",
    wrapOutputKey: true,
    label: "Market Fit Hypothesis"
  },
  {
    key: "opportunityDefinition.feasibilityAssessment",
    section: "feasibility-assessment",
    type: "object",
    outputKey: "feasibility_assessment",
    wrapOutputKey: true,
    label: "Feasibility Assessment"
  }
];

const emptyMarketLandscape = {
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

const emptyCompetitorInventory = {
  competitors: []
};

const emptyCompetitorCapabilities = {
  competitor_capabilities: [],
  industry_capability_patterns: []
};

const emptyGapsOpportunities = {
  gaps_and_opportunities: {
    functional: [],
    technical: [],
    business: []
  }
};

const emptyDocument = {
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

function emptyValueForField(field) {
  if (field.type === "string") {
    return "";
  }
  if (field.type === "array") {
    return [];
  }
  if (field.key === "problemUnderstanding.contextConstraints") {
    return { contextual_factors: [], constraints: [] };
  }
  if (field.key === "marketAndCompetitorAnalysis.marketLandscape") {
    return emptyMarketLandscape;
  }
  if (field.key === "marketAndCompetitorAnalysis.competitorInventory") {
    return emptyCompetitorInventory;
  }
  if (field.key === "marketAndCompetitorAnalysis.competitorCapabilities") {
    return emptyCompetitorCapabilities;
  }
  if (field.key === "marketAndCompetitorAnalysis.gapsOpportunities") {
    return emptyGapsOpportunities;
  }
  if (field.key === "opportunityDefinition.opportunityStatement") {
    return { opportunity_statement: "" };
  }
  if (field.key === "opportunityDefinition.valueDrivers") {
    return { value_drivers: [] };
  }
  if (field.key === "opportunityDefinition.marketFitHypothesis") {
    return { market_fit_hypothesis: { desirability: [], viability: [] } };
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
  return {};
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

async function loadGlossary() {
  const entries = await fs.readdir(GLOSSARY_DIR);
  const jsonFiles = entries.filter(
    (name) => name.startsWith("glossary.") && name.endsWith(".json")
  );
  const glossarySets = await Promise.all(
    jsonFiles.map(async (file) => {
      const raw = await fs.readFile(path.join(GLOSSARY_DIR, file), "utf8");
      return JSON.parse(raw);
    })
  );
  const domains = [];
  const terms = [];
  glossarySets.forEach((entry) => {
    if (Array.isArray(entry.domains)) {
      domains.push(...entry.domains);
    }
    if (Array.isArray(entry.terms)) {
      terms.push(...entry.terms);
    }
  });
  return {
    domains,
    terms,
    sources: jsonFiles
  };
}

const promptService = createPromptService({
  promptsDir: PROMPTS_DIR,
  productManagerDir: PRODUCT_MANAGER_DIR,
  fieldDefinitions: FIELD_DEFINITIONS,
  getNestedValue,
  buildApprovedDocument
});
const validationService = createValidationService({ getNestedValue });
const storageService = createStorageService({
  supabaseUrl: SUPABASE_URL,
  supabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  supabaseTable: SUPABASE_TABLE
});
const generationService = createGenerationService({
  promptService,
  validationService,
  llmService,
  getNestedValue,
  buildApprovedDocument,
  emptyValueForField
});
const randomService = createRandomService({
  llmService,
  otherPromptsDir: OTHER_PROMPTS_DIR,
  domains: [
    "Education & learning",
    "Healthcare & wellbeing",
    "Finance & personal money",
    "Climate & environment",
    "Entertainment & media",
    "Work & collaboration",
    "Civic life & public services"
  ],
  maxRecentIdeas: 5
});


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

const exportService = createExportService({
  exportStructure: EXPORT_STRUCTURE,
  getNestedValue,
  storageService
});
const {
  renderDiscoveryMarkdown,
  renderDiscoveryHtml,
  renderPdfFromHtml,
  getExportRecord
} = exportService;

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

const { generateFieldValueWithOutput } = generationService;
const { generateRandomInputs } = randomService;

const workflowService = createWorkflowService({
  storageService,
  validationService,
  fieldDefinitions: FIELD_DEFINITIONS,
  requiredFields: REQUIRED_FIELDS,
  emptyDocument,
  emptyValueForField,
  buildFieldStatus,
  buildApprovedDocument,
  setNestedValue,
  getNestedValue,
  generateFieldValueWithOutput,
  normalizeUserMessages
});

  const {
    runDiscoveryWorkflow,
    generateEntireDiscoveryDocument,
    approveDiscoveryVersion,
    approveDiscoveryField,
    regenerateDiscoveryField,
    saveDiscoveryDocument,
    clearDiscoveryField,
    clearDiscoveryDocument
  } = workflowService;

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
const handleDiscoveryRoutes = createDiscoveryRouter({
  applyCorsHeaders,
  parseRequestBody,
  sendJson,
  createAbortSignal,
  getExportRecord,
  renderDiscoveryMarkdown,
  renderDiscoveryHtml,
  renderPdfFromHtml,
    runDiscoveryWorkflow,
    generateEntireDiscoveryDocument,
    generateRandomInputs,
    approveDiscoveryField,
    regenerateDiscoveryField,
    saveDiscoveryDocument,
    clearDiscoveryField,
    approveDiscoveryVersion,
    clearDiscoveryDocument,
    getLatestRecord: storageService.getLatestRecord,
    getGlossary: loadGlossary
  });

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    applyCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const handled = await handleDiscoveryRoutes(req, res);
    if (handled) {
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
