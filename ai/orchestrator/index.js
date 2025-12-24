import http from "http";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";
import fetch from "node-fetch";

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
const OUTPUT_DIR = path.join(__dirname, "output");
const HISTORY_FILE = path.join(OUTPUT_DIR, "history.json");
const PROMPTS_DIR = path.join(
  __dirname,
  "..",
  "..",
  "knowledge-base",
  "prompts",
  "product-manager"
);

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
    type: "array"
  },
  {
    key: "marketAndCompetitorAnalysis.marketLandscape",
    section: "market-landscape",
    type: "array"
  },
  {
    key: "marketAndCompetitorAnalysis.competitorInventory",
    section: "competitor-inventory",
    type: "array"
  },
  {
    key: "marketAndCompetitorAnalysis.competitorCapabilities",
    section: "competitor-capabilities",
    type: "array"
  },
  {
    key: "marketAndCompetitorAnalysis.gapsOpportunities",
    section: "gaps-opportunities",
    type: "array"
  },
  {
    key: "opportunityDefinition.opportunityStatement",
    section: "opportunity-statement",
    type: "string"
  },
  {
    key: "opportunityDefinition.valueDrivers",
    section: "value-drivers",
    type: "array"
  },
  {
    key: "opportunityDefinition.marketFitHypothesis",
    section: "market-fit-hypothesis",
    type: "array"
  },
  {
    key: "opportunityDefinition.feasibilityAssessment",
    section: "feasibility-assessment",
    type: "array"
  }
];

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

const combineStringArrays = (left, right) => {
  if (!right) return left;
  if (Array.isArray(right)) {
    return left.concat(right.filter(Boolean));
  }
  return left.concat([right]);
};

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

const recordFilePath = (version) =>
  path.join(OUTPUT_DIR, `discovery-doc-v${version}.json`);

async function readJsonFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

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
  if (SUPABASE_ENABLED) {
    const supabaseRecord = await supabaseFetchLatestRecord();
    if (supabaseRecord) {
      return supabaseRecord;
    }
  }
  try {
    const entries = await fs.readdir(OUTPUT_DIR);
    const versions = entries
      .map((file) => {
        const match = file.match(/discovery-doc-v(\d+)\.json$/);
        return match ? Number(match[1]) : undefined;
      })
      .filter((value) => Number.isFinite(value));
    if (!versions.length) {
      return null;
    }
    const latestVersion = Math.max(...versions);
    const latestRecord = await readJsonFile(recordFilePath(latestVersion));
    return latestRecord
      ? {
          ...latestRecord,
          version: latestVersion,
          filePath: recordFilePath(latestVersion)
        }
      : null;
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function loadDiscoveryRecord(version) {
  if (SUPABASE_ENABLED) {
    const supabaseRecord = await supabaseFetchRecordByVersion(version);
    if (supabaseRecord) {
      return supabaseRecord;
    }
  }
  return readJsonFile(recordFilePath(version));
}

async function appendHistoryEntry(entry) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  let history = [];
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf8");
    history = JSON.parse(raw);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  history.push(entry);
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), "utf8");
  return history;
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
      contextConstraints: []
    },
    marketAndCompetitorAnalysis: {
      marketLandscape: [],
      competitorInventory: [],
      competitorCapabilities: [],
      gapsOpportunities: []
    },
    opportunityDefinition: {
      opportunityStatement: "",
      valueDrivers: [],
      marketFitHypothesis: [],
      feasibilityAssessment: []
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
  const promptAssets = await getDiscoveryPromptAssets();
  const sectionPrompt = promptAssets.sectionPromptMap[field.section] || "";
  const sectionSchema = promptAssets.sectionSchemaMap[field.section] || "";

  const messages = [
    {
      role: "system",
      content: promptAssets.systemPrompt
    },
    {
      role: "user",
      content: buildFieldPrompt({
        productIdea,
        targetUser,
        userNotes,
        outputRules: promptAssets.outputRules,
        sectionPrompt,
        sectionSchema,
        finalSchema: promptAssets.finalSchema,
        currentDocument,
        fieldKey: field.key,
        fieldOutputKey: field.outputKey
      })
    }
  ];

  const model = getChatModel();
  if (!model) {
    if (process.env.MOCK_DISCOVERY === "true") {
      return buildFallbackFieldValue(field);
    }
    throw new Error("Ollama is not available. Start Ollama and retry.");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await model.invoke(messages);
      const fieldName = field.key.split(".").pop();
      try {
        const parsed = tryParseDiscoveryResponse(response);
        if (field.outputKey && typeof parsed?.[field.outputKey] !== "undefined") {
          if (field.wrapOutputKey) {
            return { [field.outputKey]: parsed[field.outputKey] };
          }
          return parsed[field.outputKey];
        }
        if (fieldName && typeof parsed?.[fieldName] !== "undefined") {
          return parsed[fieldName];
        }
        const nested = getNestedValue(parsed, field.key);
        if (typeof nested !== "undefined") {
          return nested;
        }
      } catch (parseError) {
        const rawText = extractTextFromResponse(response);
        if (rawText) {
          return normalizeRawFieldValue(rawText, field.type);
        }
      }
    } catch (error) {
      console.warn(`Discovery field ${field.key} attempt ${attempt + 1} failed`, error);
    }
  }

  throw new Error(`LLM output invalid for field ${field.key}.`);
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

