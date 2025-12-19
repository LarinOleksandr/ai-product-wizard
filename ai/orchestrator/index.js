import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";

const PORT = Number(process.env.ORCHESTRATOR_PORT) || 8002;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, "output");
const HISTORY_FILE = path.join(OUTPUT_DIR, "history.json");

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

async function getLatestRecord() {
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
  if (latestRecord.approved === true) {
    return null;
  }

  return {
    status: "awaiting_approval",
    resultType: "existing",
    version: latestRecord.version,
    discoveryDocument: latestRecord.discoveryDocument,
    timestamp: latestRecord.timestamp,
    approved: !!latestRecord.approved,
    changeReason: latestRecord.changeReason,
    productIdea: latestRecord.productIdea,
    targetUser: latestRecord.targetUser,
    filePath: latestRecord.filePath,
    message: "Approval required before generating a new discovery document."
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
    productSummary: z.string().min(20),
    targetUsers: z.array(z.string().min(3)).nonempty(),
    pains: z.array(z.string().min(3)).nonempty(),
    solutionOutline: z.array(z.string().min(10)).nonempty(),
    successMetrics: z.array(z.string().min(3)).nonempty(),
    openQuestions: z.array(z.string().min(3)).nonempty()
  })
  .strict();

const discoveryGraph = buildDiscoveryGraph();
let chatInstance;

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
    openQuestions: discoveryDocument.openQuestions,
    targetUser: state.targetUser,
    decisions: [
      `Discovery document drafted at ${new Date().toISOString()}`
    ]
  };
}

async function produceDiscoveryDocument({ productIdea, targetUser, userMessages }) {
  const messages = [
    {
      role: "system",
      content:
        "You are the Discovery Agent. Respond only with JSON that matches the required schema. Do not write prose."
    },
    {
      role: "user",
      content: buildUserPrompt(productIdea, targetUser, userMessages)
    }
  ];

  const model = getChatModel();
  if (model) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await model.invoke(messages);
        const parsed = tryParseDiscoveryResponse(response);
        return discoveryDocumentSchema.parse(parsed);
      } catch (error) {
        console.warn(`Discovery agent attempt ${attempt + 1} failed`, error);
      }
    }
  } else {
    console.warn("Chat model unavailable, using deterministic fallback.");
  }

  const fallback = buildFallbackDocument(productIdea, targetUser);
  return discoveryDocumentSchema.parse(fallback);
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
      keepAlive: "2m"
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

function buildUserPrompt(productIdea, targetUser, userMessages) {
  const sections = [
    `Product idea: ${productIdea}`,
    `Primary user: ${targetUser || "Not provided"}`,
    userMessages.length
      ? `User notes:\n- ${userMessages.join("\n- ")}`
      : "User notes: none provided",
    "Return JSON with keys: productSummary, targetUsers, pains, solutionOutline, successMetrics, openQuestions."
  ];
  return sections.join("\n\n");
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
    productSummary: `Discovery summary for: ${baseIdea}. Target user hint: ${userTarget}. This draft was generated without the LLM and should be reviewed.`,
    targetUsers: [
      "Primary customers who feel the described pain",
      "Early adopters inside the target company",
      "Stakeholders who fund the project"
    ],
    pains: [
      "Lack of clarity about the user problem",
      "No shared success definition yet",
      "Missing structured discovery document"
    ],
    solutionOutline: [
      "Capture the product idea and align on the user",
      "List pains and connect them to the idea",
      "Describe success signals that can be measured"
    ],
    successMetrics: [
      "Discovery document delivered and approved",
      "Stakeholders understand the user pain",
      "Next delivery stage is unblocked"
    ],
    openQuestions: [
      "What data backs up the product pain?",
      "Who will review and approve the discovery document?",
      "What timeline is acceptable for the first version?"
    ]
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

  const pendingApproval = await checkApprovalGate();
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

  const persisted = await persistDiscoveryResult(finalState, { changeReason });
  return {
    status: "awaiting_approval",
    resultType: "created",
    version: persisted.version,
    filePath: persisted.filePath,
    discoveryDocument: persisted.record.discoveryDocument,
    timestamp: persisted.record.timestamp,
    approved: false,
    changeReason: persisted.record.changeReason,
    productIdea: persisted.record.productIdea,
    targetUser: persisted.record.targetUser
  };
}

export async function approveDiscoveryDocument(version, approver) {
  const approval = await approveDiscoveryVersion(version, approver);
  return approval.record;
}

async function persistDiscoveryResult(state, options = {}) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const version = await computeNextVersion();
  const timestamp = new Date().toISOString();
  const filePath = recordFilePath(version);
  const changeReason =
    options.changeReason && options.changeReason.length > 0
      ? options.changeReason
      : "Initial discovery draft";

  const record = {
    version,
    stage: "discovery",
    timestamp,
    productIdea: state.productIdea,
    targetUser: state.targetUser,
    discoveryDocument: state.discoveryDocument,
    decisions: state.decisions,
    openQuestions: state.openQuestions,
    userMessages: state.userMessages,
    approved: false,
    approvedAt: null,
    approvalHistory: [],
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

  await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf8");
  await fs.writeFile(
    path.join(OUTPUT_DIR, `discovery-doc-v${version}.md`),
    buildMarkdownDocument(record),
    "utf8"
  );
  await appendHistoryEntry({
    version,
    timestamp,
    reason: changeReason,
    stage: "discovery_generation"
  });
  return { version, filePath, record };
}

async function computeNextVersion() {
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

async function approveDiscoveryVersion(version, approver) {
  if (!Number.isFinite(Number(version))) {
    throw new Error("A numeric version is required for approval.");
  }
  const numericVersion = Number(version);
  const filePath = recordFilePath(numericVersion);
  const record = await readJsonFile(filePath);
  if (!record) {
    throw new Error(`Discovery document v${numericVersion} was not found.`);
  }

  if (record.approved) {
    return { record, filePath, alreadyApproved: true };
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
  return { record: updatedRecord, filePath, alreadyApproved: false };
}

function buildMarkdownDocument(record) {
  const doc = record.discoveryDocument || {};
  const listToMarkdown = (items = []) =>
    items && items.length ? items.map((item) => `- ${item}`).join("\n") : "- None";

  return [
    `# Discovery Document v${record.version}`,
    "",
    `**Generated:** ${record.timestamp}`,
    `**Product Idea:** ${record.productIdea || "Not provided"}`,
    `**Target User:** ${record.targetUser || "Not provided"}`,
    `**Status:** ${record.approved ? "Approved" : "Awaiting approval"}`,
    `**Latest Change:** ${record.changeReason || "Not documented"}`,
    "",
    "## Product Summary",
    doc.productSummary || "Missing summary.",
    "",
    "## Target Users",
    listToMarkdown(doc.targetUsers),
    "",
    "## Pains",
    listToMarkdown(doc.pains),
    "",
    "## Solution Outline",
    listToMarkdown(doc.solutionOutline),
    "",
    "## Success Metrics",
    listToMarkdown(doc.successMetrics),
    "",
    "## Open Questions",
    listToMarkdown(doc.openQuestions),
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

    if (req.method === "POST" && req.url === "/discovery/approve") {
      const body = await parseRequestBody(req);
      const approval = await approveDiscoveryVersion(body.version, body.approver);
      sendJson(res, 200, {
        status: "approved",
        version: approval.record.version,
        approved: approval.record.approved,
        timestamp: approval.record.approvedAt,
        discoveryDocument: approval.record.discoveryDocument
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
        status: latest.approved ? "approved" : "awaiting_approval",
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