function buildFallbackFieldValue(field) {
  if (field.type === "string") {
    return "Draft content needs review.";
  }
  return ["Draft item needs review."];
}

async function getDiscoveryPromptAssets() {
  if (promptCache && Array.isArray(promptCache.sectionSchemas)) {
    return promptCache;
  }

  const systemPrompt = await readPromptFile("product-manager-system-prompt.md");
  const outputRules = await readPromptFile("document-output-rules.md");
  const finalSchema = await readPromptFile("discovery-document-schema.json");

  const sectionPrompts = [];
  const sectionSchemas = [];
  const sectionPromptMap = {};
  const sectionSchemaMap = {};
  for (const definition of FIELD_DEFINITIONS) {
    const section = definition.section;
    const promptPath = path.join("sections", `${section}.prompt.md`);
    const promptContent = await readPromptFile(promptPath);
    if (promptContent) {
      sectionPrompts.push(`Section: ${section}\n${promptContent}`);
      sectionPromptMap[section] = promptContent;
    }
    const schemaPath = path.join("sections", `${section}.schema.json`);
    const schemaContent = await readPromptFile(schemaPath);
    if (schemaContent) {
      sectionSchemas.push(`Section: ${section}\n${schemaContent}`);
      sectionSchemaMap[section] = schemaContent;
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
    sectionSchemaMap
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

function renderTemplate(template, values) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : "";
  });
}

const DiscoveryState = Annotation.Root({
  productIdea: Annotation(),
  targetUser: Annotation(),
  userMessages: Annotation({
    reducer: combineStringArrays,
    default: () => []
  }),
  currentStage: Annotation(),
  decisions: Annotation({
    reducer: combineStringArrays,
    default: () => []
  }),
  openQuestions: Annotation({
    reducer: combineStringArrays,
    default: () => []
  }),
  pendingQuestions: Annotation({
    reducer: combineStringArrays,
    default: () => []
  }),
  discoveryDocument: Annotation(),
  approvalStatus: Annotation()
});

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
        contextConstraints: z.array(z.string().min(3)).nonempty()
      })
      .strict(),
    marketAndCompetitorAnalysis: z
      .object({
        marketLandscape: z.array(z.string().min(3)).nonempty(),
        competitorInventory: z.array(z.string().min(3)).nonempty(),
        competitorCapabilities: z.array(z.string().min(3)).nonempty(),
        gapsOpportunities: z.array(z.string().min(3)).nonempty()
      })
      .strict(),
    opportunityDefinition: z
      .object({
        opportunityStatement: z.string().min(20),
        valueDrivers: z.array(z.string().min(3)).nonempty(),
        marketFitHypothesis: z.array(z.string().min(3)).nonempty(),
        feasibilityAssessment: z.array(z.string().min(3)).nonempty()
      })
      .strict()
  })
  .strict();

const discoveryGraph = buildDiscoveryGraph();
let chatInstance;
let promptCache;

function buildDiscoveryGraph() {
  const builder = new StateGraph(DiscoveryState)
    .addNode("orchestrator", orchestratorNode)
    .addNode("discovery_agent", discoveryAgentNode)
    .addEdge("__start__", "orchestrator")
    .addConditionalEdges("orchestrator", shouldRunDiscovery, {
      generate: "discovery_agent",
      finished: "__end__"
    })
    .addEdge("discovery_agent", "__end__");

  return builder.compile();
}

function shouldRunDiscovery(state) {
  return state.discoveryDocument ? "finished" : "generate";
}

async function orchestratorNode(state) {
  if (!state.productIdea) {
    throw new Error("Product idea is required before running discovery.");
  }

  return {
    currentStage: state.discoveryDocument ? "complete" : "discovery_planning"
  };
}

async function discoveryAgentNode(state) {
  const discoveryDocument = await produceDiscoveryDocument({
    productIdea: state.productIdea,
    targetUser: state.targetUser,
    userMessages: state.userMessages
  });

  return {
    discoveryDocument,
    targetUser: state.targetUser,
    decisions: [
      `Discovery document drafted at ${new Date().toISOString()}`
    ]
  };
}

async function produceDiscoveryDocument({ productIdea, targetUser, userMessages }) {
  const emptyDocument = buildEmptyDocument();
  const firstField = FIELD_DEFINITIONS[0];
  if (!firstField) {
    throw new Error("No discovery fields configured.");
  }

  const firstValue = await generateFieldValue({
    field: firstField,
    productIdea,
    targetUser,
    userNotes: userMessages,
    currentDocument: emptyDocument
  });
  setNestedValue(emptyDocument, firstField.key, firstValue);
  return emptyDocument;
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
  productIdea,
  targetUser,
  userNotes,
  outputRules,
  sectionPrompt,
  sectionSchema,
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
  const documentBlock = currentDocument
    ? `Current document (JSON):\n${JSON.stringify(currentDocument, null, 2)}`
    : "Current document: none.";
  const schemaBlock = sectionSchema
    ? `Section schema:\n${sectionSchema}`
    : "Section schema: missing.";
  const finalSchemaBlock = finalSchema
    ? `Final JSON schema:\n${finalSchema}`
    : "Final JSON schema: missing.";

  const exampleJson = outputKey
    ? `Example JSON:\n{"${outputKey}":"..."}`
    : "";

  const prompt = [
    `Product idea: ${productIdea}`,
    `Target user: ${targetUser || "Not provided"}`,
    notesBlock,
    outputRules ? `Output rules:\n${outputRules}` : "",
    `Return JSON with only this key: ${outputKey}.`,
    exampleJson,
    "Section prompt:",
    sectionPrompt || "Section prompt missing.",
    schemaBlock,
    finalSchemaBlock,
    documentBlock
  ]
    .filter(Boolean)
    .join("\n\n");

  return renderTemplate(prompt, {
    productIdea,
    targetUser,
    userNotes: safeNotes.length ? `- ${safeNotes.join("\n- ")}` : "none",
    problemStatement:
      getNestedValue(currentDocument, "problemUnderstanding.problemStatement") || ""
  });
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
      contextConstraints: [
        "Time constraints for delivery",
        "Budget and staffing limits",
        "Data availability and quality"
      ]
    },
    marketAndCompetitorAnalysis: {
      marketLandscape: [
        "Market is fragmented with manual discovery workflows",
        "Teams rely on documents and spreadsheets",
        "Buyers seek faster alignment"
      ],
      competitorInventory: [
        "Document templates",
        "Product management suites",
        "Internal tools"
      ],
      competitorCapabilities: [
        "Capture requirements",
        "Track approvals",
        "Share documents"
      ],
      gapsOpportunities: [
        "Lack of AI-driven draft generation",
        "Limited focus on discovery outcomes",
        "Poor visibility into open questions"
      ]
    },
    opportunityDefinition: {
      opportunityStatement:
        "Provide a clear, structured discovery draft that accelerates alignment and decision-making.",
      valueDrivers: [
        "Speed of creating the first draft",
        "Shared understanding across stakeholders",
        "Clear next-step readiness"
      ],
      marketFitHypothesis: [
        "Teams will adopt the tool if it reduces discovery time by 50%",
        "Stakeholders will approve faster with clearer summaries"
      ],
      feasibilityAssessment: [
        "LLM can generate the first draft from minimal input",
        "Data storage and approval tracking are straightforward"
      ]
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
    fieldApprovalHistory: []
  };

  const persisted = await persistDiscoveryResult(record);
  return {
    status: "in_progress",
    resultType: "created",
    record: persisted.record,
    savedToSupabase: persisted.savedToSupabase
  };
}

export async function approveDiscoveryDocument(version, approver) {
  const approval = await approveDiscoveryVersion(version, approver);
  return approval.record;
}

async function persistDiscoveryResult(record) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const version = await computeNextVersion();
  const timestamp = record.timestamp || new Date().toISOString();
  const filePath = recordFilePath(version);
  const changeReason = record.changeReason || "Initial discovery draft";
  let savedToSupabase = false;

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

  await fs.writeFile(filePath, JSON.stringify(persistedRecord, null, 2), "utf8");
  await fs.writeFile(
    path.join(OUTPUT_DIR, `discovery-doc-v${version}.md`),
    buildMarkdownDocument(persistedRecord),
    "utf8"
  );
  await appendHistoryEntry({
    version,
    timestamp,
    reason: changeReason,
    stage: "discovery_generation"
  });
  if (SUPABASE_ENABLED) {
    try {
      await supabaseInsertRecord(version, persistedRecord);
      savedToSupabase = true;
    } catch (error) {
      console.warn("Supabase insert failed", error);
    }
  }
  return { version, filePath, record: persistedRecord, savedToSupabase };
}

async function computeNextVersion() {
  if (SUPABASE_ENABLED) {
    const latest = await supabaseFetchLatestRecord();
    const latestVersion = latest?.version ? Number(latest.version) : 0;
    return latestVersion + 1;
  }
  try {
    const entries = await fs.readdir(OUTPUT_DIR);
    const versions = entries
      .map((file) => {
        const match = file.match(/discovery-doc-v(\d+)\.json$/);
        return match ? Number(match[1]) : 0;
      })
      .filter((num) => Number.isFinite(num));
    const maxVersion = versions.length ? Math.max(...versions) : 0;
    return maxVersion + 1;
  } catch (error) {
    if (error.code === "ENOENT") {
      return 1;
    }
    throw error;
  }
}

async function updateDiscoveryRecord(record, stage, reason) {
  const filePath = recordFilePath(record.version);
  const timestamp = new Date().toISOString();
  const changeEntry = {
    version: record.version,
    timestamp,
    reason: reason || "Update",
    stage: stage || "discovery_update"
  };
  let savedToSupabase = false;

  const updatedRecord = {
    ...record,
    timestamp,
    changeLog: Array.isArray(record.changeLog)
      ? record.changeLog.concat([changeEntry])
      : [changeEntry]
  };

  await fs.writeFile(filePath, JSON.stringify(updatedRecord, null, 2), "utf8");
  await fs.writeFile(
    path.join(OUTPUT_DIR, `discovery-doc-v${record.version}.md`),
    buildMarkdownDocument(updatedRecord),
    "utf8"
  );
  await appendHistoryEntry(changeEntry);
  if (SUPABASE_ENABLED) {
    try {
      await supabaseUpdateRecord(record.version, updatedRecord);
      savedToSupabase = true;
    } catch (error) {
      console.warn("Supabase update failed", error);
    }
  }

  return { record: updatedRecord, savedToSupabase };
}

async function approveDiscoveryVersion(version, approver) {
  if (!Number.isFinite(Number(version))) {
    throw new Error("A numeric version is required for approval.");
  }
  const numericVersion = Number(version);
  const filePath = recordFilePath(numericVersion);
  const record = await loadDiscoveryRecord(numericVersion);
  if (!record) {
    throw new Error(`Discovery document v${numericVersion} was not found.`);
  }

  if (record.approved) {
    return { record, filePath, alreadyApproved: true, savedToSupabase: false };
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

  await fs.writeFile(filePath, JSON.stringify(updatedRecord, null, 2), "utf8");
  let savedToSupabase = false;
  if (SUPABASE_ENABLED) {
    try {
      await supabaseUpdateRecord(numericVersion, updatedRecord);
      savedToSupabase = true;
    } catch (error) {
      console.warn("Supabase update failed", error);
    }
  }
  return { record: updatedRecord, filePath, alreadyApproved: false, savedToSupabase };
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
    const nextValue = await generateFieldValue({
      field: nextField,
      productIdea: record.productIdea,
      targetUser: record.targetUser,
      userNotes: record.userMessages || [],
      currentDocument: record.discoveryDocument
    });
    setNestedValue(record.discoveryDocument, nextField.key, nextValue);
    record.currentFieldKey = nextField.key;
    record.approved = false;
  } else {
    record.currentFieldKey = null;
    record.approved = true;
    record.approvedAt = new Date().toISOString();
  }

  const { record: updatedRecord, savedToSupabase } = await updateDiscoveryRecord(
    record,
    "field_approval",
    `Approved ${fieldKey}`
  );

  return { record: updatedRecord, savedToSupabase };
}

async function regenerateDiscoveryField({ version, fieldKey, approver }) {
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
  const nextValue = await generateFieldValue({
    field,
    productIdea: record.productIdea,
    targetUser: record.targetUser,
    userNotes: record.userMessages || [],
    currentDocument: record.discoveryDocument
  });
  setNestedValue(record.discoveryDocument, field.key, nextValue);

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
    `Regenerated ${fieldKey}`
  );

  return { record: updatedRecord, savedToSupabase };
}

function buildMarkdownDocument(record) {
  const doc = record.discoveryDocument || buildEmptyDocument();
  const listToMarkdown = (items = []) =>
    items && items.length ? items.map((item) => `- ${item}`).join("\n") : "- None";
  const formatTargetSegments = (value) => {
    if (!value || !Array.isArray(value.target_segments)) {
      return "- None";
    }
    return value.target_segments
      .map((segment) => {
        const groupLines = (segment.user_groups || [])
          .map(
            (group) =>
              `  - ${group.name}: ${Array.isArray(group.characteristics) ? group.characteristics.join("; ") : ""}`
          )
          .join("\n");
        return [
          `- ${segment.segment_name}`,
          `  - Business relevance: ${segment.business_relevance}`,
          groupLines || "  - User groups: None"
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n");
  };
  const formatPainPoints = (value) => {
    if (!value || !Array.isArray(value.pain_point_themes)) {
      return "- None";
    }
    return value.pain_point_themes
      .map((theme) => {
        const painLines = (theme.pain_points || [])
          .map(
            (pain) =>
              `  - ${pain.name}: ${pain.description} (severity: ${pain.severity}, frequency: ${pain.frequency}, business: ${pain.business_importance})`
          )
          .join("\n");
        return [
          `- ${theme.theme_name}`,
          painLines || "  - Pain points: None"
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n");
  };

  return [
    `# Discovery Document v${record.version}`,
    "",
    `**Generated:** ${record.timestamp}`,
    `**Product Idea:** ${record.productIdea || "Not provided"}`,
    `**Target User:** ${record.targetUser || "Not provided"}`,
    `**Status:** ${record.approved ? "Approved" : "In progress"}`,
    `**Latest Change:** ${record.changeReason || "Not documented"}`,
    "",
    "## Problem Understanding",
    "### Problem Statement",
    doc.problemUnderstanding?.problemStatement || "Missing.",
    "",
    "### Target Users & Segments",
    formatTargetSegments(doc.problemUnderstanding?.targetUsersSegments),
    "",
    "### User Pain Points",
    formatPainPoints(doc.problemUnderstanding?.userPainPoints),
    "",
    "### Context & Constraints",
    listToMarkdown(doc.problemUnderstanding?.contextConstraints),
    "",
    "## Market and Competitor Analysis",
    "### Market Landscape",
    listToMarkdown(doc.marketAndCompetitorAnalysis?.marketLandscape),
    "",
    "### Competitor Inventory",
    listToMarkdown(doc.marketAndCompetitorAnalysis?.competitorInventory),
    "",
    "### Competitor Capabilities",
    listToMarkdown(doc.marketAndCompetitorAnalysis?.competitorCapabilities),
    "",
    "### Gaps & Opportunities",
    listToMarkdown(doc.marketAndCompetitorAnalysis?.gapsOpportunities),
    "",
    "## Opportunity Definition",
    "### Opportunity Statement",
    doc.opportunityDefinition?.opportunityStatement || "Missing.",
    "",
    "### Value Drivers",
    listToMarkdown(doc.opportunityDefinition?.valueDrivers),
    "",
    "### Market Fit Hypothesis",
    listToMarkdown(doc.opportunityDefinition?.marketFitHypothesis),
    "",
    "### Feasibility Assessment",
    listToMarkdown(doc.opportunityDefinition?.feasibilityAssessment),
    "",
    "## Decisions",
    listToMarkdown(record.decisions),
    "",
    "## Change Log",
    listToMarkdown(
      (record.changeLog || []).map(
        (entry) =>
          `${entry.timestamp || "n/a"} — ${entry.stage || "discovery"} — ${
            entry.reason || "No reason provided"
          }`
      )
    )
  ].join("\n");
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
    if (req.method === "POST" && req.url === "/discovery") {
      const body = await parseRequestBody(req);
      const result = await runDiscoveryWorkflow(body);
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
        savedToSupabase: result.savedToSupabase
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
    sendJson(res, 400, {
      status: "error",
      message: error.message
    });
    return;
  }

  sendJson(res, 200, {
    status: "ok",
    message:
      "POST /discovery with { productIdea, targetUser, userMessages?, changeReason? } to run the agent.",
    timestamp: new Date().toISOString()
  });
});

if (process.env.SKIP_SERVER === "true") {
  console.log("Server start skipped because SKIP_SERVER=true.");
} else {
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Agentic orchestrator running on http://127.0.0.1:${PORT}`);
  });
}
